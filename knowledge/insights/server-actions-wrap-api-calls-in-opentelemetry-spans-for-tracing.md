---
description: "Every server action uses withSpan to create a named trace span around the entire API call lifecycle, including auth, fetch, result mapping, and error handling"
type: convention
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Server actions wrap API calls in OpenTelemetry spans for tracing

Every server action in the codebase follows a mandatory convention: the entire action body is wrapped in a `withSpan` call that creates an OpenTelemetry trace span. The span name follows the `api.actions.{domain}.{actionName}` convention (e.g., `api.actions.invoices.fetchInvoices`), which makes server action traces discoverable in any OTEL-compatible backend.

This convention bridges the gap between the frontend's server-side execution environment and the backend API. A server action that fetches invoices produces a span covering the full lifecycle: JWT retrieval from the auth service, the HTTP fetch to the backend API (with its own child span from auto-instrumentation), response parsing, result mapping, and error handling. If any step fails, the span records the error with full context.

The convention interacts directly with the `ServerActionResult` pattern. Because server actions return structured results instead of throwing, the `withSpan` wrapper can record success or failure as span attributes without catching exceptions at the span boundary. The span always completes cleanly, with its status reflecting the action's logical outcome rather than an uncaught exception.

The `fetchWithTimeout` utility adds a 30-second default timeout to all API calls within spans, preventing indefinitely-hanging requests from producing orphaned spans that never close.

---

Related Insights:
- [[withspan-pattern-wraps-async-operations-for-automatic-span-lifecycle]] — foundation: the generic withSpan API that server actions consume
- [[server-action-results-use-discriminated-unions-instead-of-exceptions]] — enables: structured results make span error recording consistent
- [[http-status-codes-map-to-semantic-error-codes-for-ui-consumption]] — extends: error codes appear as span attributes

Domains:
- [[frontend-patterns]]
