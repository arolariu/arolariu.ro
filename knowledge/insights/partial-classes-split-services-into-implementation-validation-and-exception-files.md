---
description: "Each Foundation/Processing/Orchestration service uses 3-4 partial class files: main implementation, .Validations.cs, .Exceptions.cs, and optionally .TryCatch.cs"
type: convention
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Partial classes split services into implementation, validation, and exception files

Service classes in The Standard's layers are organized as C# partial classes spread across multiple files by concern. A typical Foundation service like `InvoiceStorageFoundationService` has three files: the main implementation file (`InvoiceStorageFoundationService.cs`) containing constructor, dependencies, and business method bodies; a validation file (`InvoiceStorageFoundationService.Validations.cs`) containing private validation methods like `ValidateIdentifierIsSet` and `ValidateInvoiceInformationIsValid`; and an exceptions file (`InvoiceStorageFoundationService.Exceptions.cs`) containing the `TryCatchAsync` wrapper that catches and reclassifies exceptions from the layer below.

This file organization serves multiple purposes. Validation logic is separately reviewable -- a code reviewer can focus on `*.Validations.cs` files to verify input checking completeness. Exception handling patterns are separately auditable via `*.Exceptions.cs` files. The main implementation file stays focused on the business flow without being cluttered by validation and exception boilerplate.

Endpoint classes follow a similar but expanded pattern: `InvoiceEndpoints.cs` (route registration), `InvoiceEndpoints.Handlers.cs` (handler implementations), `InvoiceEndpoints.Mappings.cs` (DTO conversions), and `InvoiceEndpoints.Metadata.cs` (OpenAPI documentation). Since [[exposer-endpoints-split-across-four-partial-class-files-by-concern]], endpoints have four files rather than the typical three.

---

Related Insights:
- [[each-layer-validates-its-own-inputs-independently]] -- enables: validation partial files are where per-layer validation lives
- [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]] -- enables: exception partial files implement the three-tier wrapping
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] -- foundation: TryCatch lives in the exceptions partial class file
- [[exposer-endpoints-split-across-four-partial-class-files-by-concern]] -- extends: endpoints expand the pattern to four files

Domains:
- [[backend-architecture]]
