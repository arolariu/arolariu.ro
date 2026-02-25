---
description: "Each bounded context exposes Add*DomainConfiguration() extensions for builder and app, called sequentially in Program.cs"
type: pattern
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Domain configuration registers via extension methods on WebApplicationBuilder

Each bounded context in the modular monolith registers its services and middleware through a pair of extension methods: one on `WebApplicationBuilder` for service registration and one on `WebApplication` for middleware/endpoint configuration. For example, `builder.AddGeneralDomainConfiguration()` registers health checks, Swagger, OpenTelemetry, and auth services, while `app.AddGeneralApplicationConfiguration()` configures the middleware pipeline (routing, CORS, authentication, authorization, Swagger UI). The Invoices domain follows the same pattern with `AddInvoicesDomainConfiguration()` and `AddInvoiceDomainConfiguration()`.

This pattern keeps Program.cs minimal — just a sequence of domain registration calls — while each bounded context encapsulates its own setup logic. Adding a new bounded context means creating a new extension class and adding two calls to Program.cs. The pattern also enforces that each domain is self-describing: all its dependencies, middleware, and endpoints are declared in one place.

---

Related Insights:
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — foundation: the bounded contexts that use this registration pattern
- [[backend-is-a-modular-monolith-not-microservices]] — enables: extension method composition is the mechanism that makes the monolith modular

Domains:
- [[backend-architecture]]
