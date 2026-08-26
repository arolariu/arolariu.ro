---
name: API Architecture
description: DDD and The Standard rules for the arolariu.ro API.
applyTo: "sites/api.arolariu.ro/**/*.cs,sites/api.arolariu.ro/**/*.csproj,sites/api.arolariu.ro/**/Program.cs,sites/api.arolariu.ro/**/appsettings.json"
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

```text
Endpoints -> Management -> Processing -> Orchestration -> Foundation -> Brokers
```

- Endpoints map protocol behavior and do not contain business logic.
- Management is the endpoint/worker-facing application boundary.
- Processing owns heavy or multi-stage workflows.
- Orchestration coordinates Foundation services.
- Foundation owns CRUD and domain validation.
- Brokers are thin external-system wrappers.
- Never make Foundation-to-Foundation calls.
- Keep each service at two or three dependencies.
- Follow the existing partial-class structure for validations and TryCatch
  classification.
- Start an Activity for observable service work and add non-sensitive domain
  tags.
- Use existing marker interfaces and exception-to-HTTP mapping.
- Register new services in the owning bounded-context extension.
- Preserve partition and ownership boundaries in storage calls.
- Do not commit connection strings or credentials.

## Validation

Use the API local guide's smallest build and MSTest selection.

## Escalation

Ask before auth/security behavior, schema/data migration, a new bounded
context, dependency, external integration, or layer change.
