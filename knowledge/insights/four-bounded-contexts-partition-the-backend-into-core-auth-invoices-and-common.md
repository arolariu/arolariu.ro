---
description: "Core handles infrastructure/bootstrap, Core.Auth owns identity, Invoices owns business logic, Common provides shared DDD base classes and telemetry"
type: convention
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Four bounded contexts partition the backend into Core, Auth, Invoices, and Common

The backend modular monolith is divided into four bounded contexts, each with distinct ownership boundaries. **Core** is the application entry point responsible for bootstrapping, middleware pipeline setup, health checks, CORS, OpenAPI documentation, and cross-cutting infrastructure. **Core.Auth** owns authentication and authorization — JWT validation, external identity provider integration, authorization policies, and identity persistence via its own `AuthDbContext`. **Invoices** is the primary business domain owning invoice lifecycle, merchant management, product handling, and all business rule validation. **Common** provides shared DDD contracts (base entity classes), telemetry infrastructure, configuration options, and validators used across all other contexts.

The critical constraint is that these contexts communicate through well-defined interfaces, not by reaching into each other's internals. Core.Auth and Invoices do not share database contexts. Common is a dependency of all other contexts but contains no business logic — only shared abstractions and cross-cutting utilities.

---

Related Insights:
- [[backend-is-a-modular-monolith-not-microservices]] — foundation: the monolith decision that these contexts live within
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] — example: the core entity within the Invoices bounded context
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — convention: how bounded contexts expose their capabilities

Domains:
- [[backend-architecture]]
