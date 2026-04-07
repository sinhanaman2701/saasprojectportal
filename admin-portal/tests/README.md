# Phase 1 Auth Guard - Playwright Tests

Automated tests for the Phase 1 authentication fixes.

## Prerequisites

1. **Backend server running** on `http://localhost:3002`
2. **Admin portal running** on `http://localhost:3000`
3. **Test data**: A tenant "koltepatil" with admin credentials:
   - Email: `admin@koltepatil.com`
   - Password: `password123`

## Install Dependencies

```bash
cd admin-portal
npm install -D @playwright/test
npx playwright install chromium
```

## Run Tests

```bash
# Run all auth guard tests
npx playwright test tests/auth-guard.spec.ts

# Run with UI (interactive mode)
npx playwright test tests/auth-guard.spec.ts --ui

# Run specific test
npx playwright test tests/auth-guard.spec.ts -g "should redirect unauthenticated user"

# Run with visible browser (headed mode)
npx playwright test tests/auth-guard.spec.ts --headed

# Run with slow mo (see what's happening)
npx playwright test tests/auth-guard.spec.ts --headed --slowmo 1000
```

## Test Cases

| # | Test Case | Description |
|---|-----------|-------------|
| 1 | Unauthenticated access redirects | Navigating to `/[slug]` without token redirects to login |
| 2 | Login page accessible | Login page works without token |
| 3 | Protected pages redirect | All protected routes redirect to login |
| 4 | Authenticated user can access dashboard | Valid token allows dashboard access |
| 5 | Token removal triggers redirect | Deleting `tenantToken` redirects to login |
| 6 | Loading state shows during auth check | Spinner appears briefly before redirect |
| 7 | Different tenant slugs isolated | Non-existent tenants handled gracefully |
| 8 | Invalid token format handled | Invalid tokens redirect to login |
| 9 | Expired token handled | 401 responses trigger redirect |

## View Report

After running tests, open the HTML report:

```bash
npx playwright show-report
```

## Troubleshooting

### Tests fail with "Connection refused"
Make sure both servers are running:
```bash
# Terminal 1
cd backend
npm run dev  # or bun run dev

# Terminal 2
cd admin-portal
npm run dev
```

### Tests fail with "Test credentials not available"
The test expects a tenant "koltepatil" with admin user. Create it:
1. Go to `http://localhost:3000/admin`
2. Create a new portal with slug `koltepatil`
3. Create admin with email `admin@koltepatil.com` and password `password123`

Or update the test credentials in `auth-guard.spec.ts` to match your test data.

### Browser doesn't close after tests
Playwright should handle this automatically. If stuck, press `Ctrl+C` to terminate.

## Test File Locations

- **Tests:** `admin-portal/tests/auth-guard.spec.ts`
- **Config:** `admin-portal/playwright.config.ts`
- **Reports:** `admin-portal/playwright-report/` (after running)
