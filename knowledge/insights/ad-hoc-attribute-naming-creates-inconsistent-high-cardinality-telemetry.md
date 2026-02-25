---
description: "Without semantic conventions, attributes like 'method' (lowercase, non-standard) and 'status' (ambiguous scope) create ungovernable dashboards"
type: gotcha
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Ad-hoc attribute naming creates inconsistent high-cardinality telemetry

Before adopting semantic conventions, telemetry attributes are typically ad-hoc: one developer uses `method`, another uses `http_method`, a third uses `httpMethod`. One uses `status` for HTTP status codes, another for business logic status. This creates three compounding problems.

First, dashboards break when attribute names aren't consistent across services. A panel filtering on `http.method` returns empty results for spans that used `method` — the data exists but is invisible. Second, queries require `method OR http_method OR httpMethod` predicates, making every dashboard filter a maintenance burden that grows with each new contributor. Third, high-cardinality fields sneak in because there's no schema enforcement — a developer might add `request.body` as an attribute, creating unique values per request that degrade query performance.

The RFC's Section 9.1 migration guide shows the concrete before/after transformation. The "before" code uses `span.setAttribute('method', 'get')` (lowercase, non-standard key) and `span.setAttribute('status', 200)` (ambiguous — HTTP status? business status?). The "after" code uses `createHttpServerAttributes('GET', 200, {route: '/api/user'})` which produces exactly `http.method: 'GET'` and `http.status_code: 200` — standard keys, correct casing, unambiguous semantics.

The semantic convention interfaces solve this by providing exactly one valid attribute name for each concept. There is no way to express "HTTP method" other than `http.method`, and the `HttpMethod` type ensures the value is uppercase.

---

Related Insights:
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — resolves: the solution to this problem
- [[template-literal-types-enforce-span-naming-conventions]] — resolves: the solution for span names specifically
- [[untyped-span-names-bypass-semantic-conventions]] — extends: the same problem for span names

Domains:
- [[frontend-patterns]]
