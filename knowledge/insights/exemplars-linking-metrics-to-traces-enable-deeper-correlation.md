---
description: "Metric exemplars attach trace IDs to specific metric data points, enabling drill-down from aggregate dashboards to individual request traces"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# Exemplars linking metrics to traces enable deeper correlation

Exemplars bridge the gap between metrics and traces. When a histogram records a particularly slow request duration, an exemplar attaches the trace ID of that specific request to the metric data point. This enables a workflow: see a P99 spike on a dashboard, click the spike, jump directly to the trace of the slow request. Without exemplars, investigating a metric anomaly requires manually searching traces by timestamp range. The OpenTelemetry specification supports exemplars, but not all backends support querying them yet (Prometheus has experimental support, Grafana Tempo integrates well).

---

Related Insights:
- [[database-query-instrumentation-records-span-attributes-and-histogram-duration]] — enables: histograms are the primary exemplar target

Domains:
- [[frontend-patterns]]
