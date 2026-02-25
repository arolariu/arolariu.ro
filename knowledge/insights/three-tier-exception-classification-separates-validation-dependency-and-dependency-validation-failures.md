---
description: "Each service layer wraps exceptions from below into three typed categories, enabling exposers to map ValidationException to 400 and DependencyException to 500"
type: pattern
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Three-tier exception classification separates validation, dependency, and dependency-validation failures

Every service layer in The Standard classifies exceptions into exactly three categories: **Validation** (the service's own input validation failed), **Dependency** (the layer below threw an unexpected error), and **DependencyValidation** (the layer below reported a validation failure that propagated up). This classification propagates through each layer -- a Foundation service catches broker exceptions and reclassifies them as `InvoiceStorageFoundationServiceDependencyException`, while a Processing service catching a Foundation validation failure wraps it as `InvoiceProcessingServiceDependencyValidationException`.

The naming convention is deterministic: `{Entity}{Layer}Service{Category}Exception`. For example, `InvoiceProcessingServiceValidationException` means the Processing layer's own validation logic rejected the input, while `InvoiceProcessingServiceDependencyException` means a Foundation service or broker failed unexpectedly beneath it. This makes exception types self-documenting -- you can read the origin layer and failure category directly from the class name.

At the Exposer layer, these exception types should map to HTTP semantics: Validation and DependencyValidation to 400-class responses (the client sent bad data), Dependency to 500-class responses (a server-side system failed). However, since [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]], this mapping is a future enhancement.

---

Related Insights:
- [[service-layers-flow-strictly-downward-in-the-standard]] -- foundation: exceptions propagate upward through this directional chain
- [[exception-naming-follows-entity-layer-category-convention-for-traceability]] -- convention: the naming pattern that makes exception types self-documenting
- [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]] -- gotcha: the current gap in HTTP status mapping
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] -- enables: TryCatch is the mechanism that performs this exception wrapping

Domains:
- [[backend-architecture]]
