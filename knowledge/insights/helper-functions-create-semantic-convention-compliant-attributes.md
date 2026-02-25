---
description: "Seven factory functions (createHttpServerAttributes, createDatabaseAttributes, etc.) produce type-safe attribute objects matching OTEL semantic conventions"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Helper functions create semantic-convention-compliant attributes

Rather than constructing attribute objects inline — a process that is both error-prone and verbose — seven `create*Attributes()` factory functions build correctly-shaped attribute objects. `createHttpServerAttributes(req)` extracts method, URL, status code, and user agent from a request object into the standard OTEL format. `createDatabaseAttributes(system, statement, operation)` produces `db.system`, `db.statement`, and `db.operation` attributes.

These factories enforce the type system at the call site while keeping instrumentation code concise. A developer writing `createHttpServerAttributes(req)` gets a correctly-typed `HttpAttributes` object without needing to remember the exact OTEL attribute key names. The factory handles the mapping from application-level concepts (a request object) to telemetry-level concepts (semantic convention attributes).

The factories also serve as living documentation. Reading the factory function signatures shows exactly which attributes the system tracks for each signal type. When onboarding a new developer, the factory list provides a complete inventory of the telemetry schema without needing to read backend dashboard configurations.

By centralizing attribute construction, the factories create a single point of change when semantic conventions evolve. If the OTEL spec renames `http.method` to `http.request.method` (as happened in recent convention updates), one factory function update propagates the change everywhere, and the compiler flags any call sites that need attention.

---

Related Insights:
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — foundation: the interfaces these factories implement
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — foundation: the overarching type-safety strategy

Domains:
- [[frontend-patterns]]
