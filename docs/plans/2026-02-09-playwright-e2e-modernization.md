# Playwright E2E Test Suite Modernization

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modernize the entire Playwright E2E test suite to use accessible, CSS-agnostic locator strategies, eliminating all TailwindCSS class dependencies and aligning with Playwright's official best practices for enterprise-grade testing.

**Architecture:** Replace all CSS class-based selectors with a priority hierarchy of `getByRole` > `getByLabel` > `getByText` > `getByTestId` > semantic HTML locators. Refactor Page Object Models to use this hierarchy. Add `data-testid` attributes to source components only where semantic/role-based selectors are insufficient. Introduce ARIA snapshot testing for structural regression detection.

**Tech Stack:** Playwright 1.49+, TypeScript, Next.js 16, React 19, axe-core for a11y, SCSS (BEM naming)

---

## Current State Analysis

### What Exists
- **10 test files** covering: homepage, about, auth, domains, legal pages, error pages, routing, header, footer, full-site a11y
- **3 Page Object Models**: `BasePage`, `HeaderComponent`, `FooterComponent`
- **3 Fixtures**: base (screenshot), navigation (retry), a11y (axe-core)
- **Test utilities**: tags, assertions, logger, playwright-helpers
- **~120+ test cases** with tagging system (`@smoke`, `@regression`, `@a11y`, etc.)

### Critical Issues Found

**HIGH RISK - Will break after SCSS migration:**
1. `FooterComponent.ts:36` - `description: "footer div[class*='md:col-span-1'] div[class*='mt-4'] .prose"` - Uses TailwindCSS utility classes
2. `FooterComponent.ts:81` - `buildInfo: "footer div.text-slate-300"` - Uses TailwindCSS color class

**MODERATE RISK - Fragile but functional:**
3. `FooterComponent.ts:84` - `commitSha: "footer span:has-text('Commit SHA:') code"` - Depends on exact i18n text
4. `HeaderComponent.ts:45` - `mobileMenuButton: "header button[aria-label*='menu' i]"` - Substring match on aria-label
5. `HeaderComponent.ts:48` - `themeToggle: "header button[aria-label*='theme' i]"` - Substring match on aria-label
6. `FooterComponent.ts:27` - `heroLink: "footer a[title='AROLARIU.RO']"` - Depends on exact title attribute

**ALREADY GOOD - No changes needed:**
- All test spec files use semantic HTML (`main`, `header`, `footer`, `h1`) and role-based selectors
- Routing tests use the `safeNavigate` fixture (URL-based, no DOM selectors)
- A11y tests use axe-core injection (no CSS dependencies)
- `BasePage.ts` is CSS-agnostic (uses Playwright's built-in `Locator` API)

### Locator Strategy Audit Summary

| Strategy | Count | Risk Level |
|----------|-------|------------|
| Semantic HTML (`main`, `header`, `footer`, `nav`) | 30+ | LOW |
| `getByRole()` | 8+ | LOW |
| `href` attribute selectors | 20+ | LOW |
| `aria-label` substring match | 3 | MODERATE |
| `title` attribute exact match | 3 | MODERATE |
| `:has-text()` pseudo-selector | 4 | MODERATE |
| **CSS class selectors (TailwindCSS)** | **4** | **HIGH** |

---

## Implementation Plan

### Task 1: Fix FooterComponent TailwindCSS Selectors (Critical)

**Files:**
- Modify: `sites/arolariu.ro/src/components/Footer.tsx:132-138` (add data-testid)
- Modify: `sites/arolariu.ro/src/components/Footer.tsx:251` (add data-testid)
- Modify: `sites/arolariu.ro/tests/page-objects/FooterComponent.ts:19-85` (update selectors)
- Test: `sites/arolariu.ro/src/components/Footer.spec.tsx`

**Step 1: Add `data-testid` attributes to Footer source component**

In `sites/arolariu.ro/src/components/Footer.tsx`, add test IDs to the two elements that currently rely on TailwindCSS classes:

```tsx
// Line 132-138: Add data-testid to brand description
<div className='footer__brand-description'>
  <RichText
    className='footer__rich-text prose'
    sectionKey='Footer'
    textKey='subtitle'
    data-testid='footer-description'
  />
</div>
```

Note: If `RichText` doesn't pass through `data-testid`, wrap it or add the testid to the parent div instead:

```tsx
<div className='footer__brand-description' data-testid='footer-description'>
  <RichText
    className='footer__rich-text prose'
    sectionKey='Footer'
    textKey='subtitle'
  />
</div>
```

For build info (line 251):

```tsx
<div className='footer__build-info' data-testid='footer-build-info'>
```

**Step 2: Update FooterComponent selectors to remove TailwindCSS dependencies**

In `sites/arolariu.ro/tests/page-objects/FooterComponent.ts`, replace the `FOOTER_SELECTORS` object:

```typescript
const FOOTER_SELECTORS = {
  /** Root footer element */
  root: "footer",

  /** SVG wave decoration */
  svgWave: "footer > svg[preserveAspectRatio='none']",

  /** Hero section with logo and site name */
  heroLink: "footer a[aria-label='Go home']",

  /** Logo image in footer */
  logo: "footer a[aria-label='Go home'] img",

  /** Site name span */
  siteName: "footer a[aria-label='Go home'] span",

  /** Footer description (prose content) - uses data-testid since no semantic role applies */
  description: "[data-testid='footer-description']",

  /** Subdomains section heading */
  subdomainsHeading: "footer p.footer__nav-title:first-of-type",

  /** About section heading */
  aboutHeading: "footer p.footer__nav-title:last-of-type",

  /** All internal links */
  internalLinks: "footer a[href^='/']:not([href*='#'])",

  /** All external links */
  externalLinks: "footer a[target='_blank']",

  /** API subdomain link */
  apiLink: "footer a[href='https://api.arolariu.ro']",

  /** Docs subdomain link */
  docsLink: "footer a[href='https://docs.arolariu.ro']",

  /** About page link */
  aboutLink: "footer a[href='/about']",

  /** Acknowledgements link */
  acknowledgementsLink: "footer a[href='/acknowledgements']",

  /** Terms of service link */
  termsLink: "footer a[href='/terms-of-service']",

  /** Privacy policy link */
  privacyLink: "footer a[href='/privacy-policy']",

  /** Copyright text */
  copyright: "footer .footer__copyright",

  /** GitHub repository link */
  githubRepoLink: "footer a[href='https://github.com/arolariu/arolariu.ro/']",

  /** Author's GitHub profile link */
  authorGithubLink: "footer a[href='https://github.com/arolariu']",

  /** Author's LinkedIn link */
  authorLinkedinLink: "footer a[href='https://linkedin.com/in/olariu-alexandru']",

  /** Build info section - uses data-testid since no semantic role applies */
  buildInfo: "[data-testid='footer-build-info']",

  /** Commit SHA element */
  commitSha: "footer .footer__build-info code",
} as const;
```

**Key changes:**
- `description`: `"footer div[class*='md:col-span-1'] div[class*='mt-4'] .prose"` -> `"[data-testid='footer-description']"`
- `buildInfo`: `"footer div.text-slate-300"` -> `"[data-testid='footer-build-info']"`
- `heroLink`: `"footer a[title='AROLARIU.RO']"` -> `"footer a[aria-label='Go home']"` (leverages existing `aria-label` on the Link)
- `logo`: Updated to match new heroLink base selector
- `siteName`: Updated to match new heroLink base selector
- `aboutLink`: `"footer a[href='/about/']"` -> `"footer a[href='/about']"` (remove trailing slash to match actual component)
- `acknowledgementsLink`, `termsLink`, `privacyLink`: Remove trailing slashes to match actual `href` values in Footer.tsx
- `copyright`: Use BEM class instead of `:has-text()` pseudo-selector
- `commitSha`: Use BEM class path instead of `:has-text()` pseudo-selector

**Step 3: Run footer tests to verify**

Run: `npx playwright test src/components/Footer.spec.tsx --project chromium-desktop-e2e`
Expected: All footer tests pass with updated selectors

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/components/Footer.tsx sites/arolariu.ro/tests/page-objects/FooterComponent.ts
git commit -m "fix(e2e): replace TailwindCSS class selectors in FooterComponent with data-testid and BEM selectors"
```

---

### Task 2: Improve HeaderComponent Selectors

**Files:**
- Modify: `sites/arolariu.ro/tests/page-objects/HeaderComponent.ts:19-49` (update selectors)
- Test: `sites/arolariu.ro/src/components/Header.spec.tsx`

**Step 1: Update HeaderComponent selectors to prefer role-based queries**

In `sites/arolariu.ro/tests/page-objects/HeaderComponent.ts`, update locators to use role-based selectors instead of CSS attribute selectors where possible. Replace the existing getter methods:

```typescript
const HEADER_SELECTORS = {
  /** Root header element */
  root: "header",

  /** Logo image or SVG - scoped to header */
  logo: "header img[alt*='logo'], header svg",

  /** Logo link (home) - use aria-label or href */
  logoLink: "header a[href='/']",

  /** Navigation container */
  nav: "header nav",

  /** All navigation links */
  navLinks: "header nav a",

  /** About page link */
  aboutLink: "header a[href*='about']",

  /** Domains link */
  domainsLink: "header a[href*='domains']",

  /** Auth/Sign-in link */
  authLink: "header a[href*='auth'], header a[href*='sign-in']",

  /** Mobile menu toggle button - simplified */
  mobileMenuButton: "header button[aria-label*='menu' i], header button[aria-label*='navigation' i]",

  /** Theme toggle button - simplified */
  themeToggle: "header button[aria-label*='theme' i], header button[aria-label*='dark' i], header button[aria-label*='light' i]",
} as const;
```

Additionally, update the `shouldHaveNavLinks` method to use web-first assertions:

```typescript
async shouldHaveNavLinks(minCount: number = 1): Promise<this> {
  await expect(this.navLinks.first()).toBeVisible({timeout: TIMEOUTS.element});
  const count = await this.navLinks.count();
  expect(count).toBeGreaterThanOrEqual(minCount);
  return this;
}
```

And remove the `localhost` fallback from `logoLink` since tests should use `baseURL` config:

```typescript
logoLink: "header a[href='/']",
```

**Step 2: Run header tests to verify**

Run: `npx playwright test src/components/Header.spec.tsx --project chromium-desktop-e2e`
Expected: All header tests pass

**Step 3: Commit**

```bash
git add sites/arolariu.ro/tests/page-objects/HeaderComponent.ts
git commit -m "fix(e2e): clean up HeaderComponent selectors, remove localhost fallback"
```

---

### Task 3: Migrate Homepage Test Locators

**Files:**
- Modify: `sites/arolariu.ro/src/app/page.spec.tsx` (audit and update locators)

**Step 1: Audit and update homepage test locators**

Read `sites/arolariu.ro/src/app/page.spec.tsx` and verify all locators use the priority hierarchy. Replace any CSS class-based or structural selectors with role-based equivalents.

Key replacements pattern:
- `page.locator("[data-clerk-component], [href*='auth']")` -> `page.getByRole('link', { name: /sign in|sign up/i })` (with fallback to Clerk selector)
- Ensure all `getByRole` calls include accessible names for precision

**Step 2: Run homepage tests**

Run: `npx playwright test src/app/page.spec.tsx --project chromium-desktop-e2e`
Expected: All homepage tests pass

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/page.spec.tsx
git commit -m "refactor(e2e): migrate homepage test locators to role-based selectors"
```

---

### Task 4: Migrate Auth Page Test Locators

**Files:**
- Modify: `sites/arolariu.ro/src/app/auth/page.spec.tsx` (audit and update locators)

**Step 1: Audit and update auth test locators**

Read `sites/arolariu.ro/src/app/auth/page.spec.tsx`. Replace:
- `page.locator("[data-clerk-component]")` -> Keep as-is (this is a third-party component data attribute, acceptable)
- `page.getByRole("banner")` -> Already good
- Remove any `waitForTimeout` calls and replace with proper web-first assertions

**Step 2: Run auth tests**

Run: `npx playwright test src/app/auth/page.spec.tsx --project chromium-desktop-e2e`
Expected: All auth tests pass

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/auth/page.spec.tsx
git commit -m "refactor(e2e): clean up auth test locators, remove hardcoded waits"
```

---

### Task 5: Migrate About Section Test Locators

**Files:**
- Modify: `sites/arolariu.ro/src/app/about/page.spec.tsx` (audit and update)

**Step 1: Audit about section tests**

Read the file and verify all locators use semantic HTML and role-based queries. These tests already appear mostly clean based on the audit.

**Step 2: Run about tests**

Run: `npx playwright test src/app/about/page.spec.tsx --project chromium-desktop-e2e`
Expected: All about tests pass

**Step 3: Commit (if changes needed)**

```bash
git add sites/arolariu.ro/src/app/about/page.spec.tsx
git commit -m "refactor(e2e): clean up about section test locators"
```

---

### Task 6: Migrate Legal Pages Test Locators

**Files:**
- Modify: `sites/arolariu.ro/src/app/(privacy-and-terms)/legal.spec.tsx` (audit and update)

**Step 1: Audit legal pages tests**

Read the file. Replace any `page.locator("h1, h2, h3, h4, h5, h6")` with `page.getByRole('heading')` which is the Playwright-preferred approach:

```typescript
// Before:
const headings = page.locator("h1, h2, h3, h4, h5, h6");

// After:
const headings = page.getByRole('heading');
```

Also replace `page.locator("footer").getByRole("link", {name: /privacy/i})` pattern -> this is already correct, scoped role query.

**Step 2: Run legal tests**

Run: `npx playwright test src/app/(privacy-and-terms)/legal.spec.tsx --project chromium-desktop-e2e`
Expected: All legal tests pass

**Step 3: Commit**

```bash
git add "sites/arolariu.ro/src/app/(privacy-and-terms)/legal.spec.tsx"
git commit -m "refactor(e2e): migrate legal page tests to use getByRole for headings"
```

---

### Task 7: Migrate Error Page Test Locators

**Files:**
- Modify: `sites/arolariu.ro/src/app/global-error.spec.tsx`
- Modify: `sites/arolariu.ro/src/app/global-not-found.spec.tsx`

**Step 1: Audit error page tests**

Replace:
```typescript
// Before:
page.textContent("body")
page.locator("a[href='/'], a[href*='home']")

// After:
page.locator("body").textContent()
page.getByRole('link', { name: /home/i })
```

**Step 2: Run error page tests**

Run: `npx playwright test src/app/global-error.spec.tsx src/app/global-not-found.spec.tsx --project chromium-desktop-e2e`
Expected: All error page tests pass

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/app/global-error.spec.tsx sites/arolariu.ro/src/app/global-not-found.spec.tsx
git commit -m "refactor(e2e): migrate error page tests to role-based locators"
```

---

### Task 8: Migrate Full-Site Accessibility Test Locators

**Files:**
- Modify: `sites/arolariu.ro/src/accessibility/full-site.spec.tsx`

**Step 1: Audit a11y test locators**

Replace heading tag selectors with role-based equivalents:
```typescript
// Before:
page.locator("h1, h2, h3, h4, h5, h6")

// After:
page.getByRole('heading')
```

All other locators (`main`, `header`, `footer`, `nav`, `:focus`) are semantic HTML and remain valid.

**Step 2: Run a11y tests**

Run: `npx playwright test src/accessibility/full-site.spec.tsx --project chromium-desktop-e2e`
Expected: All a11y tests pass

**Step 3: Commit**

```bash
git add sites/arolariu.ro/src/accessibility/full-site.spec.tsx
git commit -m "refactor(e2e): use getByRole for heading selectors in a11y tests"
```

---

### Task 9: Add ESLint Rule for Floating Promises

**Files:**
- Modify: `sites/arolariu.ro/eslint.config.js` (add rule for test files)

**Step 1: Add `@typescript-eslint/no-floating-promises` as error for test files**

In `sites/arolariu.ro/eslint.config.js`, add or verify this rule exists for test file patterns:

```javascript
{
  files: ["**/*.spec.ts", "**/*.spec.tsx", "tests/**/*.ts"],
  rules: {
    "@typescript-eslint/no-floating-promises": "error",
  },
}
```

This catches the #1 source of flaky Playwright tests: missing `await` on assertions.

**Step 2: Run lint to check for violations**

Run: `npx eslint --ext .ts,.tsx sites/arolariu.ro/src/**/*.spec.tsx sites/arolariu.ro/tests/**/*.ts`
Expected: No floating promise violations (or fix any that appear)

**Step 3: Commit**

```bash
git add sites/arolariu.ro/eslint.config.js
git commit -m "chore(e2e): add no-floating-promises ESLint rule for test files"
```

---

### Task 10: Add ARIA Snapshot Tests for Critical Pages

**Files:**
- Create: `sites/arolariu.ro/src/app/aria-snapshots.spec.tsx`

**Step 1: Write ARIA snapshot tests for structural regression**

Create a new test file that captures ARIA snapshots of critical page landmarks:

```typescript
import {test, expect} from "../tests/fixtures";

test.describe("ARIA Snapshot Tests @regression @a11y", () => {
  test("homepage landmark structure", async ({page, safeNavigate}) => {
    await safeNavigate("/");
    await expect(page.getByRole("banner")).toMatchAriaSnapshot(`
      - banner:
        - navigation
    `);
    await expect(page.locator("main")).toMatchAriaSnapshot(`
      - heading [level=1]
    `);
    await expect(page.getByRole("contentinfo")).toMatchAriaSnapshot(`
      - link "Go home"
    `);
  });

  test("about page landmark structure", async ({page, safeNavigate}) => {
    await safeNavigate("/about");
    await expect(page.locator("main")).toMatchAriaSnapshot(`
      - heading [level=1]
    `);
  });

  test("auth page landmark structure", async ({page, safeNavigate}) => {
    await safeNavigate("/auth");
    await expect(page.locator("main")).toMatchAriaSnapshot(`
      - heading [level=1]
    `);
  });
});
```

Note: The actual ARIA snapshot content will be auto-generated on first run with `--update-snapshots`. The above is a template showing the approach. Run once with `--update-snapshots` to capture baseline, then commit the generated snapshots.

**Step 2: Generate initial snapshots**

Run: `npx playwright test src/app/aria-snapshots.spec.tsx --update-snapshots --project chromium-desktop-e2e`
Expected: Snapshots generated in `__snapshots__/` directory

**Step 3: Run to verify they match**

Run: `npx playwright test src/app/aria-snapshots.spec.tsx --project chromium-desktop-e2e`
Expected: All snapshot tests pass

**Step 4: Commit**

```bash
git add sites/arolariu.ro/src/app/aria-snapshots.spec.tsx sites/arolariu.ro/src/app/__snapshots__/
git commit -m "feat(e2e): add ARIA snapshot tests for critical page landmarks"
```

---

### Task 11: Update Custom Assertions to Use Role-Based Patterns

**Files:**
- Modify: `sites/arolariu.ro/tests/utils/assertions.ts`

**Step 1: Review and update assertion helpers**

Read `sites/arolariu.ro/tests/utils/assertions.ts` and ensure:
- `assertInternalLink` and `assertExternalLink` use `page.getByRole('link')` where possible instead of CSS selectors
- `assertFieldError` uses `page.getByRole` pattern rather than locator strings
- Add a new helper for role-based link assertion:

```typescript
/**
 * Assert a link is visible using role-based query.
 */
export async function assertLinkByRole(
  page: Page,
  name: string | RegExp,
  expectedHref: string,
  options?: { external?: boolean }
): Promise<void> {
  const link = page.getByRole('link', { name });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', expectedHref);
  if (options?.external) {
    await expect(link).toHaveAttribute('target', '_blank');
  }
}
```

**Step 2: Run all tests to verify no regressions**

Run: `npx playwright test --project chromium-desktop-e2e`
Expected: All tests pass

**Step 3: Commit**

```bash
git add sites/arolariu.ro/tests/utils/assertions.ts
git commit -m "refactor(e2e): add role-based assertion helpers, update existing assertions"
```

---

### Task 12: Run Full Suite and Verify Zero Regressions

**Files:**
- No changes - validation only

**Step 1: Run full test suite across all environments**

Run: `npx playwright test --project chromium-desktop-e2e`
Expected: All tests pass. Note any flaky tests.

**Step 2: Run with retries to check for flakiness**

Run: `npx playwright test --project chromium-desktop-e2e --retries 3`
Expected: No tests marked as "flaky" (pass on retry after initial failure)

**Step 3: Generate HTML report for review**

Run: `npx playwright show-report`
Review the report for any warnings, slow tests, or unexpected behavior.

---

## Locator Migration Reference

### Priority Hierarchy (enforce via code review)

| Priority | Method | When to Use | Example |
|----------|--------|-------------|---------|
| 1 | `getByRole()` | Buttons, links, headings, navigation, forms | `page.getByRole('button', { name: 'Submit' })` |
| 2 | `getByLabel()` | Form inputs with labels | `page.getByLabel('Email')` |
| 3 | `getByText()` | Non-interactive text content | `page.getByText('Welcome')` |
| 4 | `getByPlaceholder()` | Inputs without labels | `page.getByPlaceholder('Search...')` |
| 5 | `getByAltText()` | Images | `page.getByAltText('Logo')` |
| 6 | `getByTitle()` | Elements with title attr | `page.getByTitle('Close')` |
| 7 | `getByTestId()` | Last resort for non-semantic elements | `page.getByTestId('footer-description')` |
| 8 | Semantic HTML | Landmark elements | `page.locator('main')`, `page.locator('footer')` |
| BANNED | CSS class selectors | NEVER | ~~`page.locator('.bg-blue-500')`~~ |
| BANNED | XPath | NEVER | ~~`page.locator('//div[@class="header"]')`~~ |

### Common Migrations

```typescript
// Heading tags -> getByRole
page.locator("h1, h2, h3, h4, h5, h6")  ->  page.getByRole('heading')
page.locator("h1")                        ->  page.getByRole('heading', { level: 1 })

// Links by href -> getByRole with name
page.locator("a[href='/about']")          ->  page.getByRole('link', { name: /about/i })

// Buttons -> getByRole
page.locator("button.submit-btn")         ->  page.getByRole('button', { name: /submit/i })

// Nav sections -> getByRole
page.locator("nav")                       ->  page.getByRole('navigation')

// Header -> getByRole
page.locator("header")                    ->  page.getByRole('banner')

// Footer -> getByRole
page.locator("footer")                    ->  page.getByRole('contentinfo')

// CSS class -> data-testid
page.locator(".my-component")             ->  page.getByTestId('my-component')
```

---

## Best Practices Checklist (Apply to All Tasks)

### Selector Rules
- [ ] No CSS class selectors in any test file or page object
- [ ] No XPath selectors
- [ ] No TailwindCSS utility class references
- [ ] All `getByRole` calls include accessible name parameter
- [ ] `getByTestId` used only when no semantic alternative exists (max 2-3 per page)

### Test Design Rules
- [ ] Each test covers one concern
- [ ] No `waitForTimeout()` calls (use web-first assertions instead)
- [ ] All async operations properly awaited (enforced by ESLint rule)
- [ ] Third-party dependencies mocked via `page.route()`
- [ ] Tests run in isolation (no shared state between tests)

### Performance Rules
- [ ] Auth state reused via `storageState` (existing global-setup.ts)
- [ ] `fullyParallel: true` enabled (already set in config)
- [ ] Heavy tests tagged `@slow` for selective CI execution
- [ ] No unnecessary full-page screenshots in test logic

### Maintenance Rules
- [ ] All selectors centralized in Page Object Model `SELECTORS` objects
- [ ] New components get POM classes before test writing
- [ ] Locator changes require only POM updates (never test file changes)
- [ ] ARIA snapshots updated when page structure intentionally changes

---

## Files Changed Summary

| File | Action | Risk |
|------|--------|------|
| `sites/arolariu.ro/src/components/Footer.tsx` | Add 2 `data-testid` attributes | LOW |
| `sites/arolariu.ro/tests/page-objects/FooterComponent.ts` | Replace 6 selectors | MEDIUM |
| `sites/arolariu.ro/tests/page-objects/HeaderComponent.ts` | Clean up 2 selectors | LOW |
| `sites/arolariu.ro/src/app/page.spec.tsx` | Audit locators | LOW |
| `sites/arolariu.ro/src/app/auth/page.spec.tsx` | Remove hardcoded waits | LOW |
| `sites/arolariu.ro/src/app/about/page.spec.tsx` | Audit locators | LOW |
| `sites/arolariu.ro/src/app/(privacy-and-terms)/legal.spec.tsx` | Replace heading selectors | LOW |
| `sites/arolariu.ro/src/app/global-error.spec.tsx` | Replace link selector | LOW |
| `sites/arolariu.ro/src/app/global-not-found.spec.tsx` | Audit locators | LOW |
| `sites/arolariu.ro/src/accessibility/full-site.spec.tsx` | Replace heading selectors | LOW |
| `sites/arolariu.ro/tests/utils/assertions.ts` | Add role-based helpers | LOW |
| `sites/arolariu.ro/eslint.config.js` | Add floating promises rule | LOW |
| `sites/arolariu.ro/src/app/aria-snapshots.spec.tsx` | NEW - ARIA snapshot tests | LOW |

**Total changes:** 13 files (12 modified, 1 created)
**Estimated commits:** 10-12 atomic commits
