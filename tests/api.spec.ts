import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test('Valid Zipcode Lookup', async ({ request }) => {
    const response = await request.get('/api/zipcode/90210');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.zipcode).toBe('90210');
    expect(data.city).toBe('Beverly Hills');
    expect(data.state).toBe('CA');
    expect(data.latitude).toBeDefined();
    expect(data.longitude).toBeDefined();
  });

  test('Invalid Zipcode Format', async ({ request }) => {
    const response = await request.get('/api/zipcode/abcde');
    expect(response.status()).toBe(400);
  });

  test('Zipcode Not Found', async ({ request }) => {
    const response = await request.get('/api/zipcode/00000');
    expect(response.status()).toBe(404);
  });

  test('Refresh Endpoint Security - No Auth', async ({ request }) => {
    const response = await request.post('/api/refresh');
    expect(response.status()).toBe(401);
  });

  test('Refresh Endpoint Security - Invalid Auth', async ({ request }) => {
    const response = await request.post('/api/refresh', {
      headers: { 'x-admin-secret': 'wrong-secret' }
    });
    expect(response.status()).toBe(401);
  });
});
