---
description: "Database operations capture both a span (for distributed traces) and a histogram metric (for aggregate latency analysis), providing two analysis dimensions"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Database query instrumentation records span attributes and histogram duration

Every database query is instrumented with two signals simultaneously: a trace span and a duration histogram metric. The span captures the full context — which trace it belongs to, what SQL/NoSQL operation was performed, timing, success/failure — enabling per-request debugging. The histogram captures the duration distribution across all queries, enabling aggregate analysis: P50/P95/P99 latency, slow query identification, and trend detection over time. This dual-capture pattern is more expensive than either signal alone but provides complementary analysis: "which specific request was slow?" (traces) and "are queries getting slower over time?" (metrics).

---

Related Insights:
- [[cache-instrumentation-tracks-hit-miss-ratios-through-dual-counters]] — extends: similar pattern for cache operations
- [[helper-functions-create-semantic-convention-compliant-attributes]] — enables: createDatabaseAttributes produces the span attributes

Domains:
- [[frontend-patterns]]
