# ConfigureAwait Best Practices

## Overview

This document outlines the proper usage of `ConfigureAwait()` in the arolariu.ro codebase, explaining when to use it, when to omit it, and
the rationale behind these decisions.

## Quick Reference

| Context                           | Rule                                      | Rationale                                                   |
| --------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| **Production Code**               | ✅ **Always use** `ConfigureAwait(false)` | Prevents deadlocks, improves performance                    |
| **Test Methods**                  | **Optional**                              | CA2007 is suppressed in test projects; tests use both forms |
| **Minimal API endpoint handlers** | ✅ **Use** `ConfigureAwait(false)`        | CA2007 is a build error in `src`; keeps code context-free   |
| **Library Code**                  | ✅ **Use** `ConfigureAwait(false)`        | Should not assume execution context                         |

---

## Production Code Guidelines

### ✅ DO: Use ConfigureAwait(false) in Library Code

**Why?** Library code should not assume it will run on a specific synchronization context.

```csharp
// ✅ CORRECT
public async Task<Invoice> GetInvoiceAsync(Guid id)
{
    var data = await _repository.FetchAsync(id).ConfigureAwait(false);
    var result = await ProcessDataAsync(data).ConfigureAwait(false);
    return result;
}
```

```csharp
// ❌ INCORRECT - Missing ConfigureAwait
public async Task<Invoice> GetInvoiceAsync(Guid id)
{
    var data = await _repository.FetchAsync(id); // CA2007 (build error in src)
    var result = await ProcessDataAsync(data); // CA2007 (build error in src)
    return result;
}
```

### ✅ DO: Use ConfigureAwait(false) in Minimal API Endpoint Handlers

**Why?** ASP.NET Core has no `SynchronizationContext`, so there is no request context to restore after an `await`. The rule still applies
here because CA2007 is enabled by `<AnalysisLevel>latest-all</AnalysisLevel>` and escalated to a build error by
`<TreatWarningsAsErrors>True</TreatWarningsAsErrors>` in `sites/api.arolariu.ro/Directory.Build.props`, and because it keeps handler and
service code context-free in library style.

```csharp
// ✅ CORRECT - Minimal API handler (simplified from InvoiceEndpoints.Handlers.cs; tracing and error mapping omitted)
internal static async partial Task<IResult> RetrieveProductsFromInvoiceAsync(
    IInvoiceManagementService invoiceManagementService,
    IHttpContextAccessor httpContext,
    Guid id,
    CancellationToken cancellationToken)
{
    var potentialUserIdentifier = RetrieveUserIdentifierClaimFromPrincipal(httpContext);
    var possibleInvoice = await invoiceManagementService
        .ReadInvoice(id, potentialUserIdentifier, cancellationToken)
        .ConfigureAwait(false);

    if (possibleInvoice is null)
    {
        return TypedResults.NotFound();
    }

    return TypedResults.Ok(possibleInvoice.Items.Select(ProductResponseDto.FromProduct));
}
```

### ✅ DO: Chain ConfigureAwait(false) for All Awaits

**Why?** Consistency prevents accidental context captures and makes code behavior predictable.

```csharp
// ✅ CORRECT - All awaits use ConfigureAwait(false)
public async Task<ProcessedData> ProcessAsync(InputData data)
{
    var step1 = await ValidateAsync(data).ConfigureAwait(false);
    var step2 = await TransformAsync(step1).ConfigureAwait(false);
    var step3 = await EnrichAsync(step2).ConfigureAwait(false);
    return await FinalizeAsync(step3).ConfigureAwait(false);
}
```

---

## Test Code Guidelines

### ConfigureAwait Is Optional in Test Methods

**Why?** Test projects suppress CA2007, so the analyzer does not require `ConfigureAwait(false)` in tests. Existing tests use both forms:
`ConfigProxyClientTests` awaits with `.ConfigureAwait(false)`, while `InvoiceEndpointsStatusCodeTests` awaits directly. Test parallelism is
configured separately, by `[assembly: Parallelize(...)]` in each test project's `AssemblyInfo.cs`.

```csharp
// ✅ VALID - Direct await (CA2007 is suppressed in test projects)
[TestMethod]
public async Task GetInvoice_ValidId_ReturnsInvoice()
{
    // Arrange
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();
    _mockRepository.Setup(r => r.GetAsync(It.IsAny<Guid>()))
        .ReturnsAsync(expectedInvoice);

    // Act
    var result = await _service.GetInvoiceAsync(Guid.NewGuid());

    // Assert
    Assert.IsNotNull(result);
    Assert.AreEqual(expectedInvoice.id, result.id);
}
```

```csharp
// ✅ ALSO VALID - ConfigureAwait(false) in a test, as in ConfigProxyClientTests
[TestMethod]
public async Task GetInvoice_ValidId_ReturnsInvoice()
{
    var result = await _service.GetInvoiceAsync(Guid.NewGuid()).ConfigureAwait(false);
    Assert.IsNotNull(result);
}
```

### Build Configuration for Tests

Test projects disable CA2007 warnings via `Directory.Build.props`:

```xml
<!-- sites/api.arolariu.ro/tests/Directory.Build.props -->
<PropertyGroup Label="Test Code Analysis Settings">
  <!-- CA2007: ConfigureAwait Rule Override for Test Projects -->
  <NoWarn>$(NoWarn);CA2007</NoWarn>
  <!-- The same group also suppresses CA1707, CA1515, CA1062, and CA1303. -->
</PropertyGroup>
```

This means:

- ✅ Test code **doesn't need** `ConfigureAwait` calls
- ✅ No CA2007 warnings in test files
- ✅ Existing tests that use `ConfigureAwait(false)` remain valid
- ✅ Test parallelism is configured by `[assembly: Parallelize(...)]` in each test project's `AssemblyInfo.cs`

---

## Common Scenarios

### Scenario 1: Domain Service Methods

```csharp
// ✅ CORRECT
public async Task<Invoice> AnalyzeInvoiceAsync(Invoice invoice)
{
    // All library/service code uses ConfigureAwait(false)
    var validated = await ValidateDomainRulesAsync(invoice).ConfigureAwait(false);
    var enriched = await EnrichWithAIAsync(validated).ConfigureAwait(false);
    return await ApplyBusinessLogicAsync(enriched).ConfigureAwait(false);
}
```

### Scenario 2: Repository/Data Access

```csharp
// ✅ CORRECT
public async Task<Invoice> GetByIdAsync(Guid id, Guid? userId)
{
    var container = await GetContainerAsync().ConfigureAwait(false);
    var response = await container.ReadItemAsync<Invoice>(
        id.ToString(),
        new PartitionKey(userId?.ToString() ?? string.Empty)
    ).ConfigureAwait(false);

    return response.Resource;
}
```

### Scenario 3: Exception Handling

```csharp
// ✅ CORRECT - ConfigureAwait inside the TryCatch wrapper (InvoiceOrchestrationService.Exceptions.cs)
private async Task<Invoice> TryCatchAsync(ReturningInvoiceFunction returningInvoiceFunction)
{
    try
    {
        return await returningInvoiceFunction().ConfigureAwait(false);
    }
    catch (OperationCanceledException)
    {
        // Cancellation is not a fault. Bare rethrow preserves the original stack trace.
        throw;
    }
    catch (Exception exception)
    {
        throw Classify(exception);
    }
}
```

### Scenario 4: Integration-Style Endpoint Tests

Integration-style tests invoke Minimal API handler delegates directly instead of using `WebApplicationFactory<Program>`, because the
production `Program.cs` boots Azure Key Vault, Cosmos DB, SQL Server, and Application Insights at startup. As in other tests,
`ConfigureAwait` is optional.

```csharp
// ✅ CORRECT - Direct handler invocation (from InvoiceEndpointsStatusCodeTests)
[TestMethod]
public async Task RetrieveSpecificInvoiceAsync_WhenServiceThrowsNotFound_Returns404()
{
    // Arrange
    var mockService = CreateServiceMockThatThrowsOnRead(new TestNotFoundException("invoice not found"));
    var accessor = CreateAuthenticatedContextAccessor();

    // Act
    var result = await InvoiceEndpoints
        .RetrieveSpecificInvoiceAsync(mockService.Object, accessor, Guid.NewGuid(), CancellationToken.None);

    // Assert
    Assert.AreEqual(StatusCodes.Status404NotFound, GetStatusCode(result));
}
```

---

## Performance Implications

### With ConfigureAwait(false)

- ✅ Avoids unnecessary context switches
- ✅ Better thread pool utilization
- ✅ Prevents potential deadlocks in library code
- ✅ Lower memory overhead (no context capture)

### Without ConfigureAwait (in production)

- ❌ Potential deadlocks in synchronous-over-async code
- ❌ Unnecessary context captures
- ❌ Reduced throughput due to context switches
- ❌ Higher memory allocation

### Without ConfigureAwait (in tests)

- ✅ **Allowed** - CA2007 is suppressed in test projects
- ✅ Simpler, more readable test code
- ✅ Test parallelism is configured by `[assembly: Parallelize(...)]` in each test project's `AssemblyInfo.cs`

---

## Analyzer Rules

### CA2007: Do not directly await a Task

**Severity:** Error in `src` (enabled by `AnalysisLevel` `latest-all` and escalated by `TreatWarningsAsErrors`); suppressed in tests

**Configuration:**

- **Production projects:** inherited from `sites/api.arolariu.ro/Directory.Build.props` (`<AnalysisLevel>latest-all</AnalysisLevel>` and
  `<TreatWarningsAsErrors>True</TreatWarningsAsErrors>`)
- **Test projects:** `<NoWarn>$(NoWarn);CA2007</NoWarn>` in `sites/api.arolariu.ro/tests/Directory.Build.props`

No `.editorconfig` or `.globalconfig` entry configures CA2007.

---

## Migration Guide

### Fixing Existing Code

**Step 1:** Build to find violations (CA2007 violations in `src` fail the build as errors)

```bash
dotnet build sites/api.arolariu.ro/src/Core
```

**Step 2:** Fix production code violations

```csharp
// Before
await SomeMethodAsync();

// After
await SomeMethodAsync().ConfigureAwait(false);
```

---

## References

- [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
- [CA2007: Do not directly await a Task](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007)
- [Async/Await Best Practices](https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming)
- [MSTest Parallel Test Execution](https://learn.microsoft.com/dotnet/core/testing/unit-testing-parallel-execution)

---

## Summary

| Context               | ConfigureAwait              | Reason                           |
| --------------------- | --------------------------- | -------------------------------- |
| **Service layer**     | ✅ `.ConfigureAwait(false)` | Library code                     |
| **Repository layer**  | ✅ `.ConfigureAwait(false)` | Data access code                 |
| **Endpoint handlers** | ✅ `.ConfigureAwait(false)` | CA2007 is a build error in `src` |
| **Domain logic**      | ✅ `.ConfigureAwait(false)` | Pure business logic              |
| **Unit tests**        | Optional                    | CA2007 suppressed in tests       |
| **Integration tests** | Optional                    | CA2007 suppressed in tests       |

**Golden Rule:**

- **Production = Always ConfigureAwait(false)**
- **Tests = Optional (CA2007 is suppressed; existing tests use both forms)**
