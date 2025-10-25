# The Standard Implementation Guide

## Quick Reference for RFC 2003: The Standard Implementation

This guide provides practical examples for implementing Hassan Habib's "The Standard" in the .NET backend.

## Quick Start

### 1. Understand the Five Layers

```plaintext
Exposers (Controllers) → Orchestration → Processing → Foundation → Brokers
```

### 2. Follow Business Language Mapping

| Technical Operation | Business Language |
|-------------------|------------------|
| Insert | Add |
| Select | Retrieve |
| Update | Modify |
| Delete | Remove |

### 3. Apply the Florance Pattern

#### Maximum 2-3 dependencies per service

## Core Patterns

### Brokers Layer

**Purpose**: Thin abstraction over external dependencies (database, APIs, time, logging)

**Rules**:

- Zero business logic
- No validation
- No exception classification
- Only native/primitive types where possible

#### Database Broker Interface

```csharp
/// <summary>
/// Low-level persistence contract for invoice aggregates backed by Azure Cosmos DB.
/// </summary>
/// <remarks>
/// <para><b>Role (The Standard):</b> A broker is a thin abstraction over an external
/// dependency. It exposes primitive CRUD operations with minimal translation.</para>
/// </remarks>
public interface IInvoiceNoSqlBroker
{
    /// <summary>Persists a new invoice document.</summary>
    ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice);
    
    /// <summary>Retrieves a single invoice by identifier.</summary>
    ValueTask<Invoice?> ReadInvoiceAsync(Guid invoiceIdentifier);
    
    /// <summary>Lists all non soft-deleted invoices.</summary>
    ValueTask<IEnumerable<Invoice>> ReadInvoicesAsync();
    
    /// <summary>Replaces (upserts) an invoice by identifier.</summary>
    ValueTask<Invoice?> UpdateInvoiceAsync(Guid invoiceIdentifier, Invoice updatedInvoice);
    
    /// <summary>Soft-deletes an invoice (sets IsSoftDeleted flag).</summary>
    ValueTask DeleteInvoiceAsync(Guid invoiceIdentifier);
}
```

#### Database Broker Implementation

```csharp
public sealed partial class InvoiceNoSqlBroker : DbContext, IInvoiceNoSqlBroker
{
    private CosmosClient CosmosClient { get; }
    
    public InvoiceNoSqlBroker(
        CosmosClient client,
        DbContextOptions<InvoiceNoSqlBroker> options)
        : base(options)
    {
        ArgumentNullException.ThrowIfNull(client);
        ArgumentNullException.ThrowIfNull(options);
        CosmosClient = client;
    }
    
    // DbSet properties
    public DbSet<Invoice> Invoices { get; set; } = default!;
    public DbSet<Merchant> Merchants { get; set; } = default!;
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure Cosmos containers, partition keys, JSON mappings
        modelBuilder.Entity<Invoice>()
            .ToContainer("invoices")
            .HasPartitionKey(i => i.UserIdentifier);
    }
}
```

### Foundation Services

**Purpose**: Validation + CRUD operations (broker-neighboring layer)

**Rules**:

- Single dependency: one broker
- Business language method names (Add, Retrieve, Modify, Remove)
- Structural and logical validation
- Exception classification (Validation, Dependency, DependencyValidation)

#### Foundation Service Interface

```csharp
/// <summary>
/// Foundation (broker-neighboring) service for invoice storage operations.
/// Validates invoice entities and delegates persistence to the database broker.
/// </summary>
/// <remarks>
/// <para><b>The Standard Layer:</b> Foundation. Single dependency on <see cref="IInvoiceNoSqlBroker"/>.
/// Performs structural and logical validation before delegating CRUD to the broker.</para>
/// </remarks>
public interface IInvoiceStorageFoundationService
{
    /// <summary>Adds a new invoice to persistent storage after validation.</summary>
    ValueTask<Invoice> AddInvoiceAsync(Invoice invoice);
    
    /// <summary>Retrieves a single invoice by identifier.</summary>
    ValueTask<Invoice?> RetrieveInvoiceByIdAsync(Guid invoiceId);
    
    /// <summary>Retrieves all invoices.</summary>
    ValueTask<IEnumerable<Invoice>> RetrieveAllInvoicesAsync();
    
    /// <summary>Modifies an existing invoice after validation.</summary>
    ValueTask<Invoice?> ModifyInvoiceAsync(Invoice invoice);
    
    /// <summary>Removes an invoice from storage (soft delete).</summary>
    ValueTask RemoveInvoiceAsync(Guid invoiceId);
}
```

#### Foundation Service Implementation

```csharp
public sealed partial class InvoiceStorageFoundationService : IInvoiceStorageFoundationService
{
    private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;
    
    public InvoiceStorageFoundationService(IInvoiceNoSqlBroker invoiceNoSqlBroker)
    {
        this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    }
    
    public async ValueTask<Invoice> AddInvoiceAsync(Invoice invoice) =>
        await TryCatchAsync(async () =>
        {
            ValidateInvoiceOnAdd(invoice);
            
            return await invoiceNoSqlBroker
                .CreateInvoiceAsync(invoice)
                .ConfigureAwait(false);
        }).ConfigureAwait(false);
    
    public async ValueTask<Invoice?> RetrieveInvoiceByIdAsync(Guid invoiceId) =>
        await TryCatchAsync(async () =>
        {
            ValidateInvoiceId(invoiceId);
            
            return await invoiceNoSqlBroker
                .ReadInvoiceAsync(invoiceId)
                .ConfigureAwait(false);
        }).ConfigureAwait(false);
    
    // Validation methods in partial class: InvoiceStorageFoundationService.Validations.cs
}
```

### Processing Services

**Purpose**: Higher-order business logic combining multiple operations

**Rules**:

- 2-3 dependencies (typically multiple foundation services)
- Business language method names
- Exception classification
- No direct broker access

#### Processing Service Interface

```csharp
/// <summary>
/// Processing service for invoice business operations.
/// Combines invoice storage, merchant storage, and analysis services.
/// </summary>
/// <remarks>
/// <para><b>The Standard Layer:</b> Processing. Dependencies on multiple foundation services
/// to perform higher-order invoice operations.</para>
/// </remarks>
public interface IInvoiceProcessingService
{
    /// <summary>Creates a complete invoice with merchant and analysis.</summary>
    Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null);
    
    /// <summary>Analyzes an invoice with specified options.</summary>
    Task AnalyzeInvoice(
        InvoiceAnalysisOptions options,
        Guid identifier,
        Guid? userIdentifier = null);
    
    /// <summary>Retrieves an invoice by identifier.</summary>
    Task<Invoice?> RetrieveInvoice(Guid invoiceIdentifier, Guid? userIdentifier = null);
    
    /// <summary>Modifies an existing invoice.</summary>
    Task ModifyInvoice(Invoice invoice, Guid? userIdentifier = null);
    
    /// <summary>Removes an invoice.</summary>
    Task DeleteInvoice(Guid invoiceIdentifier, Guid? userIdentifier = null);
}
```

#### Processing Service Implementation

```csharp
public sealed partial class InvoiceProcessingService : IInvoiceProcessingService
{
    private readonly IInvoiceOrchestrationService invoiceOrchestrationService;
    
    public InvoiceProcessingService(
        IInvoiceOrchestrationService invoiceOrchestrationService)
    {
        this.invoiceOrchestrationService = invoiceOrchestrationService;
    }
    
    public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null) =>
        await TryCatchAsync(async () =>
        {
            using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
            
            await invoiceOrchestrationService
                .CreateInvoiceObject(invoice)
                .ConfigureAwait(false);
        }).ConfigureAwait(false);
    
    public async Task AnalyzeInvoice(
        InvoiceAnalysisOptions options,
        Guid identifier,
        Guid? userIdentifier = null) =>
        await TryCatchAsync(async () =>
        {
            using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
            
            await invoiceOrchestrationService
                .AnalyzeInvoiceWithOptions(options, identifier, userIdentifier)
                .ConfigureAwait(false);
        }).ConfigureAwait(false);
    
    // Exception handling in partial class: InvoiceProcessingService.Exceptions.cs
}
```

### Orchestration Services

**Purpose**: Complex multi-entity workflows and coordination

**Rules**:

- 2-3 dependencies (multiple foundation/processing services)
- Business language method names
- Coordinate cross-aggregate operations
- Exception classification

#### Orchestration Service Interface

```csharp
/// <summary>
/// Orchestration service coordinating invoice, merchant, and analysis operations.
/// </summary>
/// <remarks>
/// <para><b>The Standard Layer:</b> Orchestration. Coordinates multiple foundation services
/// for complex invoice workflows.</para>
/// </remarks>
public interface IInvoiceOrchestrationService
{
    /// <summary>Creates a complete invoice object with all related entities.</summary>
    Task<Invoice> CreateInvoiceObject(Invoice invoice);
    
    /// <summary>Retrieves a complete invoice with all related data.</summary>
    Task<Invoice?> RetrieveInvoiceObject(Guid invoiceId);
    
    /// <summary>Analyzes an invoice with specified options and enrichment.</summary>
    Task AnalyzeInvoiceWithOptions(
        InvoiceAnalysisOptions options,
        Guid invoiceId,
        Guid? userId = null);
}
```

#### Orchestration Service Implementation

```csharp
public sealed partial class InvoiceOrchestrationService : IInvoiceOrchestrationService
{
    private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;
    private readonly IMerchantStorageFoundationService merchantStorageFoundationService;
    private readonly IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService;
    
    public InvoiceOrchestrationService(
        IInvoiceStorageFoundationService invoiceStorageFoundationService,
        IMerchantStorageFoundationService merchantStorageFoundationService,
        IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService)
    {
        this.invoiceStorageFoundationService = invoiceStorageFoundationService;
        this.merchantStorageFoundationService = merchantStorageFoundationService;
        this.invoiceAnalysisFoundationService = invoiceAnalysisFoundationService;
    }
    
    public async Task<Invoice> CreateInvoiceObject(Invoice invoice) =>
        await TryCatchAsync(async () =>
        {
            // Step 1: Ensure merchant exists
            if (invoice.Merchant is not null)
            {
                var existingMerchant = await merchantStorageFoundationService
                    .RetrieveMerchantByIdAsync(invoice.MerchantId)
                    .ConfigureAwait(false);
                
                if (existingMerchant is null)
                {
                    await merchantStorageFoundationService
                        .AddMerchantAsync(invoice.Merchant)
                        .ConfigureAwait(false);
                }
            }
            
            // Step 2: Create invoice
            return await invoiceStorageFoundationService
                .AddInvoiceAsync(invoice)
                .ConfigureAwait(false);
        }).ConfigureAwait(false);
}
```

### Exposers Layer

**Purpose**: Protocol mapping (HTTP, gRPC) to service calls

**Rules**:

- Minimal API endpoints (ASP.NET Core)
- Business language route names
- Single dependency: one processing/orchestration service
- Exception to HTTP status code mapping

#### Minimal API Endpoint

```csharp
internal static partial class InvoiceEndpoints
{
    internal static async partial Task<IResult> CreateNewInvoiceAsync(
        [FromServices] IInvoiceProcessingService invoiceProcessingService,
        [FromBody] InvoiceDto invoiceDto)
    {
        try
        {
            using var activity = InvoicePackageTracing.StartActivity(
                nameof(CreateNewInvoiceAsync),
                ActivityKind.Server
            );
            
            var invoice = invoiceDto.ToInvoice();
            
            await invoiceProcessingService
                .CreateInvoice(invoice)
                .ConfigureAwait(false);
            
            return TypedResults.Created($"/rest/v1/invoices/{invoice.Id}", invoice);
        }
        catch (InvoiceProcessingServiceValidationException exception)
        {
            return TypedResults.Problem(
                detail: exception.Message,
                statusCode: StatusCodes.Status400BadRequest,
                title: "Validation error"
            );
        }
        catch (InvoiceProcessingServiceDependencyException exception)
        {
            return TypedResults.Problem(
                detail: exception.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Dependency error"
            );
        }
    }
}
```

## Exception Classification

### Three Exception Types

| Exception Type | Meaning | HTTP Status |
|---------------|---------|-------------|
| **ValidationException** | Invalid input from caller | 400 Bad Request |
| **DependencyException** | External dependency failed | 500 Internal Server Error |
| **DependencyValidationException** | Dependency rejected input | 424 Failed Dependency |

### Exception Hierarchy

```csharp
// Foundation Service Exceptions
public class InvoiceStorageFoundationServiceValidationException : Exception { }
public class InvoiceStorageFoundationServiceDependencyException : Exception { }
public class InvoiceStorageFoundationServiceDependencyValidationException : Exception { }

// Processing Service Exceptions
public class InvoiceProcessingServiceValidationException : Exception { }
public class InvoiceProcessingServiceDependencyException : Exception { }
public class InvoiceProcessingServiceDependencyValidationException : Exception { }
```

### Try-Catch Pattern

```csharp
private async ValueTask<Invoice> TryCatchAsync(
    ReturningInvoiceFunction returningInvoiceFunction)
{
    try
    {
        return await returningInvoiceFunction().ConfigureAwait(false);
    }
    catch (NullInvoiceException nullInvoiceException)
    {
        throw CreateAndLogValidationException(nullInvoiceException);
    }
    catch (InvalidInvoiceException invalidInvoiceException)
    {
        throw CreateAndLogValidationException(invalidInvoiceException);
    }
    catch (CosmosException cosmosException)
    {
        throw CreateAndLogDependencyException(cosmosException);
    }
    catch (Exception exception)
    {
        throw CreateAndLogServiceException(exception);
    }
}
```

## Validation Strategy

### Structural Validation

**Check**: Object nullability, required properties

```csharp
private static void ValidateInvoiceOnAdd(Invoice invoice)
{
    ValidateInvoiceIsNotNull(invoice);
    
    Validate(
        (Rule: IsInvalid(invoice.Id), Parameter: nameof(Invoice.Id)),
        (Rule: IsInvalid(invoice.Name), Parameter: nameof(Invoice.Name)),
        (Rule: IsInvalid(invoice.MerchantId), Parameter: nameof(Invoice.MerchantId)),
        (Rule: IsInvalid(invoice.CreatedDate), Parameter: nameof(Invoice.CreatedDate))
    );
}

private static dynamic IsInvalid(Guid id) => new
{
    Condition = id == Guid.Empty,
    Message = "Id is required"
};

private static dynamic IsInvalid(string text) => new
{
    Condition = string.IsNullOrWhiteSpace(text),
    Message = "Text is required"
};
```

### Logical Validation

**Check**: Business rules, domain invariants

```csharp
private static void ValidateInvoiceOnModify(Invoice invoice)
{
    ValidateInvoiceIsNotNull(invoice);
    
    Validate(
        (Rule: IsInvalid(invoice.Id), Parameter: nameof(Invoice.Id)),
        (Rule: IsInvalid(invoice.UpdatedDate), Parameter: nameof(Invoice.UpdatedDate)),
        (Rule: IsNotRecent(invoice.UpdatedDate), Parameter: nameof(Invoice.UpdatedDate)),
        (Rule: IsSame(
            firstDate: invoice.UpdatedDate,
            secondDate: invoice.CreatedDate,
            secondDateName: nameof(Invoice.CreatedDate)),
        Parameter: nameof(Invoice.UpdatedDate))
    );
}

private static dynamic IsNotRecent(DateTimeOffset date) => new
{
    Condition = IsDateNotRecent(date),
    Message = $"Date is not recent. It was {date}"
};
```

## Dependency Injection Setup

### Service Registration by Layer

```csharp
// Program.cs or extension methods

// Brokers
builder.Services.AddDbContext<IInvoiceNoSqlBroker, InvoiceNoSqlBroker>();
builder.Services.AddSingleton<IInvoiceAnalysisBroker, InvoiceAnalysisBroker>();

// Foundation Services
builder.Services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();
builder.Services.AddScoped<IMerchantStorageFoundationService, MerchantStorageFoundationService>();
builder.Services.AddScoped<IInvoiceAnalysisFoundationService, InvoiceAnalysisFoundationService>();

// Processing Services
builder.Services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();

// Orchestration Services
builder.Services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();
builder.Services.AddScoped<IMerchantOrchestrationService, MerchantOrchestrationService>();
```

## Best Practices

### ✅ Do: Use Business Language

```csharp
// ✅ Good - business language
public interface IInvoiceStorageFoundationService
{
    ValueTask<Invoice> AddInvoiceAsync(Invoice invoice);
    ValueTask<Invoice?> RetrieveInvoiceByIdAsync(Guid id);
    ValueTask<Invoice?> ModifyInvoiceAsync(Invoice invoice);
    ValueTask RemoveInvoiceAsync(Guid id);
}

// ❌ Bad - technical language
public interface IInvoiceStorageFoundationService
{
    ValueTask<Invoice> InsertInvoiceAsync(Invoice invoice);
    ValueTask<Invoice?> SelectInvoiceByIdAsync(Guid id);
    ValueTask<Invoice?> UpdateInvoiceAsync(Invoice invoice);
    ValueTask DeleteInvoiceAsync(Guid id);
}
```

### ✅ Do: Follow the Florance Pattern

```csharp
// ✅ Good - 1 dependency (Foundation Service)
public class InvoiceStorageFoundationService
{
    private readonly IInvoiceNoSqlBroker invoiceNoSqlBroker;
    
    public InvoiceStorageFoundationService(IInvoiceNoSqlBroker invoiceNoSqlBroker)
    {
        this.invoiceNoSqlBroker = invoiceNoSqlBroker;
    }
}

// ✅ Good - 3 dependencies (Orchestration Service)
public class InvoiceOrchestrationService
{
    private readonly IInvoiceStorageFoundationService invoiceStorageFoundationService;
    private readonly IMerchantStorageFoundationService merchantStorageFoundationService;
    private readonly IInvoiceAnalysisFoundationService invoiceAnalysisFoundationService;
}

// ❌ Bad - too many dependencies
public class InvoiceService
{
    private readonly IBroker1 broker1;
    private readonly IBroker2 broker2;
    private readonly IService1 service1;
    private readonly IService2 service2;
    private readonly IService3 service3;
    // ... 5+ dependencies violates Florance Pattern
}
```

### ✅ Do: Pure Contracting

```csharp
// ✅ Good - interface-driven
public interface IInvoiceProcessingService
{
    Task CreateInvoice(Invoice invoice);
}

public class InvoiceProcessingService : IInvoiceProcessingService
{
    public async Task CreateInvoice(Invoice invoice) { }
}

// ❌ Bad - concrete class without interface
public class InvoiceProcessingService
{
    public async Task CreateInvoice(Invoice invoice) { }
}
```

### ✅ Do: Validate at Every Layer

```csharp
// ✅ Good - each layer validates
public class InvoiceStorageFoundationService
{
    public async ValueTask<Invoice> AddInvoiceAsync(Invoice invoice)
    {
        ValidateInvoiceOnAdd(invoice); // ← Foundation validates
        return await broker.CreateInvoiceAsync(invoice);
    }
}

public class InvoiceProcessingService
{
    public async Task CreateInvoice(Invoice invoice)
    {
        ValidateInvoiceForCreation(invoice); // ← Processing validates
        await foundationService.AddInvoiceAsync(invoice);
    }
}

// ❌ Bad - only top layer validates
public class InvoiceProcessingService
{
    public async Task CreateInvoice(Invoice invoice)
    {
        ValidateInvoice(invoice);
        await foundationService.AddInvoiceAsync(invoice); // ← No validation
    }
}
```

### ❌ Don't: Put Business Logic in Brokers

```csharp
// ❌ Bad - broker contains validation
public class InvoiceNoSqlBroker : IInvoiceNoSqlBroker
{
    public async ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice)
    {
        if (invoice.TotalAmount < 0) // ← Business logic in broker!
            throw new InvalidOperationException();
        
        return await dbContext.Invoices.AddAsync(invoice);
    }
}

// ✅ Good - broker is thin
public class InvoiceNoSqlBroker : IInvoiceNoSqlBroker
{
    public async ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice)
    {
        return await dbContext.Invoices.AddAsync(invoice);
    }
}
```

### ❌ Don't: Skip Layers

```csharp
// ❌ Bad - processing service directly calls broker
public class InvoiceProcessingService
{
    private readonly IInvoiceNoSqlBroker broker; // ← Should not inject broker
    
    public async Task CreateInvoice(Invoice invoice)
    {
        await broker.CreateInvoiceAsync(invoice); // ← Skips foundation layer
    }
}

// ✅ Good - processing service calls foundation service
public class InvoiceProcessingService
{
    private readonly IInvoiceStorageFoundationService foundationService;
    
    public async Task CreateInvoice(Invoice invoice)
    {
        await foundationService.AddInvoiceAsync(invoice);
    }
}
```

## Testing Patterns

### Foundation Service Tests

```csharp
[Fact]
public async Task ShouldAddInvoiceAsync()
{
    // given
    Invoice randomInvoice = CreateRandomInvoice();
    Invoice inputInvoice = randomInvoice;
    Invoice expectedInvoice = inputInvoice;
    
    this.invoiceNoSqlBrokerMock.Setup(broker =>
        broker.CreateInvoiceAsync(inputInvoice))
        .ReturnsAsync(expectedInvoice);
    
    // when
    Invoice actualInvoice = await this.invoiceStorageFoundationService
        .AddInvoiceAsync(inputInvoice);
    
    // then
    actualInvoice.Should().BeEquivalentTo(expectedInvoice);
    
    this.invoiceNoSqlBrokerMock.Verify(broker =>
        broker.CreateInvoiceAsync(inputInvoice),
        Times.Once);
}
```

### Exception Classification Tests

```csharp
[Fact]
public async Task ShouldThrowValidationExceptionOnAddIfInvoiceIsNullAndLogItAsync()
{
    // given
    Invoice nullInvoice = null;
    
    var nullInvoiceException = new NullInvoiceException();
    
    var expectedInvoiceStorageFoundationServiceValidationException =
        new InvoiceStorageFoundationServiceValidationException(nullInvoiceException);
    
    // when
    ValueTask<Invoice> addInvoiceTask =
        this.invoiceStorageFoundationService.AddInvoiceAsync(nullInvoice);
    
    // then
    await Assert.ThrowsAsync<InvoiceStorageFoundationServiceValidationException>(
        () => addInvoiceTask.AsTask());
}
```

## Quick Reference

| Layer | Purpose | Dependencies | Method Prefix |
|-------|---------|--------------|---------------|
| **Brokers** | External dependency abstraction | None | Create/Read/Update/Delete |
| **Foundation** | Validation + CRUD | 1 broker | Add/Retrieve/Modify/Remove |
| **Processing** | Higher-order business logic | 2-3 foundation services | Business verbs |
| **Orchestration** | Multi-entity coordination | 2-3 foundation/processing | Business verbs |
| **Exposers** | Protocol mapping | 1 processing/orchestration | HTTP verbs |

## Additional Resources

- **RFC 2003**: Complete The Standard implementation documentation
- **The Standard by Hassan Habib**: <https://github.com/hassanhabib/The-Standard>
- **Example Services**: `sites/api.arolariu.ro/src/Invoices/Services/`
- **The Standard Book**: <https://www.thestandard.pro/>
