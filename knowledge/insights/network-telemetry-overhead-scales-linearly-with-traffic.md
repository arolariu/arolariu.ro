---
description: "Telemetry export generates 100-500KB per minute at typical traffic levels, scaling linearly with request volume rather than exponentially"
type: constraint
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Network telemetry overhead scales linearly with traffic

The network bandwidth consumed by telemetry export is 100-500KB per minute under typical traffic conditions. This scales linearly with request volume — double the traffic, double the export volume.

The linear scaling is a design property of the batching and export system: each request generates a roughly constant amount of telemetry data (one trace with N spans, increments to M counters), and the BatchSpanProcessor and PeriodicExportingMetricReader aggregate efficiently.

Without batching, the scaling would be worse due to per-span network overhead (TCP connection setup, HTTP headers, TLS handshake per export). Without the type system limiting attributes, high-cardinality fields could cause super-linear growth in the metrics dimension.

The key implication: telemetry cost is predictable from traffic forecasts. If current traffic generates 300KB/min of telemetry export, a projected 3x traffic increase will generate approximately 900KB/min. This predictability enables capacity planning for both the Collector infrastructure and the observability backend storage.

At very high traffic volumes, sampling becomes necessary to maintain the linear cost profile while preserving statistical representativeness.

---

Related Insights:
- [[batch-span-processing-reduces-network-overhead-by-95-percent]] — enables: batching keeps the linear coefficient small
- [[periodic-metric-export-at-60-seconds-balances-freshness-against-cost]] — enables: periodic export smooths the traffic
- [[all-traces-exported-without-sampling-creates-cost-pressure-at-scale]] — tension: without sampling, the linear scaling applies to 100% of traffic

Domains:
- [[frontend-patterns]]
