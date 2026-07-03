# Feature Stories & Test Status

Canonical tracking document for every user-facing feature in the SaaS Portal Platform. One entry per coherent user flow. Status is updated as testing (Phase 2) and fixes (Phase 3/4) proceed.

**Status legend:**
- 🔲 Not tested yet
- ✅ Pass — works as expected
- ⚠️ Partial — works but with a UX/logistical issue
- ❌ Fail — broken / does not work
- 🐛 Known issue (found via code review, not yet live-tested)

**Areas:** [A] Superadmin · [T] Tenant Admin · [F] Dynamic Form Engine (shared) · [M] Public/Mobile API · [L] Legacy single-tenant area · [X] Cross-cutting

---

## [A] Superadmin Area

### A1 — Superadmin login
**Story:** As a superadmin, I want to sign in with email/password so I can manage tenant portals.
**Expected behavior:**
- `/admin/login` shows email (required) + password (required) fields, pre-filled with `admin@example.com` / `password123` as defaults.
- Sign In → `POST /superadmin/auth/login`. On `status_code === 200`, stores `superadminToken` + `superadminEmail` in localStorage, redirects to `/admin`.
- On failure, shows `status_message` (or "Login failed") in a red banner. Network failure → "Unable to connect to server".
- Button disabled + shows "Signing in..." while in flight.
**Status:** 🔲

### A2 — First-run superadmin registration
**Story:** As the first operator standing up the platform, I want to create the initial superadmin account.
**Expected behavior:**
- Same login page has a "Create Superadmin Account" button reusing the email/password fields → `POST /superadmin/auth/register`.
- Succeeds (201) only if zero superadmins exist yet; every subsequent call returns 403 regardless of credentials.
- On success, stores token same as login and redirects to `/admin`.
**Known issue:** 🐛 Register reuses the same fields as Login — easy to accidentally register instead of logging in.
**Status:** 🔲

### A3 — Superadmin auth guard
**Story:** As the platform, I want unauthenticated visitors redirected away from `/admin/**`.
**Expected behavior:** `admin/layout.tsx` checks `superadminToken` presence on mount/pathname change; redirects to `/admin/login` if absent and not already on the login page.
**Known issue:** 🐛 No loading gate — a flash of protected content can render before the redirect fires (unlike the tenant guard, which shows a spinner first). Also only checks token *presence*, never validity.
**Status:** 🔲

### A4 — Tenant list dashboard
**Story:** As a superadmin, I want to see all tenant portals with status and project counts.
**Expected behavior:**
- `GET /admin/portals` on mount; redirects to login if no token.
- Table columns: logo/initial avatar, name, slug, status pill (PENDING=yellow/LIVE=green/SUSPENDED=red), project count, created date.
- Empty state shows a CTA card; loading shows "Loading...".
**Status:** 🔲

### A5 — Delete a tenant portal
**Story:** As a superadmin, I want to permanently delete a tenant and all its data.
**Expected behavior:** Delete icon → `confirm()` dialog naming the tenant and warning it's irreversible → `DELETE /admin/portals/{slug}` → row removed from local list on success (no refetch); error banner on failure; per-row disabled state while deleting.
**Status:** 🔲

### A6 — Create a new tenant portal (5-step wizard)
**Story:** As a superadmin, I want to onboard a new tenant through a guided wizard covering basics, branding, field schema, first admin, and review.
**Expected behavior (per step):**
1. **Basics:** name + auto-derived (but independently editable) slug; slug sanitized to `[a-z0-9-]`; Next disabled until both non-empty and slug valid.
2. **Branding:** optional logo URL with a live broken-image check.
3. **Fields:** starts pre-seeded with 15 default fields across 3 sections; supports add/rename/delete section, add/edit/delete field (per-type conditional options: SELECT/MULTISELECT option list, TEXT maxLength, IMAGE dimensions + caption toggle), drag-and-drop reorder within a section; empty sections are visually flagged and block "Next" via a warning modal offering remove-section or add-field.
4. **Admin:** email (regex-validated) + password (≥8 chars enforced client-side) + optional name.
5. **Review:** read-only summary; red-flags any section still at 0 fields.
- **Create Portal** (final submit): creates tenant (`POST /admin/portals`), persists field schema (`POST .../fields/bulk`), creates first tenant admin (`POST .../admins`), then shows a success screen with quick links and auto-redirects to portal management after 3s.
**Known issues:** 🐛 Field-schema persistence failure is only logged to console, never shown to the superadmin — portal can appear fully created when the schema silently didn't save. 🐛 Admin-creation failure downgrades to a warning message rather than blocking success.
**Status:** 🔲

### A7 — Manage portal: Fields tab
**Story:** As a superadmin, I want to edit an existing tenant's field schema after creation.
**Expected behavior:** Same add/edit/delete/reorder field & section UI as the wizard, but every mutation calls the backend live. Editing a field is optimistic-with-rollback (awaited PUT; reverts + alerts on failure). Adding a field/section or reordering fires the request in the background without awaiting or surfacing failure.
**Known issues:** 🐛 Asymmetric error handling (edit vs. add/reorder) means a failed add/reorder leaves the UI showing state that doesn't exist server-side, with no indication to the user. 🐛 "Changes Saved" button's underlying `fieldsSaved` flag is never set to `false` anywhere, so the button's stated condition is effectively dead code.
**Status:** 🔲

### A8 — Manage portal: Branding tab
**Story:** As a superadmin, I want to update a tenant's display name and logo.
**Expected behavior:** Name field requires explicit "Save Branding" click (`PUT /admin/portals/{slug}`) with a 2s success banner. Logo URL field auto-saves on every keystroke.
**Known issue:** 🐛 Inconsistent save model between the two fields on the same tab — logo URL writes to the server on every character typed, including invalid/incomplete URLs.
**Status:** 🔲

### A9 — Manage portal: API Config tab
**Story:** As a superadmin, I want to view/copy/regenerate a tenant's mobile Access-Token and download its Postman collection.
**Expected behavior:** Displays token with Copy (clipboard + "Copied!" for 2s) and Regenerate (confirm dialog warning it breaks existing mobile integrations → `POST .../regenerate-token`); shows slug + base API URL + documented endpoints; Refresh re-fetches the Postman JSON via the tenant's own Access-Token; Download triggers a client-side blob download named `{TenantName}_API.postman_collection.json`.
**Status:** 🔲

### A10 — Manage portal: Admins tab
**Story:** As a superadmin, I want to list, add, and remove tenant admin accounts for a portal.
**Expected behavior:** Table of admins; Add Admin modal (name optional, email + password required) → `POST .../admins`, error banner on failure; Delete → confirm dialog, per-row spinner while deleting.
**Known issue:** 🐛 Password field only shows a "Min. 8 characters" hint with no actual client-side length enforcement (unlike the wizard's step 4, which does enforce it) — relies entirely on the backend's own check.
**Status:** 🔲

### A11 — Portal analytics dashboard
**Story:** As a superadmin, I want to see aggregate stats and top projects for one tenant.
**Expected behavior:** `GET /admin/portals/{slug}` (authed) for tenant name + `GET /api/{slug}/projects/stats` (unauthenticated call) for counts; 4 stat cards (total/active/drafts/archived); "Top Projects by Views" ranked by click count with medal styling for top 3, listing project **ID** (not name).
**Known issue:** 🐛 The stats endpoint call has no auth header — confirm whether that's intentional (matches backend design, since stats route only requires an Access-Token OR JWT and the frontend sends neither) or a bug where the tenant's Access-Token should have been attached.
**Status:** 🔲

---

## [T] Tenant Admin Area

### T1 — Tenant admin login
**Story:** As a tenant admin, I want to sign in to my portal at `/{slug}/login`.
**Expected behavior:** Branded with tenant logo/name (fetched via a superadmin-style GET that's expected to fail gracefully and fall back to raw slug). Email+password required → `POST /api/{slug}/auth/login`; on success stores `tenantToken`/`tenantEmail`/`tenantSlug`, waits 100ms, then redirects to `/{slug}`. Error banner on failure/network issues.
**Known issue:** 🐛 Verbose `console.log`s including the raw password value — a hygiene/security smell, not functional, but worth fixing.
**Status:** 🔲

### T2 — Tenant auth guard
**Story:** As the platform, I want unauthenticated visitors to `/{slug}/**` redirected to that tenant's login.
**Expected behavior:** Shows a loading spinner until the presence-check completes (no flash of protected content, unlike the superadmin guard), then redirects if `tenantToken` is missing and the path isn't already `/login`.
**Known issue:** 🐛 Path check is a substring match (`pathname.includes("/login")`) rather than exact — could misfire on a hypothetical nested route containing that substring. Also never verifies token validity, only presence.
**Status:** 🔲

### T3 — Tenant project dashboard (list + filters)
**Story:** As a tenant admin, I want to see my projects filtered by Active/Drafts/Archived/All.
**Expected behavior:** Filter tabs refetch `GET /api/{slug}/projects?filter=...`; project cards show cover image, status badge (ONGOING/LATEST/other), separate Draft badge, name, location, bedrooms, price; empty/loading/error states present.
**Known issue:** 🐛 Search and grid/list-view toggle are fully implemented in component state/filtering logic but have **no rendered UI control** to trigger them — dead feature, present in code but inaccessible to users.
**Status:** 🔲

### T4 — Create a new project (dynamic form)
**Story:** As a tenant admin, I want to create a project through a form driven by my portal's configured fields.
**Expected behavior:** See [F] Dynamic Form Engine stories below for the form mechanics. Submits `POST /api/{slug}/projects` as multipart form data with `status` hard-coded to `"ONGOING"`. Redirects to dashboard on success.
**Known issue:** 🐛 New/edited projects are always force-set to `status=ONGOING` regardless of any project-status-like field the tenant may have configured — worth confirming this is intentional.
**Status:** 🔲

### T5 — Edit an existing project
**Story:** As a tenant admin, I want to edit a project I already created.
**Expected behavior:** Same page as create, via `?editId=`; pre-populates from `GET /api/{slug}/projects/{id}`, normalizing enriched API shapes (amenities/nearby-places) back to raw editable values. `PUT /api/{slug}/projects/{editId}` on submit.
**Status:** 🔲

### T6 — Project detail view
**Story:** As a tenant admin, I want to view a project's full details grouped by section, with an image carousel.
**Expected behavior:** Carousel with prev/next/dots/counter, auto-selects the cover image; fields grouped by section (fixed preferred order, then alphabetical for custom sections); type-specific read renderers for every field type.
**Known issue:** 🐛 LOCATION fields (non-`nearbyPlaces`) render admin-supplied Google Maps iframe HTML via `dangerouslySetInnerHTML` with no sanitization — a stored-XSS-shaped risk if that field is ever attacker-controlled (e.g. a compromised tenant admin account, or a future public-facing edit surface).
**Status:** 🔲

### T7 — Archive / restore a project
**Story:** As a tenant admin, I want to archive a project and later restore it.
**Expected behavior:** Archive button (confirm dialog) → `PATCH {isArchived:true, isActive:false}`, optimistic UI update. Restore button (confirm dialog) → `PATCH {isArchived:false, isActive:true, isDraft:false}`.
**Known issue:** 🐛 Restoring an archived project that was a **draft** force-clears the draft flag — a draft archived project becomes fully live on restore, which may surprise the admin (no way to "restore to draft").
**Status:** 🔲

### T8 — Change password
**Story:** As a tenant admin, I want to change my own password.
**Expected behavior:** Current + new + confirm fields; client checks new===confirm and new length ≥8; `PUT /api/{slug}/auth/change-password`; success/error banners; fields clear on success.
**Known issue:** 🐛 Submit handler redundantly re-fetches `/auth/me` before the actual password-change call, for no apparent functional reason.
**Status:** 🔲

### T9 — View own profile
**Story:** As a tenant admin, I want to see my account info (email, name, member-since date).
**Expected behavior:** Read-only card fed by `GET /api/{slug}/auth/me`; redirects to login on a 401.
**Status:** 🔲

### T10 — Log out (tenant)
**Story:** As a tenant admin, I want to log out of my portal.
**Expected behavior:** Clears `tenantToken`/`tenantEmail`/`tenantSlug`, redirects to `/{slug}/login`.
**Status:** 🔲

---

## [F] Dynamic Form Engine (shared by T4/T5)

### F1 — Multi-step form driven by tenant field schema
**Story:** As a tenant admin, I want the create/edit form to present my configured fields grouped into steps by section.
**Expected behavior:** Sections become steps, ordered by each section's first field's `order`; per-field defaults seeded by type; `StepperBar` shows complete (checkmark)/current/upcoming states, only allows navigating back to completed steps.
**Status:** 🔲

### F2 — Per-step validation with error clearing
**Story:** As a tenant admin, I want to be told which required fields I'm missing before moving to the next step.
**Expected behavior:** `validate()` runs only against the current step's fields on Next; changing a field's value immediately clears its error; file-type fields check the attachments array rather than the value.
**Status:** 🔲

### F3 — Draft save bypasses validation; Publish validates everything
**Story:** As a tenant admin, I want to save incomplete work as a draft, but be blocked from publishing something incomplete.
**Expected behavior:** "Save as Draft" skips all required-field checks entirely. "Publish" validates every field across every section, and on failure jumps the stepper to the first section containing an error.
**Status:** 🔲

### F4 — Field type rendering (all 12 types)
**Story:** As a tenant admin, I want each field type to render an appropriate, working input.
**Expected behavior per type:** TEXT (auto-resize textarea, live maxLength counter that ambers at 90%/reds at 100%, silently truncates overflow), NUMBER/PRICE/AREA (numeric input), SELECT (dropdown), MULTISELECT (icon+label toggle grid), CHECKBOX (styled checkbox using placeholder as label), LOCATION (two distinct UIs: specialized nearbyPlaces widget vs. generic address+iframe), IMAGE/IMAGE_MULTI (uploader with crop-forcing, reordering, cover selection, optional captions), FILE (multi-file picker, no preview), DATERANGE (two date pickers joined into one string), unknown type (falls back to plain text input).
**Status:** 🔲

### F5 — Image upload with forced crop-to-dimensions
**Story:** As a tenant admin, if a field has fixed image dimensions configured, I want my uploads auto-cropped to fit.
**Expected behavior:** Any new upload on a field with both `imageWidth`+`imageHeight` set is routed through the crop modal before being added; crop exports a JPEG at quality 0.85 sized exactly to the target dimensions.
**Known issue:** 🐛 If the crop/export step fails, the error is only `console.error`'d — the user sees the modal simply not close, with no visible error message.
**Status:** 🔲

### F6 — Image reordering, cover selection, and captions
**Story:** As a tenant admin, I want to reorder uploaded images, mark one as the cover, and (if enabled) caption them.
**Expected behavior:** Move-left/right buttons reorder; removing the current cover auto-promotes the next remaining image to cover; caption input only appears if `field.allowCaption` is true, capped at 500 chars.
**Status:** 🔲

---

## [M] Public / Mobile API

### M1 — Public project listing (Access-Token auth)
**Story:** As a mobile app / integration, I want to list a tenant's active projects.
**Expected behavior:** `GET /api/{slug}/projects?filter=active&page=&limit=` with `Access-Token` header; returns paginated, showInList-filtered fields with icon-enriched amenities/nearby-places and resolved cover image.
**Status:** 🔲 (covered by backend smoke test — re-verify post any further changes)

### M2 — Public project detail
**Story:** As a mobile app, I want full detail for one project.
**Expected behavior:** `GET /api/{slug}/projects/:id`, returns all fields (not just showInList) with icon enrichment.
**Status:** 🔲

### M3 — Project stats
**Story:** As an integration, I want aggregate counts and recently-updated project IDs for a tenant.
**Expected behavior:** `GET /api/{slug}/projects/stats` → total/active/drafts/archived + top 10 by `updatedAt`.
**Status:** 🔲

### M4 — Auto-generated Postman collection
**Story:** As a developer integrating with a tenant's API, I want a ready-made Postman collection reflecting their exact field schema.
**Expected behavior:** `GET /api/{slug}/postman.json` generates a collection from the tenant's current fields + access token.
**Status:** 🔲

### M5 — Legacy public mobile API (Access-Token, hardened)
**Story:** As the legacy mobile app, I want to list/click-track the single hard-coded tenant's projects.
**Expected behavior:** `POST /projects/list` and `POST /projects/:id/click`, both gated by `LEGACY_ACCESS_TOKEN` (fixed in the security pass — previously any non-empty header worked, and click had no auth at all).
**Status:** ✅ (already verified in the security-fix regression pass)

---

## [L] Legacy Single-Tenant Area

> Uses a different token (`adminToken`), different backend namespace (`/admin/projects`), different header component, and **has no auth guard at all** (no redirect on missing token anywhere in this tree).

### L1 — Legacy catalog dashboard
**Story:** As the legacy admin, I want to browse/search/filter my project catalog.
**Expected behavior:** Fully working search (name/location substring match), status filter dropdown, All/Active/Drafts/Archived pills, grid/list view toggle — all functional, unlike the tenant dashboard's dead search UI.
**Status:** 🔲

### L2 — Legacy project detail (marketing-style page)
**Story:** As the legacy admin, I want a rich detail page with carousel, specs, amenities, map, and brochure.
**Expected behavior:** Project looked up by **name** (decoded, lowercased, trimmed) rather than ID.
**Known issue:** 🐛 Two projects with the same name (case-insensitive) would collide on this lookup; renaming a project breaks any bookmarked/shared link to it. 🐛 "Enquire Now"/"Refer" buttons render with no `onClick` — decorative only.
**Status:** 🔲

### L3 — Legacy project lifecycle actions
**Story:** As the legacy admin, I want to publish a draft, archive, or restore a project from its detail page.
**Expected behavior:** Make Live (`PATCH isDraft:false`), Restore (`PATCH isArchived:false`), Archive.
**Known issue:** 🐛 "Archive" here is implemented as a hard `DELETE /admin/projects/{id}` call, not a flag toggle — inconsistent with the tenant flow's soft-archive semantics, and worth confirming this doesn't actually hard-delete the row (check backend: it's a soft flag update despite the HTTP verb, per admin_projects.ts `router.delete` handler — confirm still true post-rewrite).
**Status:** 🔲

### L4 — Legacy 3-step "New Listing" wizard
**Story:** As the legacy admin, I want to publish a new listing with fixed banner images, amenities, and a brochure.
**Expected behavior:** Exactly 3 banner slots (forced 1200×675 crop each), community amenities (repeatable rows, native HTML5 DnD reorder), 10 fixed property-amenity chips (draggable to set display order), 10 fixed nearby-place chips + distance/unit, brochure PDF required for publish.
**Known issue:** 🐛 Full validation only runs on "Publish", not "Save as Draft" — first failing rule scrolls to top but does **not** jump to the step containing that field (e.g. a missing Step-3 brochure can surface its error while the user is still on Step 1).
**Status:** 🔲

### L5 — Legacy edit listing (no validation)
**Story:** As the legacy admin, I want to edit an existing listing.
**Expected behavior:** Same 3-step form, pre-populated by numeric ID lookup (inconsistent with the detail page's name-based lookup).
**Known issue:** 🐛 `handleSubmit` on this page has **no validation call at all** — an edit can be submitted with entirely blank required fields, unlike create.
**Status:** 🔲

### L6 — Legacy header/logout
**Story:** As the legacy admin, I want a logout button.
**Expected behavior:** Logout button.
**Known issue:** 🐛 Calls `localStorage.clear()` — wipes **all** localStorage keys (including any tenant/superadmin tokens present), not just `adminToken`; redirects to `/` which bounces into the **superadmin** login flow, not any tenant-specific login.
**Status:** 🔲

---

## [X] Cross-Cutting

### X1 — Two parallel, incompatible project-management systems
**Story:** N/A — architectural observation to confirm intent.
**Question to resolve during testing:** Is the legacy area (`/dashboard`, `/projects/**`, `adminToken`) still in active use, or should it be considered dead/deprecated scope? This affects how seriously to weigh L1–L6 bugs.
**Status:** 🔲 (needs a decision, not a test)

### X2 — Auth token validity never verified client-side
**Story:** As a user with a stale/garbage token, I want to be bounced to login rather than see a broken page.
**Expected/actual behavior:** Both superadmin and tenant layouts only check *presence* of a token, never call the API to verify it — invalid/expired tokens are only caught downstream, inconsistently, when a specific page happens to handle a 401.
**Status:** 🔲

### X3 — Root path redirect
**Story:** As any visitor to `/`, I get redirected somewhere sensible.
**Expected behavior:** Always redirects to `/admin`, regardless of whether the visitor is actually a tenant user — there's no way to reach a tenant's login without already knowing its slug.
**Status:** 🔲

---

## Testing Log

_(Phase 2 entries — timestamped notes, screenshots, and reproduction steps for anything not a clean ✅ go here as testing proceeds.)_
