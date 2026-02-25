---
description: "Six TypeScript interfaces (Http, NextJs, Database, Cache, Auth, Error) mirror OpenTelemetry semantic conventions for cross-tool compatibility"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Semantic attribute interfaces align OpenTelemetry spec with TypeScript

Rather than allowing arbitrary key-value pairs as span attributes, six typed interfaces enforce the OpenTelemetry semantic conventions specification. `HttpAttributes` requires `http.method`, `http.status_code`, and `http.url`. `DatabaseAttributes` requires `db.system`, `db.statement`, and `db.operation`. `CacheAttributes`, `AuthAttributes`, `NextJsAttributes`, and `ErrorAttributes` each define their respective required and optional fields.

These interfaces mirror the official OTEL semantic conventions document, ensuring that traces exported from this application are compatible with any OTEL-compliant backend without attribute mapping or transformation. A trace viewed in Jaeger, Grafana Tempo, or Datadog will display the same attribute names and types because they all expect the same semantic convention keys.

The interfaces also prevent high-cardinality attributes — like user IDs or request bodies used as attribute keys — that degrade backend query performance. By defining a fixed set of allowed attributes per signal type, the type system makes it impossible to accidentally introduce cardinality bombs.

When the OTEL semantic conventions spec evolves (it is still stabilizing for some signal types), updating the TypeScript interfaces propagates changes to every instrumentation call site, making spec compliance a compiler-enforced property rather than a review-time concern.

---

Related Insights:
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — foundation: the overarching type-safety approach
- [[helper-functions-create-semantic-convention-compliant-attributes]] — extends: factory functions that produce these typed attributes
- [[ad-hoc-attribute-naming-creates-inconsistent-high-cardinality-telemetry]] — contradicts: the problem this solves

Domains:
- [[frontend-patterns]]
