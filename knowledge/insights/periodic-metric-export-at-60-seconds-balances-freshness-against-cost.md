---
description: "PeriodicExportingMetricReader with 60-second interval provides near-real-time metrics without overwhelming the collector with per-second exports"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Periodic metric export at 60 seconds balances freshness against cost

Metrics are exported every 60 seconds via `PeriodicExportingMetricReader` with `exportIntervalMillis: 60_000`. This is a deliberate trade-off between data freshness and network cost.

More frequent export (e.g., every 5 seconds) would provide near-real-time dashboards but generate 12x more network traffic. Less frequent export (e.g., every 5 minutes) would save bandwidth but make dashboards lag behind reality.

The 60-second interval means dashboards are at most one minute behind current state — acceptable for monitoring but potentially too slow for real-time alerting on latency-sensitive operations. For traces, the BatchSpanProcessor handles its own export timing separately.

This interval is a configuration value, not a hard architectural constraint. Teams can adjust it per environment — shorter in staging for faster feedback loops, longer in production for cost control.

---

Related Insights:
- [[batch-span-processing-reduces-network-overhead-by-95-percent]] — extends: the same batching philosophy applied to traces
- [[network-telemetry-overhead-scales-linearly-with-traffic]] — enables: 60s intervals keep network overhead predictable

Domains:
- [[frontend-patterns]]
