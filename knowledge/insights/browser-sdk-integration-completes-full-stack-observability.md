---
description: "@opentelemetry/sdk-trace-web would extend tracing from server to browser, creating end-to-end request visibility from click to response"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# Browser SDK integration completes full-stack observability

The current observability system covers server-side execution only. Browser SDK integration would add client-side tracing using @opentelemetry/sdk-trace-web, creating end-to-end visibility: user click, browser fetch, server processing, database query, response, browser rendering. This would capture Core Web Vitals (LCP, FID, CLS) as OTEL metrics, user interaction spans, and client-side error traces. The W3C Trace Context header would link browser-initiated traces to their server-side continuations. The challenge is a dual-SDK architecture (NodeSDK for server, WebSDK for browser) with different export strategies (browser typically exports to a collector proxy to avoid CORS issues).

---

Related Insights:
- [[client-side-observability-requires-separate-browser-sdk]] — tension: the dual-SDK maintenance burden
- [[four-render-contexts-partition-telemetry-by-nextjs-runtime]] — extends: would add full coverage for the 'client' render context

Domains:
- [[frontend-patterns]]
