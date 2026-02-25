---
description: Domain map for Next.js 16, React 19, Island pattern, and frontend conventions
type: moc
created: 2026-02-25
---

# frontend patterns

Frontend architecture for the arolariu.ro platform (sites/arolariu.ro/). Built on Next.js 16 with React 19, using App Router with Server Components by default.

## Core Insights

## Observability — RFC 1001

### Architecture Decisions
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — central thesis: TypeScript type system catches telemetry bugs at compile time
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — OTLP over HTTP enables backend switching via config changes only
- [[opentelemetry-collector-serves-as-proxy-between-app-and-backends]] — Collector separates telemetry generation from routing
- [[batch-span-processing-reduces-network-overhead-by-95-percent]] — BatchSpanProcessor amortizes export network cost
- [[periodic-metric-export-at-60-seconds-balances-freshness-against-cost]] — 60s metric intervals trade freshness for efficiency

### Conventions
- [[nextjs-instrumentation-hooks-initialize-telemetry-before-bootstrap]] — register() in instrumentation.ts runs before first request
- [[nextjs-register-function-is-the-single-telemetry-initialization-point]] — all telemetry setup in one place
- [[telemetry-initialization-is-runtime-conditional-for-nodejs-only]] — runtime guard prevents edge SDK crashes
- [[template-literal-types-enforce-span-naming-conventions]] — SpanOperationType constrains names to valid prefixes
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — six typed interfaces mirror OTEL spec
- [[metric-naming-follows-component-dot-operation-convention]] — component.operation naming for metrics
- [[otlp-endpoint-configuration-uses-environment-variables]] — deployment-time backend routing via env vars
- [[debug-logs-suppressed-in-production-to-eliminate-overhead]] — NODE_ENV check strips debug logs

### Patterns
- [[auto-instrumentation-covers-http-fetch-filesystem-dns-without-manual-spans]] — 20+ auto-instrumentations for baseline observability
- [[withspan-pattern-wraps-async-operations-for-automatic-span-lifecycle]] — core manual instrumentation API
- [[helper-functions-create-semantic-convention-compliant-attributes]] — seven factory functions for typed attributes
- [[observability-separates-auto-instrumentation-from-manual-business-spans]] — infrastructure vs business instrumentation
- [[four-render-contexts-partition-telemetry-by-nextjs-runtime]] — server/client/edge/api context tagging
- [[error-handling-in-instrumented-code-follows-try-catch-with-error-attributes]] — four-step error recording pattern
- [[cache-instrumentation-tracks-hit-miss-ratios-through-dual-counters]] — dual counter pattern for cache efficiency
- [[database-query-instrumentation-records-span-attributes-and-histogram-duration]] — dual-capture for queries
- [[request-counting-uses-metric-counters-with-semantic-attributes]] — dimensional analysis via attributed counters
- [[lazy-initialization-of-tracer-and-meter-prevents-startup-penalty]] — deferred init for cold-start optimization
- [[incremental-telemetry-adoption-follows-five-phase-rollout]] — five-phase migration from zero to full observability

### Performance Constraints
- [[span-creation-overhead-of-10-50-microseconds-is-negligible]] — per-span cost is invisible at request scale
- [[less-than-1-percent-cpu-overhead-validates-comprehensive-instrumentation]] — measured production CPU impact
- [[memory-footprint-of-10-20mb-establishes-telemetry-cost-baseline]] — fixed memory cost of SDK + instrumentation
- [[network-telemetry-overhead-scales-linearly-with-traffic]] — 100-500KB/min scales predictably
- [[low-cardinality-attributes-enforced-by-type-system-prevent-dashboard-explosion]] — type system prevents time series explosion
- [[per-attribute-recording-overhead-compounds-for-spans-with-many-attributes]] — 1-2μs per attribute accumulates

### Testing
- [[integration-tests-validate-type-safe-telemetry-attributes-at-runtime]] — unit tests bridge compile-time and runtime guarantees

### Anti-Patterns
- [[logging-sensitive-data-in-trace-attributes-is-a-security-violation]] — PII must never appear in telemetry
- [[ad-hoc-attribute-naming-creates-inconsistent-high-cardinality-telemetry]] — the problem semantic conventions solve
- [[untyped-span-names-bypass-semantic-conventions]] — the problem SpanOperationType solves

### Future Direction (Speculative)
- [[tail-based-sampling-enables-cost-effective-high-traffic-observability]] — planned sampling solution
- [[browser-sdk-integration-completes-full-stack-observability]] — client-side tracing
- [[attribute-redaction-processor-prevents-sensitive-data-leakage]] — defense-in-depth for PII
- [[w3c-baggage-propagation-enables-cross-service-context-sharing]] — cross-service context
- [[exemplars-linking-metrics-to-traces-enable-deeper-correlation]] — metric-trace bridge
- [[structured-log-export-via-otlp-unifies-all-three-pillars]] — OTLP log export
- [[business-logic-aware-samplers-enable-intelligent-trace-selection]] — domain-specific sampling

## Internationalization — RFC 1003

### Architecture Decisions
- [[cookie-based-locale-routing-avoids-url-path-segments]] — locale resolved from HTTP cookie, not URL path prefixes, trading hreflang SEO for simpler routing
- [[auto-generated-types-enforce-translation-key-safety-at-compile-time]] — en.d.json.ts provides IntelliSense and compile-time errors for translation keys

### Conventions
- [[english-locale-file-is-the-single-source-of-truth-for-translation-structure]] — en.json defines canonical structure; all locales must mirror it
- [[translation-namespaces-mirror-component-hierarchy-using-mixed-case-conventions]] — PascalCase domains, camelCase properties, kebab-case routes
- [[metadata-namespace-convention-separates-seo-from-content-translations]] — reserved __metadata__ sub-object for page-level SEO strings
- [[scoped-translators-narrow-namespace-to-prevent-full-path-key-access]] — always pass namespace to useTranslations()/getTranslations(), never use unscoped full paths

### Patterns
- [[dual-translation-api-maps-to-the-island-pattern]] — getTranslations() for RSC pages, useTranslations() hook for client islands
- [[server-components-resolve-translations-at-zero-client-bundle-cost]] — RSC translations render server-side, shipping no i18n runtime to the browser
- [[dynamic-imports-load-only-the-active-locale-messages-per-request]] — one locale's JSON loaded per server request via dynamic import
- [[locale-switching-flows-through-zustand-store-to-cookie-to-router-refresh]] — five-step chain: Commander -> store -> cookie -> onLocaleSync -> router.refresh()

## State Management — RFC 1005

### Architecture Decisions
- [[zustand-chosen-over-redux-and-jotai-for-minimal-boilerplate-with-persistence]] — Redux rejected for boilerplate, Jotai for poor entity collection fit, Context for no persistence

### Conventions
- [[store-naming-follows-use-entity-store-convention-with-camelcase]] — use{PluralEntity}Store naming with barrel export from src/stores/
- [[devtools-middleware-is-conditionally-included-only-in-development-builds]] — NODE_ENV branching: devtools in dev, persist-only in prod

### Patterns
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] — three TypeScript interfaces enforce the persistence boundary at the type level
- [[indexeddb-entity-level-storage-via-dexie-handles-large-offline-datasets]] — Dexie adapter stores each entity as individual IndexedDB row for efficient updates
- [[server-data-merges-into-zustand-store-after-hydration-completes]] — RSC fetches data, passes to island, island merges after hasHydrated is true
- [[selective-zustand-subscriptions-prevent-unnecessary-re-renders]] — selector functions narrow re-render scope to accessed state slices
- [[upsert-pattern-handles-create-and-update-through-single-store-action]] — single action for API sync prevents duplicate entries in offline-first flows
- [[preferences-store-uses-flat-key-value-persistence-unlike-entity-stores]] — singleton config uses shared table; entity stores use per-row tables

### Constraints
- [[zustand-stores-live-exclusively-in-client-island-components]] — hooks require "use client"; Server Components pass data as props to islands

### Gotchas
- [[indexeddb-hydration-is-async-requiring-explicit-hashydrated-guards]] — every component reading persisted data must check hasHydrated before rendering

## JSDoc/TSDoc Documentation — RFC 1002

### Architecture Decisions
- [[typescript-types-express-shape-while-jsdoc-expresses-intent-and-constraints]] — core thesis: types handle structural correctness, JSDoc handles semantic correctness and design rationale
- [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] — nine ESLint rules with tiered severity enforce JSDoc presence and correctness in CI
- [[jsdoc-serves-as-training-data-for-ai-code-generation]] — JSDoc is an explicit input channel for GitHub Copilot, making documentation quality an AI productivity lever

### Conventions
- [[jsdoc-summaries-are-capped-at-80-characters-for-intellisense-readability]] — tooltip-friendly first lines for VS Code quick info panels
- [[function-summaries-start-with-verbs-and-type-summaries-start-with-nouns]] — verb/noun prefix convention for scannable IntelliSense and TypeDoc output
- [[every-react-component-jsdoc-must-declare-its-rendering-context]] — Server/Client/Edge must appear in @remarks to make execution model explicit
- [[server-actions-require-four-documented-sections-in-remarks]] — Execution Context, Authentication, Side Effects, Error Handling required in every server action
- [[custom-hooks-document-dependencies-side-effects-and-rerender-triggers]] — three-section @remarks template for hooks: Dependencies, Side Effects, Re-render Triggers
- [[jsdoc-param-tags-document-domain-constraints-beyond-typescript-types]] — @param carries constraint semantics (UUIDs, valid ranges, defaults) that TS types cannot express
- [[fileoverview-tags-provide-module-level-architectural-context]] — major modules require @fileoverview with purpose, capabilities, @module name, and cross-references

### Patterns
- [[jsdoc-cross-references-link-code-to-rfcs-and-framework-docs]] — @see and @link create a reference web from source code to RFCs, specs, and framework docs

### Dependencies
- [[typedoc-generates-api-reference-from-jsdoc-into-the-docs-site]] — two TypeDoc configs produce Markdown API docs, making JSDoc the single source for IDE and published references

## Metadata & SEO — RFC 1004

### Architecture Decisions
- [[metadata-system-uses-layered-architecture-for-centralized-seo-management]] — five-layer stack (Route -> createMetadata -> Base Config -> I18n -> Next.js API) so routes only provide overrides
- [[static-metadata-export-preferred-for-routes-without-localized-content]] — zero-overhead static exports for language-independent routes; generateMetadata reserved for localized content
- [[satisfies-keyword-enforces-metadata-type-correctness-without-type-widening]] — satisfies + as const preserves narrow literal types while validating against Metadata interface
- [[sitemap-is-static-xml-requiring-manual-updates-for-new-routes]] — hand-maintained XML sitemap; dynamic generation planned as future enhancement

### Conventions
- [[metadata-translations-use-double-underscore-metadata-namespace-convention]] — all SEO strings live under __metadata__ keys in translation files, separated from UI strings
- [[title-template-pattern-prevents-double-site-name-in-page-titles]] — base template "%s | arolariu.ro" means routes provide only the page-specific title segment

### Patterns
- [[createmetadata-helper-composes-route-metadata-by-merging-base-defaults-with-overrides]] — single composition point that auto-propagates title/description to OpenGraph and Twitter
- [[generatemetadata-follows-a-fixed-pattern-of-get-translations-then-get-locale-then-compose]] — rigid three-step sequence: getTranslations -> getLocale -> createMetadata for all dynamic routes
- [[root-layout-re-exports-base-metadata-to-establish-global-defaults]] — one-line re-export wires base config as fallback for any route without its own metadata
- [[opengraph-locale-mapping-converts-simple-codes-to-regional-format-via-readonlymap]] — maps 'en'->'en_US', 'ro'->'ro_RO'; French locale falls back to en_US (gap)

### Dependencies
- [[metadata-system-depends-on-next-intl-for-all-localized-seo-content]] — hard runtime coupling: generateMetadata imports getTranslations/getLocale from next-intl/server

### Gotchas
- [[missing-metadata-keys-in-any-locale-file-breaks-generatemetadata-at-runtime]] — TypeScript types generated from primary locale only; missing keys in fr.json or ro.json fail at runtime
- [[nextjs-aggressively-caches-metadata-requiring-cache-clear-during-development]] — metadata changes may require deleting .next directory to appear in dev mode

## Advanced Frontend Patterns — RFC 1007

### Architecture Decisions
- [[server-action-results-use-discriminated-unions-instead-of-exceptions]] — ServerActionResult<T> encodes success/failure as data, preserving type safety across the server-client serialization boundary
- [[dialog-context-enforces-single-dialog-constraint-to-prevent-stacking]] — openDialog no-ops when a dialog is already open, eliminating modal stacking bugs
- [[entity-store-state-splits-into-persisted-entities-and-transient-selection]] — entities persist to IndexedDB; selection state and hydration flags are transient

### Conventions
- [[http-status-codes-map-to-semantic-error-codes-for-ui-consumption]] — mapHttpStatusToErrorCode translates HTTP statuses to seven semantic error codes
- [[server-actions-wrap-api-calls-in-opentelemetry-spans-for-tracing]] — every server action wrapped in withSpan for full lifecycle tracing
- [[dialog-types-follow-feature-double-underscore-action-naming-convention]] — FEATURE__ACTION naming (e.g., EDIT_INVOICE__MERCHANT) for dialog type identifiers
- [[useShallow-selectors-prevent-unnecessary-zustand-store-re-renders]] — mandatory useShallow wrapping for entity store selectors
- [[dialog-payloads-carry-ids-not-full-objects-to-minimize-context-size]] — pass entity IDs in dialog payloads, not full objects

### Patterns
- [[generic-entity-store-factory-eliminates-crud-boilerplate-through-zustand-generics]] — createEntityStore<E> generates a complete store from a 3-field config
- [[hydration-tracking-prevents-flash-of-empty-content-from-indexeddb-restore]] — hasHydrated flag gates rendering until IndexedDB restoration completes
- [[dialog-context-uses-ref-plus-state-hybrid-for-reads-and-renders]] — dual ref+state storage ensures synchronous correctness and proper React re-renders

### Constraints
- [[entity-store-factory-awaits-incremental-migration-from-hand-rolled-stores]] — factory is tested but production stores (invoices, merchants, scans) are still hand-rolled

## Component Library Integration — RFC 1006

### Cross-Domain Dependencies
- [[component-library-provides-client-side-primitives-consumed-by-island-pattern]] -- library components are client-side, consumed in island.tsx not page.tsx
- [[aschild-prop-enables-polymorphic-rendering-via-radix-slot]] -- enables Button-as-Link composition for client-side navigation in islands

## SCSS System — RFC 1008

### Architecture Decisions
- [[scss-modules-chosen-over-css-in-js-for-zero-runtime-scoped-styling]] — CSS-in-JS rejected for runtime overhead and RSC incompatibility; SCSS Modules provide compile-time scoping with full Sass power
- [[seven-one-pattern-organizes-scss-into-abstracts-base-themes-animations-components-utilities]] — industry-standard 7-1 file organization adapted for Next.js with pages/ and vendors/ omitted
- [[component-library-retains-tailwind-while-site-pages-migrate-to-scss-modules]] — clear boundary: @arolariu/components keeps Tailwind permanently, site pages migrate route-by-route

### Conventions
- [[every-css-module-file-starts-with-use-abstracts-as-star-import]] — mandatory @use abstracts as * header gives each module access to all tokens and mixins
- [[css-module-classes-use-semantic-camelcase-not-bem-because-scoping-is-automatic]] — camelCase naming (cardTitle, ctaButton) replaces BEM since CSS Modules handle scoping
- [[bracket-notation-accesses-scss-module-classes-for-typescript-safety]] — styles["className"] over styles.className for explicit optionality handling
- [[mobile-first-respond-to-mixin-is-the-preferred-responsive-approach]] — base styles target mobile, respond-to() adds progressive min-width enhancements
- [[dark-mode-styling-prefers-include-dark-mixin-over-global-selector]] — @include dark wraps :global(.dark) & for consistency; most colors auto-adapt via CSS custom properties
- [[z-index-uses-named-semantic-layers-to-prevent-stacking-conflicts]] — nine named layers from base(0) through toast(1080) accessed via z() function
- [[shadow-elevation-follows-six-level-material-design-inspired-scale]] — six levels (none through 2xl) with automatic dark mode opacity adjustment
- [[sassdoc-triple-slash-annotations-document-all-public-scss-apis]] — 17 named @group categories with @param, @return, @throws, @example tags

### Patterns
- [[css-custom-properties-handle-runtime-theming-while-scss-variables-handle-compile-time-tokens]] — dual-layer variables: CSS vars for runtime themes, SCSS maps for compile-time tokens
- [[scss-helper-functions-with-error-messages-enforce-valid-token-access]] — space(), breakpoint(), z(), radius() validate keys at compile time with listed alternatives
- [[scss-spacing-and-breakpoints-mirror-tailwind-for-incremental-migration]] — identical token values enable pixel-perfect migration without visual regressions
- [[scss-feature-flags-in-config-enable-compile-time-capability-toggling]] — seven boolean flags control fluid type, container queries, print styles via @use with()

### Constraints
- [[scss-main-loads-after-tailwind-ensuring-higher-cascade-specificity]] — import order in globals.scss places SCSS after Tailwind layers for specificity control

## Key Source Documents

- RFC 1001: Frontend OpenTelemetry Observability
- RFC 1002: Comprehensive JSDoc/TSDoc Documentation
- RFC 1003: Internationalization (next-intl)
- RFC 1004: Metadata & SEO System
- RFC 1005: State Management (Zustand)
- RFC 1006: Component Library Architecture
- RFC 1007: Advanced Frontend Patterns
- RFC 1008: SCSS System Architecture

## Tensions

- [[edge-runtime-has-limited-auto-instrumentation-creating-observability-gap]] — edge functions run without telemetry
- [[client-side-observability-requires-separate-browser-sdk]] — dual-SDK maintenance burden
- [[all-traces-exported-without-sampling-creates-cost-pressure-at-scale]] — no sampling at current configuration
- [[console-based-logging-lacks-structured-export]] — logs not on par with traces and metrics

## Open Questions

- [[how-should-rpc-semantic-conventions-apply-to-internal-api-calls]] — HTTP vs RPC conventions for frontend-backend calls
- [[what-sampling-strategy-balances-cost-and-observability-at-scale]] — head-based vs tail-based vs business-aware
- How do the Island pattern conventions interact with React 19's new features?
- What are the edge cases in the RSC-first approach?
