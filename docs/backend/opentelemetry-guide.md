# OpenTelemetry Backend Guide

## Quick Reference for RFC 2002: OpenTelemetry Backend Observability

This guide provides practical examples for implementing OpenTelemetry tracing in the .NET backend using the Activity API and Azure Application Insights integration.

## Quick Start

### 1. Import Activity Generators

```csharp
using arolariu.Backend.Common.Telemetry.Tracing;
using System.Diagnostics;
```

### 2. Create Activities

```csharp
public async Task ProcessInvoice(Guid invoiceId)
{
    using var activity = InvoicePackageTracing.StartActivity(nameof(ProcessInvoice));
    // Your code here
}
```

## Core Patterns

### Basic Activity Creation

```csharp
using arolariu.Backend.Common.Telemetry.Tracing;
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public class InvoiceService
{
    public async Task CreateInvoice(Invoice invoice)
    {
        // Activity name convention: Use method name with nameof()
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
        
        // Activity is automatically disposed and completed when exiting the using block
        await SaveInvoice(invoice).ConfigureAwait(false);
    }
}
```

### Specifying Activity Kind

```csharp
public async Task<IResult> CreateNewInvoiceAsync(InvoiceDto invoiceDto)
{
    try
    {
        // Specify ActivityKind for HTTP server endpoints
        using var activity = InvoicePackageTracing.StartActivity(
            nameof(CreateNewInvoiceAsync),
            ActivityKind.Server
        );
        
        var invoice = invoiceDto.ToInvoice();
        await invoiceProcessingService.CreateInvoice(invoice).ConfigureAwait(false);
        
        return TypedResults.Created($"/rest/v1/invoices/{invoice.Id}", invoice);
    }
    catch (Exception exception)
    {
        // Exceptions are automatically captured by Application Insights
        return TypedResults.Problem(
            detail: exception.Message,
            statusCode: StatusCodes.Status500InternalServerError
        );
    }
}
```

### Adding Tags (Attributes)

```csharp
public async Task ProcessPayment(Guid invoiceId, decimal amount)
{
    using var activity = InvoicePackageTracing.StartActivity(nameof(ProcessPayment));
    
    // Add custom tags to provide context
    activity?.SetTag("invoice.id", invoiceId.ToString());
    activity?.SetTag("payment.amount", amount);
    activity?.SetTag("payment.currency", "USD");
    
    var result = await ChargeCard(amount).ConfigureAwait(false);
    
    // Add result tags
    activity?.SetTag("payment.status", result.Success ? "success" : "failed");
    activity?.SetTag("payment.transaction_id", result.TransactionId);
}
```

### Adding Events

```csharp
public async Task AnalyzeInvoice(Guid invoiceId)
{
    using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
    
    activity?.AddEvent(new ActivityEvent("validation.start"));
    var isValid = await ValidateInvoice(invoiceId).ConfigureAwait(false);
    activity?.AddEvent(new ActivityEvent("validation.complete"));
    
    if (!isValid)
    {
        activity?.AddEvent(new ActivityEvent(
            "validation.failed",
            tags: new ActivityTagsCollection
            {
                {"invoice.id", invoiceId.ToString()},
                {"validation.error", "Invalid invoice format"}
            }
        ));
        throw new ValidationException("Invalid invoice");
    }
    
    activity?.AddEvent(new ActivityEvent("analysis.start"));
    await PerformAnalysis(invoiceId).ConfigureAwait(false);
    activity?.AddEvent(new ActivityEvent("analysis.complete"));
}
```

### Setting Activity Status

```csharp
public async Task DeleteInvoice(Guid invoiceId)
{
    using var activity = InvoicePackageTracing.StartActivity(nameof(DeleteInvoice));
    
    try
    {
        activity?.SetTag("invoice.id", invoiceId.ToString());
        
        await RemoveInvoice(invoiceId).ConfigureAwait(false);
        
        // Explicitly set success status
        activity?.SetStatus(ActivityStatusCode.Ok);
        activity?.SetTag("invoice.deleted", true);
    }
    catch (Exception ex)
    {
        // Set error status
        activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
        activity?.SetTag("error.type", ex.GetType().Name);
        throw;
    }
}
```

## Activity Source Organization

The backend uses domain-specific activity sources defined in `ActivityGenerators.cs`:

### Common Package Tracing

```csharp
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public class ConfigurationService
{
    public async Task LoadConfiguration()
    {
        // Use CommonPackageTracing for infrastructure operations
        using var activity = CommonPackageTracing.StartActivity(nameof(LoadConfiguration));
        
        activity?.SetTag("config.source", "KeyVault");
        var config = await keyVaultClient.GetSecretsAsync().ConfigureAwait(false);
        
        activity?.SetTag("config.secrets_loaded", config.Count);
        activity?.SetStatus(ActivityStatusCode.Ok);
    }
}
```

### Core Package Tracing

```csharp
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public class StartupService
{
    public void ConfigureMiddleware(WebApplicationBuilder builder)
    {
        // Use CorePackageTracing for application startup and middleware
        using var activity = CorePackageTracing.StartActivity(nameof(ConfigureMiddleware));
        
        activity?.SetTag("middleware.count", 10);
        activity?.SetTag("environment", builder.Environment.EnvironmentName);
        
        // Configure middleware...
        
        activity?.SetStatus(ActivityStatusCode.Ok);
    }
}
```

### Auth Package Tracing

```csharp
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public class AuthenticationService
{
    public async Task<ClaimsPrincipal> ValidateToken(string token)
    {
        // Use AuthPackageTracing for authentication operations
        using var activity = AuthPackageTracing.StartActivity(nameof(ValidateToken));
        
        activity?.SetTag("auth.method", "jwt");
        
        try
        {
            var principal = await jwtHandler.ValidateAsync(token).ConfigureAwait(false);
            
            activity?.SetTag("auth.user_id", principal.FindFirst("sub")?.Value);
            activity?.SetTag("auth.success", true);
            activity?.SetStatus(ActivityStatusCode.Ok);
            
            return principal;
        }
        catch (SecurityTokenException ex)
        {
            activity?.SetTag("auth.success", false);
            activity?.SetTag("auth.error", ex.Message);
            activity?.SetStatus(ActivityStatusCode.Error, "Token validation failed");
            throw;
        }
    }
}
```

### Invoice Package Tracing

```csharp
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

public class InvoiceProcessingService
{
    public async Task AnalyzeInvoice(Guid invoiceId)
    {
        // Use InvoicePackageTracing for invoice domain operations
        using var activity = InvoicePackageTracing.StartActivity(nameof(AnalyzeInvoice));
        
        activity?.SetTag("invoice.id", invoiceId.ToString());
        
        await invoiceOrchestrationService
            .AnalyzeInvoiceWithOptions(options, identifier, userIdentifier)
            .ConfigureAwait(false);
        
        activity?.SetStatus(ActivityStatusCode.Ok);
    }
}
```

## HTTP Endpoint Patterns

### Minimal API Endpoint

```csharp
using static arolariu.Backend.Common.Telemetry.Tracing.ActivityGenerators;

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
        
        activity?.SetTag("http.method", "POST");
        activity?.SetTag("http.route", "/rest/v1/invoices");
        
        var invoice = invoiceDto.ToInvoice();
        
        activity?.SetTag("invoice.merchant_id", invoice.MerchantId.ToString());
        activity?.SetTag("invoice.item_count", invoice.Products.Count);
        
        await invoiceProcessingService.CreateInvoice(invoice).ConfigureAwait(false);
        
        activity?.SetTag("http.status_code", 201);
        activity?.SetStatus(ActivityStatusCode.Ok);
        
        return TypedResults.Created($"/rest/v1/invoices/{invoice.Id}", invoice);
    }
    catch (InvoiceProcessingServiceValidationException exception)
    {
        return TypedResults.Problem(
            detail: exception.Message,
            statusCode: StatusCodes.Status500InternalServerError,
            title: "The service encountered a validation error."
        );
    }
}
```

### GET Endpoint

```csharp
internal static async partial Task<IResult> RetrieveSpecificInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromRoute] Guid invoiceId)
{
    using var activity = InvoicePackageTracing.StartActivity(
        nameof(RetrieveSpecificInvoiceAsync),
        ActivityKind.Server
    );
    
    activity?.SetTag("http.method", "GET");
    activity?.SetTag("http.route", "/rest/v1/invoices/{id}");
    activity?.SetTag("invoice.id", invoiceId.ToString());
    
    var invoice = await invoiceProcessingService
        .RetrieveInvoice(invoiceId)
        .ConfigureAwait(false);
    
    if (invoice is null)
    {
        activity?.SetTag("http.status_code", 404);
        return TypedResults.NotFound();
    }
    
    activity?.SetTag("http.status_code", 200);
    activity?.SetStatus(ActivityStatusCode.Ok);
    
    return TypedResults.Ok(invoice);
}
```

### DELETE Endpoint

```csharp
internal static async partial Task<IResult> DeleteInvoiceAsync(
    [FromServices] IInvoiceProcessingService invoiceProcessingService,
    [FromRoute] Guid invoiceId)
{
    using var activity = InvoicePackageTracing.StartActivity(
        nameof(DeleteInvoiceAsync),
        ActivityKind.Server
    );
    
    activity?.SetTag("http.method", "DELETE");
    activity?.SetTag("http.route", "/rest/v1/invoices/{id}");
    activity?.SetTag("invoice.id", invoiceId.ToString());
    
    activity?.AddEvent(new ActivityEvent("deletion.start"));
    
    await invoiceProcessingService
        .DeleteInvoice(invoiceId)
        .ConfigureAwait(false);
    
    activity?.AddEvent(new ActivityEvent("deletion.complete"));
    
    activity?.SetTag("http.status_code", 204);
    activity?.SetTag("invoice.deleted", true);
    activity?.SetStatus(ActivityStatusCode.Ok);
    
    return TypedResults.NoContent();
}
```

## Service Layer Patterns

### Service with Try-Catch

```csharp
public class InvoiceProcessingService : IInvoiceProcessingService
{
    public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null) =>
        await TryCatchAsync(async () =>
        {
            using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
            
            activity?.SetTag("invoice.id", invoice.Id.ToString());
            activity?.SetTag("user.id", userIdentifier?.ToString() ?? "anonymous");
            
            await invoiceOrchestrationService
                .CreateInvoiceObject(invoice)
                .ConfigureAwait(false);
            
            activity?.SetStatus(ActivityStatusCode.Ok);
        }).ConfigureAwait(false);
}
```

### Orchestration Service

```csharp
public class InvoiceOrchestrationService
{
    public async Task ProcessInvoiceWorkflow(Guid invoiceId)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(ProcessInvoiceWorkflow));
        
        activity?.SetTag("invoice.id", invoiceId.ToString());
        activity?.SetTag("workflow.steps", 3);
        
        // Step 1: Validate
        activity?.AddEvent(new ActivityEvent("workflow.validate.start"));
        await ValidateInvoice(invoiceId).ConfigureAwait(false);
        activity?.AddEvent(new ActivityEvent("workflow.validate.complete"));
        
        // Step 2: Analyze
        activity?.AddEvent(new ActivityEvent("workflow.analyze.start"));
        await AnalyzeInvoice(invoiceId).ConfigureAwait(false);
        activity?.AddEvent(new ActivityEvent("workflow.analyze.complete"));
        
        // Step 3: Store
        activity?.AddEvent(new ActivityEvent("workflow.store.start"));
        await StoreResults(invoiceId).ConfigureAwait(false);
        activity?.AddEvent(new ActivityEvent("workflow.store.complete"));
        
        activity?.SetTag("workflow.completed", true);
        activity?.SetStatus(ActivityStatusCode.Ok);
    }
}
```

### Database Operations

```csharp
public class InvoiceRepository
{
    public async Task<Invoice?> GetInvoiceById(Guid invoiceId)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(GetInvoiceById));
        
        activity?.SetTag("db.system", "postgresql");
        activity?.SetTag("db.operation", "SELECT");
        activity?.SetTag("db.table", "invoices");
        activity?.SetTag("invoice.id", invoiceId.ToString());
        
        activity?.AddEvent(new ActivityEvent("db.query.start"));
        
        var invoice = await dbContext.Invoices
            .FirstOrDefaultAsync(i => i.Id == invoiceId)
            .ConfigureAwait(false);
        
        activity?.AddEvent(new ActivityEvent("db.query.complete"));
        
        activity?.SetTag("db.rows_returned", invoice is null ? 0 : 1);
        activity?.SetStatus(ActivityStatusCode.Ok);
        
        return invoice;
    }
    
    public async Task SaveInvoice(Invoice invoice)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(SaveInvoice));
        
        activity?.SetTag("db.system", "postgresql");
        activity?.SetTag("db.operation", "INSERT");
        activity?.SetTag("db.table", "invoices");
        activity?.SetTag("invoice.id", invoice.Id.ToString());
        
        activity?.AddEvent(new ActivityEvent("db.transaction.start"));
        
        await dbContext.Invoices.AddAsync(invoice).ConfigureAwait(false);
        var rowsAffected = await dbContext.SaveChangesAsync().ConfigureAwait(false);
        
        activity?.AddEvent(new ActivityEvent("db.transaction.complete"));
        
        activity?.SetTag("db.rows_affected", rowsAffected);
        activity?.SetStatus(ActivityStatusCode.Ok);
    }
}
```

## Activity Kind Reference

```csharp
// Use appropriate ActivityKind for different scenarios:

// HTTP server endpoint
using var activity = InvoicePackageTracing.StartActivity(
    nameof(CreateInvoiceAsync),
    ActivityKind.Server
);

// HTTP client request
using var activity = CommonPackageTracing.StartActivity(
    nameof(CallExternalApi),
    ActivityKind.Client
);

// Message producer
using var activity = InvoicePackageTracing.StartActivity(
    nameof(PublishEvent),
    ActivityKind.Producer
);

// Message consumer
using var activity = InvoicePackageTracing.StartActivity(
    nameof(ConsumeEvent),
    ActivityKind.Consumer
);

// Internal operation (default)
using var activity = InvoicePackageTracing.StartActivity(
    nameof(ProcessData),
    ActivityKind.Internal
);
```

## Best Practices

### ✅ Do: Use nameof() for Activity Names

```csharp
// ✅ Good - refactor-safe
using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
```

### ✅ Do: Null-Check Activities

```csharp
// ✅ Good - activities may be null if tracing is disabled
activity?.SetTag("key", "value");
activity?.AddEvent(new ActivityEvent("event"));
activity?.SetStatus(ActivityStatusCode.Ok);
```

### ✅ Do: Use Appropriate Activity Source

```csharp
// ✅ Good - domain-specific activity source
using var activity = InvoicePackageTracing.StartActivity(nameof(ProcessInvoice));

// ✅ Good - infrastructure activity source
using var activity = CommonPackageTracing.StartActivity(nameof(LoadConfig));

// ✅ Good - authentication activity source
using var activity = AuthPackageTracing.StartActivity(nameof(ValidateToken));
```

### ✅ Do: Add Business Context

```csharp
// ✅ Good - includes meaningful business tags
activity?.SetTag("invoice.merchant_id", merchantId.ToString());
activity?.SetTag("invoice.total_amount", totalAmount);
activity?.SetTag("invoice.currency", currency);
activity?.SetTag("invoice.item_count", items.Count);
```

### ✅ Do: Use ConfigureAwait(false)

```csharp
// ✅ Good - avoids deadlocks in synchronization contexts
await invoiceService
    .CreateInvoice(invoice)
    .ConfigureAwait(false);
```

### ❌ Don't: Use String Literals for Activity Names

```csharp
// ❌ Bad - prone to typos and refactoring issues
using var activity = InvoicePackageTracing.StartActivity("CreateInvoice");

// ✅ Good
using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
```

### ❌ Don't: Log Sensitive Data

```csharp
// ❌ Bad - exposes sensitive information
activity?.SetTag("user.password", password);
activity?.SetTag("credit_card.number", cardNumber);

// ✅ Good - only non-sensitive identifiers
activity?.SetTag("user.id", userId.ToString());
activity?.SetTag("payment.method", "card");
```

### ❌ Don't: Create Activities for Trivial Operations

```csharp
// ❌ Bad - too granular
public int Add(int a, int b)
{
    using var activity = CommonPackageTracing.StartActivity(nameof(Add));
    return a + b;
}

// ✅ Good - trace meaningful operations
public async Task CalculateInvoiceTotal(Invoice invoice)
{
    using var activity = InvoicePackageTracing.StartActivity(nameof(CalculateInvoiceTotal));
    // Complex business logic
}
```

## Azure Application Insights Integration

### Automatic Instrumentation

The backend automatically exports traces to Azure Application Insights:

```csharp
// Configured in Program.cs or extension methods
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddSqlClientInstrumentation()
            .AddSource("arolariu.Backend.*")
            .AddAzureMonitorTraceExporter(options =>
            {
                options.ConnectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
            });
    });
```

### Viewing Traces

1. **Azure Portal**: Navigate to Application Insights → Transaction search
2. **End-to-End Transaction**: View complete request flow across services
3. **Performance**: Analyze slow operations and bottlenecks
4. **Failures**: Investigate exceptions and error patterns

### Custom Metrics

```csharp
using System.Diagnostics.Metrics;

public class InvoiceMetrics
{
    private static readonly Meter Meter = new("arolariu.Backend.Invoices");
    private static readonly Counter<long> InvoicesCreated = Meter.CreateCounter<long>("invoices.created");
    
    public async Task CreateInvoice(Invoice invoice)
    {
        using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
        
        await SaveInvoice(invoice).ConfigureAwait(false);
        
        // Increment metric
        InvoicesCreated.Add(1, new KeyValuePair<string, object?>("merchant.id", invoice.MerchantId));
    }
}
```

## Troubleshooting

### Issue: Activities Not Appearing in Application Insights

**Check**:

1. Application Insights connection string is configured
2. Activity source names are registered with OpenTelemetry
3. Activity source name matches the pattern `"arolariu.Backend.*"`

**Solution**:

```csharp
// Verify activity source registration
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing.AddSource("arolariu.Backend.Common");
        tracing.AddSource("arolariu.Backend.Core");
        tracing.AddSource("arolariu.Backend.Auth");
        tracing.AddSource("arolariu.Backend.Domain.Invoices");
    });
```

### Issue: Tags Not Appearing

**Root Cause**: Tags set after activity is disposed

**Solution**:

```csharp
// ✅ Set tags before leaving the using block
using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
activity?.SetTag("key", "value"); // ← Before disposal
// Operation completes, activity is disposed here
```

### Issue: Nested Activities Not Showing Hierarchy

**Root Cause**: Parent activity context not propagated

**Solution**: Activities automatically inherit parent context when using the same thread. For async operations, ensure proper async/await usage:

```csharp
public async Task ParentOperation()
{
    using var parentActivity = InvoicePackageTracing.StartActivity(nameof(ParentOperation));
    
    // Child activities automatically become children of parent
    await ChildOperation().ConfigureAwait(false);
}

private async Task ChildOperation()
{
    using var childActivity = InvoicePackageTracing.StartActivity(nameof(ChildOperation));
    // This activity will be a child of ParentOperation
}
```

## Configuration

### Environment Variables

```bash
# Application Insights connection string
APPLICATIONINSIGHTS__CONNECTIONSTRING=InstrumentationKey=your-key;...

# OpenTelemetry configuration
OTEL_SERVICE_NAME=arolariu.Backend
OTEL_LOG_LEVEL=Information
```

### appsettings.json

```json
{
  "ApplicationInsights": {
    "ConnectionString": "InstrumentationKey=your-key;..."
  },
  "OpenTelemetry": {
    "ServiceName": "arolariu.Backend",
    "TracingEnabled": true
  }
}
```

## Quick Reference

| Task | Code Pattern | Example |
|------|--------------|---------|
| Create activity | `using var activity = Source.StartActivity(nameof(Method))` | `InvoicePackageTracing.StartActivity(nameof(CreateInvoice))` |
| HTTP endpoint | `StartActivity(nameof(Method), ActivityKind.Server)` | `StartActivity(nameof(GetInvoice), ActivityKind.Server)` |
| Add tag | `activity?.SetTag(key, value)` | `activity?.SetTag("invoice.id", id.ToString())` |
| Add event | `activity?.AddEvent(new ActivityEvent(name))` | `activity?.AddEvent(new ActivityEvent("validation.start"))` |
| Set status | `activity?.SetStatus(ActivityStatusCode)` | `activity?.SetStatus(ActivityStatusCode.Ok)` |
| Error status | `activity?.SetStatus(ActivityStatusCode.Error, desc)` | `activity?.SetStatus(ActivityStatusCode.Error, ex.Message)` |

## Additional Resources

- **RFC 2002**: Complete backend OpenTelemetry documentation
- **ActivityGenerators**: `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityGenerators.cs`
- **Example Usage**: `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`
- **OpenTelemetry .NET**: <https://opentelemetry.io/docs/languages/net/>
- **Azure Monitor Integration**: <https://learn.microsoft.com/azure/azure-monitor/app/opentelemetry-enable>
