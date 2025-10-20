# RFC 2002: OpenTelemetry Backend Observability System

- **Status**: Implemented
- **Date**: 2025-10-20
- **Authors**: Alexandru Olariu
- **Related Components**:
  - `sites/api.arolariu.ro/src/Common/Telemetry/`
  - `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/`

---

## Abstract

This RFC documents the OpenTelemetry (OTel) observability implementation in the api.arolariu.ro .NET modular monolith. The system provides comprehensive distributed tracing, structured logging, and performance metrics collection with Azure Application Insights integration. The implementation leverages OpenTelemetry SDK for standardized observability while maintaining zero-allocation performance through source generators and automatic instrumentation.

---

## 1. Motivation

### 1.1 Problem Statement

Modern distributed systems require comprehensive observability to:

- **Diagnose Performance Issues**: Identify bottlenecks across service layers (API → Orchestration → Foundation → Database)
- **Correlate Distributed Operations**: Track requests through multiple layers of the modular monolith
- **Monitor System Health**: Collect real-time metrics on throughput, latency, and error rates
- **Debug Production Issues**: Access structured logs with trace context correlation
- **Ensure SLA Compliance**: Measure and alert on performance degradation

Without standardized observability, debugging production issues requires manual log correlation and lacks visibility into cross-layer performance characteristics.

### 1.2 Design Goals

- **Standard Compliance**: Use OpenTelemetry specification for vendor-neutral observability
- **Zero-Allocation Logging**: Leverage source generators for compile-time logging optimization
- **Automatic Instrumentation**: Capture HTTP, database, and dependency calls without manual intervention
- **Azure Integration**: Export telemetry to Azure Application Insights for centralized monitoring
- **Development Visibility**: Provide console export during debugging for immediate feedback
- **Modular Architecture**: Align tracing with DDD domain boundaries (Common, Core, Auth, Invoices)
- **Secure Authentication**: Use Managed Identity for production Azure integration

---

## 2. Technical Design

### 2.1 Architecture Overview

The observability system consists of four pillars:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│  (Controllers, Endpoints, Middleware)                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
          ┌──────────────┐      ┌──────────────┐
          │   Tracing    │      │   Logging    │
          │  (Spans &    │      │ (Structured  │
          │  Activities) │      │   Logs)      │
          └──────┬───────┘      └──────┬───────┘
                │                     │
                │      ┌──────────────┴──────────┐
                │      │                         │
                │      ▼                         ▼
                │  ┌──────────┐          ┌─────────────┐
                │  │ Metering │          │ Application │
                │  │ (Metrics │          │  Insights   │
                │  │  & KPIs) │          │  Telemetry  │
                │  └────┬─────┘          │  (Legacy)   │
                │       │                └─────────────┘
                │       │
                └───────┴─────────────┐
                                      ▼
                              ┌─────────────────┐
                              │ Azure Monitor   │
                              │ (OTel Exporter) │
                              └─────────────────┘
                                      │
                              ┌────────┴────────┐
                              │  Console Export │
                              │  (Debug Only)   │
                              └─────────────────┘
```

### 2.2 Core Components

#### 2.2.1 Tracing Infrastructure

**Location**: `Common/Telemetry/Tracing/`

**Purpose**: Distributed request tracing with automatic instrumentation

**Key Classes**:

- `TracingExtensions`: Configures OpenTelemetry tracing with ASP.NET Core, HTTP Client, and EF Core instrumentation
- `ActivityGenerators`: Centralized activity sources for domain-specific tracing

**Activity Sources** (aligned with DDD domains):

```csharp
public static class ActivityGenerators
{
  // Infrastructure layer tracing
  public static readonly ActivitySource CommonPackageTracing =
    new("arolariu.Backend.Common");

  // Application core tracing
  public static readonly ActivitySource CorePackageTracing =
    new("arolariu.Backend.Core");

  // Authentication domain tracing
  public static readonly ActivitySource AuthPackageTracing =
    new("arolariu.Backend.Auth");

  // Invoice domain tracing
  public static readonly ActivitySource InvoicePackageTracing =
    new("arolariu.Backend.Domain.Invoices");
}
```

**Automatic Instrumentation**:

- **ASP.NET Core**: HTTP request spans with route, status code, duration
- **HTTP Client**: Outbound dependency tracking with correlation headers
- **Entity Framework Core**: Database query spans with SQL execution time

#### 2.2.2 Logging Infrastructure

**Location**: `Common/Telemetry/Logging/`

**Purpose**: High-performance structured logging with compile-time optimization

**Key Classes**:

- `LoggingExtensions`: Configures OpenTelemetry logging with Azure Monitor integration
- `Log`: Source-generated logging methods (zero-allocation)

**Source-Generated Logging Pattern**:

```csharp
public static partial class Log
{
  [LoggerMessage(0, LogLevel.Critical,
    "The option {propertyName} is missing from configuration AND Key Vault: {keyVaultName}")]
  public static partial void LogOptionValueIsCompletelyMissing(
    this ILogger logger, string propertyName, string keyVaultName);

  [LoggerMessage(1, LogLevel.Information,
    "The option {propertyName} was loaded from Key Vault: {keyVaultName}.")]
  public static partial void LogOptionValueFromKeyVault(
    this ILogger logger, string propertyName, string keyVaultName);

  [LoggerMessage(2, LogLevel.Information,
    "The option {propertyName} was loaded from configuration file.")]
  public static partial void LogOptionValueFromConfiguration(
    this ILogger logger, string propertyName);
}
```

**Benefits**:

- **Zero Allocation**: No boxing, string interpolation, or closure allocation
- **Compile-Time Validation**: Type-safe parameters with compiler checks
- **Trace Correlation**: Automatic log-trace correlation via Activity context

#### 2.2.3 Metering Infrastructure

**Location**: `Common/Telemetry/Metering/`

**Purpose**: Performance metrics and KPI collection

**Key Classes**:

- `MeteringExtensions`: Configures OpenTelemetry metrics with automatic instrumentation

**Automatic Metrics Collection**:

- **ASP.NET Core Metrics**:
  - `http.server.request.duration`: Request latency histogram
  - `http.server.active_requests`: Concurrent request counter
  - `http.server.request.body.size`: Request size distribution
  - `http.server.response.body.size`: Response size distribution

- **HTTP Client Metrics**:
  - `http.client.request.duration`: Dependency call latency
  - `http.client.active_requests`: Concurrent outbound requests

#### 2.2.4 Application Insights Telemetry

**Location**: `Common/Telemetry/TelemetryExtensions.cs`

**Purpose**: Legacy Application Insights SDK integration for additional features

**Features**:

- Automatic exception tracking with stack traces
- Dependency tracking (Redis, Azure services)
- Performance counters (CPU, memory, GC)
- Custom event tracking for business metrics

### 2.3 Configuration & Integration

**Startup Configuration** (`Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs`):

```csharp
public static void AddGeneralDomainConfiguration(this WebApplicationBuilder builder)
{
  // ... other services

  builder.AddTelemetry();        // Application Insights SDK
  builder.AddOTelLogging();      // OpenTelemetry logging
  builder.AddOTelMetering();     // OpenTelemetry metrics
  builder.AddOTelTracing();      // OpenTelemetry tracing
}
```

**Authentication**:

- **Development**: Uses `DefaultAzureCredential()` (Visual Studio, Azure CLI, etc.)
- **Production**: Uses Managed Identity via `AZURE_CLIENT_ID` environment variable

**Connection String Resolution**:

```csharp
// Resolved via IOptionsManager from:
// 1. appsettings.json (local development)
// 2. Azure Key Vault (production)
string instrumentationKey = optionsManager
  .GetRequiredService<IOptionsManager>()
  .GetApplicationOptions()
  .ApplicationInsightsEndpoint;
```

---

## 3. Implementation Examples

### 3.1 Manual Activity Creation (Processing Layer)

```csharp
public partial class InvoiceProcessingService : IInvoiceProcessingService
{
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier = null) =>
    await TryCatchAsync(async () =>
    {
      // Create activity for distributed tracing
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));

      // Activity automatically captures:
      // - Start/end timestamps
      // - Parent-child relationships
      // - Trace/span IDs for correlation

      await invoiceOrchestrationService
        .CreateInvoiceObject(invoice)
        .ConfigureAwait(false);

      // Activity disposed automatically; duration recorded
    }).ConfigureAwait(false);
}
```

### 3.2 Activity with Tags (Endpoint Layer)

```csharp
internal static async Task<IResult> CreateNewInvoiceAsync(
  [FromServices] IInvoiceProcessingService invoiceProcessingService,
  [FromBody] CreateInvoiceDto invoiceDto,
  ClaimsPrincipal principal)
{
  try
  {
    // Server activity with explicit kind
    using var activity = InvoicePackageTracing.StartActivity(
      nameof(CreateNewInvoiceAsync),
      ActivityKind.Server);

    // Add custom tags for filtering/analysis
    activity?.SetTag("invoice.merchant_id", invoiceDto.MerchantId);
    activity?.SetTag("invoice.total_amount", invoiceDto.TotalAmount);

    var invoice = invoiceDto.ToInvoice();
    await invoiceProcessingService.CreateInvoice(invoice).ConfigureAwait(false);

    activity?.SetStatus(ActivityStatusCode.Ok);
    return TypedResults.Created($"/rest/v1/invoices/{invoice.id}", invoice);
  }
  catch (Exception ex)
  {
    // Exception automatically captured by OTel instrumentation
    return TypedResults.Problem(detail: ex.Message, statusCode: 500);
  }
}
```

### 3.3 High-Performance Logging

```csharp
public class ConfigurationManager
{
  private readonly ILogger<ConfigurationManager> _logger;

  public string LoadOptionValue(string propertyName, string keyVaultName)
  {
    // 1. Try configuration file
    var configValue = configuration[propertyName];
    if (configValue != null)
    {
      // Zero-allocation logging
      _logger.LogOptionValueFromConfiguration(propertyName);
      return configValue;
    }

    // 2. Try Key Vault
    var secretValue = keyVaultClient.GetSecret(propertyName);
    if (secretValue != null)
    {
      // Structured log with trace correlation
      _logger.LogOptionValueFromKeyVault(propertyName, keyVaultName);
      return secretValue;
    }

    // 3. Critical failure
    _logger.LogOptionValueIsCompletelyMissing(propertyName, keyVaultName);
    throw new InvalidOperationException($"Missing configuration: {propertyName}");
  }
}
```

### 3.4 Automatic Instrumentation (No Code Changes)

```csharp
// HTTP request automatically traced:
public class InvoiceController : ControllerBase
{
  [HttpGet("{id}")]
  public async Task<IActionResult> GetInvoice(Guid id)
  {
    // ASP.NET Core instrumentation automatically creates:
    // - Span with http.method, http.route, http.status_code
    // - Parent-child relationship with upstream requests
    // - Correlation headers (traceparent, tracestate)

    var invoice = await dbContext.Invoices.FindAsync(id);

    // EF Core instrumentation automatically traces:
    // - SQL query execution time
    // - Database connection details
    // - Query parameters (if configured)

    return Ok(invoice);
  }
}
```

---

## 4. Trade-offs and Alternatives

### 4.1 Considered Alternatives

- **Alternative 1: Manual Logging with Serilog**
  - **Rejected**: Lacks automatic instrumentation, no standardized tracing, manual correlation required

- **Alternative 2: Application Insights SDK Only**
  - **Rejected**: Vendor lock-in, no OpenTelemetry standard compliance, limited cross-platform support

- **Alternative 3: Custom Tracing Solution**
  - **Rejected**: Reinventing the wheel, no community support, high maintenance burden

### 4.2 Trade-offs

**Pros**:

- ✅ **Standard Compliance**: OpenTelemetry is CNCF standard with broad adoption
- ✅ **Zero-Allocation Logging**: Source generators eliminate runtime overhead
- ✅ **Automatic Instrumentation**: 90% of telemetry requires no code changes
- ✅ **Vendor Flexibility**: Can switch exporters without application changes
- ✅ **Rich Ecosystem**: Extensive instrumentation libraries for .NET
- ✅ **Azure Integration**: Native support for Application Insights export

**Cons**:

- ❌ **Learning Curve**: Developers must understand Activity/Span concepts
- ❌ **Configuration Complexity**: Multiple extension methods for full setup
- ❌ **Package Dependencies**: Requires 7 OpenTelemetry NuGet packages
- ❌ **Dual Telemetry**: Running both OTel and Application Insights SDK (temporary)

---

## 5. Performance Considerations

### 5.1 Performance Impact

**Logging**:

- **Source Generators**: Zero-allocation logging (< 50ns overhead per log call)
- **Filtering**: Logs filtered at source based on log level
- **Async Export**: Background export prevents blocking application threads

**Tracing**:

- **Sampling**: Production uses head-based sampling (1-10% of requests)
- **Activity Overhead**: ~100ns per activity creation (negligible)
- **Propagation**: W3C Trace Context headers add ~200 bytes per request

**Metering**:

- **Aggregation**: Metrics aggregated in-memory before export
- **Export Interval**: 60-second batching reduces network overhead
- **Cardinality**: Limited to high-value metrics to prevent explosion

### 5.2 Optimization Strategies

- **Conditional Compilation**: Console exporters only enabled in DEBUG builds
- **Activity Filtering**: Use `ShouldListenTo` to disable low-value activities
- **Log Level Configuration**: Production runs at `Information` level or higher
- **Managed Identity Caching**: Credential caching reduces authentication overhead
- **Batch Export**: Telemetry exported in batches (100 items or 30 seconds)

---

## 6. Security Considerations

**Authentication**:

- **Managed Identity**: Production uses Azure Managed Identity (no secrets in code)
- **Credential Hierarchy**: `DefaultAzureCredential` provides fallback chain for development

**Data Protection**:

- **PII Redaction**: No automatic PII capture in logs or traces
- **Secret Masking**: Connection strings not logged; only referenced by Key Vault URL
- **Scope Isolation**: Activity sources isolated by domain boundary

**Compliance**:

- **GDPR**: User identifiers only logged with explicit consent tracking
- **LGPD**: Telemetry data stored in Azure Brazil South region (configurable)
- **Retention**: Application Insights data retained per configured retention policy (default: 90 days)

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Approach**: Test telemetry configuration without actual export

```csharp
[Fact]
public void AddOTelTracing_ShouldRegisterActivitySources()
{
  // Arrange
  var builder = WebApplication.CreateBuilder();

  // Act
  builder.AddOTelTracing();

  // Assert
  var serviceProvider = builder.Services.BuildServiceProvider();
  var tracerProvider = serviceProvider.GetService<TracerProvider>();
  Assert.NotNull(tracerProvider);
}
```

### 7.2 Integration Tests

**Approach**: Verify telemetry end-to-end with in-memory exporter

```csharp
[Fact]
public async Task CreateInvoice_ShouldCreateActivitySpan()
{
  // Arrange
  var activities = new List<Activity>();
  using var listener = new ActivityListener
  {
    ShouldListenTo = source => source.Name.StartsWith("arolariu.Backend"),
    Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllData,
    ActivityStarted = activity => activities.Add(activity)
  };
  ActivitySource.AddActivityListener(listener);

  // Act
  await invoiceProcessingService.CreateInvoice(testInvoice);

  // Assert
  Assert.Contains(activities, a => a.DisplayName == nameof(CreateInvoice));
}
```

### 7.3 Observability Tests

**Approach**: Validate telemetry appears in Azure Application Insights

- Manual validation using Azure Portal Application Map
- Query Kusto logs for expected trace patterns
- Alert testing for critical scenarios

---

## 8. Migration Guide

### 8.1 Breaking Changes

**None** - This is the initial observability implementation.

### 8.2 Migration from Legacy Logging

**For developers adding new features**:

1. **Replace manual logging**:

   ```csharp
   // Before
   logger.LogInformation($"Option {propName} loaded from config");

   // After
   logger.LogOptionValueFromConfiguration(propName);
   ```

2. **Add activity tracing**:

   ```csharp
   // Add to service methods
   using var activity = InvoicePackageTracing.StartActivity(nameof(MethodName));
   ```

3. **Use appropriate activity source**:
   - Common infrastructure: `CommonPackageTracing`
   - Core application: `CorePackageTracing`
   - Authentication: `AuthPackageTracing`
   - Invoice domain: `InvoicePackageTracing`

---

## 9. Documentation Requirements

- [x] XML documentation on all telemetry classes
- [x] README in `Common/Telemetry/` explaining usage patterns
- [x] Architecture diagram showing telemetry flow
- [x] Azure Application Insights dashboard setup guide
- [ ] Runbook for common troubleshooting scenarios using telemetry

---

## 10. Future Work

### 10.1 Planned Enhancements

- **Custom Metrics**: Business KPIs (invoices processed/hour, average processing time)
- **Span Events**: Fine-grained operation markers within long-running activities
- **Baggage Propagation**: Cross-service context propagation for user preferences
- **Auto-Instrumentation**: Eliminate manual activity creation via source generators
- **OpenTelemetry Collector**: Deploy OTEL Collector for advanced filtering/routing
- **Distributed Context**: Propagate business context (tenant ID, user roles) across boundaries

### 10.2 Deprecation Plan

- **Phase Out Application Insights SDK**: Once OTel feature parity achieved, remove legacy SDK
- **Timeline**: Q2 2026 (after validating OTel custom events and metrics)

---

## 11. References

- [OpenTelemetry .NET Documentation](https://opentelemetry.io/docs/instrumentation/net/)
- [Azure Monitor OpenTelemetry Exporter](https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [.NET Source Generators (LoggerMessage)](https://learn.microsoft.com/en-us/dotnet/core/extensions/logger-message-generator)
- [Application Insights Documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)

---

## 12. Appendices

### Appendix A: NuGet Dependencies

```xml
<PackageReference Include="OpenTelemetry" Version="1.13.1" />
<PackageReference Include="OpenTelemetry.Api" Version="1.13.1" />
<PackageReference Include="OpenTelemetry.Exporter.Console" Version="1.13.1" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.13.1" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.12.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.EntityFrameworkCore" Version="1.0.0-beta.11" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.12.0" />
<PackageReference Include="Azure.Monitor.OpenTelemetry.Exporter" Version="1.4.0" />
```

### Appendix B: Activity Naming Conventions

**Pattern**: Use method name as activity display name

```csharp
// ✅ Correct
using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));

// ❌ Incorrect
using var activity = InvoicePackageTracing.StartActivity("create_invoice");
```

**Benefits**:

- Consistent naming across codebase
- Refactoring-safe (renames propagate automatically)
- IDE autocomplete support

### Appendix C: Azure Application Insights Query Examples

**Find slow invoice creation requests**:

```kusto
dependencies
| where name == "CreateInvoice"
| where duration > 5000 // > 5 seconds
| project timestamp, duration, success, resultCode
| order by duration desc
```

**Trace request through all layers**:

```kusto
union traces, requests, dependencies
| where operation_Id == "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
| project timestamp, itemType, name, message, duration
| order by timestamp asc
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-20
**Reviewed By**: Alexandru Olariu
**Status**: Implemented
