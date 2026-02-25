---
description: "Every service implements an interface (IInvoiceNoSqlBroker, IInvoiceStorageFoundationService, etc.) enabling test doubles via Moq at each layer boundary"
type: decision
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# Interface-driven design enables mock-based unit testing at every layer

The Standard requires "Pure Contracting" -- every service class implements a corresponding interface, and all dependencies are expressed as interface types rather than concrete implementations. This is not merely a SOLID compliance exercise; it is the mechanism that makes the five-layer architecture testable. Because `InvoiceStorageFoundationService` depends on `IInvoiceNoSqlBroker` (not `InvoiceNoSqlBroker`), a unit test can substitute a `Mock<IInvoiceNoSqlBroker>` and verify Foundation behavior in complete isolation from Cosmos DB.

The DI container registration reflects this one-to-one mapping: `services.AddScoped<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>()` at the Broker level, `services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>()` at Foundation, and so on through every layer. Since [[primary-constructors-implement-dependency-injection-at-every-service-layer]], the interface dependencies are visible directly in the class signature, making the mock boundary obvious.

Combined with the strict downward call direction from [[service-layers-flow-strictly-downward-in-the-standard]], this means each layer has a clear, narrow mock surface: Foundation tests mock Brokers, Processing tests mock Foundation services, Orchestration tests mock Processing services, and Exposer tests mock the single Processing service they consume. The testing pyramid naturally follows the architectural layers.

---

Related Insights:
- [[primary-constructors-implement-dependency-injection-at-every-service-layer]] -- enables: interfaces are injected via primary constructors
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] -- foundation: one interface per layer per entity provides the mock boundaries
- [[each-layer-mocks-only-the-layer-directly-below-for-test-isolation]] -- extends: the testing pattern that this interface design enables
- [[service-layers-flow-strictly-downward-in-the-standard]] -- foundation: directional constraint that keeps mock surfaces narrow

Domains:
- [[backend-architecture]]
