---
description: "Brokers abstract external dependencies (Cosmos DB, AI services, translation) with no validation, no flow control, and no domain rules -- they own only configuration"
type: constraint
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Brokers are thin wrappers with zero business logic

The Broker layer sits at the bottom of The Standard's five-layer hierarchy and serves as a pure abstraction boundary over external dependencies. In the arolariu.ro backend, brokers wrap Cosmos DB access (`IInvoiceNoSqlBroker`), Azure AI services (`IOpenAiBroker`, `IFormRecognizerBroker`), and translation services (`ITranslatorBroker`). These brokers perform no validation, no business rule enforcement, no flow control, and no exception classification beyond what the external dependency itself throws. Their sole responsibilities are mapping interface methods to external API calls and owning configuration (connection strings, retry policies, container names, partition key assignments).

The `InvoiceNoSqlBroker` concretely demonstrates this: it is an EF Core `DbContext` with Cosmos provider that configures entity-to-container mappings, JSON property names, value object conversions, and partition keys (Invoices by `UserIdentifier`, Merchants by `ParentCompanyId`). All actual business validation happens one layer up in Foundation services. This makes brokers trivially replaceable for testing -- mock the `IInvoiceNoSqlBroker` interface and the entire Foundation layer becomes unit-testable in isolation.

The "zero business logic" rule is the hardest discipline to maintain because it is tempting to add "just a small validation" at the data access layer. Resist it. Any validation that enters a broker becomes invisible to the service layers above, creates dual-maintenance burden, and breaks the testing isolation model.

---

Related Insights:
- [[service-layers-flow-strictly-downward-in-the-standard]] -- foundation: brokers are the terminal layer in the downward chain
- [[foundation-services-introduce-validation-and-business-language-to-broker-operations]] -- extends: the layer directly above that adds the intelligence brokers lack
- [[interface-driven-design-enables-mock-based-unit-testing-at-every-layer]] -- enables: broker interfaces are the primary mock boundary for Foundation tests

Domains:
- [[backend-architecture]]
