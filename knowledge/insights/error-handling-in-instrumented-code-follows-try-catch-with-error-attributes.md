---
description: "Consistent pattern: catch error → createErrorAttributes → logWithTrace at error level → recordSpanError, ensuring errors appear in both logs and traces"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Error handling in instrumented code follows try-catch with error attributes

Instrumented code follows a four-step error handling pattern: (1) catch the error in a try-catch block, (2) create structured error attributes via `createErrorAttributes(error, handled)` where `handled` indicates if the error is recoverable, (3) log the error with `logWithTrace('error', message, attributes)` for the logging pipeline, (4) record the error on the active span with `recordSpanError(error)` for the tracing pipeline. This dual-recording ensures errors are visible in both log-based and trace-based investigation workflows. The `handled` flag distinguishes expected errors (validation failures) from unexpected ones (infrastructure errors), enabling different alerting thresholds.

---

Related Insights:
- [[withspan-pattern-wraps-async-operations-for-automatic-span-lifecycle]] — foundation: the span context in which errors are recorded
- [[helper-functions-create-semantic-convention-compliant-attributes]] — enables: createErrorAttributes is one of the factory functions

Domains:
- [[frontend-patterns]]
