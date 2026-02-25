---
description: "C# primary constructors replace traditional constructor bodies for DI, making dependency declarations concise and enforcing DIP through abstractions"
type: pattern
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Primary constructors implement dependency injection at every service layer

All service classes in The Standard layers use C# primary constructors for dependency injection. For example, `InvoiceOrchestrationService(IInvoiceStorageFoundationService invoiceStorageFoundationService, IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService)` declares its dependencies directly in the class signature rather than through a separate constructor body with field assignments. This pattern reduces boilerplate while making dependencies immediately visible when reading the class declaration.

The primary constructor parameters are the concrete mechanism enforcing the Dependency Inversion Principle: every parameter is typed as an interface (`IInvoiceStorageFoundationService`), never a concrete class. Combined with The Standard's layer rules, this creates a compile-time guarantee that services only depend on abstractions from the layer below them. Adding a new dependency is as simple as adding a parameter — if that parameter violates the Florance Pattern's 2-3 dependency limit, the long parameter list becomes a visual code smell prompting a refactor.

---

Related Insights:
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] — foundation: the interfaces that primary constructors inject
- [[all-domain-entities-inherit-through-baseentity-to-namedentity-hierarchy]] — extends: the DDD abstractions that DIP also applies to

Domains:
- [[backend-architecture]]
