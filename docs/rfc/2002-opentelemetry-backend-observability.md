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

- **Diagnose Performance Issues**: Identify bottlenecks across the Invoices
  flow (Endpoint/Worker → Management → Processing → Orchestration → Foundation
  → Broker)
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
- **Secure Authentication**: Use the repository Azure credential factory for
  Azure Monitor export

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

#### 2.2.4 Queued Analysis Trace and Retry Telemetry

Invoice and merchant analysis requests capture W3C `traceparent` in
`QueueAnalysisMessage`. `InvoiceProcessingService.ProcessAnalysisAsync` parses
that context and starts an `ActivityKind.Consumer` activity, so background work
remains correlated with the request that published it.

Failed-only replacement messages preserve the original `CorrelationId` and
`TraceParent` while incrementing the bounded logical `AttemptNumber`. Each
replacement attempt therefore remains in the same distributed trace without
using Azure Queue dequeue count as application retry state.

Bounded analysis telemetry records:

- capability success, failure, and dependency-blocked outcomes;
- logical replacement attempt number;
- replacement publication;
- attempt-three discard; and
- target persistence failure.

Logs and metrics accept only correlation identifiers, bounded enums, attempt
numbers, counts, and durations. OCR content, product or merchant names, prompts,
provider responses, scan URLs, and credentials are excluded.

#### 2.2.5 Azure Monitor Export Integration

**Location**: Implemented directly in:

- `Common/Telemetry/Logging/LoggingExtensions.cs`
- `Common/Telemetry/Metering/MeteringExtensions.cs`
- `Common/Telemetry/Tracing/TracingExtensions.cs`

**Purpose**: Export OpenTelemetry logs, metrics, and traces to Azure Monitor/Application Insights using `Azure.Monitor.OpenTelemetry.Exporter`.

**Features**:

- Azure Monitor exporters configured per signal (logs/metrics/traces)
- `DefaultAzureCredential` + managed identity support via `AZURE_CLIENT_ID`
- Debug-time console exporters for local diagnostics

### 2.3 Configuration & Integration

**Startup Configuration** (`Core/Domain/General/Extensions/WebApplicationBuilderExtensions.cs`):

```csharp
public static void AddGeneralDomainConfiguration(this WebApplicationBuilder builder)
{
  // ... other services

  builder.AddOTelLogging();      // OpenTelemetry logging
  builder.AddOTelMetering();     // OpenTelemetry metrics
  builder.AddOTelTracing();      // OpenTelemetry tracing
}
```

**Azure Monitor authentication**:

- The exporter uses the configured Application Insights connection string and
  the shared `AzureCredentialFactory`.
- Debug builds use the normal `DefaultAzureCredential` developer chain.
- Release builds configure the managed-identity client ID from
  `AZURE_CLIENT_ID`.
- Console exporters are added only when a debugger is attached.

**Local Swagger personas**:

- Aspire runs a loopback-only `local-identities` tooling resource for Alice,
  Bob, and Charlie.
- Tokens use the same issuer, audience, signature, lifetime validation, and
  `userIdentifier` claim contract as normal API Bearer tokens.
- Development Swagger injects persona controls only when the environment is
  Development, `INFRA=local`, no Azure managed identity is present, and AppHost
  supplies the loopback identity endpoint.
- The API content security policy adds that exact loopback origin to
  `connect-src`; production retains the same-origin-only policy.
- Tokens, signing secrets, connection strings, raw fixture documents, and scan
  contents are never logged or exported.
- The identity helper and seed bootstrap are excluded from deployment manifests;
  production authentication and observability remain unchanged.

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
  IInvoiceManagementService invoiceManagementService,
  IHttpContextAccessor httpContext,
  CreateInvoiceRequestDto invoiceDto)
{
  using var writeScope = RequestCancellation.ForWrite(
    httpContext.HttpContext!,
    RequestCancellation.CrudWriteBudget);

  try
  {
    using var activity = InvoicePackageTracing.StartActivity(
      nameof(CreateNewInvoiceAsync),
      ActivityKind.Server);
    activity?
      .SetLayerContext("Endpoint", nameof(InvoiceEndpoints))
      .SetOperationType("CRUD.Create");

    var invoice = invoiceDto.ToInvoice();
    activity?.SetInvoiceContext(invoice.id, invoice.UserIdentifier);

    await invoiceManagementService
      .CreateInvoice(invoice, invoice.UserIdentifier, writeScope.Token)
      .ConfigureAwait(false);

    activity?.RecordSuccess("Invoice created successfully");
    return TypedResults.Created(
      $"/rest/v1/invoices/{invoice.id}",
      InvoiceResponseDto.FromInvoice(invoice));
  }
  catch (OperationCanceledException)
  {
    return HandleCancellation(
      httpContext.HttpContext!,
      writeScope,
      "create",
      "invoice");
  }
  catch (Exception ex)
  {
    Activity.Current?.RecordException(ex);
    Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
    return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
  }
}
```

Endpoints record bounded identifiers and operation labels, never request
payloads, OCR content, merchant/product names, prompts, provider responses, or
credentials. Writes use the repository-owned cancellation budget; timeout and
client-disconnect outcomes are classified before the safe shared exception
mapper.

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

The implementation uses source-generated logging for recurring events and
bounded metric labels to control allocation and cardinality. OpenTelemetry
providers perform their configured batching/export behavior.

No custom trace sampler is currently registered; do not claim a production
sampling percentage without adding and testing one.

Console exporters are added when `Debugger.IsAttached`, not through a DEBUG
conditional compilation contract. Activity/listener absence must not affect
business behavior.

---

## 6. Security Considerations

The request instrumentation records the remote IP and, when available, the
claim-derived user identifier as a span tag and baggage value. No consent gate
is implemented for that enrichment. Treat both as personal data when defining
access, retention, export, or deletion policy.

Application code must not add OCR/scan content, names, prompts, request bodies,
credentials, authorization headers, connection strings, or raw provider
responses to telemetry. The current shared exception recorder still emits
exception type, message, and stack trace, and several generated exception logs
accept `exception.Message`; these are implemented privacy debts, not redacted
patterns.

Telemetry region and retention are deployment/configuration concerns. The
repository's current infrastructure parameters and Azure resource settings are
authoritative; this RFC does not assert a compliance region or fixed retention
period.

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Approach**: Test telemetry configuration without actual export

```csharp
[TestMethod]
public void AddOTelTracing_ShouldRegisterActivitySources()
{
  // Arrange
  var builder = WebApplication.CreateBuilder();

  // Act
  builder.AddOTelTracing();

  // Assert
  var serviceProvider = builder.Services.BuildServiceProvider();
  var tracerProvider = serviceProvider.GetService<TracerProvider>();
  Assert.IsNotNull(tracerProvider);
}
```

### 7.2 Integration Tests

**Approach**: Verify telemetry end-to-end with in-memory exporter

```csharp
[TestMethod]
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
  Assert.Contains(a => a.DisplayName == nameof(CreateInvoice), activities);
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
