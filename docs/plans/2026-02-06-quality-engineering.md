# Principal Engineering Quality Plan: sites/arolariu.ro

## Audit Summary

**Codebase Health Score: 73/100** — A mature, production-ready Next.js 16 application with excellent foundations (TypeScript strict mode, Server Components, Island Architecture, OpenTelemetry) but with actionable gaps in security hardening, performance optimization, error handling completeness, and test coverage for authenticated flows.

---

## Phase 1: Security Hardening (Critical)

### 1.1 Tighten Content Security Policy
**File:** `sites/arolariu.ro/next.config.ts` (lines 16-26)
- Remove `'unsafe-inline'` and `'unsafe-eval'` from `script-src`
- Replace `https:` wildcard with explicit trusted domains only
- Use nonce-based CSP (Next.js 16 supports `nonce` in `<Script>` components)
- Consider `'strict-dynamic'` for modern CSP approach
- Add missing headers: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`

### 1.2 Add Server Action Input Validation with Zod
**Files:** All files in `sites/arolariu.ro/src/lib/actions/`
- Install `zod` as a dependency
- Create validation schemas in `src/types/schemas/` for every Server Action input
- Add `schema.parse(input)` as the first line of every mutating Server Action
- Priority actions (handle user input directly):
  - `createInvoice.ts` — validate payload structure, file types, sizes
  - `uploadBlob.ts` — validate file type, size limits, container names
  - `patchInvoice.ts` / `updateInvoice.ts` — validate partial update payloads
  - `uploadScan.ts` — validate scan data, file constraints
  - `cookies.action.ts` — validate cookie names/values

### 1.3 Fix Cookie Security Flags
**File:** `sites/arolariu.ro/src/lib/actions/cookies/cookies.action.ts` (line 48-51)
- Add `secure: true` (HTTPS only)
- Add `httpOnly: true` where appropriate (non-JS-accessible cookies)
- Add `sameSite: "lax"` (CSRF protection while allowing navigation)
- Add explicit `maxAge` to prevent indefinite cookies

### 1.4 Fix JWT Payload Typing
**Files:** `src/lib/utils.server.ts` (lines 110, 261), `src/types/index.ts`
- Replace `Record<string, any>` with a proper `JwtPayload` interface
- Define typed fields: `iss`, `aud`, `sub`, `exp`, `iat`, `nbf`, `role`, `userIdentifier`
- Remove the `as Record<string, any>` type assertion

### 1.5 Add Environment Variable Validation
**File:** `src/lib/utils.server.ts` (lines 14-17)
- Replace empty string fallbacks with runtime validation
- Throw clear errors on missing critical env vars (`API_URL`, `API_JWT`, `CONFIG_STORE`)
- Consider using Zod for env validation (or the built-in `typedEnv` experimental feature)

### 1.6 Sanitize Error Messages
**Files:** `src/lib/actions/user/fetchUser.ts`, `src/lib/actions/storage/uploadBlob.ts`, and others
- Never re-throw raw errors to clients
- Create a `sanitizeError()` utility that strips stack traces and internal paths
- Return user-friendly error codes and messages only

---

## Phase 2: Performance Optimization (High Priority)

### 2.1 Enable Next.js 16 Experimental Features
**File:** `sites/arolariu.ro/next.config.ts` (lines 142-170)
- Enable `ppr: true` (Partial Prerendering) — Next.js 16 flagship feature for instant static shells with streaming dynamic content
- Enable `reactCompiler: true` — automatic memoization, eliminates manual `useMemo`/`useCallback`
- Add more packages to `optimizePackageImports`: `react-icons`, `recharts`, `motion`, `@clerk/nextjs`, `three`, `@react-pdf/renderer`
- Add `serverExternalPackages` for `@azure/*` and `@opentelemetry/*` packages (should not be bundled into server code)

### 2.2 Fix Memory Leaks in Hooks
**Files:** `src/hooks/useInvoices.tsx`, `src/hooks/useInvoice.tsx`, `src/hooks/useMerchants.tsx`, `src/hooks/useMerchant.tsx`
- Add `AbortController` pattern (already correctly implemented in `useUserInformation.tsx` — use as template)
- Add cleanup functions to all `useEffect` hooks that perform async operations
- Prevent state updates on unmounted components

### 2.3 Throttle Scroll Event Handler
**File:** `src/hooks/useScrollToTop.tsx` (lines 95-106)
- Add throttling (100ms interval) to the scroll event listener
- Add `{ passive: true }` to `addEventListener` for scroll performance
- Implement inline throttle (avoid adding lodash dependency just for this)

### 2.4 Optimize Search/Filter Performance
**File:** `src/hooks/usePagination.tsx` (lines 162-167)
- Replace `JSON.stringify(item)` in filter loop with targeted field search
- Search only relevant string fields instead of serializing entire objects
- Consider `useMemo` for filtered results (or rely on React Compiler after 2.1)

### 2.5 Implement Parallel Data Fetching
**Files:** Pages that fetch multiple resources sequentially
- Use `Promise.all()` / `Promise.allSettled()` when fetching user + invoices, user + merchants, etc.
- Example in `src/app/domains/invoices/view-invoices/page.tsx`: fetch user and invoices in parallel

### 2.6 Add Route Segment Caching Configuration
**Files:** Static/semi-static pages
- Add `export const revalidate = 3600` to content pages (about, privacy, terms)
- Add `export const dynamic = "force-dynamic"` to user-specific pages
- Configure appropriate `fetchCache` settings in Server Actions

---

## Phase 3: Architecture & Robustness (Medium-High Priority)

### 3.1 Add Route-Level Error Boundaries
**Create new files:**
- `src/app/domains/invoices/error.tsx` — invoice-specific error UI with retry and navigation
- `src/app/auth/error.tsx` — auth-specific error UI with sign-in prompt
- `src/app/about/error.tsx` — content error UI with cached fallback suggestion
- `src/app/my-profile/error.tsx` — profile error UI with re-auth prompt

Each should be a `"use client"` component that receives `error` and `reset` props, provides contextual recovery actions, and logs to telemetry.

### 3.2 Add Missing Loading States
**Create new files:**
- `src/app/auth/sign-in/[[...sign-in]]/loading.tsx`
- `src/app/auth/sign-up/[[...sign-up]]/loading.tsx`
- `src/app/domains/invoices/view-invoices/loading.tsx`
- `src/app/domains/invoices/edit-invoice/[id]/loading.tsx`
- `src/app/domains/invoices/view-invoice/[id]/loading.tsx`

Skeleton UIs should match actual page layouts to prevent CLS (Cumulative Layout Shift).

### 3.3 Add Route-Level Not-Found Pages
**Create new files:**
- `src/app/domains/invoices/not-found.tsx` — "Invoice not found" with link to invoice list
- `src/app/domains/invoices/view-invoice/[id]/not-found.tsx` — specific invoice not found

Add `notFound()` calls in dynamic route pages when resource fetch returns null.

### 3.4 Fix Provider Composition Order
**File:** `src/app/providers.tsx` (lines 132-154)
- Reorder to: AuthProvider (outermost) → FontProvider → ThemeProvider → GradientThemeProvider → TranslationProvider (innermost)
- The current code has TranslationProvider outermost despite comments saying AuthProvider should be
- Add an ErrorBoundary wrapping all providers to prevent full-app crashes

### 3.5 Fix Semantic HTML Issues
**Files:** Multiple island.tsx files across routes
- Ensure only ONE `<main>` element per page (in layout.tsx)
- Replace additional `<main>` tags in islands with `<div>` or `<section>`
- Add proper `aria-label` attributes to `<section>` elements
- Verify heading hierarchy (h1 → h2 → h3, no skipped levels)

### 3.6 Remove @ts-ignore Comments
**Files:** `src/app/layout.tsx` (lines 12, 15, 18), `src/app/global-error.tsx`, `src/app/global-not-found.tsx`
- Create `src/globals.d.ts` with module declarations for `.css`, `.scss`, `.module.scss`
- Remove all `@ts-ignore` comments for CSS/SCSS imports

### 3.7 Add Dynamic Route Parameter Validation
**Files:** `src/app/domains/invoices/view-invoice/[id]/page.tsx`, `src/app/domains/invoices/edit-invoice/[id]/page.tsx`
- Validate `id` parameter format (UUID validation)
- Call `notFound()` when the fetched resource is null
- Return proper error states for malformed IDs

---

## Phase 4: Test Coverage Expansion (Medium Priority)

### 4.1 Add Missing Component Tests
**Create new files:**
- `src/components/Commander.test.tsx` — test keyboard shortcuts, search, navigation commands
- `src/components/Buttons/AuthButton.test.tsx` — test auth state rendering, click handling
- `src/components/Buttons/ThemeButton.test.tsx` — test theme toggling, persistence

### 4.2 Add Missing Context Tests
**Create new files:**
- Tests for `src/app/domains/invoices/view-invoice/[id]/_context/` (InvoiceContext)
- Tests for `src/app/domains/invoices/edit-invoice/[id]/` context (EditInvoiceContext)
- Tests for `src/app/domains/invoices/upload-scans/_context/` (ScanUploadContext)

### 4.3 Add Missing Utility Tests
**Create new files:**
- Tests for `src/app/domains/invoices/view-invoices/_utils/export.ts`
- Tests for `src/app/domains/invoices/view-invoice/[id]/_utils/timeline.tsx`
- Tests for `src/app/domains/invoices/view-invoice/[id]/_utils/analytics.ts`

### 4.4 Add E2E Tests for Invoice Domain
**Create in `tests/` directory:**
- Invoice list view E2E (sorting, filtering, pagination)
- Invoice detail view E2E (tabs, charts, insights)
- Invoice create flow E2E (scan upload → invoice creation)
- Invoice edit flow E2E (field modifications, save)
- Invoice delete flow E2E (confirmation, soft delete)

### 4.5 Add E2E Tests for Authenticated Flows
**Create in `tests/` directory:**
- User profile management E2E
- Theme switching persistence E2E
- Command palette interactions E2E
- Scan management flows E2E

---

## Phase 5: Code Quality & Maintainability (Medium Priority)

### 5.1 Resolve ESLint Suppressions
- Audit all 60+ `eslint-disable` comments — fix underlying issues or document legitimate exceptions
- Priority: Remove full-file ESLint disablement from:
  - `src/app/domains/invoices/edit-invoice/[id]/_components/dialogs/MerchantReceiptsDialog.tsx`
  - `src/app/domains/invoices/edit-invoice/[id]/_components/dialogs/RecipeDialog.tsx`
- Fix `react/jsx-no-bind` violations (30+ instances) — extract handler functions or rely on React Compiler

### 5.2 Fix Hardcoded Colors in CSS
**File:** `src/app/globals.css` (lines 118-138)
- Replace hardcoded hex values (`#1e90ff`) and rgba values with CSS custom properties
- Ensure all custom classes reference theme variables for dark mode compatibility

### 5.3 Fix DaisyUI Dependency Classification
**File:** `package.json`
- Move `daisyui` from `devDependencies` to `dependencies` (it's used in production CSS via `globals.css`)

### 5.4 Relocate ScrollToTop Component
- Move `src/hooks/useScrollToTop.tsx` → `src/components/ScrollToTop.tsx`
- The file contains a React component (`ScrollToTop`), not a hook
- Update barrel exports in `src/hooks/index.ts` and `src/components/`

### 5.5 Split Large Island Components
- Identify islands over 400 lines and split into sub-components
- Priority targets: invoice domain islands with complex state management
- Extract reusable sections into `_components/` directories

---

## Phase 6: SEO & Metadata Completeness (Lower Priority)

### 6.1 Add Missing OG/Twitter Images
- Create `public/images/og-default.png` (1200x630) — referenced in `src/metadata.ts` line 264
- Create `public/images/twitter-card.png` (1200x628) — referenced in `src/metadata.ts` line 278

### 6.2 Add Language Alternates
**File:** `src/metadata.ts`
- Add `alternates.languages` for `en`, `ro`, `fr` locale URLs
- Enables proper hreflang tags for multilingual SEO

### 6.3 Add Search Engine Verification
**File:** `src/metadata.ts`
- Add `verification.google` — Google Search Console token
- Add `verification.yandex` — if targeting Eastern European traffic
- Add Bing Webmaster verification via meta tag

### 6.4 Verify manifest.json
- Confirm `public/manifest.json` exists and is valid (referenced in metadata.ts line 296)
- If missing, create from existing PWA icons in `public/manifest/` directory

---

## Phase 7: Future-Proofing (Nice-to-Have)

### 7.1 Add Next.js Middleware
**Create:** `src/middleware.ts`
- i18n locale detection and routing (currently handled by next-intl config only)
- Rate limiting for Server Actions
- Request logging and telemetry enrichment
- Bot detection and blocking

### 7.2 PostCSS Enhancements
**File:** `postcss.config.js`
- Verify `autoprefixer` is handled by Tailwind v4 (if using v4) or add explicitly
- Add environment-conditional `cssnano` (skip in development)

### 7.3 Conditional Telemetry Loading
**File:** `src/instrumentation.ts`
- Add environment check to skip OTEL in development
- Add try-catch to prevent telemetry failures from crashing the app
- Add edge runtime support for middleware instrumentation

### 7.4 Add `prefers-reduced-motion` Fix
**File:** `src/app/globals.css` (lines 201-208)
- Change animation duration from `0.01ms` to `0s` for true accessibility compliance

---

## Implementation Order (Recommended)

| Order | Phase | Estimated Effort | Impact |
|-------|-------|-----------------|--------|
| 1st | Phase 1 (Security) | Large | Critical — fixes active vulnerabilities |
| 2nd | Phase 2 (Performance) | Medium | High — measurable user experience improvement |
| 3rd | Phase 3 (Architecture) | Medium | High — robustness and developer experience |
| 4th | Phase 5 (Code Quality) | Small-Medium | Medium — maintainability and consistency |
| 5th | Phase 4 (Testing) | Large | Medium — confidence and regression prevention |
| 6th | Phase 6 (SEO) | Small | Lower — completeness and discoverability |
| 7th | Phase 7 (Future-Proofing) | Small | Lower — optional enhancements |

---

## Files to Create (New)

| File | Purpose |
|------|---------|
| `src/types/schemas/*.ts` | Zod validation schemas for Server Actions |
| `src/globals.d.ts` | Module declarations for CSS/SCSS imports |
| `src/app/domains/invoices/error.tsx` | Invoice error boundary |
| `src/app/auth/error.tsx` | Auth error boundary |
| `src/app/about/error.tsx` | About error boundary |
| `src/app/my-profile/error.tsx` | Profile error boundary |
| `src/app/domains/invoices/not-found.tsx` | Invoice not-found page |
| `src/app/domains/invoices/view-invoice/[id]/not-found.tsx` | Specific invoice not-found |
| `src/app/auth/sign-in/[[...sign-in]]/loading.tsx` | Sign-in loading skeleton |
| `src/app/auth/sign-up/[[...sign-up]]/loading.tsx` | Sign-up loading skeleton |
| `src/app/domains/invoices/view-invoices/loading.tsx` | Invoice list loading skeleton |
| `src/app/domains/invoices/edit-invoice/[id]/loading.tsx` | Invoice edit loading skeleton |
| `src/app/domains/invoices/view-invoice/[id]/loading.tsx` | Invoice detail loading skeleton |
| `public/images/og-default.png` | OpenGraph default image |
| `public/images/twitter-card.png` | Twitter card image |

## Files to Modify (Existing)

| File | Changes |
|------|---------|
| `next.config.ts` | CSP hardening, experimental features, package optimization, security headers |
| `src/app/providers.tsx` | Fix provider order, add error boundary |
| `src/app/layout.tsx` | Remove @ts-ignore, verify meta tags |
| `src/app/globals.css` | Replace hardcoded colors, fix reduced-motion |
| `src/lib/utils.server.ts` | Fix JWT typing, env validation, error sanitization |
| `src/lib/actions/cookies/cookies.action.ts` | Add security flags |
| `src/hooks/useInvoices.tsx` | Add AbortController |
| `src/hooks/useInvoice.tsx` | Add AbortController |
| `src/hooks/useMerchants.tsx` | Add AbortController |
| `src/hooks/useMerchant.tsx` | Add AbortController |
| `src/hooks/useScrollToTop.tsx` | Add throttling, relocate to components |
| `src/hooks/usePagination.tsx` | Optimize filter performance |
| `src/metadata.ts` | Add language alternates, verification tokens |
| `package.json` | Add zod, move daisyui to dependencies |
| Multiple island.tsx files | Fix semantic HTML (<main> tag usage) |
| Multiple page.tsx files | Add route segment config, notFound() calls |
| Multiple Server Action files | Add Zod validation, sanitize errors |
