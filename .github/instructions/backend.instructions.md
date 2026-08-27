---
name: API Architecture
description: DDD and The Standard rules for the arolariu.ro API.
applyTo: "sites/api.arolariu.ro/**/*.cs,sites/api.arolariu.ro/**/*.csproj,sites/api.arolariu.ro/**/Program.cs,sites/api.arolariu.ro/**/appsettings*.json"
---

# API Architecture

## Scope

Owns API-specific DDD, service-layer, telemetry, exception, endpoint, and
persistence boundaries.

## Required Inputs

- `sites/api.arolariu.ro/AGENTS.md`
- C# instructions
- One sibling implementation in the same bounded context and layer
- RFC 2001-2004 when architecture, observability, exceptions, or docs change

## Rules

The full chain below applies to the Invoices bounded context:

```text
Endpoints -> Management -> Processing -> Orchestration -> Foundation -> Brokers
```

- Endpoints map protocol behavior and do not contain business logic.
- Invoices Management is the endpoint/worker-facing application boundary.
- Processing owns heavy or multi-stage workflows.
- Orchestration coordinates Foundation services.
- Foundation owns CRUD and domain validation.
- Brokers are thin external-system wrappers.
- Never make Foundation-to-Foundation calls.
- Keep each service at two or three direct domain collaborators; framework and
  support dependencies such as `ILoggerFactory` do not count toward that
  budget.
- Follow the existing partial-class structure for validations and TryCatch
  classification.
- Start an Activity for observable service work and add non-sensitive domain
  tags.
- Use existing marker interfaces and exception-to-HTTP mapping.
- Register new services in the owning bounded-context extension.
- Core.Auth deliberately injects ASP.NET Core Identity managers from endpoints;
  do not report that established topology as an Invoices-style layer bypass.
- Preserve partition and ownership boundaries in storage calls.
- Do not commit connection strings or credentials.

## Reference Catalog

Open `references/backend.md` only when the task needs one of:

- confirming or extending the Management-to-Broker dependency graph for a
  bounded context;
- a CRUD, analysis-composition, or durable-queue pattern not resolved by the
  rules above;
- an exception-to-HTTP mapping, telemetry tag, or DI-registration decision;
- a partition/ownership boundary question in a persistence call.

The catalog does not redefine these rules, the `backend-vertical-slice` skill's
own decision workflow, or the verification/escalation sections below; it only
adds repository-specific examples and anti-patterns.

## Validation

Use the API local guide's smallest build and MSTest selection.

## Escalation

Ask before auth/security behavior, schema/data migration, a new bounded
context, dependency, external integration, or layer change.
