---
description: "Next.js edge functions cannot use the full NodeSDK, creating blind spots in distributed traces when requests cross from server to edge runtime"
type: gotcha
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Edge runtime has limited auto-instrumentation creating an observability gap

The OpenTelemetry NodeSDK and its auto-instrumentation libraries depend on Node.js-specific APIs that are not available in the Next.js edge runtime. Edge functions run in a V8 isolate environment with a restricted API surface — no fs, no net, limited crypto. The runtime guard in register() prevents the SDK from loading in edge, which means edge functions execute with zero telemetry. This creates blind spots: if a request is handled by an edge middleware before reaching a Node.js route handler, the edge portion is invisible in traces. The gap is particularly concerning for edge-based authentication or geolocation logic. No production-ready solution exists yet — the @opentelemetry/sdk-trace-web package is designed for browsers, not edge runtimes.

---

Related Insights:
- [[telemetry-initialization-is-runtime-conditional-for-nodejs-only]] — foundation: the runtime guard creating this gap
- [[four-render-contexts-partition-telemetry-by-nextjs-runtime]] — extends: the 'edge' context has no data

Domains:
- [[frontend-patterns]]
