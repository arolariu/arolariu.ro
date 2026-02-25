---
description: "Metrics use component.operation naming like api.user.requests, db.query.duration, cache.redis.hits for consistent dashboarding and alerting"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Metric naming follows component.operation convention

All custom metrics follow the `<component>.<operation>` naming pattern. Examples: `api.user.requests` (counter), `db.query.duration` (histogram), `cache.redis.hits` (counter), `cache.redis.misses` (counter). This convention produces self-documenting metric names that map naturally to dashboard organization. The component prefix groups related metrics in metric explorers, while the operation suffix distinguishes what's being measured. This mirrors the span naming convention enforced by `SpanOperationType` template literal types. Consistent naming across traces and metrics means a developer can find related signals by component prefix.

---

Related Insights:
- [[template-literal-types-enforce-span-naming-conventions]] — extends: the span equivalent of this metric naming convention
- [[request-counting-uses-metric-counters-with-semantic-attributes]] — example: a specific application of this naming convention

Domains:
- [[frontend-patterns]]
