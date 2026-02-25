---
description: "Each domain defines INoSqlBroker, IStorageFoundationService, IOrchestrationService, and IProcessingService — one focused interface per Standard layer"
type: convention
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Interface segregation splits each domain into four service layer interfaces

Each bounded context in the Invoices domain defines four interfaces that map directly to The Standard's service layers: `IInvoiceNoSqlBroker` for data access (the Broker layer), `IInvoiceStorageFoundationService` for CRUD with validation (Foundation), `IInvoiceOrchestrationService` for multi-service coordination (Orchestration), and `IInvoiceProcessingService` for complex business flows (Processing). This is Interface Segregation in practice — no service interface bleeds responsibilities from another layer.

The naming convention is consistent: `I{Entity}{Layer}Service` (or `I{Entity}NoSqlBroker` for the data layer). Consumers only depend on the interface they need. Endpoints depend on `IProcessingService`, Processing depends on Orchestration, Orchestration depends on Foundation (2-3 max), and Foundation depends on Brokers (1-2 max). This layered dependency chain, combined with focused interfaces, means changing a Foundation implementation never requires changes to Processing consumers — only the Foundation interface contract matters.

All dependencies flow through these abstractions via constructor injection using C# primary constructors, enforcing the Dependency Inversion Principle alongside Interface Segregation.

---

Related Insights:
- [[domain-events-are-implicit-through-service-layer-coordination-not-explicit-types]] — extends: these interfaces carry the coordination that replaces explicit events
- [[primary-constructors-implement-dependency-injection-at-every-service-layer]] — enables: how these interfaces are injected into consuming services
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — extends: endpoints are the consumer of the top-level interface

Domains:
- [[backend-architecture]]
