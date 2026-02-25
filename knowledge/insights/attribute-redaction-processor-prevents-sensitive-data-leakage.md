---
description: "SensitiveDataProcessor intercepts spans before export and redacts attributes like user.email and auth tokens, preventing PII from reaching telemetry backends"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# Attribute redaction processor prevents sensitive data leakage

A SensitiveDataProcessor class would sit in the span processing pipeline between span completion and export. It inspects every span's attributes and redacts known sensitive fields (user.email to [REDACTED], auth.token to [REDACTED]). This is a defense-in-depth measure — the type system prevents most sensitive attributes from being added, but the processor catches anything that slips through. The processor runs synchronously in the export pipeline, so its performance must be negligible. Pattern matching against a configurable deny-list of attribute names provides flexibility without code changes.

---

Related Insights:
- [[logging-sensitive-data-in-trace-attributes-is-a-security-violation]] — resolves: the anti-pattern this prevents
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — extends: defense-in-depth beyond compile-time checks

Domains:
- [[frontend-patterns]]
- [[cross-cutting]]
