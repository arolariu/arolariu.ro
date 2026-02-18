---
name: "api-endpoint"
description: 'Scaffolds a complete API endpoint following The Standard architecture with Broker, Foundation Service, Endpoint, and xUnit tests.'
agent: 'agent'
model: 'Claude Sonnet 4.5'
tools: ['codebase', 'search', 'editFiles', 'terminalLastCommand']
---

# API Endpoint Generator

## Purpose

Generate a complete API endpoint following The Standard architecture pattern, including all layers from Broker to Endpoint with proper tests.

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
public class [Entity]StorageFoundationServiceTests
{
    [Fact]
    public async Task Create[Entity]Object_ValidInput_CreatesSuccessfully() { }

    [Fact]
    public async Task Create[Entity]Object_NullInput_ThrowsValidationException() { }

    [Fact]
    public async Task Retrieve[Entity]Object_ExistingId_ReturnsEntity() { }

    [Fact]
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
- [ ] xUnit tests with 85%+ coverage
- [ ] `dotnet build` passes with no warnings

## RFC Grounding Checklist (Mandatory)

Before final output or code changes:

1. Map task scope to relevant RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files and verify RFC guidance is still current.
3. If RFC and source conflict, follow source-of-truth code and record RFC drift for remediation.
4. Include concrete evidence in outputs (file paths, command results, and validation notes).

