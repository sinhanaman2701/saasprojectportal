# Feature Stories & Test Status

Canonical tracking document for every user-facing feature in the SaaS Portal Platform. One entry per coherent user flow. Live-tested end-to-end (real Postgres, real backend, real Next.js frontend, Playwright-driven Chromium) rather than just read from code.

**Status legend:**
- ✅ Pass — verified working end-to-end
- ✅🔧 Pass — was broken, now fixed and re-verified
- ⚠️ Partial — works but with a real UX/logistical issue (documented, not yet fixed — see Known issue)
- 🔲 Not independently live-tested this pass (assessed via code read only)

**Areas:** [A] Superadmin · [T] Tenant Admin · [F] Dynamic Form Engine (shared) · [M] Public/Mobile API · [L] Legacy single-tenant area · [X] Cross-cutting

---

## [A] Superadmin Area

### A1 — Superadmin login — ✅
Login with `bootstrap_admin@test.com` succeeded, token stored, redirected to `/admin`. Dev-convenience defaults (`admin@example.com`/`password123`) confirmed pre-filled — harmless in a dev build, but worth removing before a real production deploy.

### A2 — First-run superadmin registration — ✅
Confirmed 403-locked after the first superadmin exists; error banner rendered correctly.
**Known issue (unfixed):** Register reuses the same email/password fields as Login — easy to misclick.

### A3 — Superadmin auth guard — ✅
Unauthenticated `/admin` correctly redirects to `/admin/login`.
**Known issue (unfixed):** No loading gate (brief flash possible); presence-only check, no validity check.

### A4 — Tenant list dashboard — ✅
Loads and lists tenants with status pills, project counts, dates.

### A5 — Delete a tenant portal — ✅
Deleted a test tenant via the confirm dialog; row count dropped from 2→1 with no refetch needed.

### A6 — Create a new tenant portal (5-step wizard) — ✅
Full end-to-end run (twice) through all 5 steps — name/slug entry, auto-slug derivation, default 15-field/3-section schema rendering correctly, admin creation, review, and final "Portal Created Successfully!" with working Quick Actions and 3s auto-redirect.
**Known issues (unfixed):** Field-schema persist failure is console-only, never surfaced; admin-creation failure downgrades to warning instead of blocking.

### A7 — Manage portal: Fields tab — ✅ (core), ⚠️ (edge cases)
Page loads, shows tenant name and field list correctly.
**Known issues (unfixed):** Asymmetric error handling between edit (awaited + rollback) vs. add/reorder (fire-and-forget). Removed the dead "Changes Saved" button (see Fixes below) rather than half-wire a pending-changes indicator — flagging that the underlying asymmetric-error-handling gap is still there for a future pass.

### A8 — Manage portal: Branding tab — ✅
Name field save-button flow and 2s success banner confirmed. Logo URL auto-save-on-keystroke behavior confirmed present (documented inconsistency, low severity, left as-is).

### A9 — Manage portal: API Config tab — ✅🔧
Access token display, Regenerate, and Copy all confirmed. **Bug found & fixed:** `copyToken()` called `navigator.clipboard.writeText()` without a try/catch — a denied/failed clipboard write became an unhandled promise rejection in the console with zero user feedback. Now wrapped in try/catch with a logged failure instead of a crash-shaped rejection.

### A10 — Manage portal: Admins tab — ✅
Added a new tenant admin through the modal; appeared in the list immediately.
**Known issue (unfixed):** Password field shows a "Min. 8 characters" hint with no actual client-side enforcement (backend still enforces it server-side).

### A11 — Portal analytics dashboard — ❌→✅🔧 **Real bug, fixed**
**Was completely broken**: the stats fetch (`GET /api/{slug}/projects/stats`) sent zero auth headers, and the backend's `tenantApiAuth` middleware correctly rejected it with `401 Access-Token header required` — every superadmin visiting any tenant's analytics page saw only a red error banner, never any data. Root cause: the page already fetches the tenant record (which includes `accessToken`) for the tenant-name display, but never forwarded that token to the stats call. **Fixed** by attaching `Access-Token: <tenant's accessToken>` to the stats request. Re-verified: stat cards now render real numbers with zero 401s.

---

## [T] Tenant Admin Area

### T1 — Tenant admin login — ✅🔧
Login flow works (branded, submits, stores token, redirects). **Also fixed:** removed verbose `console.log`s that included the raw plaintext password on every login attempt, plus a second, pointless fetch that sent `Authorization: Bearer invalid` for no reason.

### T2 — Tenant auth guard — ✅
Unauthenticated visits to `/{slug}` correctly redirect to `/{slug}/login` with a loading spinner shown first (no flash of protected content).
**Known issue (unfixed):** substring path match (`pathname.includes("/login")`), no token-validity check.

### T3 — Tenant project dashboard (list + filters) — ✅🔧 **Real bug, fixed**
Dashboard renders, filter tabs work. **Confirmed and fixed:** the search input and grid/list view toggle were fully wired in component state/filter logic but had **zero rendered UI** — a literal empty `<div className="flex-1 max-w-xs" />` placeholder sat where the search box should have been. Added the missing search `<input>` (wired to the existing `search` state) and the missing Grid/List toggle buttons (wired to the existing `view` state). Re-verified both now render and function.

### T4 — Create a new project (dynamic form) — ✅
Full multi-step flow tested end-to-end: filled Property Information (including a real JPEG upload to Banner Images), Project Details (including selects), Location & Attachments (including a required Brochure upload), then Publish — project appeared correctly on the dashboard and in the DB (`isDraft: false`, `isActive: true`).
**Known issue (unfixed):** `status` is hard-coded to `"ONGOING"` on every create/edit, regardless of any project-status field.

### T5 — Edit an existing project — 🔲
Not independently live-tested this pass (shares 100% of the code path with T4's dynamic form engine, which was tested); no separate risk identified.

### T6 — Project detail view — ✅
Verified rendering of a real created project — carousel, cover-image ring, field sections, all values displayed correctly.
**Known issue (unfixed, flagged not fixed):** `dangerouslySetInnerHTML` for admin-supplied Google Maps iframe embeds on LOCATION fields — a stored-XSS-shaped pattern. Not fixed this pass since a proper fix (HTML sanitization) is a dependency/design decision beyond a contained bug fix; flagging for a deliberate follow-up.

### T7 — Archive / restore a project — ❌→✅🔧 **Real bug, fixed (was a regression from the earlier Prisma-removal rewrite)**
**Was completely broken**: clicking "Archive Project" showed the confirm dialog correctly, then the PATCH request failed with a raw `alert("Internal server error")` — the project never actually archived. Root cause: the raw-SQL `PATCH` handler built its `UPDATE ... SET` clause by appending a new `"col" = $N` fragment on every `set()` call without deduplicating by column name; when the frontend sends `{isArchived: true, isActive: false}` together, `isActive` got assigned twice in one `UPDATE`, which Postgres rejects outright ("multiple assignments to same column"). The exact same bug pattern existed in 2 more places (`tenant_projects.ts` PUT, `admin_projects.ts` legacy PATCH) that hadn't been exercised by the smoke test yet. **Fixed** by adding a `buildSetClause()` helper that accumulates into a plain object first (so a later assignment naturally overwrites, matching the original Prisma-era semantics) and refactoring all 3 call sites to use it. Re-verified: archive → shows "Archived" badge + "Restore to Active" button; restore → badge clears, DB confirms `isArchived: false, isActive: true`.

### T8 — Change password — ✅
Full flow tested (old→new, success banner, fields cleared).
**Known issue (unfixed):** redundant `/auth/me` re-fetch before the actual password-change call.

### T9 — View own profile — ✅
Profile card correctly shows the logged-in tenant admin's email.

### T10 — Log out (tenant) — ✅
Confirmed `tenantToken` cleared and redirect to login.

---

## [F] Dynamic Form Engine (shared by T4/T5)

### F1 — Multi-step form driven by tenant field schema — ✅
Steps correctly derived from sections (Property Information → Project Details → Location & Attachments), `StepperBar` reflected progress correctly.

### F2 — Per-step validation with error clearing — ✅
Confirmed: attempting to advance Step 1 without a required Banner Image showed a clear inline "Banner Images is required" error and blocked advancement; uploading an image cleared it and allowed progression.

### F3 — Draft save bypasses validation; Publish validates everything — 🔲
Not independently isolated this pass (Publish path was exercised in T4 with all fields correctly filled, so the "everything validated" path wasn't forced to fail); no reason to suspect regression.

### F4 — Field type rendering (all 12 types) — ✅ (spot-checked)
TEXT, NUMBER/PRICE/AREA (native `<input type=number>`, confirmed it rejects non-numeric text like "1200 sqft" — expected HTML5 behavior, not a bug), SELECT, IMAGE_MULTI, FILE all exercised directly during T4. LOCATION's `nearbyPlaces` widget and generic address+iframe variant, MULTISELECT, CHECKBOX, DATERANGE were verified via code read only this pass.
**Accessibility gap noted (unfixed):** field labels are plain `<label>` text with no `htmlFor`/`id` association to their input — not a functional bug, but a real accessibility/testability gap (screen readers and `getByLabel`-style tooling can't associate them).

### F5 — Image upload with forced crop-to-dimensions — ✅ (partial coverage)
Confirmed uploading clears the required-field error and populates `attachments` correctly with `isCover: true`. The specific tenant/field tested didn't have fixed `imageWidth`/`imageHeight` configured, so the forced-crop-modal path itself wasn't exercised live this pass (verified via code read).

### F6 — Image reordering, cover selection, and captions — 🔲
Not independently live-tested this pass; single-image upload path confirmed, multi-image reorder/cover-swap logic assessed via code read only.

---

## [M] Public / Mobile API

### M1–M4 — Tenant-scoped public API (list, detail, stats, postman) — ✅
Covered by the backend functional smoke test during the security-fix and Prisma-removal phases (32/32 passing), and stats specifically re-verified again in this pass via the Analytics-tab fix.

### M5 — Legacy public mobile API (Access-Token, hardened) — ✅
Verified in the earlier security-fix pass: bogus token → 401, valid token → 200, click endpoint now requires the token too.

---

## [L] Legacy Single-Tenant Area

> No dedicated login page exists anywhere in the frontend for this area — see X4 below, a significant finding from this pass.

### L1 — Legacy catalog dashboard — ✅
Confirmed reachable with **zero auth guard** (no redirect even with `localStorage` fully cleared — matches code review). After manually injecting a real `adminToken` (obtained via direct API login, since no UI exists to do this), the dashboard rendered the seeded "Canvas" project correctly, and the search input actually filtered results (unlike the tenant dashboard's formerly-dead search, this one was always fully wired).

### L2 — Legacy project detail (marketing-style page) — ✅ (happy path)
`/dashboard/Canvas` correctly resolved and rendered the project by name.
**Known issue (unfixed):** name-based lookup collision risk for same-name projects; decorative non-functional "Enquire Now"/"Refer" buttons.

### L3 — Legacy project lifecycle actions — 🔲
Not independently live-tested this pass. Re-confirmed via code read post-rewrite: the "Archive" action, despite calling `DELETE /admin/projects/{id}`, is implemented backend-side as a soft `UPDATE ... SET isArchived = true` — **not** an actual row deletion. This is confusing REST-verb naming but not destructive.

### L4 — Legacy 3-step "New Listing" wizard — 🔲
Not independently live-tested this pass (Playwright coverage of this area was scoped down given the higher-value finding that the area has no reachable login in the first place — see X4). Known validation-doesn't-jump-to-step issue remains documented, unfixed.

### L5 — Legacy edit listing (no validation) — 🔲
Same as L4 — documented, unfixed, deprioritized pending a decision on X4/X1.

### L6 — Legacy header/logout — ✅🔧
**Bug found & fixed:** logout called `localStorage.clear()`, wiping *all* stored keys (including `superadminToken`/`tenantToken` if present in the same browser) rather than just its own `adminToken`. Changed to `localStorage.removeItem('adminToken')`.

---

## [X] Cross-Cutting

### X1 — Two parallel, incompatible project-management systems — **Resolved to a stronger finding: see X4**
The legacy area isn't just parallel — it's provably unreachable through the app's own UI (no login entry point exists). Recommend a deliberate decision: either build the missing legacy login page if this system is meant to stay, or remove the ~2,000 lines of legacy route/page code if it's dead. Left as-is pending that product decision; not something a bug-fix pass should decide unilaterally.

### X2 — Auth token validity never verified client-side — confirmed, unfixed
Both guards check presence only. Architectural change, out of scope for a logistical/UX bug-fix pass; flagged for a deliberate follow-up.

### X3 — Root path redirect — ✅ (behaves as documented)
Confirmed `/` always redirects to `/admin`. Not a bug — no tenant-facing landing page exists by design, tenants must know their own slug.

### X4 — Legacy area has no reachable login (new finding this pass)
`grep` across the entire frontend for any `localStorage.setItem('adminToken', ...)` call returns **zero matches** — only 4 pages *read* `adminToken`, nothing ever *writes* it via any UI form. The only way into `/dashboard`, `/dashboard/[name]`, `/projects/new`, `/projects/edit/[id]` is to call `POST /admin/auth/login` directly (curl/Postman) and hand-inject the token into `localStorage`. Combined with X1, this strongly suggests the legacy single-tenant flow is orphaned/leftover from before the multi-tenant system existed. **Not fixed** — building a new login page for a system that might be intended for removal would be a product decision, not a bug fix. Flagging prominently for a decision.

---

## Session Summary

**Tested live** (real Postgres + backend + Next.js dev server + Playwright/Chromium): 24 of 40 stories directly exercised through the browser; remaining 16 assessed via code read with no live-tested regression risk identified (mostly F-series edge cases and the legacy wizard steps, deprioritized after the X4 finding).

**Real bugs found and fixed this pass** (beyond the code-review-only 🐛 items already known before testing started):
1. **Archive/restore completely broken** (T7) — Postgres "multiple assignments to same column" from a duplicate-SET-clause bug introduced during the earlier Prisma-removal rewrite. Same bug pattern fixed in 3 locations.
2. **Analytics dashboard completely broken** (A11) — stats fetch sent no auth header at all.
3. **Tenant branding silently broken on 5 pages** (T1, T3, T5/T6 shared header, T8, T9) — every tenant-facing page called a superadmin-only endpoint for its own logo/name, always got 401, always silently fell back to showing the raw slug instead of the real tenant name. Added a proper public `GET /api/:slug/info` endpoint and repointed all 5 call sites.
4. **Dashboard search/view-toggle dead UI** (T3) — logic existed, no way to trigger it. Added the missing controls.
5. **Clipboard copy unhandled rejection** (A9) — now caught.
6. **Legacy logout wiped all localStorage, not just its own token** (L6) — now scoped correctly.
7. Removed verbose console logging of the raw tenant-admin password on every login attempt (T1).
8. Removed dead/unreachable "Changes Saved" button (A7) whose underlying state was never actually toggled.

**Confirmed-safe rate-limiter false alarms during testing:** repeated `/admin/auth/login` and `/api/:slug/auth/login` calls across many test runs correctly triggered 429s within the same 15-minute window — this is the security-pass rate-limiter working as designed, not a bug (resolved by restarting the backend between heavy test runs, exactly as a real 15-minute cooldown would).

**Deliberately left unfixed, with reasoning:**
- Everything requiring a product/design decision rather than a mechanical fix (X1/X4 legacy area fate, restore-clears-draft-flag semantics, hard-coded `status=ONGOING`).
- Everything requiring a new dependency or larger refactor (iframe HTML sanitization, full token-validity verification, asymmetric optimistic-update error handling across Fields tab).
- Low-severity cosmetic/consistency nits documented but not touched (branding tab's inconsistent save-on-keystroke vs. explicit-save UX, admin password hint without enforcement, register/login button proximity, dev-convenience default credentials).
