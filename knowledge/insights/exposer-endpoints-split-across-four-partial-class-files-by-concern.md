---
description: "InvoiceEndpoints uses InvoiceEndpoints.cs (routes), .Handlers.cs (logic), .Mappings.cs (DTO conversions), and .Metadata.cs (OpenAPI docs) for separation of concerns"
type: convention
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Exposer endpoints split across four partial class files by concern

The `InvoiceEndpoints` Exposer class is organized as four partial class files, each handling a distinct concern of the HTTP surface. `InvoiceEndpoints.cs` registers route groups using `MapGroup("rest/v1")` and connects route patterns to handler methods. `InvoiceEndpoints.Handlers.cs` contains the handler implementations that inject `IInvoiceProcessingService`, extract claims, call service methods, and translate exceptions to HTTP status codes. `InvoiceEndpoints.Mappings.cs` handles conversions between DTOs (like `CreateInvoiceDto`) and domain aggregates. `InvoiceEndpoints.Metadata.cs` adds OpenAPI documentation metadata (`.WithName()`, `.Produces<T>()`, `.ProducesValidationProblem()`).

This four-file structure is an extension of the three-file pattern used by service layers (since [[partial-classes-split-services-into-implementation-validation-and-exception-files]]). The extra file exists because Exposers have DTO mapping responsibilities that other layers lack. The route registration file is deliberately minimal -- it serves as a table of contents for the endpoint surface, making it easy to review the full API contract at a glance without reading handler logic.

Endpoint versioning is dual: an internal semantic version (`SemanticVersioning = "3.0.0"`) tracks additive changes, while the external URI version segment (`rest/v1`) is decoupled from it. This allows internal API evolution without forcing URI version bumps for non-breaking changes.

---

Related Insights:
- [[partial-classes-split-services-into-implementation-validation-and-exception-files]] -- foundation: the three-file pattern that endpoints extend to four
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] -- foundation: the architectural constraint that these handler files implement
- [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]] -- enables: handler catch blocks map exception categories to HTTP responses

Domains:
- [[backend-architecture]]
