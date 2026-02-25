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

## Key Source Documents

- RFC 1001: Frontend OpenTelemetry Observability
- RFC 1002: Comprehensive JSDoc/TSDoc Documentation
- RFC 1003: Internationalization (next-intl)
- RFC 1004: Metadata & SEO System
- RFC 1005: State Management (Zustand)
- RFC 1006: Component Library Architecture
- RFC 1007: Advanced Frontend Patterns

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
