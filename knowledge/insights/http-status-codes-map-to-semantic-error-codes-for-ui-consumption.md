---
description: "mapHttpStatusToErrorCode translates 401/403 to AUTH_ERROR, 404 to NOT_FOUND, 400/422 to VALIDATION_ERROR, 5xx to SERVER_ERROR for UI-level error branching"
type: convention
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# HTTP status codes map to semantic error codes for UI consumption

The `mapHttpStatusToErrorCode` function in `sites/arolariu.ro/src/lib/utils.server.ts` translates raw HTTP status codes into a fixed set of seven semantic error codes. This translation layer exists because UI components should not reason about HTTP semantics -- a component displaying an error message cares whether the user lacks permission (`AUTH_ERROR`), the resource is missing (`NOT_FOUND`), or the input was invalid (`VALIDATION_ERROR`), not whether the backend returned a 401 vs 403 or a 400 vs 422.

The mapping collapses related HTTP codes into broader categories: both 401 (Unauthorized) and 403 (Forbidden) become `AUTH_ERROR` because the UI response is identical -- prompt the user to re-authenticate. Similarly, 400 (Bad Request) and 422 (Unprocessable Entity) both become `VALIDATION_ERROR` because the UI response is the same -- show field-level error feedback.

A `createErrorResult` helper handles caught JavaScript exceptions, distinguishing timeout errors (by inspecting the error message for "timed out") from generic network failures. This ensures that client-side failures like DNS resolution errors or aborted requests also produce structured error results rather than unhandled exceptions propagating through the component tree.

The convention is that every server action must use these helpers rather than constructing error objects inline. This prevents error code drift where different actions invent different error structures.

---

Related Insights:
- [[server-action-results-use-discriminated-unions-instead-of-exceptions]] — foundation: the result type these error codes populate
- [[server-actions-wrap-api-calls-in-opentelemetry-spans-for-tracing]] — extends: error codes also appear as span attributes for observability

Domains:
- [[frontend-patterns]]
