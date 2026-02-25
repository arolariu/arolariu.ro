---
description: "BatchSpanProcessor batches trace exports instead of sending each span individually, dramatically reducing network calls to the collector"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Batch span processing reduces network overhead by 95 percent

Instead of exporting each span the moment it completes, the BatchSpanProcessor accumulates spans and exports them in configurable batches. The RFC documents a 95% reduction in network overhead compared to immediate export via SimpleSpanProcessor.

This is a classic throughput-vs-latency trade-off. Batching introduces a small delay before spans appear in the observability backend, but eliminates the per-span network round-trip cost. For a web application generating hundreds of spans per second during peak traffic, the difference between one-at-a-time and batched export is the difference between saturating the network and barely noticing telemetry overhead.

The production configuration uses BatchSpanProcessor exclusively. SimpleSpanProcessor is reserved for development environments where immediate span visibility matters more than export efficiency — developers want to see traces appear in Jaeger the moment a request completes, even if that costs more network calls.

The batch size, export interval, and queue limits are tunable. The defaults favor reliability (dropping spans rather than blocking the application), which aligns with the principle that telemetry should never degrade application performance.

---

Related Insights:
- [[periodic-metric-export-at-60-seconds-balances-freshness-against-cost]] — extends: the same batching philosophy applied to metrics
- [[network-telemetry-overhead-scales-linearly-with-traffic]] — enables: batching keeps the linear scaling manageable

Domains:
- [[frontend-patterns]]
