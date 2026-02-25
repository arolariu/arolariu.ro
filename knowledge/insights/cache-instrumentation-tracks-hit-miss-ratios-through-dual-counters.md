---
description: "Separate cacheHitCounter and cacheMissCounter with shared cache.system attributes enable hit-rate dashboards and cache efficiency alerting"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Cache instrumentation tracks hit-miss ratios through dual counters

Cache observability uses two separate counters — `cacheHitCounter` and `cacheMissCounter` — rather than a single counter with a hit/miss label. Both counters share the same `cache.system` attribute identifying the cache backend (Redis, in-memory, etc.). The dual-counter approach makes dashboard math simpler: hit rate = hits / (hits + misses). A single counter with a boolean label would require the same math but with more complex PromQL/Grafana queries. The shared `cache.system` attribute enables per-backend analysis when multiple cache layers exist. Cache efficiency alerts (e.g., "hit rate below 80% for 5 minutes") can be built directly on these counters.

---

Related Insights:
- [[database-query-instrumentation-records-span-attributes-and-histogram-duration]] — extends: similar dual-capture for database operations
- [[metric-naming-follows-component-dot-operation-convention]] — foundation: naming convention for the counter names

Domains:
- [[frontend-patterns]]
