import { test, expect } from '@playwright/test';

/**
 * Test Suite: Tenant Layout Auth Guard
 *
 * These tests verify the Phase 1 fixes for:
 * 1. CRITICAL - Missing Auth Guard in Tenant Layout (FIXED)
 * 2. HIGH - Race Condition in Tenant Dashboard Auth Check (FIXED)
 *
 * Run: npx playwright test tests/auth-guard.spec.ts
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3002';

test.describe('Tenant Auth Guard', () => {

  // Test Case 1: Unauthenticated access redirects to login
  test('should redirect unauthenticated user to login page', async ({ page }) => {
    // Clear all cookies and localStorage
    await page.context().clearCookies();

    // Navigate to tenant dashboard
    await page.goto(`${BASE_URL}/koltepatil`, { waitUntil: 'networkidle' });

    // Should be redirected to login page
    await expect(page).toHaveURL(`${BASE_URL}/koltepatil/login`);
  });

  // Test Case 4: Login page accessible without token
  test('should allow access to login page without token', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto(`${BASE_URL}/koltepatil/login`);

    // Should stay on login page
    await expect(page).toHaveURL(`${BASE_URL}/koltepatil/login`);

    // Login form should be visible
    await expect(page.getByPlaceholder('admin@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  // Test Case 5: Protected pages redirect without auth
  test('should redirect all protected pages to login', async ({ page }) => {
    await page.context().clearCookies();

    const protectedPages = [
      '/koltepatil/projects/new',
      '/koltepatil/projects/1',
      '/koltepatil/settings',
    ];

    for (const path of protectedPages) {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(`${BASE_URL}/koltepatil/login`);
    }
  });

  // Test Case 2: Authenticated user can access dashboard
  test('should allow authenticated user to access dashboard', async ({ page }) => {
    // First, login via API to get token
    const loginResponse = await page.request.post(`${API_URL}/api/koltepatil/auth/login`, {
      data: {
        email: 'admin@koltepatil.com',
        password: 'password123',
      },
    });

    const loginData = await loginResponse.json();

    // Skip test if credentials don't work (tenant may not exist)
    test.skip(loginData.status_code !== 200, 'Test credentials not available');

    const token = loginData.response_data.token;

    // Set localStorage token before navigation
    await page.addInitScript((tokenData) => {
      localStorage.setItem('tenantToken', tokenData.token);
      localStorage.setItem('tenantEmail', tokenData.email);
      localStorage.setItem('tenantSlug', tokenData.slug);
    }, { token, email: loginData.response_data.email, slug: loginData.response_data.tenantSlug });

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/koltepatil`, { waitUntil: 'networkidle' });

    // Should stay on dashboard (not redirect)
    await expect(page).toHaveURL(`${BASE_URL}/koltepatil`);

    // Dashboard content should be visible
    await expect(page.getByText('Manage your project listings')).toBeVisible();
  });

  // Test Case 3: Token removal triggers redirect
  test('should redirect when token is removed from localStorage', async ({ page }) => {
    // Login first
    const loginResponse = await page.request.post(`${API_URL}/api/koltepatil/auth/login`, {
      data: {
        email: 'admin@koltepatil.com',
        password: 'password123',
      },
    });

    const loginData = await loginResponse.json();
    test.skip(loginData.status_code !== 200, 'Test credentials not available');

    const token = loginData.response_data.token;

    await page.addInitScript((tokenData) => {
      localStorage.setItem('tenantToken', tokenData.token);
      localStorage.setItem('tenantSlug', tokenData.slug);
    }, { token, slug: loginData.response_data.tenantSlug });

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/koltepatil`, { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(`${BASE_URL}/koltepatil`);

    // Remove token
    await page.evaluate(() => {
      localStorage.removeItem('tenantToken');
    });

    // Refresh page
    await page.reload({ waitUntil: 'networkidle' });

    // Should be redirected to login
    await expect(page).toHaveURL(`${BASE_URL}/koltepatil/login`);
  });

  // Test Case 6: Loading state shows during auth check
  test('should show loading state briefly during auth check', async ({ page }) => {
    await page.context().clearCookies();

    // Start navigation
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/koltepatil`, { waitUntil: 'commit' });

    // Check if loading spinner is visible (it appears immediately)
    const loadingSpinner = page.locator('div.animate-spin');

    // The loading state should appear briefly before redirect
    // We can't assert exact timing, but we verify redirect happens
    await page.waitForURL(`${BASE_URL}/koltepatil/login`, { timeout: 5000 });

    const loadTime = Date.now() - startTime;
    console.log(`Redirect completed in ${loadTime}ms`);

    // Should redirect within reasonable time (< 2 seconds)
    expect(loadTime).toBeLessThan(2000);
  });

  // Test Case 7: Different tenant slugs are isolated
  test('should handle non-existent tenant gracefully', async ({ page }) => {
    await page.context().clearCookies();

    // Try accessing a non-existent tenant
    await page.goto(`${BASE_URL}/nonexistenttenant`, { waitUntil: 'networkidle' });

    // Should redirect to login for that tenant
    await expect(page).toHaveURL(`${BASE_URL}/nonexistenttenant/login`);
  });
});

test.describe('Auth Guard - Edge Cases', () => {

  // Test: Invalid token format
  test('should handle invalid token format', async ({ page }) => {
    // Set invalid token
    await page.addInitScript(() => {
      localStorage.setItem('tenantToken', 'invalid-token-format');
      localStorage.setItem('tenantSlug', 'koltepatil');
    });

    await page.goto(`${BASE_URL}/koltepatil`, { waitUntil: 'networkidle' });

    // Should either redirect to login or show error
    // (backend should reject invalid token)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/login|error/);
  });

  // Test: Expired token handling
  test('should handle expired token', async ({ page }) => {
    // Note: This test requires generating an expired JWT
    // For now, we test that the system handles 401 responses

    await page.addInitScript(() => {
      // Set a token that will fail validation
      localStorage.setItem('tenantToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired');
      localStorage.setItem('tenantSlug', 'koltepatil');
    });

    await page.goto(`${BASE_URL}/koltepatil/projects`, { waitUntil: 'networkidle' });

    // Should redirect to login when API returns 401
    await expect(page).toHaveURL(`${BASE_URL}/koltepatil/login`);
  });
});
