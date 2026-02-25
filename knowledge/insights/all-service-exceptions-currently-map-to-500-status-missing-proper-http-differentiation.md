---
description: "Endpoint handlers catch all exception categories but return 500 InternalServerError for every case -- ValidationException should be 400, DependencyException should be 500"
type: gotcha
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# All service exceptions currently map to 500 status missing proper HTTP differentiation

The endpoint handler catch blocks in `InvoiceEndpoints.Handlers.cs` catch four distinct exception types (`InvoiceProcessingServiceValidationException`, `InvoiceProcessingServiceDependencyException`, `InvoiceProcessingServiceDependencyValidationException`, and the generic `InvoiceProcessingServiceException`), but every single catch block returns `TypedResults.Problem` with `StatusCodes.Status500InternalServerError`. This defeats the purpose of the three-tier exception classification since [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]].

The correct mapping should be: `ValidationException` and `DependencyValidationException` to `400 Bad Request` (the client sent invalid data), `DependencyException` and generic `ServiceException` to `500 Internal Server Error` (the server failed), and future `NotFoundException` to `404`. This gap means API consumers cannot distinguish between "your request was invalid" and "our database is down" -- both look like server errors.

The RFC explicitly acknowledges this as a planned enhancement. The fix could be implemented either as refined catch blocks in each handler or as a global exception-to-status middleware. Until this is addressed, frontend Server Actions (which call these endpoints) cannot reliably implement user-facing error differentiation based on HTTP status codes. Since [[server-components-fetch-data-and-server-actions-mutate-keeping-a-slim-bff-barrier]], the write path depends on meaningful HTTP status codes to translate API responses into structured results for client islands — but all errors currently look the same.

---

Related Insights:
- [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]] -- foundation: the classification system that this gap fails to surface in HTTP responses
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] -- context: the Exposer layer where this mapping should live
- [[http-status-codes-map-to-semantic-error-codes-for-ui-consumption]] -- contradicts: the frontend expects semantic error codes but the backend returns 500 for everything
- [[server-components-fetch-data-and-server-actions-mutate-keeping-a-slim-bff-barrier]] -- impact: the write path cannot distinguish validation from infrastructure failures
- [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]] -- impact: the BFF error handling is degraded by undifferentiated 500 responses

Domains:
- [[backend-architecture]]
