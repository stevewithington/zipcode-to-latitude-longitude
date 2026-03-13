import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import AdmZip from "adm-zip";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import rateLimit from "express-rate-limit";

async function refreshDatabase(db: Database.Database) {
  console.log("Downloading and populating zipcode database from geonames.org...");
  try {
    const response = await fetch("https://download.geonames.org/export/zip/US.zip");
    if (!response.ok) throw new Error(`Failed to fetch US.zip: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const usTxtEntry = zipEntries.find(entry => entry.entryName === "US.txt");
    
    if (usTxtEntry) {
      const text = usTxtEntry.getData().toString("utf8");
      const lines = text.split("\n");
      
      const insert = db.prepare(`
        INSERT OR REPLACE INTO zipcodes (zipcode, city, state, state_abbr, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const insertMany = db.transaction((lines: string[]) => {
        for (const line of lines) {
          if (!line.trim()) continue;
          const parts = line.split("\t");
          if (parts.length >= 11) {
            const zipcode = parts[1];
            const city = parts[2];
            const state = parts[3];
            const state_abbr = parts[4];
            const latitude = parseFloat(parts[9]);
            const longitude = parseFloat(parts[10]);
            insert.run(zipcode, city, state, state_abbr, latitude, longitude);
          }
        }
      });
      
      insertMany(lines);
      
      const now = new Date().toISOString();
      db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_refreshed', ?)").run(now);
      
      console.log("Database populated successfully.");
      return { success: true, message: "Database populated successfully." };
    } else {
      console.error("US.txt not found in the downloaded zip file.");
      return { success: false, error: "US.txt not found in the downloaded zip file." };
    }
  } catch (error) {
    console.error("Error setting up database:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function setupDatabase() {
  const dbPath = path.join(process.cwd(), "zipcodes.db");
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS zipcodes (
      zipcode TEXT PRIMARY KEY,
      city TEXT,
      state TEXT,
      state_abbr TEXT,
      latitude REAL,
      longitude REAL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  const { count } = db.prepare("SELECT COUNT(*) as count FROM zipcodes").get() as { count: number };
  
  if (count === 0) {
    await refreshDatabase(db);
  } else {
    console.log(`Database already populated with ${count} zipcodes.`);
    // Ensure metadata exists for existing databases
    const { metaCount } = db.prepare("SELECT COUNT(*) as metaCount FROM metadata WHERE key = 'last_refreshed'").get() as { metaCount: number };
    if (metaCount === 0) {
      db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_refreshed', ?)").run(new Date().toISOString());
    }
  }
  
  return db;
}

async function startServer() {
  const db = await setupDatabase();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'Zipcode Location API',
      version: '1.0.0',
      description: 'An API service that returns the latitude and longitude of a given US zipcode.',
    },
    servers: [
      {
        url: '/',
        description: 'Current environment',
      },
    ],
    paths: {
      '/api/zipcode/{zipcode}': {
        get: {
          summary: 'Get location by zipcode',
          description: 'Retrieves the geographical coordinates and location details for a specific US zipcode.',
          parameters: [
            {
              in: 'path',
              name: 'zipcode',
              required: true,
              schema: {
                type: 'string',
                pattern: '^\\d{5}$',
              },
              description: 'A 5-digit US zipcode (e.g., 90210)',
            },
          ],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      zipcode: { type: 'string', example: '90210' },
                      city: { type: 'string', example: 'Beverly Hills' },
                      state: { type: 'string', example: 'CA' },
                      latitude: { type: 'number', example: 34.0901 },
                      longitude: { type: 'number', example: -118.4065 },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request - Invalid zipcode format',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Invalid US zipcode format. Must be 5 digits.' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Not Found - Zipcode not found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Location data not found for this zipcode.' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal Server Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Failed to fetch zipcode data.' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/refresh': {
        post: {
          summary: 'Refresh zipcode database',
          description: 'Downloads the latest US.zip from GeoNames and updates the SQLite database.',
          parameters: [
            {
              in: 'header',
              name: 'x-admin-secret',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'Admin secret key configured in the server environment',
            },
          ],
          responses: {
            '200': {
              description: 'Successful refresh',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'Database populated successfully.' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Unauthorized: Invalid or missing admin secret key.' },
                    },
                  },
                },
              },
            },
            '429': {
              description: 'Too Many Requests',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Global rate limit exceeded. The database can only be refreshed once per hour. Please try again later.' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Internal Server Error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      error: { type: 'string', example: 'Failed to refresh database.' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // API Route to fetch latitude and longitude for a zipcode
  app.get("/api/zipcode/:zipcode", (req, res) => {
    const { zipcode } = req.params;

    if (!/^\d{5}$/.test(zipcode)) {
      return res.status(400).json({ error: "Invalid US zipcode format. Must be 5 digits." });
    }

    try {
      const stmt = db.prepare("SELECT * FROM zipcodes WHERE zipcode = ?");
      const row = stmt.get(zipcode) as any;
      
      if (row) {
        return res.json({
          zipcode: row.zipcode,
          city: row.city,
          state: row.state_abbr,
          latitude: row.latitude,
          longitude: row.longitude
        });
      } else {
        return res.status(404).json({ error: "Location data not found for this zipcode." });
      }
    } catch (error) {
      console.error("Error querying zipcode data:", error);
      return res.status(500).json({ error: "Failed to fetch zipcode data." });
    }
  });

  let isRefreshing = false;

  // Configure global rate limiter for the refresh endpoint
  // Limit to 1 request per hour (60 * 60 * 1000 ms)
  const refreshRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 1,
    message: { error: "Global rate limit exceeded. The database can only be refreshed once per hour. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: () => "global", // Use a static string to make it a global limit instead of IP-based
  });

  // API Route to refresh the database
  app.post("/api/refresh", refreshRateLimiter, async (req, res) => {
    const adminSecret = req.headers["x-admin-secret"];
    if (!process.env.ADMIN_SECRET_KEY) {
      return res.status(500).json({ error: "Server configuration error: ADMIN_SECRET_KEY is not set." });
    }
    if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing admin secret key." });
    }

    if (isRefreshing) {
      return res.status(429).json({ error: "A database refresh is already in progress. Please try again later." });
    }

    isRefreshing = true;
    try {
      const result = await refreshDatabase(db);
      if (result.success) {
        return res.json({ message: result.message });
      } else {
        return res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Error in /api/refresh:", error);
      return res.status(500).json({ error: "Failed to refresh database." });
    } finally {
      isRefreshing = false;
    }
  });

  // API Route to get database status
  app.get("/api/status", (req, res) => {
    try {
      const stmt = db.prepare("SELECT value FROM metadata WHERE key = 'last_refreshed'");
      const row = stmt.get() as any;
      return res.json({ lastRefreshed: row ? row.value : null });
    } catch (error) {
      console.error("Error fetching status:", error);
      return res.status(500).json({ error: "Failed to fetch status." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
