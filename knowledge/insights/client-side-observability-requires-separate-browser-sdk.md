---
description: "Server uses NodeSDK, browser needs WebSDK — two SDKs mean two configurations, two update cycles, and potential version mismatches"
type: gotcha
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Client-side observability requires separate browser SDK

Full-stack observability requires two separate OpenTelemetry SDKs: NodeSDK for server-side and @opentelemetry/sdk-trace-web for the browser. These are different packages with different APIs, different configuration patterns, and different export strategies. The NodeSDK exports directly to an OTLP endpoint; the browser SDK typically exports to a proxy endpoint (to avoid CORS issues and hide backend URLs). Keeping both SDKs at compatible versions, with consistent resource attributes and sampling configuration, is an ongoing maintenance burden. A bug in one SDK doesn't necessarily exist in the other. Testing must cover both environments.

---

Related Insights:
- [[browser-sdk-integration-completes-full-stack-observability]] — extends: the feature that would require this dual maintenance
- [[edge-runtime-has-limited-auto-instrumentation-creating-observability-gap]] — extends: another environment with SDK limitations

Domains:
- [[frontend-patterns]]
