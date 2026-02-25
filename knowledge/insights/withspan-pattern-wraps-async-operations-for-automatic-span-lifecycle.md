---
description: "Core API that creates a span, passes it to a callback, and handles errors and completion automatically — the primary manual instrumentation interface"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# The withSpan pattern wraps async operations for automatic span lifecycle

The `withSpan` function is the primary developer-facing API for manual instrumentation. It accepts a span name (constrained by `SpanOperationType`), optional attributes, and an async callback. The function creates a new span, passes it to the callback, records any errors that occur, and closes the span when the callback completes — whether successfully or with an error.

This pattern eliminates the common bug of forgetting to close spans. An unclosed span causes memory leaks in the span processor and produces incomplete traces in the backend — a trace that starts but never finishes, with no error recorded. The `withSpan` wrapper makes this impossible by tying the span lifecycle to the callback scope.

Developers focus on business logic inside the callback; the span lifecycle is handled automatically. It parallels the `using` pattern in C# or try-with-resources in Java — resource acquisition and release are structurally guaranteed rather than relying on developer discipline.

The pattern also standardizes error recording. When the callback throws, `withSpan` catches the error, sets the span status to ERROR, records the exception as a span event with stack trace, and re-throws. This ensures every failed operation produces a complete, queryable error trace without requiring explicit error handling in each instrumentation site.

---

Related Insights:
- [[auto-instrumentation-covers-http-fetch-filesystem-dns-without-manual-spans]] — foundation: withSpan is used where auto-instrumentation cannot reach
- [[error-handling-in-instrumented-code-follows-try-catch-with-error-attributes]] — extends: error handling within instrumented operations
- [[span-creation-overhead-of-10-50-microseconds-is-negligible]] — enables: low overhead makes wrapping operations practical

Domains:
- [[frontend-patterns]]
