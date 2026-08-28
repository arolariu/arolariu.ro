# API Local Guide

Root `AGENTS.md` owns repository-wide versions, commands, safety, C# testing,
and Git rules. This file records only API architecture.

## The Standard

Invoices implements the full Standard chain:

```text
Endpoints -> Management -> Processing -> Orchestration -> Foundation -> Brokers
```

- Invoices endpoints map HTTP and depend on the Management façade.
- Management exposes application use cases and delegates to Processing.
- Processing owns heavy computation and multi-stage workflows.
- Orchestration coordinates Foundation services.
- Foundation owns CRUD and domain validation.
- Brokers wrap external systems and contain no business logic.
- Foundation services never call other Foundation services.
- Follow root `AGENTS.md` for the direct-domain collaborator budget;
  framework and support dependencies such as `ILoggerFactory` do not count.
- Core.Auth is a deliberate exception and calls ASP.NET Core Identity managers
  directly from its endpoints.

## Bounded Contexts

| Context | Path | Responsibility |
| --- | --- | --- |
| Core | `src/Core/` | Host, infrastructure, middleware, health |
| Auth | `src/Core.Auth/` | Authentication and identity |
| Invoices | `src/Invoices/` | Invoice lifecycle, merchants, analysis |
| Common | `src/Common/` | Shared DDD and telemetry contracts |

## Service Contract

- Follow the existing partial-class separation in the target service.
- Wrap service methods with the repository TryCatch pattern.
- Start an OpenTelemetry Activity for observable service work.
- Classify exceptions with the existing marker interfaces.
- Map endpoint exceptions through the shared exception-to-HTTP mapper.
- Register new services in the owning bounded-context extension.

## Local Verification

Use the API build/test commands owned by root `AGENTS.md`, selecting the
smallest relevant project or test subset.

## Architecture References

- RFC 2001 - domain-driven design
- RFC 2002 - backend observability
- RFC 2003 - The Standard
- RFC 2004 - XML documentation
