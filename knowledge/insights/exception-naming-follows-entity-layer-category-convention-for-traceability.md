---
description: "Exception class names like InvoiceProcessingServiceDependencyValidationException encode the entity, layer, and failure category for instant diagnosis"
type: convention
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Exception naming follows entity-layer-category convention for traceability

Exception types in The Standard use a deterministic naming pattern: `{Entity}{Layer}Service{Category}Exception`. This encoding means every exception class name tells you three things without reading documentation: which aggregate was involved (Invoice, Merchant), which architectural layer threw it (StorageFoundation, Processing, Orchestration), and what category of failure occurred (Validation, Dependency, DependencyValidation, or generic).

For example, `InvoiceStorageFoundationServiceDependencyException` tells you that the Invoice Foundation service caught an unexpected error from its broker dependency. `InvoiceProcessingServiceDependencyValidationException` tells you that the Processing service received a validation failure that originated in a layer below it. The naming is verbose by design -- it replaces the need for exception documentation because the name IS the documentation.

This convention creates a complete exception taxonomy per bounded context. The Invoice domain currently has approximately 12 exception types (3 categories across 4 layers). When debugging a production error, the exception type alone identifies the failing layer, the affected entity, and whether the root cause is client input (Validation), infrastructure failure (Dependency), or a propagated client error (DependencyValidation). Since [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]], this naming convention is the implementation mechanism for the classification system.

---

Related Insights:
- [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]] -- foundation: the classification system these names encode
- [[partial-classes-split-services-into-implementation-validation-and-exception-files]] -- convention: these exception types live in dedicated .Exceptions.cs partial files
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] -- enables: TryCatch wraps caught exceptions in these typed exception classes

Domains:
- [[backend-architecture]]
