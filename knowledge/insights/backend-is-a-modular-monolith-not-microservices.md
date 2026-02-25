---
description: "Microservices, CQRS+Event Sourcing, and traditional layered architecture were all rejected — current scale doesn't justify distributed complexity"
type: decision
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Backend is a modular monolith not microservices

The backend API is architected as a modular monolith rather than a distributed microservices system. Three alternatives were evaluated during design: microservices (rejected because operational overhead and distributed transaction complexity exceed current scale needs), traditional layered architecture (rejected because it produces anemic domain models with scattered business logic), and CQRS with event sourcing (rejected as overkill for current requirements). The modular monolith preserves clear domain boundaries through bounded contexts while keeping deployment and operational simplicity. Each bounded context (Core, Core.Auth, Invoices, Common) is organized as a self-contained module within a single deployable unit, making future extraction to microservices possible without requiring it today.

This decision has a critical implication: all inter-context communication happens in-process through direct method calls and dependency injection, not through message queues or HTTP. If the system ever needs to scale individual contexts independently, the bounded context boundaries are already clean enough to extract.

---

Related Insights:
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — the specific boundary structure within this monolith
- [[domain-configuration-registers-via-extension-methods-on-webapplicationbuilder]] — enables: how modules compose in the monolith

Domains:
- [[backend-architecture]]
