---
description: "Span names like 'user-get' or 'fetchData' without prefix conventions create inconsistent traces that resist aggregation and dashboard filtering"
type: gotcha
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Untyped span names bypass semantic conventions

Without the `SpanOperationType` constraint, developers create span names based on whatever feels natural: `user-get`, `fetchData`, `processInvoice`, `handle_request`. These names have no consistent structure, making it impossible to build reliable dashboards or automated alerts.

A dashboard filtering by `api.*` spans would miss `fetchData`. Aggregation by operation type (all database operations, all cache operations) requires manually maintaining a mapping table that must be updated every time a developer adds a new span. Trend analysis across releases becomes unreliable because span names drift organically.

The RFC's Section 4.1 shows the compile-time enforcement directly: `withSpan('user-get', ...)` produces a TypeScript error because `'user-get'` does not match any branch of the `SpanOperationType` union. The type requires a dotted prefix: `api.user.get`, `db.query`, `cache.get`, `component.UserProfile`. This structural consistency enables three capabilities that ad-hoc naming prevents.

First, automatic grouping — all spans starting with `db.` are database operations, no mapping needed. Second, hierarchical filtering — `api.user.*` narrows to user-related API operations. Third, cross-release trend analysis — because the naming structure is enforced, the same operation produces the same span name across deployments, making latency comparisons meaningful.

The template literal type system makes this a compile-time guarantee rather than a linting rule or code review convention, which means violations are caught before code is committed.

---

Related Insights:
- [[template-literal-types-enforce-span-naming-conventions]] — resolves: the type system constraint preventing this
- [[ad-hoc-attribute-naming-creates-inconsistent-high-cardinality-telemetry]] — extends: the same problem for attributes

Domains:
- [[frontend-patterns]]
