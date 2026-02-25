---
description: "The OpenTelemetry SDK plus auto-instrumentation libraries consume 10-20MB of memory — the fixed cost of comprehensive observability"
type: constraint
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Memory footprint of 10-20MB establishes telemetry cost baseline

The combined memory footprint of the OpenTelemetry NodeSDK, OTLP exporters, and 20+ auto-instrumentation libraries is 10-20MB. This is a fixed cost regardless of traffic volume — the SDK allocates its data structures at initialization.

For a Next.js server process typically allocated 256MB-1GB of heap, the telemetry overhead is 1-8% of available memory. This is the baseline cost of comprehensive observability and should be factored into container memory limits when sizing infrastructure.

The SDK uses pooled span objects and efficient attribute storage to keep per-request memory allocation minimal on top of this base cost. Active spans consume additional memory proportional to concurrent request volume, but completed spans are released back to the pool after export.

This fixed cost is the price of having 20+ auto-instrumentation libraries loaded and ready to intercept HTTP, fetch, DNS, filesystem, and other operations. A more selective instrumentation approach (loading only HTTP and fetch instrumentations) would reduce the footprint but sacrifice visibility into other subsystems.

---

Related Insights:
- [[lazy-initialization-of-tracer-and-meter-prevents-startup-penalty]] — extends: lazy init defers some of this memory allocation
- [[less-than-1-percent-cpu-overhead-validates-comprehensive-instrumentation]] — extends: memory cost complements CPU cost assessment
- [[network-telemetry-overhead-scales-linearly-with-traffic]] — extends: the variable cost on top of this fixed cost

Domains:
- [[frontend-patterns]]
