# Backend Documentation

Source-grounded documentation for `sites/api.arolariu.ro`.

Root `AGENTS.md` owns versions, commands, testing targets, and risk
boundaries. The API local guide and live source own current architecture;
accepted RFCs record intent.

## Current architecture

The API is a modular monolith with four bounded contexts:

| Context | Current shape |
| --- | --- |
| Core | Host, middleware, health, OpenAPI, and runtime composition |
| Core.Auth | ASP.NET Core Identity persistence and endpoints |
| Invoices | Full Management -> Processing -> Orchestration -> Foundation -> Broker chain |
| Common | Shared HTTP, exception, telemetry, and DDD primitives |

Invoices endpoints and the analysis worker enter through Management. Core.Auth
is a deliberate exception: framework routes use `MapIdentityApi`, and the
custom logout handler injects `SignInManager<IdentityUser>` directly.

The direct-domain collaborator budget is owned by root `AGENTS.md`.
Framework/support dependencies do not count. Foundations never call other
Foundations, and Brokers contain no business logic.

## Canonical RFCs

| RFC | Responsibility |
| --- | --- |
| [2001](../rfc/2001-domain-driven-design-architecture.md) | Bounded contexts, DDD roles, and dependency direction |
| [2002](../rfc/2002-opentelemetry-backend-observability.md) | Backend tracing, metrics, logging, and telemetry privacy |
| [2003](../rfc/2003-the-standard-implementation.md) | Exact Invoices graph, durable analysis, exceptions, and HTTP mapping |
| [2004](../rfc/2004-comprehensive-xml-documentation-standard.md) | Public XML documentation and generated reference pipeline |

## Practical references

- [The Standard implementation guide](./the-standard-guide.md)
- [OpenTelemetry guide](./opentelemetry-guide.md)
- [Distributed tracing reference](./distributed-tracing.md)
- [Event ID registry](./event-id-registry.md)
- [ConfigureAwait guidance](./configureawait-best-practices.md)

## Live source owners

- `sites/api.arolariu.ro/src/Invoices/Services/Management/`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/`
- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/`
- `sites/api.arolariu.ro/src/Invoices/Brokers/`
- `sites/api.arolariu.ro/src/Invoices/Endpoints/`
- `sites/api.arolariu.ro/src/Invoices/Workers/`
- `sites/api.arolariu.ro/src/Common/Http/`
- `sites/api.arolariu.ro/src/Common/Telemetry/`
- `sites/api.arolariu.ro/tests/`

## Working on the API

Use:

- `sites/api.arolariu.ro/AGENTS.md` for the concise API contract;
- `.github/instructions/backend.instructions.md` and
  `.github/instructions/csharp.instructions.md` for path-scoped rules;
- `backend-vertical-slice` for endpoint/service behavior;
- the applicable `code-*` workflow for tests, defects, refactors,
  documentation, or review.

Commands are intentionally not duplicated here; select them from root
`AGENTS.md` and the owning project configuration.
