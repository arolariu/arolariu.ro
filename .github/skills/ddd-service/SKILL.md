---
name: ddd-service
description: 'Scaffolds a complete DDD service following The Standard architecture with Broker, Foundation Service, Processing/Orchestration layers, partial class separation, TryCatch pattern, OpenTelemetry tracing, and xUnit tests for the arolariu.ro backend.'
---

# DDD Service Scaffolding

Generates a complete service following The Standard architecture for the arolariu.ro backend API.

## When to Use

- Creating a new CRUD service for a domain entity
- Adding a new bounded context
- Extending an existing domain with new capabilities

## Architecture Layers

Generate artifacts in this order (bottom-up):

### 1. Broker (Data Access Layer)

Create interface and implementation for external data access.

**Interface** (`[Domain]/Brokers/I[Entity][Storage]Broker.cs`):
```csharp
/// <summary>
/// Broker for [Entity] data access operations.
/// </summary>
public interface I[Entity]NoSqlBroker
{
    /// <summary>Creates a new [entity] in the data store.</summary>
    Task Create[Entity]Async([Entity] entity);

    /// <summary>Reads an [entity] by identifier.</summary>
    Task<[Entity]?> Read[Entity]Async(Guid identifier, Guid? partitionKey = null);

    /// <summary>Updates an existing [entity].</summary>
    Task Update[Entity]Async([Entity] entity, Guid? partitionKey = null);

    /// <summary>Deletes an [entity] by identifier.</summary>
    Task Delete[Entity]Async(Guid identifier, Guid? partitionKey = null);
}
```

**Implementation** (`[Domain]/Brokers/[Entity]NoSqlBroker.cs`):
```csharp
public sealed class [Entity]NoSqlBroker(CosmosClient cosmosClient) : I[Entity]NoSqlBroker
{
    private readonly Container _container = cosmosClient
        .GetDatabase("arolariu")
        .GetContainer("[entities]");

    /// <inheritdoc/>
    public async Task Create[Entity]Async([Entity] entity) =>
        await _container.CreateItemAsync(entity,
            new PartitionKey(entity.UserIdentifier.ToString()))
            .ConfigureAwait(false);

    // ... other CRUD operations with .ConfigureAwait(false)
}
```

**Rules:**
- NO business logic in Brokers
- Always use `.ConfigureAwait(false)`
- Use primary constructors
- Seal the class

### 2. Foundation Service (CRUD + Validation)

Create using partial class separation:

**Main file** (`[Domain]/Services/Foundation/[Entity]StorageFoundationService.cs`):
```csharp
/// <summary>
/// Foundation service for [Entity] storage operations.
/// </summary>
/// <remarks>
/// <para>Handles CRUD with validation. Dependencies: 1 broker (Florance compliant).</para>
/// </remarks>
public partial class [Entity]StorageFoundationService(
    I[Entity]NoSqlBroker broker,
    ILoggerFactory loggerFactory) : I[Entity]StorageFoundationService
{
    /// <summary>Creates a new [entity] after validation.</summary>
    public async Task Create[Entity]Object([Entity] entity, Guid? userIdentifier = null) =>
        await TryCatchAsync(async () =>
        {
            using var activity = [Domain]PackageTracing.StartActivity(nameof(Create[Entity]Object));
            activity?.SetTag("[entity].id", entity.id.ToString());
            Validate[Entity]InformationIsValid(entity);
            await broker.Create[Entity]Async(entity).ConfigureAwait(false);
        }).ConfigureAwait(false);
}
```

**Exceptions partial** (`[Domain]/Services/Foundation/[Entity]StorageFoundationService.Exceptions.cs`):
```csharp
public partial class [Entity]StorageFoundationService
{
    private async Task TryCatchAsync(Func<Task> returningFunction)
    {
        try { await returningFunction(); }
        catch (CosmosException ex) { throw new [Entity]DependencyException(ex); }
        catch (Exception ex) { throw new [Entity]ServiceException(ex); }
    }
}
```

**Validations partial** (`[Domain]/Services/Foundation/[Entity]StorageFoundationService.Validations.cs`):
```csharp
public partial class [Entity]StorageFoundationService
{
    private static void Validate[Entity]InformationIsValid([Entity] entity)
    {
        if (entity is null) throw new [Entity]ValidationException("Entity cannot be null.");
        if (entity.id == Guid.Empty) throw new [Entity]ValidationException("Entity ID is required.");
    }
}
```

### 3. DI Registration

**`[Domain]/[Domain]Extensions.cs`**:
```csharp
public static IServiceCollection Add[Domain]Services(this IServiceCollection services)
{
    services.AddScoped<I[Entity]NoSqlBroker, [Entity]NoSqlBroker>();
    services.AddScoped<I[Entity]StorageFoundationService, [Entity]StorageFoundationService>();
    return services;
}
```

### 4. Tests

**`tests/[Domain]/Services/Foundation/[Entity]StorageFoundationServiceTests.cs`**:
```csharp
public class [Entity]StorageFoundationServiceTests
{
    private readonly Mock<I[Entity]NoSqlBroker> _mockBroker = new();
    private readonly [Entity]StorageFoundationService _service;

    public [Entity]StorageFoundationServiceTests()
    {
        _service = new [Entity]StorageFoundationService(
            _mockBroker.Object,
            new NullLoggerFactory());
    }

    [Fact]
    public async Task Create[Entity]Object_ValidInput_CreatesSuccessfully()
    {
        // Arrange
        var entity = [Entity]Builder.CreateRandom[Entity]();
        // Act
        await _service.Create[Entity]Object(entity);
        // Assert
        _mockBroker.Verify(b => b.Create[Entity]Async(entity), Times.Once);
    }

    [Fact]
    public async Task Create[Entity]Object_NullInput_ThrowsValidationException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<[Entity]ValidationException>(
            () => _service.Create[Entity]Object(null!));
    }
}
```

## Checklist

- [ ] Broker interface with XML docs
- [ ] Broker implementation with `.ConfigureAwait(false)`
- [ ] Foundation Service main file with TryCatch pattern
- [ ] Foundation Service exceptions partial
- [ ] Foundation Service validations partial
- [ ] OpenTelemetry activity spans on all methods
- [ ] XML documentation on all public APIs
- [ ] DI registration in Extensions class
- [ ] xUnit tests with 85%+ coverage
- [ ] `dotnet build` passes with no warnings
- [ ] Max 2-3 dependencies (Florance Pattern)

## RFC Grounding Checklist (Mandatory)

Before final output or code changes:

1. Map task scope to relevant RFC IDs using `.github/agent-governance/rfc-grounding-protocol.md`.
2. Read the referenced source files and verify RFC guidance is still current.
3. If RFC and source conflict, follow source-of-truth code and record RFC drift for remediation.
4. Include concrete evidence in outputs (file paths, command results, and validation notes).

## Execution Contract

### Prerequisites
- Confirm feature scope and expected behavior before creating or modifying files.
- Identify whether this task changes architecture-sensitive behavior and trigger RFC grounding.

### Required Context Reads
- `.github/instructions/backend.instructions.md`
- `.github/instructions/csharp.instructions.md`
- `docs/rfc/2001-domain-driven-design-architecture.md`
- `docs/rfc/2003-the-standard-implementation.md`
- `docs/rfc/2004-comprehensive-xml-documentation-standard.md`

### File Mutation Boundaries
- Allowed: `sites/api.arolariu.ro/src/**`, `sites/api.arolariu.ro/tests/**`.
- Disallowed: unrelated frontend files unless explicitly requested.

### Validation Commands
```bash
dotnet build sites/api.arolariu.ro/src/Core
dotnet test sites/api.arolariu.ro/tests
```

### Success Output Contract
- Return created/updated file paths.
- Summarize validation commands and outcomes.
- Report assumptions made during generation.

### Failure Output Contract
- Report failing step and exact error output.
- Provide impacted files and rollback-safe next steps.
- Request user confirmation when risk or ambiguity blocks safe continuation.

