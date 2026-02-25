---
description: "RenderContext type ('server' | 'client' | 'edge' | 'api') tags every telemetry signal with its execution environment for precise filtering"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Four render contexts partition telemetry by Next.js runtime

The `RenderContext` type creates four partitions for telemetry data: `server` (RSC rendering), `client` (browser-side), `edge` (edge runtime functions), and `api` (API route handlers). Every log message and span includes this context as an attribute. This enables precise dashboard filtering — "show me all slow database queries from API routes" vs "show me all rendering traces from server components." Without this partition, a dashboard aggregating all request latencies would mix SSR rendering time with API response time, producing misleading percentiles. The four contexts map directly to Next.js's execution environments.

---

Related Insights:
- [[telemetry-initialization-is-runtime-conditional-for-nodejs-only]] — extends: the runtime guard is aware of these contexts
- [[edge-runtime-has-limited-auto-instrumentation-creating-observability-gap]] — tension: edge context has incomplete telemetry

Domains:
- [[frontend-patterns]]
