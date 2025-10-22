# ConfigureAwait Best Practices

## Overview

This document outlines the proper usage of `ConfigureAwait()` in the arolariu.ro codebase, explaining when to use it, when to omit it, and the rationale behind these decisions.

## Quick Reference

| Context | Rule | Rationale |
|---------|------|-----------|
| **Production Code** | ✅ **Always use** `ConfigureAwait(false)` | Prevents deadlocks, improves performance |
| **Test Methods** | ❌ **Never use** `ConfigureAwait()` | Bypasses test parallelization, unnecessary overhead |
| **ASP.NET Controllers** | ✅ **Use** `ConfigureAwait(false)` | No synchronization context after first await |
| **Library Code** | ✅ **Use** `ConfigureAwait(false)` | Should not assume execution context |

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
    var data = await _repository.FetchAsync(id); // CA2007 warning
    var result = await ProcessDataAsync(data); // CA2007 warning
    return result;
}
```

### ✅ DO: Use ConfigureAwait(false) in ASP.NET Core

**Why?** After the first `await`, ASP.NET Core doesn't restore the synchronization context, so you should explicitly use `ConfigureAwait(false)` for clarity and performance.

```csharp
// ✅ CORRECT
[HttpGet("{id}")]
public async Task<ActionResult<Invoice>> GetInvoice(Guid id)
{
    var invoice = await _service.GetInvoiceAsync(id).ConfigureAwait(false);
    return Ok(invoice);
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

### ❌ DON'T: Use ConfigureAwait in Test Methods

**Why?** Test frameworks manage their own synchronization contexts for proper parallelization.

```csharp
// ✅ CORRECT - No ConfigureAwait in tests
[Fact]
public async Task GetInvoice_ValidId_ReturnsInvoice()
{
    // Arrange
    var expectedInvoice = InvoiceBuilder.CreateRandomInvoice();
 _mockRepository.Setup(r => r.GetAsync(It.IsAny<Guid>()))
                .ReturnsAsync(expectedInvoice);

    // Act
    var result = await _service.GetInvoiceAsync(Guid.NewGuid());

    // Assert
    Assert.NotNull(result);
    Assert.Equal(expectedInvoice.id, result.id);
}
```

```csharp
// ❌ INCORRECT - ConfigureAwait in test bypasses parallelization
[Fact]
public async Task GetInvoice_ValidId_ReturnsInvoice()
{
    var result = await _service.GetInvoiceAsync(Guid.NewGuid()).ConfigureAwait(false);
    Assert.NotNull(result);
}
```

### Build Configuration for Tests

Test projects automatically disable CA2007 warnings via `Directory.Build.props`:

```xml
<!-- sites/api.arolariu.ro/tests/Directory.Build.props -->
<PropertyGroup Label="Test Project Settings">
  <NoWarn>$(NoWarn);CA2007</NoWarn>
</PropertyGroup>
```

This means:
- ✅ Test code **doesn't need** `ConfigureAwait` calls
- ✅ No CA2007 warnings in test files
- ✅ Simpler, cleaner test code
- ✅ Proper test parallelization behavior

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
// ✅ CORRECT - ConfigureAwait in try-catch blocks
private async Task<Invoice> TryCatchAsync(ReturningInvoiceFunction function)
{
    try
    {
        return await function().ConfigureAwait(false);
    }
    catch (ValidationException ex)
    {
        throw CreateAndLogValidationException(ex);
    }
    catch (DependencyException ex)
    {
        throw CreateAndLogDependencyException(ex);
    }
}
```

### Scenario 4: Integration Tests (Different Rules!)

```csharp
// ✅ CORRECT - Integration tests can omit ConfigureAwait
[Fact]
public async Task EndToEnd_CreateAndRetrieveInvoice_Success()
{
    // Arrange
    var client = _factory.CreateClient();
 var invoice = CreateTestInvoice();

  // Act
    var createResponse = await client.PostAsJsonAsync("/api/invoices", invoice);
    var getResponse = await client.GetAsync($"/api/invoices/{invoice.id}");

    // Assert
    createResponse.EnsureSuccessStatusCode();
    getResponse.EnsureSuccessStatusCode();
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
- ✅ **Correct behavior** - test frameworks need context control
- ✅ Proper test parallelization
- ✅ Simpler, more readable test code

---

## Analyzer Rules

### CA2007: Do not directly await a Task

**Severity:** Warning (Production), Silent (Tests)

**Configuration:**
- **Production projects:** `<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>`
- **Test projects:** `<NoWarn>$(NoWarn);CA2007</NoWarn>`

**EditorConfig:**
```ini
# Production code - enforce ConfigureAwait
[**/src/**/*.cs]
dotnet_diagnostic.CA2007.severity = warning

# Test code - disable ConfigureAwait requirement
[**/tests/**/*.cs]
dotnet_diagnostic.CA2007.severity = none
```

---

## Migration Guide

### Fixing Existing Code

**Step 1:** Run analyzer to find violations
```bash
dotnet build /p:EnforceCodeStyleInBuild=true
```

**Step 2:** Fix production code violations
```csharp
// Before
await SomeMethodAsync();

// After
await SomeMethodAsync().ConfigureAwait(false);
```

**Step 3:** Remove ConfigureAwait from test code
```csharp
// Before
await orchestrationService.CreateInvoiceObject(invoice, null).ConfigureAwait(false);

// After
await orchestrationService.CreateInvoiceObject(invoice, null);
```

---

## References

- [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
- [CA2007: Do not directly await a Task](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007)
- [Async/Await Best Practices](https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming)
- [Test Parallelization in xUnit](https://xunit.net/docs/running-tests-in-parallel)

---

## Summary

| Context | ConfigureAwait | Reason |
|---------|---------------|--------|
| **Service layer** | ✅ `.ConfigureAwait(false)` | Library code |
| **Repository layer** | ✅ `.ConfigureAwait(false)` | Data access code |
| **Controllers** | ✅ `.ConfigureAwait(false)` | ASP.NET Core best practice |
| **Domain logic** | ✅ `.ConfigureAwait(false)` | Pure business logic |
| **Unit tests** | ❌ **Omit** | Test framework control |
| **Integration tests** | ❌ **Omit** | Test framework control |

**Golden Rule:** 
- **Production = Always ConfigureAwait(false)**
- **Tests = Never ConfigureAwait**
