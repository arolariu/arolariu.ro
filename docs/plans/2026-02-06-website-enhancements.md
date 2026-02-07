# Comprehensive Frontend Improvement Plan: arolariu.ro

**Status**: Draft - Pending Approval
**Date**: 2026-02-06
**Scope**: `sites/arolariu.ro` (Next.js 16 + React 19 frontend)
**Baseline**: RFCs 1001-1008, current codebase analysis, latest library documentation

---

## Executive Summary

This plan identifies **12 phases** with **120 actionable items** to improve the arolariu.ro frontend across extensibility, performance, correctness, and security. Each phase is ordered by impact and dependency, with clear acceptance criteria.

**Current Architecture Strengths** (preserve these):
- Type-safe OpenTelemetry observability system (RFC 1001)
- Comprehensive JSDoc documentation standard (RFC 1002)
- Well-structured i18n with next-intl (RFC 1003)
- Centralized metadata/SEO system (RFC 1004)
- Zustand + IndexedDB state management with generic entity factory (RFCs 1005, 1007)
- 60+ component library with Radix UI + Tailwind (RFC 1006)
- SCSS Modules with 7-1 pattern for gradual Tailwind migration (RFC 1008)
- Server Action Result pattern with discriminated unions (RFC 1007)

---

## Phase 1: Complete SCSS Migration (In Progress)

**Goal**: Finish the Tailwind-to-SCSS module migration started in RFC 1008.

**Context**: Per RFC 1008 Section 11.3, two major route groups remain unmigrated: `/domains/invoices` (78 components, HIGH priority) and `/my-profile` (11 components, MEDIUM priority). The current branch `user/aolariu/migration-to-scss` has global-error and global-not-found in progress.

| # | Item | Files | Priority |
|---|------|-------|----------|
| 1.1 | Finish `global-error.tsx` SCSS module migration | `src/app/global-error.tsx`, `global-error.module.scss` | HIGH |
| 1.2 | Finish `global-not-found.tsx` SCSS module migration | `src/app/global-not-found.tsx`, `global-not-found.module.scss` | HIGH |
| 1.3 | Migrate `/domains` landing page to SCSS modules | `src/app/domains/page.tsx`, `_components/` | HIGH |
| 1.4 | Migrate `/domains/invoices` main page to SCSS modules | `src/app/domains/invoices/page.tsx`, island files | HIGH |
| 1.5 | Migrate `/domains/invoices/[id]` view page to SCSS modules | Invoice view route components | HIGH |
| 1.6 | Migrate `/domains/invoices/[id]/edit` edit page to SCSS modules | Invoice edit route components | HIGH |
| 1.7 | Migrate invoice `_components/` shared components (dialogs, forms, cards) | ~40+ component files in `_components/` | HIGH |
| 1.8 | Migrate invoice `_contexts/` dialog context components | Dialog container, dialog components | MEDIUM |
| 1.9 | Migrate `/my-profile` page and subpages to SCSS modules | `src/app/my-profile/` route files | MEDIUM |
| 1.10 | Migrate `/my-profile/_components/` to SCSS modules | Profile components (~11 files) | MEDIUM |
| 1.11 | Audit remaining Tailwind usage across all routes and create migration tracker | All `src/app/` files | LOW |
| 1.12 | Add SCSS Module TypeScript type declarations for autocomplete | `scss.d.ts` or `typed-scss-modules` setup | LOW |

**Acceptance**: All routes use SCSS modules for page-specific styles. Tailwind remains only in `@arolariu/components` library and for utility/override classes.

---

## Phase 2: Performance Optimization

**Goal**: Achieve Lighthouse Performance score 95+, LCP < 2.0s, CLS < 0.05.

**Context**: RFC 1004 targets LCP < 2.5s, FID < 100ms, CLS < 0.1. We can be more ambitious. The codebase uses Server Components well but has room for improvement in image optimization, code splitting, and streaming.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 2.1 | Audit all `<Image>` usage for proper `sizes`, `priority`, and `placeholder` props | Grep for `next/image` imports, verify each has appropriate sizing | HIGH |
| 2.2 | Add `placeholder="blur"` to above-fold images for LCP improvement | Hero images, profile images, key illustrations | HIGH |
| 2.3 | Implement `next/dynamic` with `ssr: false` for heavy client-only components | Charts, Fireworks background, complex animations | HIGH |
| 2.4 | Add `<Suspense>` boundaries around data-fetching sections in each route | Wrap async server components with loading skeletons | HIGH |
| 2.5 | Implement React 19 `use()` hook for promise-based data loading where appropriate | Replace `useEffect` + `useState` fetch patterns with `use()` + Suspense | MEDIUM |
| 2.6 | Configure `experimental.optimizePackageImports` in next.config.ts for large dependencies | Add lucide-react, @radix-ui/*, date-fns, recharts to the list | HIGH |
| 2.7 | Audit and reduce client-side JavaScript bundle by analyzing `next build` output | Run `ANALYZE=true npm run build:website`, identify large chunks | HIGH |
| 2.8 | Move Clerk `<SignIn>` and `<SignUp>` to `next/dynamic` with loading skeletons | These are heavy client components that can be code-split | MEDIUM |
| 2.9 | Implement `loading.tsx` for ALL route segments that don't have one | Audit every route directory for missing loading states | MEDIUM |
| 2.10 | Add `fetchPriority="high"` to LCP images in hero sections | Hero images on home, about, domains pages | MEDIUM |
| 2.11 | Configure Turbopack for development builds if not already enabled | `next dev --turbopack` in dev script | MEDIUM |
| 2.12 | Implement route prefetching with `<Link prefetch>` on key navigation paths | Header nav links, domain cards, invoice list items | LOW |

**Acceptance**: Lighthouse Performance >= 95 on home, about, domains pages. Bundle analyzer shows no single chunk > 100KB gzipped.

---

## Phase 3: Security Hardening

**Goal**: Achieve Lighthouse Best Practices 100, implement defense-in-depth.

**Context**: RFC 1004 shows security headers in next.config.ts (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy). Missing: CSP, rate limiting, CSRF for Server Actions, and input validation.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 3.1 | Implement Content-Security-Policy header with nonce-based script allowlisting | Add CSP header in next.config.ts `headers()`, use `nonce` for inline scripts | HIGH |
| 3.2 | Add `X-Permitted-Cross-Domain-Policies: none` header | Prevent Flash/PDF cross-domain requests | HIGH |
| 3.3 | Validate all Server Action inputs with Zod schemas | Create Zod schemas for every server action parameter (invoice IDs, form data) | HIGH |
| 3.4 | Add rate limiting to Server Actions using token bucket or sliding window | Implement server-side rate limiting for `fetchInvoices`, `updateInvoice`, etc. | HIGH |
| 3.5 | Audit Clerk middleware configuration for route protection coverage | Verify all `/domains/*`, `/my-profile/*`, `/api/*` routes require auth | HIGH |
| 3.6 | Implement CSRF protection for mutation Server Actions | Use `headers()` to verify Origin header matches expected domain | MEDIUM |
| 3.7 | Add `Permissions-Policy` header for all unused browser APIs | Extend current policy: `camera=(), geolocation=(), microphone=(), usb=()` | MEDIUM |
| 3.8 | Sanitize user-generated content before rendering (invoice names, merchant names) | Use DOMPurify or equivalent for any user-controlled strings | MEDIUM |
| 3.9 | Implement subresource integrity (SRI) for CDN-loaded scripts | Add `integrity` attribute to external script tags | MEDIUM |
| 3.10 | Add security-focused ESLint rules (`eslint-plugin-security`, `no-eval`, `no-implied-eval`) | Extend eslint.config.js with security plugin | LOW |
| 3.11 | Audit and rotate any hardcoded secrets or API keys in environment files | Verify `.env.local` is in `.gitignore`, no secrets in committed `.env` | LOW |

**Acceptance**: Security headers score A+ on securityheaders.com. All Server Action inputs validated. No XSS vectors in user-rendered content.

---

## Phase 4: Testing Infrastructure

**Goal**: Achieve 90%+ unit test coverage (per vitest.config.ts threshold), comprehensive E2E coverage.

**Context**: The codebase has vitest and Playwright configured but test coverage is likely well below the 90% threshold. Test patterns are documented in RFCs but few actual test files exist.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 4.1 | Create test utilities file with common mocks (next-intl, Clerk, Zustand stores) | `src/__tests__/utils.ts` with render wrappers and mock providers | HIGH |
| 4.2 | Write unit tests for all utility functions in `src/lib/utils.generic.ts` | formatCurrency, formatDate, generateGuid, extractBase64FromBlob, etc. | HIGH |
| 4.3 | Write unit tests for `src/lib/utils.server.ts` (ServerActionResult helpers) | mapHttpStatusToErrorCode, createErrorResult, fetchWithTimeout | HIGH |
| 4.4 | Write unit tests for `src/lib/utils.client.ts` (browser utilities) | isBrowserStorageAvailable, dumpBrowserInformation | HIGH |
| 4.5 | Write unit tests for the generic entity store factory (`createEntityStore`) | Test upsert, remove, update, toggle, hydration behavior | HIGH |
| 4.6 | Write unit tests for each Zustand store (invoices, merchants, scans) | Test all actions, state transitions, persistence | HIGH |
| 4.7 | Write unit tests for each custom hook (useInvoice, useInvoices, useMerchant, etc.) | Use renderHook with mock server actions | HIGH |
| 4.8 | Write component tests for key shared components (Header, Footer, Commander) | Test rendering, i18n integration, theme switching, navigation | MEDIUM |
| 4.9 | Write component tests for form components (invoice creation, invoice editing) | Test form validation, submission, error states | MEDIUM |
| 4.10 | Write Playwright E2E tests for authentication flows (sign-in, sign-out) | Test Clerk integration, protected route access, redirect behavior | MEDIUM |
| 4.11 | Write Playwright E2E tests for invoice CRUD flow | Create, view, edit, delete invoice end-to-end | MEDIUM |
| 4.12 | Write Playwright E2E tests for locale switching | Verify cookie persistence, UI update, metadata update | MEDIUM |
| 4.13 | Write translation validation script to check key parity across en/ro/fr | `scripts/validate-translations.ts` per RFC 1003 Section 7.1 | MEDIUM |
| 4.14 | Add visual regression testing with Playwright screenshots | Capture key pages in light/dark mode, compare on CI | LOW |
| 4.15 | Configure test coverage reporting in CI/CD pipeline | Add coverage report upload to GitHub Actions | LOW |

**Acceptance**: `npm run test:unit` passes with >= 90% line coverage. All E2E tests pass. Translation validation passes in CI.

---

## Phase 5: SEO & Metadata Enhancement

**Goal**: Lighthouse SEO score 100, rich search results, dynamic OG images.

**Context**: RFC 1004 identifies three key future enhancements: dynamic sitemap generation, JSON-LD structured data, and dynamic Open Graph images. The current sitemap is static XML that must be manually maintained.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 5.1 | Convert static `sitemap.xml` to dynamic `sitemap.ts` using Next.js MetadataRoute | `src/app/sitemap.ts` that auto-generates from route structure | HIGH |
| 5.2 | Add JSON-LD structured data for Person schema on homepage and about pages | `<script type="application/ld+json">` with Schema.org Person markup | HIGH |
| 5.3 | Add JSON-LD structured data for WebApplication schema on domains pages | Schema.org SoftwareApplication for the invoice management tool | HIGH |
| 5.4 | Add JSON-LD BreadcrumbList schema to all nested routes | Auto-generate breadcrumb structured data from route hierarchy | MEDIUM |
| 5.5 | Implement dynamic Open Graph image generation using `next/og` | Create `opengraph-image.tsx` for key routes (home, about, domains) | MEDIUM |
| 5.6 | Add `hreflang` alternate links for all supported locales (en, ro, fr) | Add alternates to `createMetadata` for multi-language SEO | MEDIUM |
| 5.7 | Convert static `robots.txt` to dynamic `robots.ts` | `src/app/robots.ts` with environment-aware configuration (block indexing in dev/staging) | MEDIUM |
| 5.8 | Add `generateMetadata` to ALL route pages that are missing it | Audit every `page.tsx` for metadata export | MEDIUM |
| 5.9 | Optimize meta description length across all routes (120-160 chars) | Audit translation files `__metadata__.description` values | LOW |
| 5.10 | Add Twitter `summary_large_image` card type with dedicated images | Upgrade from `summary` to `summary_large_image` for richer previews | LOW |

**Acceptance**: Google Search Console shows all pages indexed with rich results. Dynamic sitemap auto-updates when routes are added.

---

## Phase 6: Internationalization Completeness

**Goal**: Full i18n coverage with automated validation, browser locale detection, and potential route-based locale.

**Context**: RFC 1003 identifies several future enhancements: route-based locale detection, browser Accept-Language detection, translation validation in CI, RTL support planning.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 6.1 | Implement automated translation key parity validation in CI | Script that diffs en.json vs ro.json vs fr.json, fails on missing keys | HIGH |
| 6.2 | Add browser `Accept-Language` header detection as fallback when no locale cookie | In `i18n/request.ts`, check headers before defaulting to English | HIGH |
| 6.3 | Audit all components for untranslated hardcoded strings | Search for English strings in JSX that should use `t()` | HIGH |
| 6.4 | Add missing translations for new SCSS-migrated components | Ensure all button text, labels, headings use i18n | MEDIUM |
| 6.5 | Add ICU plural rules for count-based translations | Invoice counts, item counts, date relative formatting | MEDIUM |
| 6.6 | Add locale-specific date/number formatting using `next-intl` formatters | Replace manual `Intl.NumberFormat` calls with `useFormatter()` hook | MEDIUM |
| 6.7 | Create a locale switcher component visible in the UI (not just command palette) | Add language toggle to header or footer for discoverability | MEDIUM |
| 6.8 | Plan route-based locale support (`/en/about`, `/ro/despre`) | Document migration path, consider Next.js i18n routing | LOW |
| 6.9 | Add locale to OpenTelemetry spans for locale-aware analytics | Include `user.locale` attribute in telemetry spans | LOW |
| 6.10 | Plan RTL language support architecture for future Arabic/Hebrew | Document `dir="rtl"` approach, CSS logical properties needed | LOW |

**Acceptance**: CI blocks PRs with missing translation keys. Browser locale detection works automatically. No hardcoded English strings in translated components.

---

## Phase 7: State Management & Data Flow

**Goal**: Eliminate stale data, implement optimistic updates, establish clear server/client state boundary.

**Context**: RFC 1005/1007 establish Zustand + IndexedDB for client state. Server Actions use discriminated unions. Missing: optimistic updates, stale data detection, proper cache invalidation, React Query for server-state caching.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 7.1 | Implement optimistic updates for invoice CRUD operations | Update store immediately, revert on server action failure | HIGH |
| 7.2 | Add stale data detection by comparing IndexedDB timestamps with server data | Add `lastSyncedAt` timestamp to entity stores, show stale indicators | HIGH |
| 7.3 | Implement `useFormStatus` from React 19 for form submission states | Replace manual `isSubmitting` state with React 19 native hook | HIGH |
| 7.4 | Implement `useOptimistic` from React 19 for immediate UI feedback | Use React 19 `useOptimistic` for invoice list add/remove/update | HIGH |
| 7.5 | Add error recovery for IndexedDB persistence failures | Handle quota exceeded, corrupted data, IndexedDB unavailable | MEDIUM |
| 7.6 | Implement cache invalidation strategy for Server Actions | After mutation server actions, invalidate related cached data | MEDIUM |
| 7.7 | Add loading skeletons that match actual content layout (avoid CLS) | Create skeleton variants for invoice cards, merchant cards, profile sections | MEDIUM |
| 7.8 | Evaluate React Query (TanStack Query) for server-state management | Compare with current Server Action + Zustand approach for data fetching | MEDIUM |
| 7.9 | Add `useActionState` from React 19 for form action results | Replace manual form state management with React 19 native pattern | MEDIUM |
| 7.10 | Implement data prefetching for likely user navigation paths | Prefetch invoice detail data when hovering invoice list items | LOW |

**Acceptance**: Invoice CRUD operations show instant UI feedback. Stale data is detected and refreshed. Form submissions show proper loading/error/success states.

---

## Phase 8: Component Library Enhancement

**Goal**: Full Storybook coverage, accessibility audit, missing component gaps filled.

**Context**: RFC 1006 documents 60+ components with Radix UI + Tailwind. Some components may lack Storybook stories, accessibility testing, or TypeScript prop documentation.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 8.1 | Audit all 60+ components for Storybook story coverage | List components without stories, create priority list | HIGH |
| 8.2 | Write Storybook stories for all components without coverage | Each component needs at least Default, Variants, and Disabled stories | HIGH |
| 8.3 | Add `@storybook/addon-a11y` for automated accessibility checking in Storybook | Run axe-core checks on all component stories | HIGH |
| 8.4 | Add keyboard navigation tests to all interactive components | Verify Tab, Enter, Escape, Arrow key behavior | MEDIUM |
| 8.5 | Add proper `displayName` to all React.forwardRef components | Verify all components have displayName for DevTools debugging | MEDIUM |
| 8.6 | Create composite component patterns (e.g., DataTable with sorting/filtering) | Build on existing Table component with common data display patterns | MEDIUM |
| 8.7 | Add dark mode preview to Storybook with `@storybook/addon-themes` | Allow toggling light/dark mode in Storybook UI | MEDIUM |
| 8.8 | Document all component props with JSDoc comments per RFC 1002 standard | Ensure every exported component has comprehensive JSDoc | LOW |
| 8.9 | Add component dependency graph visualization | Document which components compose which for tree-shaking awareness | LOW |
| 8.10 | Evaluate moving site-specific components from `sites/arolariu.ro/src/app/_components/` to library | Header, Footer, Commander could be generalized | LOW |

**Acceptance**: 100% of components have Storybook stories. Zero accessibility violations in Storybook a11y addon. All components have JSDoc documentation.

---

## Phase 9: Observability & Error Handling

**Goal**: Full-stack observability, graceful error recovery, client-side telemetry.

**Context**: RFC 1001 establishes server-side OpenTelemetry. Limitations: no client-side browser SDK, no trace sampling, console-based logging only. Error boundaries exist but may not be comprehensive.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 9.1 | Implement error boundaries for every route segment with proper fallback UI | Add `error.tsx` to every route directory that doesn't have one | HIGH |
| 9.2 | Instrument error boundaries with OpenTelemetry span recording | When error boundary catches, create error span with full context | HIGH |
| 9.3 | Add `@opentelemetry/sdk-trace-web` for client-side browser tracing | Track client-side navigation, user interactions, Web Vitals | MEDIUM |
| 9.4 | Implement tail-based trace sampling for high-traffic scenarios | Per RFC 1001 Section 10.2, implement sampling strategy | MEDIUM |
| 9.5 | Add OTLP log exporter for structured log shipping | Replace console-based logging with OTLP log exporter | MEDIUM |
| 9.6 | Instrument all Server Actions with consistent span naming per RFC 1001 | Verify every server action uses `withSpan('api.actions.*')` pattern | MEDIUM |
| 9.7 | Add custom Web Vitals metrics to OpenTelemetry | Track LCP, FID, CLS, TTFB as OTel metrics | MEDIUM |
| 9.8 | Implement global `onError` handler for uncaught client-side errors | Catch and report errors that escape React error boundaries | LOW |
| 9.9 | Add SensitiveDataProcessor span processor per RFC 1001 Section 11.2 | Automatically redact sensitive attributes before export | LOW |
| 9.10 | Create observability dashboard runbook documenting key queries/alerts | Document how to find slow pages, error rates, user locale distribution | LOW |

**Acceptance**: Every route has error.tsx. Client-side errors are captured and reported. Web Vitals tracked in OTel.

---

## Phase 10: Developer Experience & Code Quality

**Goal**: Stricter TypeScript, comprehensive linting, streamlined development workflow.

**Context**: tsconfig.json uses strict mode. ESLint has 20+ plugins. JSDoc standard is documented in RFC 1002. Room for improvement in TypeScript strictness and automated code quality checks.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 10.1 | Enable `noUncheckedIndexedAccess` in tsconfig.json | Prevent undefined access on arrays and objects | HIGH |
| 10.2 | Enable `exactOptionalPropertyTypes` in tsconfig.json | Distinguish between `undefined` and missing properties | HIGH |
| 10.3 | Add `eslint-plugin-react-compiler` for React Compiler readiness | Detect patterns that would break React Compiler optimization | HIGH |
| 10.4 | Add JSDoc coverage enforcement in ESLint (all exports must have JSDoc) | Per RFC 1002, enforce `jsdoc/require-jsdoc` for exports | MEDIUM |
| 10.5 | Add `@typescript-eslint/strict-type-checked` ruleset | Strictest TypeScript linting rules | MEDIUM |
| 10.6 | Add `eslint-plugin-import` rules for import ordering and no circular dependencies | Enforce consistent import order, detect circular imports | MEDIUM |
| 10.7 | Add Prettier integration check to CI (fail on unformatted code) | `prettier --check` as CI step | MEDIUM |
| 10.8 | Create VS Code workspace settings with recommended extensions | `.vscode/settings.json` and `.vscode/extensions.json` | LOW |
| 10.9 | Add pre-commit hook with Husky for lint + format + type-check | Prevent bad code from being committed | LOW |
| 10.10 | Create ARCHITECTURE.md documenting the frontend system design | High-level document linking to all RFCs with diagrams | LOW |

**Acceptance**: Zero TypeScript errors with stricter settings. ESLint passes with all new rules. Pre-commit hooks block invalid code.

---

## Phase 11: Build, CI/CD & Infrastructure

**Goal**: Fast builds, reliable deployments, automated quality gates.

**Context**: The monorepo uses Nx for task orchestration. GitHub Actions handle CI/CD. Package builds use RSLib for the component library.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 11.1 | Add bundle size tracking to CI (fail on significant increases) | Use `@next/bundle-analyzer` or `size-limit` with CI integration | HIGH |
| 11.2 | Add Lighthouse CI to GitHub Actions for automated performance regression | Run Lighthouse on PRs, fail if scores drop below thresholds | HIGH |
| 11.3 | Optimize `npm ci` in CI with caching (node_modules cache key on package-lock.json) | Use GitHub Actions cache for faster installs | HIGH |
| 11.4 | Add type-check step to CI pipeline (`tsc --noEmit`) | Catch TypeScript errors before merge | HIGH |
| 11.5 | Add build step for all three deployment modes (LOCAL, DEVELOPMENT, PRODUCTION) | Verify each mode builds successfully in CI | MEDIUM |
| 11.6 | Configure Nx affected commands to only build/test changed projects | `nx affected --target=build` for faster CI on monorepo changes | MEDIUM |
| 11.7 | Add Docker build validation in CI | Verify Docker image builds successfully | MEDIUM |
| 11.8 | Add preview deployments for PRs (Vercel preview or Azure Static Web Apps staging) | Automatic preview URL on every PR for visual review | MEDIUM |
| 11.9 | Implement dependency update automation (Renovate or Dependabot) | Auto-create PRs for dependency updates with CI validation | LOW |
| 11.10 | Add CLAUDE.md validation to CI (verify referenced files exist) | Script that checks all file paths mentioned in CLAUDE.md | LOW |

**Acceptance**: CI runs in < 5 minutes for affected changes. Bundle size tracked with regression alerts. Lighthouse scores monitored per PR.

---

## Phase 12: Accessibility (a11y)

**Goal**: WCAG 2.1 AA compliance across all pages, Lighthouse Accessibility score 100.

**Context**: RFC 1006 establishes Radix UI as the accessibility foundation. RFC 1008 includes reduced-motion and focus-ring mixins. However, no formal accessibility audit has been performed.

| # | Item | Details | Priority |
|---|------|---------|----------|
| 12.1 | Run axe-core automated audit on all pages and fix all critical/serious violations | Use `@axe-core/playwright` or browser extension | HIGH |
| 12.2 | Add proper `aria-label` to all icon-only buttons across the site | Search for `<Button>` with only icon children, add labels | HIGH |
| 12.3 | Verify all form inputs have associated `<label>` elements | Audit all form pages (invoice creation, profile editing) | HIGH |
| 12.4 | Add skip navigation link ("Skip to main content") to root layout | `<a href="#main" className="sr-only focus:not-sr-only">` | HIGH |
| 12.5 | Verify color contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for large text) | Audit both light and dark themes | HIGH |
| 12.6 | Test all pages with screen reader (NVDA or VoiceOver) | Manual testing of navigation, forms, dialogs | MEDIUM |
| 12.7 | Ensure all modals/dialogs have proper focus trapping (already via Radix) | Verify custom dialogs outside component library also trap focus | MEDIUM |
| 12.8 | Add `prefers-reduced-motion` support to all animations and transitions | Use `@include reduced-motion` mixin from RFC 1008 in all animated elements | MEDIUM |
| 12.9 | Add `prefers-color-scheme` CSS media query as fallback for theme detection | Support users who haven't explicitly toggled theme | LOW |
| 12.10 | Create accessibility testing Playwright suite | Automated keyboard navigation tests for critical user flows | LOW |
| 12.11 | Add `aria-live` regions for dynamic content updates (invoice list changes, toast notifications) | Ensure screen readers announce dynamic updates | LOW |

**Acceptance**: Lighthouse Accessibility score 100. Zero axe-core critical/serious violations. All forms keyboard-navigable.

---

## Implementation Priority Matrix

| Phase | Impact | Effort | Dependencies | Suggested Order |
|-------|--------|--------|-------------|-----------------|
| 1. SCSS Migration | Medium | High | None (in progress) | 1st (finish current work) |
| 3. Security Hardening | High | Medium | None | 2nd (critical path) |
| 4. Testing Infrastructure | High | High | None | 3rd (enables safe changes) |
| 2. Performance Optimization | High | Medium | Phase 1 partial | 4th |
| 9. Observability | High | Medium | None | 5th |
| 7. State Management | Medium | Medium | Phase 4 | 6th |
| 5. SEO Enhancement | Medium | Low | Phase 6 partial | 7th |
| 6. i18n Completeness | Medium | Low | None | 8th |
| 12. Accessibility | High | Medium | Phase 1 | 9th |
| 10. Developer Experience | Medium | Low | None | 10th |
| 11. CI/CD | Medium | Medium | Phase 4 | 11th |
| 8. Component Library | Low | High | None | 12th |

---

## Item Count Summary

| Phase | Items |
|-------|-------|
| Phase 1: SCSS Migration | 12 |
| Phase 2: Performance | 12 |
| Phase 3: Security | 11 |
| Phase 4: Testing | 15 |
| Phase 5: SEO | 10 |
| Phase 6: i18n | 10 |
| Phase 7: State Management | 10 |
| Phase 8: Component Library | 10 |
| Phase 9: Observability | 10 |
| Phase 10: Dev Experience | 10 |
| Phase 11: CI/CD | 10 |
| Phase 12: Accessibility | 11 |
| **Total** | **131** |

---

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SCSS migration breaks existing styles | High | Test every route in light/dark mode on all breakpoints before merging |
| Stricter TypeScript flags cause many errors | Medium | Enable flags incrementally, fix errors phase-by-phase |
| Test writing slows feature development | Medium | Start with high-value tests (utilities, stores), add component tests gradually |
| CSP header breaks third-party integrations | High | Start with report-only mode, monitor violations before enforcing |
| Bundle size increases from new features | Medium | CI bundle tracking catches regressions early |
| IndexedDB storage limits on mobile devices | Low | Implement storage quota monitoring and cleanup strategies |

---

## Success Metrics

| Metric | Current (Estimated) | Target |
|--------|-------------------|--------|
| Lighthouse Performance | ~80-85 | >= 95 |
| Lighthouse Accessibility | ~85-90 | 100 |
| Lighthouse Best Practices | ~90 | 100 |
| Lighthouse SEO | ~90-95 | 100 |
| Unit Test Coverage | ~10-20% | >= 90% |
| E2E Test Coverage | ~0% | >= 80% of critical paths |
| TypeScript Strictness | Strict | Strict + extra flags |
| Bundle Size (First Load JS) | Unknown | < 100KB gzipped |
| LCP | Unknown | < 2.0s |
| CLS | Unknown | < 0.05 |
| Security Headers Grade | B/C | A+ |

---

**Document Version**: 1.0.0
**Created**: 2026-02-06
**Author**: Claude Code (Opus 4.6) based on deep codebase analysis
**Sources**: RFCs 1001-1008, latest Next.js/React/Clerk/Zustand documentation, codebase static analysis
