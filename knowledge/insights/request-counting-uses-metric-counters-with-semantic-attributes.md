---
description: "requestCounter.add(1, attributes) with route, method, and auth status enables dimensional analysis — slicing request volume by any combination of attributes"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Request counting uses metric counters with semantic attributes

HTTP request counting uses a single counter metric with semantic attributes for dimensional analysis. Each `requestCounter.add(1, {...attributes})` call increments the counter and tags it with the request's route, HTTP method, status code, and authentication status. This enables dashboards to slice request volume by any attribute dimension: "requests per route," "error rate by method," "authenticated vs anonymous traffic." The key design choice is using a counter with attributes rather than separate counters per route — the former scales to hundreds of routes without counter proliferation, while the latter would require creating new counters as routes are added.

---

Related Insights:
- [[metric-naming-follows-component-dot-operation-convention]] — foundation: the naming convention for the counter
- [[low-cardinality-attributes-enforced-by-type-system-prevent-dashboard-explosion]] — constraint: attributes must be low-cardinality to prevent time series explosion

Domains:
- [[frontend-patterns]]
