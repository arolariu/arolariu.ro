---
description: "ServerActionResult<T> is a {success: true, data: T} | {success: false, error: {code, message, status?}} union that TypeScript narrows after checking success"
type: decision
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Server action results use discriminated unions instead of exceptions

All server actions in the Next.js frontend return `ServerActionResult<T>` -- a discriminated union where `success: true` carries the typed `data: T` payload and `success: false` carries a structured error object with a semantic `code`, human-readable `message`, and optional HTTP `status`. Server actions never throw exceptions across the server-client boundary.

This design choice reflects a fundamental constraint: server actions in Next.js cross a serialization boundary between server and client. Thrown exceptions lose their type information, stack traces, and structured error data during this crossing. By encoding success and failure as data rather than control flow, the result type preserves all error context through serialization.

TypeScript's control flow narrowing makes this ergonomic. After `if (result.success)`, the compiler knows `result.data` exists with type `T`. After the else branch, `result.error` is available with its full structure. No type assertions or runtime checks beyond the initial discriminant test.

The error structure includes a `ServerActionErrorCode` enum (`NETWORK_ERROR`, `TIMEOUT_ERROR`, `AUTH_ERROR`, `NOT_FOUND`, `VALIDATION_ERROR`, `SERVER_ERROR`, `UNKNOWN_ERROR`) that enables consistent UI error messaging. Since [[http-status-codes-map-to-semantic-error-codes-for-ui-consumption]], client components can switch on error codes to show context-appropriate error states without parsing error strings.

---

Related Insights:
- [[http-status-codes-map-to-semantic-error-codes-for-ui-consumption]] — extends: the mapping mechanism that populates error codes
- [[server-actions-wrap-api-calls-in-opentelemetry-spans-for-tracing]] — enables: consistent result structure makes span error recording uniform

Domains:
- [[frontend-patterns]]
