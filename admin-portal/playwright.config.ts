import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for SaaS Portal Admin Portal
 *
 * Run tests: npx playwright test
 * Run with UI: npx playwright test --ui
 * Run specific file: npx playwright test tests/auth-guard.spec.ts
 */

export default defineConfig({
  testDir: './tests',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and webkit disabled for local dev - run 'npx playwright install' to enable
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Your dev servers should already be running
  // If not, start them before running tests:
  // Terminal 1: cd backend && npm run dev (or bun run dev)
  // Terminal 2: cd admin-portal && npm run dev
});
