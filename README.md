# Zipcode Location API

A full-stack web application and API service that provides the latitude, longitude, city, and state for any given US 5-digit zipcode. 

Built with React, Vite, Express, and Tailwind CSS, this project serves both as a standalone REST API and a user-friendly web interface to query location data.

## Features

- **RESTful API Endpoint**: Fast and reliable zipcode lookups returning JSON data.
- **Swagger API UI**: Interactive API documentation and testing interface.
- **Local Database**: Downloads and queries a local SQLite database populated from the GeoNames dataset for ultra-fast lookups.
- **Interactive UI & Map**: A clean, responsive React frontend that plots the resulting location on an interactive OpenStreetMap and provides quick links for directions via Apple Maps, Google Maps, and Waze.
- **Input Validation**: Ensures only valid 5-digit US zipcodes are processed.
- **Error Handling**: Graceful error messages for invalid or unfound zipcodes.

## API Documentation

The API comes with an interactive Swagger UI for easy testing and exploration.

**Swagger UI Endpoint:**
`GET /api-docs`

Navigate to `http://localhost:3000/api-docs` in your browser when the server is running to view and interact with the API documentation.

### Get Location by Zipcode

Retrieves the geographical coordinates and location details for a specific US zipcode.

**Endpoint:**
`GET /api/zipcode/:zipcode`

**Parameters:**
- `zipcode` (string, required): A 5-digit US zipcode (e.g., `90210`).

**Example Request:**
```bash
curl http://localhost:3000/api/zipcode/90210
```

**Example Response (200 OK):**
```json
{
  "zipcode": "90210",
  "city": "Beverly Hills",
  "state": "CA",
  "latitude": 34.0901,
  "longitude": -118.4065
}
```

**Error Responses:**
- `400 Bad Request`: Invalid US zipcode format. Must be 5 digits.
- `404 Not Found`: Zipcode not found or location data unavailable.
- `500 Internal Server Error`: Failed to fetch zipcode data.

## Setup and Configuration

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

### Installation

1. Clone the repository and navigate to the project directory.
2. Install the dependencies:
   ```bash
   npm install
   ```

### Development

To start the development server (which runs both the Express API and the Vite React frontend):

```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Production Build

To build the application for production:

1. Build the frontend assets:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React (Icons), React-Leaflet (Maps)
- **Backend**: Node.js, Express, Swagger UI
- **Language**: TypeScript
- **Database**: SQLite (via `better-sqlite3`)
- **Data Source**: [GeoNames](https://download.geonames.org/export/zip/US.zip) (downloaded and parsed automatically on startup)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE.md) file for details.
