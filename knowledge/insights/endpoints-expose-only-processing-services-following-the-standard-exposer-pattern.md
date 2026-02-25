---
description: "Minimal API endpoints inject IProcessingService, map HTTP verbs to business operations, and handle auth claims — no direct Foundation or Broker access"
type: convention
source: "docs/rfc/2001-domain-driven-design-architecture.md"
status: current
created: 2026-02-25
---

# Endpoints expose only processing services following The Standard exposer pattern

The API endpoints (Minimal API route handlers) serve as the Exposer layer in The Standard architecture. They have exactly one responsibility: map HTTP concerns (route parameters, request bodies, status codes, authentication claims) to business operations on `IProcessingService`. An endpoint handler receives `IInvoiceProcessingService` via dependency injection, extracts the user identifier from `ClaimsPrincipal`, calls the appropriate processing method, and maps the result to an HTTP response (`Results.Ok`, `Results.NotFound`, `Results.Created`).

Endpoints never inject Foundation services, Orchestration services, or Brokers directly. This constraint ensures the entire service layer hierarchy is traversed for every request, maintaining validation, telemetry, and coordination guarantees. The route structure follows REST conventions under `rest/v1` with `MapGroup` for organization and fluent metadata (`.WithName()`, `.Produces<T>()`, `.ProducesValidationProblem()`).

---

Related Insights:
- [[interface-segregation-splits-each-domain-into-four-service-layer-interfaces]] — foundation: the IProcessingService interface that endpoints consume
- [[domain-configuration-registers-via-extension-methods-on-webapplicationbuilder]] — enables: endpoint mapping happens in the domain's app configuration extension
- [[four-bounded-contexts-partition-the-backend-into-core-auth-invoices-and-common]] — foundation: endpoints live within their bounded context's Endpoints folder

Domains:
- [[backend-architecture]]
