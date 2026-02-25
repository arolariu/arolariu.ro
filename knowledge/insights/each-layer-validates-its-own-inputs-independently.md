---
description: "Brokers validate nothing, Foundation validates structure and logic, Processing validates only used data, Orchestration validates cross-entity rules, Exposers validate protocol"
type: convention
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Each layer validates its own inputs independently

The Standard mandates that every service layer performs its own validation rather than relying on layers above or below. This is not redundant validation -- each layer validates different concerns appropriate to its role. Brokers perform zero validation (they are thin wrappers). Foundation services validate structural integrity (non-null identifiers, initialized collections) and logical constraints (positive monetary values, valid date ranges). Processing services apply "used-data-only" validation, checking only the specific fields they actually consume rather than re-validating the entire aggregate. Orchestration services validate cross-entity relationships (does the referenced merchant actually exist?). Exposers validate protocol-level inputs (route parameters, required headers).

In the arolariu.ro codebase, Foundation services implement validation in dedicated partial class files (e.g., `InvoiceStorageFoundationService.Validations.cs`) using the `Validator.ValidateAndThrow` utility with domain-specific exception types like `InvoiceIdNotSetException`. This separation since [[partial-classes-split-services-into-implementation-validation-and-exception-files]] keeps validation logic discoverable and separately testable.

The "used-data-only" principle at the Processing layer prevents unnecessary re-validation overhead. If a Processing service calls `AnalyzeInvoice`, it validates only the fields needed for analysis, trusting that structural validation already happened at the Foundation layer when the invoice was originally persisted.

---

Related Insights:
- [[foundation-services-introduce-validation-and-business-language-to-broker-operations]] -- example: Foundation performs the structural and logical validation tier
- [[brokers-are-thin-wrappers-with-zero-business-logic]] -- constraint: brokers perform zero validation by design
- [[three-tier-exception-classification-separates-validation-dependency-and-dependency-validation-failures]] -- enables: validation failures become typed exceptions that propagate upward
- [[partial-classes-split-services-into-implementation-validation-and-exception-files]] -- convention: validation lives in dedicated partial class files

Domains:
- [[backend-architecture]]
