---
description: "Constrained attribute interfaces prevent high-cardinality fields like user IDs or UUIDs in metric labels, which degrade backend query performance exponentially"
type: constraint
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Low-cardinality attributes enforced by type system prevent dashboard explosion

High-cardinality attributes — fields with many unique values like user IDs, session tokens, or request UUIDs — are one of the most expensive mistakes in observability. Each unique attribute combination creates a new time series in the metrics backend. 1000 users times 50 endpoints equals 50,000 time series from a single counter.

The type system prevents this by constraining attribute interfaces to known, low-cardinality fields. `HttpAttributes` allows `http.method` (7 values) and `http.status_code` (5 common values) but not arbitrary string fields. High-cardinality data belongs in span attributes (trace storage) not metric labels (time series storage).

This distinction is critical because metrics backends (Prometheus, Azure Monitor Metrics) store time series data, and cost scales with the number of unique label combinations. Trace backends (Jaeger, Azure Monitor Traces) store individual events and handle high cardinality efficiently.

The type system makes it a compile-time error to accidentally add a user ID as a metric attribute, catching the mistake before it reaches production and inflates the observability bill.

---

Related Insights:
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — foundation: the interfaces that enforce low cardinality
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — foundation: the type system making this enforceable
- [[ad-hoc-attribute-naming-creates-inconsistent-high-cardinality-telemetry]] — contradicts: the anti-pattern this prevents

Domains:
- [[frontend-patterns]]
