---
description: "register() checks NEXT_RUNTIME === 'nodejs' to gate full SDK initialization, preventing edge runtime from loading incompatible Node.js-specific instrumentation"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Telemetry initialization is runtime-conditional for Node.js only

The `register()` function includes a runtime guard: `if (process.env.NEXT_RUNTIME === 'nodejs')`. This prevents the full OpenTelemetry NodeSDK from loading in the Next.js edge runtime, which does not support all Node.js APIs that the SDK and auto-instrumentation libraries require.

Without this guard, edge functions would crash on import when the SDK attempts to use Node.js-specific modules like `fs`, `dns`, or `http` that are unavailable in the edge runtime environment.

The guard means edge functions currently run without telemetry — a known gap documented as a tension. Requests handled by edge middleware or edge API routes produce no traces, no metrics, and no logs through the OpenTelemetry pipeline. This creates blind spots in the observability story for latency-sensitive routes deployed to the edge.

The long-term solution is a separate lightweight SDK for edge that uses only Web APIs (fetch, Performance API), but until then, the runtime check is the pragmatic approach that prevents crashes while accepting reduced visibility.

---

Related Insights:
- [[nextjs-register-function-is-the-single-telemetry-initialization-point]] — foundation: the function containing this guard
- [[edge-runtime-has-limited-auto-instrumentation-creating-observability-gap]] — extends: the observability gap this guard creates

Domains:
- [[frontend-patterns]]
