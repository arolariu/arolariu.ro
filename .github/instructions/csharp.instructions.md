---
description: "C# coding standards and patterns for .NET 10.0 development"
applyTo: '**/*.cs'
---

# C# Coding Standards

Specific C# coding guidelines for the arolariu.ro backend. For architecture patterns, see `backend.instructions.md`.

---

## 🎯 Quick Reference

| Aspect | Standard |
|--------|----------|
| **Target** | .NET 10.0 / C# 13 |
| **Nullable** | Enabled (strict) |
| **Implicit Usings** | Disabled |
| **Warnings** | Treated as errors |
| **Documentation** | XML docs required on public APIs |

---

## 📝 File Structure

### Namespace Declaration

Use file-scoped namespaces (single line):

```csharp
namespace arolariu.Backend.Domain.Invoices.Services.Foundation;

using System;
using System.Threading.Tasks;

using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
```

### Using Directives Order

1. `System.*` namespaces
2. Third-party namespaces
3. `arolariu.Backend.*` namespaces (project references)
4. Relative namespaces

```csharp
namespace arolariu.Backend.Domain.Invoices.Services.Processing;

using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using arolariu.Backend.Common.DDD.Contracts;
using arolariu.Backend.Domain.Invoices.DDD.AggregatorRoots.Invoices;
using arolariu.Backend.Domain.Invoices.DDD.Entities.Merchants;
```

---

## 🏷️ Naming Conventions

### General Rules

| Element | Convention | Example |
|---------|------------|---------|
| **Namespaces** | PascalCase, match folder | `arolariu.Backend.Domain.Invoices` |
| **Classes** | PascalCase | `InvoiceProcessingService` |
| **Interfaces** | `I` prefix + PascalCase | `IInvoiceNoSqlBroker` |
| **Methods** | PascalCase | `CreateInvoiceAsync` |
| **Properties** | PascalCase | `UserIdentifier` |
| **Fields (private)** | camelCase | `invoiceNoSqlBroker` |
| **Constants** | PascalCase | `MaxRetryCount` |
| **Parameters** | camelCase | `userIdentifier` |
| **Local variables** | camelCase | `invoiceList` |
| **Type parameters** | `T` prefix or descriptive | `T`, `TEntity`, `TKey` |

### Special Cases

```csharp
// Cosmos DB requires lowercase 'id' - suppress warning
[SuppressMessage("Style", "IDE1006:Naming Styles", 
    Justification = "Cosmos DB requires lowercase 'id' property name.")]
public virtual T? id { get; init; } = default;

// Acronyms: only first letter capitalized for 2+ chars
public Guid UserId { get; set; }       // ✅ Correct
public Guid UserID { get; set; }       // ❌ Wrong

// Exception: well-known acronyms like IO, DB in specific contexts
public IInvoiceNoSqlBroker Broker { get; }  // ✅ NoSql is acceptable
```

---

## 🔧 Language Features

### Required Properties (C# 11+)

Use `required` for mandatory initialization:

```csharp
public sealed class Invoice : NamedEntity<Guid>
{
    public override required Guid id { get; init; } = Guid.CreateVersion7();
    public required Guid UserIdentifier { get; set; } = Guid.Empty;
}

// Usage - compiler enforces required properties
var invoice = new Invoice
{
    id = Guid.CreateVersion7(),
    UserIdentifier = userId  // Required!
};
```

### Init-Only Properties

Use `init` for immutable properties set during construction:

```csharp
public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
public Guid CreatedBy { get; init; }
```

### Primary Constructors (C# 12+)

Use for simple dependency injection:

```csharp
// ✅ Preferred for simple services
public class InvoiceStorageFoundationService(
    IInvoiceNoSqlBroker invoiceNoSqlBroker,
    ILoggingBroker loggingBroker) : IInvoiceStorageFoundationService
{
    public async Task<Invoice> ReadInvoiceObject(Guid id) =>
        await invoiceNoSqlBroker.ReadInvoiceAsync(id).ConfigureAwait(false);
}

// ❌ Avoid when additional initialization logic is needed
public class ComplexService
{
    private readonly IDependency _dependency;
    
    public ComplexService(IDependency dependency)
    {
        _dependency = dependency ?? throw new ArgumentNullException(nameof(dependency));
        // Additional initialization...
    }
}
```

### Collection Expressions (C# 12+)

```csharp
// ✅ Preferred
public ICollection<Guid> SharedWith { get; init; } = [];
public ICollection<Product> Items { get; set; } = [];
List<string> items = [item1, item2, item3];

// ❌ Avoid verbose syntax
public ICollection<Guid> SharedWith { get; init; } = new List<Guid>();
```

### Pattern Matching

```csharp
// Switch expressions
var result = invoice.Category switch
{
    InvoiceCategory.NOT_DEFINED => HandleUndefined(invoice),
    InvoiceCategory.GROCERY => HandleGrocery(invoice),
    InvoiceCategory.RESTAURANT => HandleRestaurant(invoice),
    _ => throw new InvalidOperationException($"Unknown category: {invoice.Category}")
};

// Property patterns
if (invoice is { IsSoftDeleted: true, UserIdentifier: var userId })
{
    logger.LogWarning("Soft-deleted invoice accessed by user {UserId}", userId);
}

// Type patterns with when clause
catch (Exception ex) when (ex is DbUpdateException or CosmosException)
{
    throw CreateAndLogDependencyException(ex);
}
```

### File-Scoped Types

Use for internal helper classes:

```csharp
// Only visible within this file
file class InternalValidator
{
    public static bool IsValid(Invoice invoice) => invoice.id != Guid.Empty;
}
```

### Records (for DTOs and Value Objects)

```csharp
// Immutable data transfer objects
public record CreateInvoiceRequest(
    Guid UserIdentifier,
    string Name,
    string Description);

// Value objects with behavior
public record PaymentInformation
{
    public decimal TotalAmount { get; init; }
    public decimal TotalTax { get; init; }
    public string Currency { get; init; } = "RON";
    
    public decimal NetAmount => TotalAmount - TotalTax;
}
```

---

## ⚡ Async/Await Patterns

### ConfigureAwait(false)

**Always use `ConfigureAwait(false)` in library code:**

```csharp
// ✅ Correct - library code
public async Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null) =>
    await TryCatchAsync(async () =>
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceObject));
        ValidateInvoiceInformationIsValid(invoice);
        await invoiceNoSqlBroker.CreateInvoiceAsync(invoice).ConfigureAwait(false);
    }).ConfigureAwait(false);

// ❌ Wrong - missing ConfigureAwait
public async Task CreateInvoiceObject(Invoice invoice)
{
    await invoiceNoSqlBroker.CreateInvoiceAsync(invoice);
}
```

### Async Method Naming

```csharp
// ✅ Suffix with Async for async methods
public async Task<Invoice> ReadInvoiceAsync(Guid id);
public async Task CreateInvoiceAsync(Invoice invoice);
public async Task<IEnumerable<Invoice>> GetAllInvoicesAsync();

// ✅ Exception: Interface implementations can omit Async
public interface IInvoiceStorageFoundationService
{
    Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
    Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier = null);
}
```

### Async Best Practices

```csharp
// ✅ Prefer ValueTask for hot paths that often complete synchronously
public ValueTask<Invoice?> GetCachedInvoiceAsync(Guid id)
{
    if (_cache.TryGetValue(id, out var invoice))
        return ValueTask.FromResult<Invoice?>(invoice);
    
    return new ValueTask<Invoice?>(LoadFromDatabaseAsync(id));
}

// ✅ Use Task.WhenAll for parallel operations
public async Task<(Invoice[], Merchant[])> LoadDataAsync(Guid userId)
{
    var invoicesTask = GetInvoicesAsync(userId);
    var merchantsTask = GetMerchantsAsync(userId);
    
    await Task.WhenAll(invoicesTask, merchantsTask).ConfigureAwait(false);
    
    return (await invoicesTask, await merchantsTask);
}

// ❌ Avoid async void except for event handlers
public async void ProcessInvoice() { } // Wrong!
public async Task ProcessInvoiceAsync() { } // Correct
```

---

## 🛡️ Exception Handling

### TryCatch Pattern (The Standard)

Use delegate-based TryCatch for consistent exception handling:

```csharp
public partial class InvoiceProcessingService
{
    #region Delegates
    private delegate Task CallbackFunctionForTasksWithNoReturn();
    private delegate Task<Invoice> CallbackFunctionForTasksWithInvoiceReturn();
    private delegate Task<IEnumerable<Invoice>> CallbackFunctionForTasksWithInvoiceListReturn();
    #endregion

    #region TryCatchAsync
    private async Task TryCatchAsync(CallbackFunctionForTasksWithNoReturn callbackFunction)
    {
        try
        {
            await callbackFunction().ConfigureAwait(false);
        }
        catch (InvoiceOrchestrationValidationException exception)
        {
            throw CreateAndLogValidationException(exception.InnerException!);
        }
        catch (InvoiceOrchestrationDependencyException exception)
        {
            throw CreateAndLogDependencyException(exception.InnerException!);
        }
        catch (InvoiceOrchestrationServiceException exception)
        {
            throw CreateAndLogServiceException(exception.InnerException!);
        }
        catch (Exception exception)
        {
            throw CreateAndLogServiceException(exception);
        }
    }
    #endregion
}
```

### Exception Classification (The Standard)

| Exception Type | When to Throw |
|----------------|---------------|
| `ValidationException` | Input validation failures |
| `DependencyException` | External service failures (DB, API) |
| `DependencyValidationException` | External service validation errors |
| `ServiceException` | Internal service failures |

```csharp
// Exception hierarchy
public class InvoiceProcessingValidationException : Exception { }
public class InvoiceProcessingDependencyException : Exception { }
public class InvoiceProcessingDependencyValidationException : Exception { }
public class InvoiceProcessingServiceException : Exception { }
```

### Exception Factory Methods

```csharp
private InvoiceProcessingValidationException CreateAndLogValidationException(Exception exception)
{
    var processingException = new InvoiceProcessingValidationException(exception);
    loggingBroker.LogError(processingException);
    return processingException;
}

private InvoiceProcessingDependencyException CreateAndLogDependencyException(Exception exception)
{
    var processingException = new InvoiceProcessingDependencyException(exception);
    loggingBroker.LogCritical(processingException);
    return processingException;
}
```

---

## 📖 XML Documentation

### Required Elements

All public APIs must have XML documentation:

```csharp
/// <summary>
/// Represents the invoice aggregate root controlling line items, merchant linkage,
/// and payment details within the Invoices bounded context.
/// </summary>
/// <remarks>
/// <para>
/// This aggregate encapsulates the canonical mutable state of an invoice from
/// initial photo upload through OCR analysis and item categorization.
/// </para>
/// <para>
/// <b>Soft Delete Lifecycle:</b> When soft-deleted at the storage layer,
/// <c>IsSoftDeleted</c> is set to <c>true</c> rather than physically removing the row.
/// </para>
/// <para>
/// <b>Thread-safety:</b> Not thread-safe. Do not share instances across threads
/// without external synchronization.
/// </para>
/// </remarks>
/// <seealso cref="NamedEntity{T}"/>
/// <seealso cref="Merchant"/>
[ExcludeFromCodeCoverage]
public sealed class Invoice : NamedEntity<Guid> { }
```

### Method Documentation

```csharp
/// <summary>
/// Creates a new invoice in the data store with the specified details.
/// </summary>
/// <param name="invoice">The invoice aggregate to persist. Must not be null.</param>
/// <param name="userIdentifier">
/// Optional user identifier for audit purposes. If null, uses system identity.
/// </param>
/// <returns>A task representing the asynchronous create operation.</returns>
/// <exception cref="ArgumentNullException">
/// Thrown when <paramref name="invoice"/> is null.
/// </exception>
/// <exception cref="InvoiceValidationException">
/// Thrown when the invoice fails validation rules.
/// </exception>
/// <exception cref="InvoiceDependencyException">
/// Thrown when the data store is unavailable.
/// </exception>
/// <example>
/// <code>
/// var invoice = new Invoice { id = Guid.CreateVersion7(), UserIdentifier = userId };
/// await service.CreateInvoiceObject(invoice, userId);
/// </code>
/// </example>
public async Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier = null);
```

### Property Documentation

```csharp
/// <summary>
/// Gets or initializes the unique identifier for this entity.
/// </summary>
/// <value>
/// A <see cref="Guid"/> that uniquely identifies this invoice.
/// Uses Version 7 GUID for chronological ordering.
/// </value>
/// <remarks>
/// <para>
/// The identifier is immutable once set (init-only property).
/// Uses lowercase 'id' for Cosmos DB compatibility.
/// </para>
/// </remarks>
[JsonPropertyName("id")]
[JsonPropertyOrder(0)]
public override required Guid id { get; init; } = Guid.CreateVersion7();
```

---

## 🎨 Code Style

### Braces and Formatting

```csharp
// ✅ Allman style braces (on new line)
public class InvoiceService
{
    public async Task ProcessAsync()
    {
        if (condition)
        {
            // ...
        }
    }
}

// ✅ Single-line expressions for simple cases
public decimal NetAmount => TotalAmount - TotalTax;

public async Task<Invoice> GetAsync(Guid id) =>
    await broker.ReadAsync(id).ConfigureAwait(false);
```

### Expression-Bodied Members

```csharp
// ✅ Use for single-expression methods
public override string ToString() => $"Invoice: {id}";

// ✅ Use for simple properties
public bool IsValid => !IsSoftDeleted && id != Guid.Empty;

// ❌ Avoid for complex logic
public decimal CalculateTotal() =>
    Items.Where(i => !i.IsSoftDeleted)
         .Select(i => i.Price * i.Quantity)
         .Sum() * (1 + TaxRate);  // Too complex, use block body
```

### Null Handling

```csharp
// ✅ Null-coalescing operators
var name = invoice.Name ?? "Unnamed";
var category = invoice?.Category ?? InvoiceCategory.NOT_DEFINED;

// ✅ Null-forgiving operator (when you know better than the compiler)
throw CreateAndLogValidationException(exception.InnerException!);

// ✅ Pattern matching for null checks
if (invoice is null)
    throw new ArgumentNullException(nameof(invoice));

// ✅ Target-typed new
Invoice invoice = new() { id = Guid.CreateVersion7() };
```

### LINQ Style

```csharp
// ✅ Method syntax for simple queries
var activeInvoices = invoices.Where(i => !i.IsSoftDeleted).ToList();

// ✅ Query syntax for complex joins
var result = from i in invoices
             join m in merchants on i.MerchantReference equals m.id
             where !i.IsSoftDeleted
             select new { Invoice = i, Merchant = m };

// ✅ Break long chains
var summary = invoices
    .Where(i => !i.IsSoftDeleted)
    .Where(i => i.UserIdentifier == userId)
    .GroupBy(i => i.Category)
    .Select(g => new { Category = g.Key, Total = g.Sum(i => i.PaymentInformation.TotalAmount) })
    .OrderByDescending(x => x.Total)
    .ToList();
```

---

## 🔐 Attributes

### Common Attributes

```csharp
// Exclude from code coverage (entities, DTOs)
[ExcludeFromCodeCoverage]
public sealed class Invoice : NamedEntity<Guid> { }

// JSON serialization control
[JsonPropertyName("id")]
[JsonPropertyOrder(0)]
public Guid id { get; init; }

// Suppress specific warnings with justification
[SuppressMessage("Style", "IDE1006:Naming Styles", 
    Justification = "Cosmos DB requires lowercase 'id' property name.")]

[SuppressMessage("Usage", "CA2227:Collection properties should be read only", 
    Justification = "Set is only exposed for tests.")]

// Obsolete with migration path
[Obsolete("Use CreateInvoiceAsync instead. Will be removed in v3.0.")]
public Task CreateInvoice(Invoice invoice) => CreateInvoiceAsync(invoice);
```

### Validation Attributes

```csharp
public record CreateInvoiceRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; init; } = string.Empty;
    
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; init; }
    
    [RegularExpression(@"^[A-Z]{3}$")]
    public string Currency { get; init; } = "RON";
}
```

---

## 🧪 Testing Patterns

### Test Class Structure

```csharp
namespace arolariu.Backend.Domain.Tests.Invoices.Services.Orchestration;

using System;
using System.Threading.Tasks;

using Moq;
using Xunit;

using arolariu.Backend.Domain.Invoices.Services.Orchestration;

public class InvoiceOrchestrationServiceTests
{
    private readonly Mock<IInvoiceStorageFoundationService> _mockFoundationService;
    private readonly Mock<IInvoiceAnalysisFoundationService> _mockAnalysisService;
    private readonly InvoiceOrchestrationService _sut;

    public InvoiceOrchestrationServiceTests()
    {
        _mockFoundationService = new Mock<IInvoiceStorageFoundationService>();
        _mockAnalysisService = new Mock<IInvoiceAnalysisFoundationService>();
        _sut = new InvoiceOrchestrationService(
            _mockFoundationService.Object,
            _mockAnalysisService.Object);
    }

    [Fact]
    public void Constructor_NullFoundationService_ThrowsArgumentNullException()
    {
        // Arrange & Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            new InvoiceOrchestrationService(null!, _mockAnalysisService.Object));
    }

    [Fact]
    public async Task CreateInvoiceObject_ValidInvoice_CallsFoundationService()
    {
        // Arrange
        var invoice = InvoiceBuilder.CreateRandomInvoice();
        
        _mockFoundationService
            .Setup(s => s.CreateInvoiceObject(It.IsAny<Invoice>(), It.IsAny<Guid?>()))
            .Returns(Task.CompletedTask);

        // Act
        await _sut.CreateInvoiceObject(invoice);

        // Assert
        _mockFoundationService.Verify(
            s => s.CreateInvoiceObject(invoice, null),
            Times.Once);
    }
}
```

### Test Data Builders

```csharp
public static class InvoiceBuilder
{
    public static Invoice CreateRandomInvoice() => new()
    {
        id = Guid.CreateVersion7(),
        UserIdentifier = Guid.NewGuid(),
        Name = $"INV-{Random.Shared.Next(1000, 9999)}",
        Description = "Test invoice",
        Category = InvoiceCategory.GROCERY,
        PaymentInformation = new PaymentInformation
        {
            TotalAmount = Random.Shared.Next(10, 1000),
            Currency = "RON"
        }
    };

    public static Invoice WithCategory(this Invoice invoice, InvoiceCategory category)
    {
        invoice.Category = category;
        return invoice;
    }
}
```

---

## ✅ Code Analysis

### Enabled Analyzers

The project uses maximum warning level with warnings as errors:

```xml
<PropertyGroup>
    <WarningLevel>9999</WarningLevel>
    <TreatWarningsAsErrors>True</TreatWarningsAsErrors>
    <AnalysisLevel>latest-all</AnalysisLevel>
    <EnableCodeStyleSeverity>True</EnableCodeStyleSeverity>
</PropertyGroup>
```

### Suppressed Warnings

Only suppress with clear justification:

```xml
<NoWarn>S1135, NU1903, NU1902</NoWarn>
<!-- S1135: TODO comments (tracked in issues)
     NU1903/NU1902: Preview package warnings (intentional) -->
```

### Common Suppressions

```csharp
// Collection property setters (for testing/serialization)
[SuppressMessage("Usage", "CA2227:Collection properties should be read only")]

// Naming for Cosmos DB compatibility
[SuppressMessage("Style", "IDE1006:Naming Styles")]

// Async methods without cancellation token (by design)
[SuppressMessage("Design", "CA1068:CancellationToken parameters must come last")]
```

---

## 🔗 Quick Reference

### Common Patterns

```csharp
// GUID creation (use Version 7 for sortable)
var id = Guid.CreateVersion7();

// Nullable reference handling
invoice?.Items?.FirstOrDefault()?.Name ?? "Unknown";

// Range operator
var lastThree = items[^3..];

// Index operator
var lastItem = items[^1];

// String interpolation with format
$"Total: {amount:C2}"
$"Date: {date:yyyy-MM-dd}"

// Raw string literals (C# 11+)
var json = """
    {
        "name": "Invoice",
        "id": "12345"
    }
    """;
```

### Avoid These Anti-Patterns

```csharp
// ❌ var for unclear types
var x = GetSomething();

// ✅ Explicit type when unclear
Invoice invoice = GetSomething();

// ❌ Magic strings
if (status == "active") { }

// ✅ Constants or enums
if (status == InvoiceStatus.Active) { }

// ❌ Swallowing exceptions
catch (Exception) { }

// ✅ Log and rethrow appropriately
catch (Exception ex)
{
    logger.LogError(ex, "Operation failed");
    throw;
}

// ❌ Task.Result or .Wait() (deadlock risk)
var result = task.Result;

// ✅ Async all the way
var result = await task.ConfigureAwait(false);
```

---

## 📚 Related Documentation

- **Backend Architecture**: `.github/instructions/backend.instructions.md`
- **RFC 2001**: Domain-Driven Design Architecture
- **RFC 2003**: The Standard Implementation
- **RFC 2004**: XML Documentation Standard
- **ConfigureAwait Guide**: `docs/backend/configureawait-best-practices.md`
