---
description: "Foundation services take 1 broker, Processing takes 2-3 Foundation services, Orchestration takes 2-3 Processing services, Exposers take 1 Processing service"
type: constraint
source: "docs/rfc/2003-the-standard-implementation.md"
status: current
created: 2026-02-25
---

# The Florance Pattern limits each service to two or three dependencies

Every service in The Standard's five-layer architecture may depend on at most 2-3 other services (excluding cross-cutting concerns like logging). This constraint, called the Florance Pattern, prevents any single service from becoming a coordination bottleneck with too many responsibilities. In practice, the dependency budget follows the layer: Foundation services typically consume a single Broker, Processing services combine 2-3 Foundation services, Orchestration services compose 2-3 Processing services, and Exposers take exactly 1 Processing or Orchestration service.

In the arolariu.ro backend, this plays out concretely: `InvoiceStorageFoundationService` depends only on `IInvoiceNoSqlBroker`. `InvoiceProcessingService` depends on `IInvoiceOrchestrationService` and `IMerchantOrchestrationService` (2 dependencies). `InvoiceEndpoints` handlers each inject a single `IInvoiceProcessingService`. Logging, telemetry, and similar infrastructure dependencies are not counted toward the 2-3 limit since they are cross-cutting rather than domain-functional.

When a service exceeds 3 dependencies, it signals that the service is doing too much and needs to be decomposed. The typical fix is to introduce an intermediate service at the appropriate layer to absorb some of the coordination responsibility.

---

Related Insights:
- [[service-layers-flow-strictly-downward-in-the-standard]] -- foundation: the directional constraint that the Florance Pattern operates within
- [[orchestration-services-coordinate-multi-entity-workflows-across-processing-services]] -- example: where the 2-3 dependency budget is most visible
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] -- extends: bounded contexts provide natural service grouping boundaries

Domains:
- [[backend-architecture]]
