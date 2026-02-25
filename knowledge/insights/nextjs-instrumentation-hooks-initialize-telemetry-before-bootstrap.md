---
description: "The register() function in instrumentation.ts is called by Next.js 16 before any request processing, ensuring all auto-instrumentation is active from first request"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Next.js instrumentation hooks initialize telemetry before bootstrap

Next.js 16 provides a built-in instrumentation hook via `instrumentation.ts` at the project root. The `register()` function exported from this file is invoked automatically during server startup, before any route handlers execute.

This timing is critical for telemetry because OpenTelemetry auto-instrumentation must patch Node.js modules (http, fetch, fs, dns) before they are first imported. If telemetry initializes lazily — after the first request arrives, or when a module happens to load — those early requests go untraced, and some modules may escape patching entirely.

The `register()` function is the single correct place for all server-side telemetry setup: SDK initialization, exporter configuration, resource attribute definition, and auto-instrumentation registration all happen here. Scattering initialization across multiple files or deferring it to middleware would violate this contract and produce incomplete traces.

The function includes a runtime guard (`process.env.NEXT_RUNTIME === 'nodejs'`) to ensure telemetry only initializes on the server side. Edge runtime and client-side bundles skip initialization entirely, since they have different telemetry requirements and constraints.

---

Related Insights:
- [[nextjs-register-function-is-the-single-telemetry-initialization-point]] — extends: same concept with emphasis on the "single point" constraint
- [[telemetry-initialization-is-runtime-conditional-for-nodejs-only]] — extends: the runtime guard within register()
- [[auto-instrumentation-covers-http-fetch-filesystem-dns-without-manual-spans]] — enables: auto-instrumentation depends on early initialization

Domains:
- [[frontend-patterns]]
