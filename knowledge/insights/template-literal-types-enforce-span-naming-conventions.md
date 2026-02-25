---
description: "SpanOperationType constrains span names to valid prefixes like api., db., cache., http.server. using TypeScript template literal types"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Template literal types enforce span naming conventions

The `SpanOperationType` type uses TypeScript template literal types to enforce that span names follow the OpenTelemetry naming convention of `prefix.operation`. Valid prefixes include `api.`, `db.`, `cache.`, `http.server.`, `http.client.`, and `auth.`. A call like `withSpan('userGet', ...)` fails type checking because `userGet` does not match any valid prefix pattern — it must be `api.userGet` or similar.

This convention prevents the common anti-pattern of ad-hoc span naming that makes dashboards ungovernable. When one developer names a span `getUser`, another names it `user.fetch`, and a third names it `api_user_get`, the resulting dashboard has three unrelated entries for the same logical operation. Template literal types make this inconsistency a compile error.

Since span names become metric labels and dashboard filters in observability backends, inconsistent naming cascades into inconsistent observability. A misspelled span name does not cause a runtime error — it silently creates an orphan entry in Jaeger or Grafana that no one monitors, while the correctly-named dashboard panel shows a gap.

The prefix vocabulary is intentionally limited. Adding a new prefix requires modifying the type definition, which forces a deliberate decision about whether the new category of spans is warranted.

---

Related Insights:
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] — foundation: the overarching type-safety strategy
- [[untyped-span-names-bypass-semantic-conventions]] — contradicts: the anti-pattern this prevents
- [[metric-naming-follows-component-dot-operation-convention]] — extends: similar convention for metric names

Domains:
- [[frontend-patterns]]
