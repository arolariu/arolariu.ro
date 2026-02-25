---
description: "Passwords, tokens, PII, and credentials must never appear in span attributes or log messages — only non-sensitive identifiers like user ID are permitted"
type: gotcha
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Logging sensitive data in trace attributes is a security violation

Telemetry data often has different access controls than application data. A span attribute containing `user.email` or `auth.token` might be visible to anyone with dashboard access, persisted in a third-party backend, or included in debug exports sent to external vendors. The RFC explicitly marks this as a critical anti-pattern in Section 11.1: never include passwords, authentication tokens, personally identifiable information (PII), or credentials in span attributes or log messages.

Only non-sensitive identifiers are permitted: user ID, request ID, invoice ID, session ID. These allow trace correlation without exposing data that has regulatory or security implications. The RFC's code example shows the contrast directly — `{password: user.password}` is the bad pattern, `{userId: user.id}` is the correct one.

The type system's constrained attribute interfaces provide the first line of defense. The `AuthAttributes` interface includes `user.authenticated` (boolean) and `user.role` (string) but deliberately excludes fields like `user.email`, `user.name`, or `auth.token`. However, the general `TelemetryAttributes` type (`Record<string, string | number | boolean | undefined>`) is flexible enough to accept arbitrary keys, so developer discipline and code review remain essential.

Section 11.2 describes a speculative `SensitiveDataProcessor` that would intercept and redact attributes matching sensitive patterns (like `user.email`) before export. This would add defense-in-depth but is not yet implemented. Until it is, prevention depends entirely on code-level discipline.

---

Related Insights:
- [[attribute-redaction-processor-prevents-sensitive-data-leakage]] — resolves: the defense-in-depth solution
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — enables: typed interfaces exclude sensitive fields

Domains:
- [[frontend-patterns]]
- [[cross-cutting]]
