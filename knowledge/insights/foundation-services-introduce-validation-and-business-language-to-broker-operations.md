---
description: "Foundation services are broker-neighboring: they add structural/logical validation, map CRUD to domain verbs, classify broker exceptions, and depend on a single broker"
type: pattern
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Foundation services introduce validation and business language to broker operations

Foundation services are the first layer in The Standard that contains intelligence. They sit directly above Brokers (hence "broker-neighboring") and transform raw data access operations into domain-meaningful operations. Their responsibilities are tightly scoped: validate all inputs before forwarding to brokers, map technical CRUD verbs to business language (Insert becomes Create/Add, Select becomes Read/Retrieve), handle broker exceptions by reclassifying them as domain exceptions, and remain single-purpose with no cross-entity orchestration.

In the arolariu.ro codebase, `InvoiceStorageFoundationService` depends on exactly one broker (`IInvoiceNoSqlBroker`) and adds validation methods like `ValidateIdentifierIsSet` and `ValidateInvoiceInformationIsValid` before any broker call. The method naming follows The Standard's business language principle: `CreateInvoiceObject`, `ReadInvoiceObject`, `UpdateInvoiceObject`, `DeleteInvoiceObject`. Each method is wrapped in a `TryCatchAsync` block that catches broker-level exceptions and reclassifies them as `InvoiceStorageFoundationServiceDependencyException` or similar typed exceptions.

The single-broker dependency rule is critical: if a Foundation service needs data from a different entity's broker, it cannot call that broker directly. Instead, it should be composed by an Orchestration service that coordinates multiple Foundation services. This keeps Foundation services focused and prevents them from becoming mini-orchestrators.

---

Related Insights:
- [[brokers-are-thin-wrappers-with-zero-business-logic]] -- foundation: the layer below that Foundation services add intelligence to
- [[each-layer-validates-its-own-inputs-independently]] -- extends: Foundation performs structural and logical validation specifically
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] -- pattern: the implementation pattern used within Foundation methods
- [[partial-classes-split-services-into-implementation-validation-and-exception-files]] -- convention: how Foundation service code is organized across files

Domains:
- [[backend-architecture]]
