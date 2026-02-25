---
description: "Template literal types and semantic attribute interfaces catch naming violations, wrong log levels, and incorrect HTTP methods before deployment"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Type-safe telemetry prevents instrumentation errors at compile time

The central thesis of RFC 1001 is that telemetry bugs belong in the editor, not in production dashboards. Rather than discovering misspelled span names, wrong attribute types, or invalid log levels through missing traces in a live system, the TypeScript type system catches them during development.

Template literal types constrain span operation names to valid prefixes (`api.`, `db.`, `cache.`, `http.server.`, `http.client.`, `auth.`), so a span named `userGet` instead of `api.userGet` produces a compile error. Semantic attribute interfaces enforce correct attribute shapes — `HttpAttributes` requires `http.method`, `http.status_code`, and `http.url` with their correct types.

This shifts observability bugs from "invisible in production" to "red squiggles in the editor." The trade-off is additional type complexity in the telemetry layer, but since telemetry code is infrastructure-level and changes infrequently, the upfront cost pays for itself quickly. The alternative — runtime validation or no validation at all — means broken instrumentation silently degrades observability without any visible failure signal.

The approach also prevents high-cardinality attribute injection and enforces semantic convention compliance, making traces interoperable across any OTEL-compliant backend without post-hoc attribute mapping.

---

Related Insights:
- [[template-literal-types-enforce-span-naming-conventions]] — foundation: the specific mechanism for span names
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — foundation: the specific mechanism for attributes
- [[low-cardinality-attributes-enforced-by-type-system-prevent-dashboard-explosion]] — extends: a downstream benefit of the type system

Domains:
- [[frontend-patterns]]
