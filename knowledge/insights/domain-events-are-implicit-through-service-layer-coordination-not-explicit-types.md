---
description: "No InvoiceCreatedEvent or similar domain event types exist in the source tree — The Standard's Foundation/Orchestration/Processing layering handles workflow coordination instead"
type: decision
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Domain events are implicit through service layer coordination not explicit types

Unlike canonical DDD implementations that use explicit domain event classes (e.g., `InvoiceCreatedEvent`, `InvoiceUpdatedEvent`) with publish/subscribe mechanisms, this codebase does not define domain event types. The RFC explicitly acknowledges this gap. Instead, workflow coordination is implemented through The Standard's service layering: Foundation services handle CRUD and validation, Orchestration services coordinate multi-service flows, and Processing services handle complex business operations. State change side effects are triggered by explicit service calls in the orchestration/processing layers, not by event dispatch.

This is a deliberate trade-off that keeps the system simpler at the cost of decoupling. If a future requirement needs multiple handlers to react to a domain change independently (e.g., sending a notification AND updating analytics when an invoice is created), explicit domain events would be the natural evolution. The RFC's future enhancements section hints at this with mentions of background job processing and CQRS.

---

Related Insights:
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — foundation: the aggregate whose events are implicit
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] — enables: the service interfaces that handle coordination instead of events
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — extends: the top of the call chain where workflows start

Domains:
- [[backend-architecture]]
