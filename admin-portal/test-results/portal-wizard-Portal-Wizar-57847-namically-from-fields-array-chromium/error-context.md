# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: portal-wizard.spec.ts >> Portal Wizard - Phase 2 Fixes >> should display sections dynamically from fields array
- Location: tests/portal-wizard.spec.ts:91:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Property Information').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Property Information').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "P Superadmin" [ref=e5] [cursor=pointer]:
          - /url: /admin
          - generic [ref=e7]: P
          - generic [ref=e8]: Superadmin
        - generic [ref=e9]:
          - link "New Portal" [ref=e10] [cursor=pointer]:
            - /url: /admin/portals/new
            - img [ref=e11]
            - generic [ref=e12]: New Portal
          - button "Logout" [ref=e13]:
            - img [ref=e14]
            - generic [ref=e17]: Logout
    - generic [ref=e18]:
      - link "Back to portals" [ref=e19] [cursor=pointer]:
        - /url: /admin
        - img [ref=e20]
        - text: Back to portals
      - generic [ref=e22]:
        - heading "Create New Portal" [level=1] [ref=e23]
        - paragraph [ref=e24]: Set up a new tenant portal in 5 easy steps.
      - generic [ref=e26]:
        - button "Basics" [ref=e27] [cursor=pointer]:
          - img [ref=e28]
          - generic [ref=e30]: Basics
        - button "Branding" [ref=e33] [cursor=pointer]:
          - img [ref=e34]
          - generic [ref=e36]: Branding
        - button "Fields" [ref=e39] [cursor=pointer]:
          - img [ref=e40]
          - generic [ref=e42]: Fields
        - button "4 Admin" [disabled] [ref=e45]:
          - generic [ref=e46]: "4"
          - generic [ref=e47]: Admin
        - button "5 Review" [disabled] [ref=e49]:
          - generic [ref=e50]: "5"
          - generic [ref=e51]: Review
      - generic [ref=e52]:
        - generic [ref=e53]: Admin email is required
        - generic [ref=e54]:
          - generic [ref=e55]:
            - heading "Admin Setup" [level=2] [ref=e56]
            - paragraph [ref=e57]: Create the first administrator account for this portal.
          - generic [ref=e58]:
            - generic [ref=e59]: Admin Email *
            - textbox "admin@koltepatil.com" [ref=e60]
            - paragraph [ref=e61]: This email will be used for login.
          - generic [ref=e62]:
            - generic [ref=e63]: Admin Password *
            - textbox "Min. 8 characters" [ref=e64]
            - paragraph [ref=e65]: Must be at least 8 characters.
          - generic [ref=e66]:
            - generic [ref=e67]: Admin Name (Optional)
            - textbox "Administrator" [ref=e68]
            - paragraph [ref=e69]: Display name for the admin account.
          - generic [ref=e70]:
            - button "← Back" [ref=e71]
            - 'button "Next: Review" [active] [ref=e72]'
  - button "Open Next.js Dev Tools" [ref=e78] [cursor=pointer]:
    - img [ref=e79]
  - alert [ref=e82]
```

# Test source

```ts
  26  |     // Step 1: Fill basics
  27  |     await page.getByPlaceholder('Kolte & Patil Developers').fill('Test Portal');
  28  |     await page.getByPlaceholder('koltepatil').fill('testportal');
  29  |     await page.getByRole('button', { name: 'Next: Branding' }).click();
  30  | 
  31  |     // Step 2: Enter invalid logo URL
  32  |     await page.getByPlaceholder('https://example.com/logo.png').fill('https://invalid-url-test-12345.com/bad.png');
  33  |     await page.waitForTimeout(1000); // Wait for error to show
  34  | 
  35  |     // Check error message is visible
  36  |     const errorMessage = page.getByText('Invalid image URL');
  37  |     await expect(errorMessage).toBeVisible();
  38  |   });
  39  | 
  40  |   // Test Case 2: Logo Preview Works with Valid URL
  41  |   test('should display valid logo URL preview', async ({ page }) => {
  42  |     await page.goto(`${BASE_URL}/admin/login`);
  43  |     await page.getByPlaceholder('superadmin@example.com').fill('superadmin@saasportal.com');
  44  |     await page.getByPlaceholder('••••••••').fill('SuperAdmin@2026');
  45  |     await page.getByRole('button', { name: 'Sign In' }).click();
  46  |     await page.waitForURL(`${BASE_URL}/admin`);
  47  | 
  48  |     await page.goto(`${BASE_URL}/admin/portals/new`);
  49  | 
  50  |     // Step 1: Fill basics
  51  |     await page.getByPlaceholder('Kolte & Patil Developers').fill('Valid Logo Test');
  52  |     await page.getByPlaceholder('koltepatil').fill('validlogotest');
  53  |     await page.getByRole('button', { name: 'Next: Branding' }).click();
  54  | 
  55  |     // Step 2: Enter valid logo URL
  56  |     await page.getByPlaceholder('https://example.com/logo.png').fill('https://via.placeholder.com/150');
  57  |     await page.waitForTimeout(1500);
  58  | 
  59  |     // Check logo image is visible - look for img with max-h-16 class inside the branding step
  60  |     const logoImg = page.locator('img.max-h-16');
  61  |     await expect(logoImg).toBeVisible();
  62  |   });
  63  | 
  64  |   // Test Case 3: Field Keys Display Correctly
  65  |   test('should display field keys in camelCase format', async ({ page }) => {
  66  |     await page.goto(`${BASE_URL}/admin/login`);
  67  |     await page.getByPlaceholder('superadmin@example.com').fill('superadmin@saasportal.com');
  68  |     await page.getByPlaceholder('••••••••').fill('SuperAdmin@2026');
  69  |     await page.getByRole('button', { name: 'Sign In' }).click();
  70  |     await page.waitForURL(`${BASE_URL}/admin`);
  71  | 
  72  |     await page.goto(`${BASE_URL}/admin/portals/new`);
  73  | 
  74  |     // Step 1: Fill basics
  75  |     await page.getByPlaceholder('Kolte & Patil Developers').fill('Field Key Test');
  76  |     await page.getByPlaceholder('koltepatil').fill('fieldkeytest');
  77  |     await page.getByRole('button', { name: 'Next: Branding' }).click();
  78  |     await page.getByRole('button', { name: 'Next: Fields' }).click();
  79  | 
  80  |     // Step 3: Check field keys are in camelCase - look for monospace styled keys
  81  |     const fieldKeys = ['projectName', 'location', 'bedrooms', 'nearbyPlaces'];
  82  | 
  83  |     for (const key of fieldKeys) {
  84  |       // Field keys are displayed with font-mono class
  85  |       const keyElement = page.locator(`text=${key}`);
  86  |       await expect(keyElement.first()).toBeVisible();
  87  |     }
  88  |   });
  89  | 
  90  |   // Test Case 4: Dynamic Sections Display
  91  |   test('should display sections dynamically from fields array', async ({ page }) => {
  92  |     await page.goto(`${BASE_URL}/admin/login`);
  93  |     await page.getByPlaceholder('superadmin@example.com').fill('superadmin@saasportal.com');
  94  |     await page.getByPlaceholder('••••••••').fill('SuperAdmin@2026');
  95  |     await page.getByRole('button', { name: 'Sign In' }).click();
  96  |     await page.waitForURL(`${BASE_URL}/admin`);
  97  | 
  98  |     await page.goto(`${BASE_URL}/admin/portals/new`);
  99  | 
  100 |     // Step 1: Fill basics
  101 |     await page.getByPlaceholder('Kolte & Patil Developers').fill('Sections Test');
  102 |     await page.getByPlaceholder('koltepatil').fill('sectionstest');
  103 |     await page.getByRole('button', { name: 'Next: Branding' }).click();
  104 |     await page.getByRole('button', { name: 'Next: Fields' }).click();
  105 | 
  106 |     // Step 3: Check sections are displayed as h3 headers
  107 |     const expectedSections = [
  108 |       'Property Information',
  109 |       'Project Details',
  110 |       'Location & Attachments',
  111 |     ];
  112 | 
  113 |     for (const section of expectedSections) {
  114 |       const sectionHeader = page.getByText(section, { exact: false }).first();
  115 |       await expect(sectionHeader).toBeVisible();
  116 |     }
  117 | 
  118 |     // Go to Review step and verify sections match
  119 |     await page.getByRole('button', { name: 'Next: Admin' }).click();
  120 |     await page.getByRole('button', { name: 'Next: Review' }).click();
  121 | 
  122 |     // Check sections appear in review - look for text containing section names
  123 |     for (const section of expectedSections) {
  124 |       // Sections appear with field count like "Property Information: X fields" or in badges
  125 |       const sectionText = page.getByText(section);
> 126 |       await expect(sectionText.first()).toBeVisible();
      |                                         ^ Error: expect(locator).toBeVisible() failed
  127 |     }
  128 |   });
  129 | 
  130 |   // Test Case 5: Field Reordering
  131 |   test('should have drag handles for reordering fields', async ({ page }) => {
  132 |     await page.goto(`${BASE_URL}/admin/login`);
  133 |     await page.getByPlaceholder('superadmin@example.com').fill('superadmin@saasportal.com');
  134 |     await page.getByPlaceholder('••••••••').fill('SuperAdmin@2026');
  135 |     await page.getByRole('button', { name: 'Sign In' }).click();
  136 |     await page.waitForURL(`${BASE_URL}/admin`);
  137 | 
  138 |     await page.goto(`${BASE_URL}/admin/portals/new`);
  139 | 
  140 |     // Step 1: Fill basics
  141 |     await page.getByPlaceholder('Kolte & Patil Developers').fill('Reorder Test');
  142 |     await page.getByPlaceholder('koltepatil').fill('reordertest');
  143 |     await page.getByRole('button', { name: 'Next: Branding' }).click();
  144 |     await page.getByRole('button', { name: 'Next: Fields' }).click();
  145 | 
  146 |     // Step 3: Verify drag handles (GripVertical icons) are present
  147 |     // They are buttons with GripVertical svg inside
  148 |     const dragButtons = page.locator('button.cursor-grab');
  149 |     expect(await dragButtons.count()).toBeGreaterThan(0);
  150 |   });
  151 | });
  152 | 
```