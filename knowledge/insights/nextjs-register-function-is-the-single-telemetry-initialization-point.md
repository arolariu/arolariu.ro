---
description: "All server-side telemetry — SDK, exporters, auto-instrumentation — initializes in the single register() entry point in instrumentation.ts"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Next.js register function is the single telemetry initialization point

The `register()` function in `instrumentation.ts` is the one and only place where telemetry is initialized. There is no secondary initialization path, no lazy setup triggered by first request, no configuration split across multiple files.

This single-point-of-initialization convention prevents the classic distributed-init bug where different parts of the application configure telemetry differently (different exporters, different sampling rates, different resource attributes). If telemetry needs to change, there is exactly one file to modify.

The convention also simplifies debugging — if telemetry isn't working, check `register()`. There is no need to trace initialization through multiple modules or hunt for conditional setup logic scattered across the codebase.

All telemetry configuration lives here: the `NodeSDK` instantiation, exporter endpoints, resource attributes (service name, version, environment), auto-instrumentation library registration, and metric reader setup. This makes the telemetry configuration self-documenting — reading one function reveals the complete observability setup.

---

Related Insights:
- [[nextjs-instrumentation-hooks-initialize-telemetry-before-bootstrap]] — foundation: the Next.js mechanism that enables this convention
- [[telemetry-initialization-is-runtime-conditional-for-nodejs-only]] — extends: the runtime guard within this single point

Domains:
- [[frontend-patterns]]
