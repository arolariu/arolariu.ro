---
description: "Unit tests for the seven create*Attributes helper functions verify that compile-time type guarantees produce correct attribute shapes at runtime"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Integration tests validate type-safe telemetry attributes at runtime

The type system provides compile-time guarantees, but runtime behavior can still diverge — a type assertion could mask a runtime error, or a factory function could construct attributes that satisfy the type but violate semantic conventions. Integration tests close this gap by calling each `create*Attributes` function with realistic inputs and asserting that the output matches the expected OTEL semantic convention format.

Section 8.3 of the RFC shows concrete test examples: `createHttpServerAttributes('GET', 200, {route: '/api/user'})` is tested to produce `http.method` equal to `'GET'`, `http.status_code` equal to `200`, and `http.route` equal to `'/api/user'`. Similar tests exist for `createNextJsAttributes`, `createDatabaseAttributes`, `createCacheAttributes`, `createAuthAttributes`, `createErrorAttributes`, and `createHttpClientAttributes`.

These tests validate three dimensions: correct attribute keys (matching the OTEL spec exactly — `http.method` not `httpMethod`), correct value types (string for methods, number for status codes, boolean for cache hits), and correct value constraints (HTTP methods are uppercase, status codes are numeric, cache operations are from the allowed enum). A type-level guarantee that `http.status_code` is `number` does not prevent a bug where the function returns `undefined` — only a runtime test catches that.

The tests serve double duty as documentation — reading the test assertions shows exactly what attributes each factory produces, which is faster than reading the function implementation.

---

Related Insights:
- [[helper-functions-create-semantic-convention-compliant-attributes]] — foundation: the functions under test
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — foundation: the interfaces the tests validate against

Domains:
- [[frontend-patterns]]
