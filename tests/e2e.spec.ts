import { test, expect } from '@playwright/test';

test.describe('E2E UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Successful Search Flow', async ({ page }) => {
    await page.fill('input[placeholder="Enter 5-digit zipcode..."]', '90210');
    await page.click('button[type="submit"]');
    
    // Wait for result to appear
    await expect(page.locator('text=Beverly Hills, CA 90210')).toBeVisible();
    await expect(page.locator('text=Latitude')).toBeVisible();
    await expect(page.locator('text=Longitude')).toBeVisible();
  });

  test('Error Handling UI', async ({ page }) => {
    await page.fill('input[placeholder="Enter 5-digit zipcode..."]', '00000');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Location data not found for this zipcode.')).toBeVisible();
  });

  test('Directions Dropdown', async ({ page }) => {
    await page.fill('input[placeholder="Enter 5-digit zipcode..."]', '90210');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Beverly Hills, CA 90210')).toBeVisible();
    
    // Click Get Directions
    await page.click('button:has-text("Get Directions")');
    
    // Verify links
    await expect(page.locator('a:has-text("Apple Maps")')).toBeVisible();
    await expect(page.locator('a:has-text("Google Maps")')).toBeVisible();
    await expect(page.locator('a:has-text("Waze")')).toBeVisible();
  });

  test('Admin Refresh Modal Flow', async ({ page }) => {
    // Click the refresh button
    await page.click('button[title="Refresh Database"]');
    
    // Verify modal appears
    await expect(page.locator('h2:has-text("Admin Authentication")')).toBeVisible();
    
    // Fill the secret key
    await page.fill('input[placeholder="Admin Secret Key"]', 'test-secret');
    
    // Click Confirm
    await page.click('button:has-text("Confirm")');
    
    // Modal should close and the UI should show an error because 'test-secret' is wrong
    await expect(page.locator('h2:has-text("Admin Authentication")')).not.toBeVisible();
    await expect(page.locator('text=Unauthorized: Invalid or missing admin secret key.')).toBeVisible();
  });
});
