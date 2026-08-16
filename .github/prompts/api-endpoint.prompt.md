---
name: "api-endpoint"
description: 'Scaffolds a complete API endpoint following The Standard architecture with Broker, Foundation Service, Endpoint, and MSTest tests.'
agent: 'agent'
model: 'Claude Sonnet 4.5'
tools: ['codebase', 'search', 'editFiles', 'terminalLastCommand']
lastReviewed: 2026-05-08
---

# API Endpoint Generator

## Purpose

Generate a complete API endpoint following The Standard architecture pattern, including all layers from Broker to Endpoint with proper tests.

---

## Agent Contract

### Scope
Scaffolding a new HTTP endpoint in `sites/api.arolariu.ro/`, spanning Broker, Foundation Service, Orchestration/Processing, and Endpoint layers plus their MSTest coverage. Does not cover frontend consumers, database schema changes, or auth policy changes.

### Required Inputs
- The target bounded context under `sites/api.arolariu.ro/src/**` (Core, Core.Auth, Invoices, or Common).
- `.github/instructions/backend.instructions.md` and `.github/instructions/csharp.instructions.md`.
- RFC 2001 (DDD), RFC 2003 (The Standard), RFC 2004 (XML docs).
- The existing endpoint and service files the new endpoint will sit beside.

### Execution Constraints
- Respect The Standard layer hierarchy; never make Foundation→Foundation calls.
- Keep Brokers free of business logic and obey the Florance Pattern (max 2-3 dependencies per service).
- XML docs on every public API; `.ConfigureAwait(false)` in library code; no sync-over-async.
- `TreatWarningsAsErrors` is enabled — never silence a diagnostic with `NoWarn` or `#pragma` to make a build pass.
- Do not create or delete files outside the scope above without user confirmation.

### Validation
```bash
dotnet build sites/api.arolariu.ro/src/Core
dotnet test sites/api.arolariu.ro/tests
```

### Escalation Conditions
Stop and ask the user before proceeding when the work involves a new bounded context, a database schema change, authentication or authorization logic, a new NuGet dependency, or any change to CI/CD or infrastructure. See **Ask-User Criteria** under [Execution Contract](#execution-contract) for the full rule.

---

## What Gets Generated

For a new endpoint, create the following artifacts in order:

### 1. Broker (Data Access)

```csharp
// [Domain]/Brokers/I[Entity][Storage]Broker.cs
public interface I[Entity]NoSqlBroker
{
    Task Create[Entity]Async([Entity] entity);
    Task<[Entity]?> Read[Entity]Async(Guid identifier, Guid? partitionKey = null);
    Task Update[Entity]Async([Entity] entity, Guid? partitionKey = null);
    Task Delete[Entity]Async(Guid identifier, Guid? partitionKey = null);
}

// [Domain]/Brokers/[Entity]NoSqlBroker.cs
public sealed class [Entity]NoSqlBroker(CosmosClient cosmosClient) : I[Entity]NoSqlBroker
{
    private readonly Container _container = cosmosClient
        .GetDatabase("arolariu")
        .GetContainer("[entities]");

    public async Task Create[Entity]Async([Entity] entity) =>
        await _container.CreateItemAsync(entity, new PartitionKey(entity.UserIdentifier.ToString()))
            .ConfigureAwait(false);
}
```

### 2. Foundation Service (CRUD + Validation)

```csharp
// [Domain]/Services/Foundation/I[Entity]StorageFoundationService.cs
public interface I[Entity]StorageFoundationService
{
    Task Create[Entity]Object([Entity] entity, Guid? userIdentifier = null);
    Task<[Entity]> Retrieve[Entity]Object(Guid identifier, Guid? userIdentifier = null);
    Task Modify[Entity]Object([Entity] entity, Guid? userIdentifier = null);
    Task Remove[Entity]Object(Guid identifier, Guid? userIdentifier = null);
}

// [Domain]/Services/Foundation/[Entity]StorageFoundationService.cs
// Use partial classes: *.cs, *.Exceptions.cs, *.Validations.cs
```

### 3. Endpoint (Exposer)

```csharp
// [Domain]/Endpoints/[Entity]Endpoints.cs
internal static class [Entity]Endpoints
{
    internal static void Map[Entity]Endpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/[entities]")
            .WithTags("[Entities]")
            .RequireAuthorization();

        group.MapGet("/", GetAll[Entities]);
        group.MapGet("/{id:guid}", Get[Entity]ById);
        group.MapPost("/", Create[Entity]);
        group.MapPut("/{id:guid}", Update[Entity]);
        group.MapDelete("/{id:guid}", Delete[Entity]);
    }
}
```

### 4. DI Registration

```csharp
// [Domain]/[Domain]Extensions.cs
public static IServiceCollection Add[Domain]Services(this IServiceCollection services)
{
    services.AddScoped<I[Entity]NoSqlBroker, [Entity]NoSqlBroker>();
    services.AddScoped<I[Entity]StorageFoundationService, [Entity]StorageFoundationService>();
    return services;
}
```

### 5. Tests

```csharp
// tests/[Domain]/Services/Foundation/[Entity]StorageFoundationServiceTests.cs
[TestClass]
public class [Entity]StorageFoundationServiceTests
{
    [TestMethod]
    public async Task Create[Entity]Object_ValidInput_CreatesSuccessfully() { }

    [TestMethod]
    public async Task Create[Entity]Object_NullInput_ThrowsValidationException() { }

    [TestMethod]
    public async Task Retrieve[Entity]Object_ExistingId_ReturnsEntity() { }

    [TestMethod]
    public async Task Retrieve[Entity]Object_NonExistentId_ReturnsNull() { }
}
```

---

## Checklist

- [ ] Broker interface and implementation created
- [ ] Foundation Service with partial classes (main, exceptions, validations)
- [ ] TryCatch pattern on all service methods
- [ ] OpenTelemetry activity spans on all service methods
- [ ] XML documentation on all public APIs
- [ ] `.ConfigureAwait(false)` on all async calls
- [ ] Endpoint mapped with proper HTTP verbs and authorization
- [ ] DI registration in Extensions class
- [ ] MSTest tests with 85%+ coverage
- [ ] `dotnet build` passes with no warnings

## RFC Grounding Checklist (Mandatory)

Before final output or code changes:

1. Map task scope to relevant RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files and verify RFC guidance is still current.
3. If RFC and source conflict, follow source-of-truth code and record RFC drift for remediation.
4. Include concrete evidence in outputs (file paths, command results, and validation notes).

## Execution Contract

### Context Intake
- Review affected backend bounded context in `sites/api.arolariu.ro/src/**`.
- Read `.github/instructions/backend.instructions.md` and `.github/instructions/csharp.instructions.md`.
- Consult RFC 2001, RFC 2003, and RFC 2004 before generating code.

### RFC and Source Checks
1. Identify impacted domain and map to RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files before generating edits.
3. If RFC and source conflict, follow source and flag RFC drift.

### Implementation Steps
1. Produce a file-level change plan before edits.
2. Apply minimal, behavior-safe modifications aligned with repository conventions.
3. Record assumptions explicitly when requirements are ambiguous.

### Validation Steps
```bash
dotnet build sites/api.arolariu.ro/src/Core
dotnet test sites/api.arolariu.ro/tests
```

### Ask-User Criteria
Ask the user before proceeding when:
- design choices materially change behavior or UX,
- security, auth, infra, or destructive actions are involved,
- scope boundaries are ambiguous and multiple valid options exist.

### Output Contract
- **Success:** list files changed, validations run, and residual risks.
- **Failure:** provide exact failing step/output, impacted files, and a safe next action.

## Self-Audit and Uncertainty Protocol (Mandatory)

For non-trivial tasks, complete this checklist before final output:

1. **Assumptions:** list non-obvious assumptions that influenced decisions.
2. **Risk Flags:** identify security, behavior, deployment, or data risks.
3. **Confidence:** report `high`, `medium`, or `low` with brief justification.
4. **Evidence:** cite changed files, executed commands, and validation outcomes.

Escalate to the user before continuing when security/auth/infra/destructive or major behavior-changing decisions are involved.

