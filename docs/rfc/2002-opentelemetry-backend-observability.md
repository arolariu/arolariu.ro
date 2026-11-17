# RFC 2002: OpenTelemetry Backend Observability System

- **Status**: Implemented
- **Date**: 2025-10-20
- **Authors**: Alexandru Olariu
- **Related Components**:
  - `sites/api.arolariu.ro/src/Common/Telemetry/`
  - `sites/api.arolariu.ro/src/Core/Domain/General/Extensions/`
  - `sites/api.arolariu.ro/src/Core/Domain/General/Middlewares/`

---

## Abstract

This RFC documents the OpenTelemetry (OTel) observability implementation in the api.arolariu.ro .NET modular monolith. The system provides
comprehensive distributed tracing, structured logging, and performance metrics collection with Azure Application Insights integration. The
implementation leverages OpenTelemetry SDK for standardized observability while maintaining zero-allocation performance through source
generators and automatic instrumentation.

---

## 1. Motivation

### 1.1 Problem Statement

Modern distributed systems require comprehensive observability to:

- **Diagnose Performance Issues**: Identify bottlenecks across the Invoices flow (Endpoint/Worker → Management → Processing → Orchestration
  → Foundation → Broker)
- **Correlate Distributed Operations**: Track requests through multiple layers of the modular monolith
- **Monitor System Health**: Collect real-time metrics on throughput, latency, and error rates
- **Debug Production Issues**: Access structured logs with trace context correlation
- **Ensure SLA Compliance**: Measure and alert on performance degradation

Without standardized observability, debugging production issues requires manual log correlation and lacks visibility into cross-layer
performance characteristics.

### 1.2 Design Goals

- **Standard Compliance**: Use OpenTelemetry specification for vendor-neutral observability
- **Zero-Allocation Logging**: Leverage source generators for compile-time logging optimization
- **Automatic Instrumentation**: Capture HTTP, database, and dependency calls without manual intervention
- **Azure Integration**: Export telemetry to Azure Application Insights for centralized monitoring
- **Development Visibility**: Provide console export during debugging for immediate feedback
- **Modular Architecture**: Align tracing with DDD domain boundaries (Common, Core, Auth, Invoices)
- **Secure Authentication**: Use the repository Azure credential factory for Azure Monitor export

---

## 2. Technical Design

### 2.1 Architecture Overview

The observability system consists of three OpenTelemetry signals that share one resource definition and export through per-signal exporters:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                            │
│  (Minimal API endpoints, background workers, middleware)        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Tracing    │  │   Logging    │  │   Metering   │
   │  (Spans &    │  │ (Structured  │  │  (Metrics &  │
   │  Activities) │  │    Logs)     │  │     KPIs)    │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │  shared resource attributes
                            ▼
   ┌────────────────────────────────────────────────────┐
   │ Per-signal exporters                               │
   │  - Azure Monitor (when a connection string is set) │
   │  - OTLP (when OTEL_EXPORTER_OTLP_ENDPOINT is set)  │
   │  - Console (only while a debugger is attached)     │
   └────────────────────────────────────────────────────┘
```

Outside the application, Bicep also enables the App Service Application Insights agent (`ApplicationInsightsAgent_EXTENSION_VERSION=~3`) for
the API web app. That agent is infrastructure-level and is not part of the application's OpenTelemetry pipeline.

### 2.2 Core Components

#### 2.2.1 Tracing Infrastructure

**Location**: `Common/Telemetry/Tracing/`

**Purpose**: Distributed request tracing with automatic instrumentation

**Key Classes**:

- `TracingExtensions`: Configures OpenTelemetry tracing with ASP.NET Core, HTTP Client, and EF Core instrumentation
- `ActivityGenerators`: Centralized activity sources for domain-specific tracing
- `ActivityExtensions`: Fluent tagging helpers for layer, operation, invoice, merchant, user, and Cosmos DB context, plus `RecordSuccess`,
  `RecordException`, `AddCustomEvent`, and `StartActivityWithLink`
- `ActivityEnrichingProcessor`: When a span starts, adds correlation, root-trace, parent-span, span-depth, environment, host, process,
  thread, and start-timestamp tags and copies baggage into `baggage.*` tags; when it ends, adds `duration.ms` and `display.name` and sets an
  unset status to `Ok` when no `error` tag is present

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

`TracingExtensions` registers these four sources plus the Cosmos DB SDK source `Azure.Cosmos.Operation`. The Invoices module enables Cosmos
DB SDK distributed tracing with `CosmosClientTelemetryOptions.DisableDistributedTracing = false`.

**Resource Attributes** (`Common/Telemetry/ResourceBuilderFactory.cs`, shared by traces, metrics, and logs):

- `service.name`: `arolariu-api`
- `service.namespace`: `arolariu.ro`
- `service.version`: the `COMMIT_SHA` environment variable, falling back to the assembly version and then `1.0.0`
- `service.instance.id`: the machine name
- `deployment.environment`: `ASPNETCORE_ENVIRONMENT`, defaulting to `Development`
- `cloud.role`: `api`; `cloud.provider`: `azure`

**Automatic Instrumentation**:

- **ASP.NET Core**: HTTP request spans with route, status code, and duration. Health probe requests are filtered out (see
  [2.2.6](#226-health-probe-telemetry-suppression)). Spans are enriched with `http.request.id`, `http.client.ip`, `enduser.id` (when a `sub`
  or `userId` claim is present), and `http.response.content_length`, and record exceptions.
- **HTTP Client**: Outbound dependency tracking with correlation headers, enriched with `http.request.uri.host`. Outbound probe requests are
  filtered out (see [2.2.6](#226-health-probe-telemetry-suppression)), and dependency exceptions are recorded.
- **Entity Framework Core**: EF Core command spans, which in practice cover only the SQL Server Identity store (`AuthDbContext`). Invoice
  and merchant Cosmos DB access uses the raw `CosmosClient` and is traced through broker activities and the `Azure.Cosmos.Operation` source.

#### 2.2.2 Logging Infrastructure

**Location**: `Common/Telemetry/Logging/LoggingExtensions.cs` (provider setup); source-generated `Log` classes per bounded context in
`Common/Log.cs`, `Core/Log.cs`, `Core.Auth/Log.cs`, and `Invoices/Modules/Log.cs`. Event IDs are registered in the
[event ID registry](../backend/event-id-registry.md).

**Purpose**: High-performance structured logging with compile-time optimization

**Key Classes**:

- `LoggingExtensions`: Configures OpenTelemetry logging (formatted messages and scopes included) with Azure Monitor and OTLP export
- `Log`: Source-generated logging methods (zero-allocation), one partial class per bounded context

**Source-Generated Logging Pattern** (excerpt from `Common/Log.cs`):

```csharp
public static partial class Log
{
  [LoggerMessage(
    EventId = 410_103,
    Level = LogLevel.Information,
    Message = "Config and features refreshed from proxy.")]
  public static partial void LogRefreshSucceeded(this ILogger logger);

  [LoggerMessage(
    EventId = 410_201,
    Level = LogLevel.Warning,
    Message = "exp returned HTTP {StatusCode} for config key '{Key}'.")]
  public static partial void LogConfigKeyHttpError(this ILogger logger, int statusCode, string key);
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

- `MeteringExtensions`: Configures OpenTelemetry metrics with automatic instrumentation and registers the domain meters
- `MeterGenerators`: Domain meters `arolariu.Backend.Common`, `arolariu.Backend.Core`, `arolariu.Backend.Auth`, and
  `arolariu.Backend.Domain.Invoices` (version `1.0.0`)
- `HealthCheckMetrics`: Failed health-check counter (see [2.2.6](#226-health-probe-telemetry-suppression))
- `CommonMetrics`, `AuthMetrics`, `InvoiceMetrics`: Per-context custom instruments

**Custom Metrics** (the owning classes are the source of truth for the full instrument list):

- `CommonMetrics` (`Common/CommonMetrics.cs`, meter `arolariu.Backend.Common`): `config.refresh.success`, `config.refresh.failure`,
  `config.refresh.duration`
- `HealthCheckMetrics` (`Common/Telemetry/Metering/HealthCheckMetrics.cs`, meter `arolariu.Backend.Core`): `arolariu.health.check.failures`
- `AuthMetrics` (`Core.Auth/AuthMetrics.cs`, meter `arolariu.Backend.Auth`): `auth.logouts`, `auth.logout_failures`,
  `auth.jwt.validation_failures`
- `InvoiceMetrics` (`Invoices/Modules/InvoiceMetrics.cs`, meter `arolariu.Backend.Domain.Invoices`):
  - `invoices.operations` and `invoices.operations.duration`
  - `invoices.analysis` and `invoices.analysis.*`: analysis outcomes and duration, content-filter triggers, queue depth, enqueues and wait
    time, message outcomes and duration, lease recovery and loss, replacements and discards, persistence failures, capability outcomes,
    duration, retries, content-filter and invalid-structured-output counts, taxonomy validation failures, input and output tokens, and
    estimated cost
  - `invoices.cosmosdb.request_charge`: Cosmos DB request units

**Automatic Metrics Collection**:

- **ASP.NET Core Metrics**:
  - `http.server.request.duration`: Request latency histogram
  - `http.server.active_requests`: Concurrent request counter

- **HTTP Client Metrics**:
  - `http.client.request.duration`: Dependency call latency
  - `http.client.active_requests`: Concurrent outbound requests

#### 2.2.4 Queued Analysis Trace and Retry Telemetry

Invoice and merchant analysis requests capture W3C `traceparent` in `QueueAnalysisMessage`. `InvoiceProcessingService.ProcessAnalysisAsync`
parses that context and starts an `ActivityKind.Consumer` activity, so background work remains correlated with the request that published
it.

Failed-only replacement messages preserve the original `CorrelationId` and `TraceParent` while incrementing the bounded logical
`AttemptNumber`. Each replacement attempt therefore remains in the same distributed trace without using Azure Queue dequeue count as
application retry state.

Bounded analysis telemetry records:

- capability success, failure, and dependency-blocked outcomes;
- logical replacement attempt number;
- replacement publication;
- attempt-three discard; and
- target persistence failure.

Logs and metrics accept only correlation identifiers, bounded enums, attempt numbers, counts, and durations. OCR content, product or
merchant names, prompts, provider responses, scan URLs, and credentials are excluded.

#### 2.2.5 Azure Monitor Export Integration

**Location**: Implemented directly in:

- `Common/Telemetry/Logging/LoggingExtensions.cs`
- `Common/Telemetry/Metering/MeteringExtensions.cs`
- `Common/Telemetry/Tracing/TracingExtensions.cs`

**Purpose**: Export OpenTelemetry logs, metrics, and traces to Azure Monitor/Application Insights using
`Azure.Monitor.OpenTelemetry.Exporter`.

**Features**:

- Azure Monitor exporters per signal (logs/metrics/traces), added only when the resolved Application Insights connection string is non-blank
- `DefaultAzureCredential` + managed identity support via `AZURE_CLIENT_ID`
- OTLP exporter per signal when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (the Aspire AppHost injects it for the Aspire dashboard)
- Console exporters for local diagnostics, added only while a debugger is attached

#### 2.2.6 Health Probe Telemetry Suppression

**Location**: `Common/Telemetry/HealthTelemetryPolicy.cs`, `Core/Domain/General/Middlewares/HealthTelemetrySuppressionMiddleware.cs`, and
`Common/Telemetry/Metering/HealthCheckMetrics.cs`

**Purpose**: Keep high-frequency liveness and readiness probes out of traces, request metrics, and logs without hiding failed checks.

`HealthTelemetryPolicy` suppresses telemetry for the `/health`, `/api/health`, and `/api/ready` paths. Matching is exact and
case-insensitive after the query string and trailing slashes are removed. Suppression is enabled by default. Set
`OTEL_SUPPRESS_HEALTH_TELEMETRY=false` to disable it; a missing, blank, or unparseable value keeps it enabled.

When suppression is enabled, it is applied by:

- the ASP.NET Core trace `Filter` and the HttpClient `FilterHttpRequestMessage` in `TracingExtensions`, which also drop outbound probes such
  as the exp `/api/ready` ping;
- a `Warning` minimum level for the `Microsoft.Extensions.Diagnostics.HealthChecks` category on the OpenTelemetry logger provider in
  `LoggingExtensions`;
- `HealthTelemetrySuppressionMiddleware`, which runs probe requests inside a `SuppressInstrumentationScope`; and
- `DisableHttpMetrics()` on the `/health` endpoint.

Failed checks are always counted by `arolariu.health.check.failures` (`HealthCheckMetrics`, `arolariu.Backend.Core` meter, unit `{failure}`,
tag `check`), even while suppression is enabled. The website and the exp service honour the same environment variable.

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

- The exporter uses the configured Application Insights connection string and the shared `AzureCredentialFactory`.
- Debug builds use the normal `DefaultAzureCredential` developer chain.
- Release builds configure the managed-identity client ID from `AZURE_CLIENT_ID`.
- Console exporters are added only when a debugger is attached.

**Local Swagger personas**:

- Aspire runs a loopback-only `local-identities` tooling resource for Alice, Bob, Charlie, and Dmitryi.
- Tokens use the same issuer, audience, signature, lifetime validation, and `userIdentifier` claim contract as normal API Bearer tokens.
- Development Swagger injects persona controls only when the environment is Development, `INFRA=local`, no Azure managed identity is
  present, and AppHost supplies the loopback identity endpoint.
- The API content security policy adds that exact loopback origin to `connect-src`; production retains the same-origin-only policy.
- Tokens, signing secrets, connection strings, raw fixture documents, and scan contents are never logged or exported.
- The identity helper and seed bootstrap are excluded from deployment manifests; production authentication and observability remain
  unchanged.

**Connection String Resolution** (`Common/Telemetry/Tracing/TracingExtensions.cs`; the logging and metering extensions use the same
pattern):

```csharp
// Resolved at startup for every INFRA mode via the exp config proxy:
// exp key "Endpoints:Observability:Telemetry" → AzureOptions:ApplicationInsightsEndpoint
// (CloudOptionsManager; refreshed by ConfigRefreshHostedService). exp reads Azure App
// Configuration (+ Key Vault references) when INFRA=azure, otherwise its local config.json.
using var serviceProvider = builder.Services.BuildServiceProvider();
var connectionString = serviceProvider
  .GetRequiredService<IOptionsManager>()
  .GetApplicationOptions()
  .ApplicationInsightsEndpoint ?? string.Empty;
```

---

## 3. Implementation Examples

### 3.1 Manual Activity Creation (Processing Layer)

```csharp
public sealed partial class InvoiceProcessingService : IInvoiceProcessingService
{
  public async Task CreateInvoice(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      // Create activity for distributed tracing
      using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoice));
      var sw = Stopwatch.StartNew();

      // Activity automatically captures:
      // - Start/end timestamps
      // - Parent-child relationships
      // - Trace/span IDs for correlation

      if (invoice.Classification is not null)
      {
        invoice.Classification = await analysisOrchestrationService
          .ResolveManualClassificationAsync(
            invoice.Classification.Code,
            ClassificationSystem.EcoicopV2,
            cancellationToken)
          .ConfigureAwait(false);
      }

      await invoiceOrchestrationService
        .CreateInvoiceObject(invoice, userIdentifier, cancellationToken)
        .ConfigureAwait(false);

      sw.Stop();
      InvoiceMetrics.RecordOperation("create", "invoice", "success", sw.Elapsed.TotalMilliseconds);

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

Endpoints record bounded identifiers and operation labels, never request payloads, OCR content, merchant/product names, prompts, provider
responses, or credentials. Writes use the repository-owned cancellation budget; timeout and client-disconnect outcomes are classified before
the safe shared exception mapper.

### 3.3 High-Performance Logging

Excerpt from `Common/Configuration/ConfigProxyClient.cs`; the `LogConfigKeyHttpError` definition is shown in
[2.2.2](#222-logging-infrastructure).

```csharp
public sealed class ConfigProxyClient(HttpClient httpClient, ILogger<ConfigProxyClient> logger) : IConfigProxyClient
{
  public async Task<ConfigValueResponse?> GetConfigValueAsync(string name, string? label = null, CancellationToken ct = default)
  {
    using var activity = ActivityGenerators.CommonPackageTracing.StartActivity("exp.config.fetch");
    activity?.SetTag("config.key", name);
    activity?.SetTag("peer.service", "exp");
    activity?
      .SetLayerContext("Broker", nameof(ConfigProxyClient))
      .SetOperationType("Config.Read");
    // ... correlation identifier, remaining tags, and log scope elided

    try
    {
      var uri = $"/api/v1/config?name={Uri.EscapeDataString(name)}";
      // ... optional label query parameter elided

      var requestUri = new Uri(uri, UriKind.Relative);
      using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
      // ... X-Request-Id header elided

      using var response = await httpClient.SendAsync(request, ct).ConfigureAwait(false);

      activity?.SetTag("http.response.status_code", (int)response.StatusCode);

      if (!response.IsSuccessStatusCode)
      {
        activity?.SetStatus(ActivityStatusCode.Error, $"HTTP {(int)response.StatusCode}");

        // Zero-allocation structured log (EventId 410_201), correlated with the active trace
        logger.LogConfigKeyHttpError((int)response.StatusCode, name);
        return null;
      }

      var result = await response.Content.ReadFromJsonAsync<ConfigValueResponse>(cancellationToken: ct).ConfigureAwait(false);
      activity?.SetTag("config.resolved", result is not null);
      return result;
    }
    catch (HttpRequestException ex)
    {
      activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
      // ... exception span event elided
      logger.LogConfigKeyNetworkError(ex, name);
      return null;
    }
    // ... timeout and JSON error handlers elided
  }
}
```

### 3.4 Automatic Instrumentation (No Code Changes)

```csharp
// Invoices/Endpoints/InvoiceEndpoints.Mappings.cs: the mapping itself contains no tracing code.
router // Retrieve a specific invoice, given its identifier.
  .MapGet("/invoices/{id}", RetrieveSpecificInvoiceAsync)
  .Produces<InvoiceResponseDto>(StatusCodes.Status200OK)
  // ... remaining response metadata elided
  .RequireAuthorization()
  .RequireRateLimiting(RateLimitPolicies.StandardReads)
  .WithName(nameof(RetrieveSpecificInvoiceAsync))
  .WithRequestTimeout(RequestTimeoutPolicies.Crud);

// ASP.NET Core instrumentation automatically creates:
// - Server span with http.request.method, http.route, http.response.status_code
// - Parent-child relationship with upstream requests
// - Correlation headers (traceparent, tracestate)
//
// Child spans come from the handler's own InvoicePackageTracing activity (see 3.2), the Cosmos DB
// broker activities, and the Azure.Cosmos.Operation source. Invoice reads use the raw CosmosClient,
// not EF Core; EF Core instrumentation applies only to the SQL Server Identity store (AuthDbContext).
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
- ❌ **Package Dependencies**: Requires 9 telemetry NuGet packages (8 `OpenTelemetry.*` packages plus
  `Azure.Monitor.OpenTelemetry.Exporter`; see [Appendix A](#appendix-a-nuget-dependencies))
- ❌ **Dual Telemetry**: The App Service Application Insights agent (`~3`) runs alongside OpenTelemetry export; the
  `Microsoft.ApplicationInsights*` SDK packages are still referenced but not initialized in code

---

## 5. Performance Considerations

The implementation uses source-generated logging for recurring events and bounded metric labels to control allocation and cardinality.
OpenTelemetry providers perform their configured batching/export behavior.

No custom trace sampler is currently registered; do not claim a production sampling percentage without adding and testing one.

Console exporters are added when `Debugger.IsAttached`, not through a DEBUG conditional compilation contract. Activity/listener absence must
not affect business behavior.

---

## 6. Security Considerations

The ASP.NET Core request enrichment records the remote IP as the `http.client.ip` span tag and, when a `sub` or `userId` claim is present,
that value as the `enduser.id` span tag and `enduser.id` baggage. `ActivityEnrichingProcessor` copies baggage into `baggage.*` tags on spans
that carry it. No consent gate is implemented for that enrichment. Treat these values as personal data when defining access, retention,
export, or deletion policy.

Application code must not add OCR/scan content, names, prompts, request bodies, credentials, authorization headers, connection strings, or
raw provider responses to telemetry. The current shared exception recorder still emits exception type, message, and stack trace, and several
generated exception logs accept `exception.Message`; these are implemented privacy debts, not redacted patterns.

Telemetry region and retention are deployment/configuration concerns. The repository's current infrastructure parameters and Azure resource
settings are authoritative; this RFC does not assert a compliance region or fixed retention period.

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
  builder.Services.AddSingleton<IOptionsManager>(
    new FakeOptionsManager(new LocalOptions()));

  // Act
  builder.AddOTelTracing();

  // Assert
  var serviceProvider = builder.Services.BuildServiceProvider();
  var tracerProvider = serviceProvider.GetService<TracerProvider>();
  Assert.IsNotNull(tracerProvider);
}
```

### 7.2 Integration Tests

**Approach**: Verify spans with an `ActivityListener`. Invoice tests use the `InvoiceActivityRecorder` helper
(`sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Helpers/InvoiceActivityRecorder.cs`), which listens to the
`arolariu.Backend.Domain.Invoices` source. In-memory exporter tests (`OpenTelemetry.Exporter.InMemory`) cover the health-check metrics and
middleware.

```csharp
[TestMethod]
public async Task CreateInvoice_ShouldCreateActivitySpan()
{
  // Arrange
  using var activities = new InvoiceActivityRecorder();

  // Act
  await invoiceProcessingService.CreateInvoice(testInvoice, testInvoice.UserIdentifier, CancellationToken.None);

  // Assert
  Assert.IsNotNull(activities.FindActivity("CreateInvoice"));
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
   logger.LogWarning($"exp returned HTTP {(int)response.StatusCode} for config key '{name}'.");

   // After
   logger.LogConfigKeyHttpError((int)response.StatusCode, name);
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
- [x] Usage guides in [`docs/backend/opentelemetry-guide.md`](../backend/opentelemetry-guide.md),
      [`docs/backend/distributed-tracing.md`](../backend/distributed-tracing.md), and
      [`docs/backend/event-id-registry.md`](../backend/event-id-registry.md)
- [x] Architecture diagram showing telemetry flow
- [x] Azure Application Insights dashboard setup guide
- [ ] Runbook for common troubleshooting scenarios using telemetry

---

## 10. Future Work

### 10.1 Planned Enhancements

- **Business KPI Dashboards**: Throughput and latency views (for example invoices processed per hour) built on the existing
  `invoices.operations` and `invoices.operations.duration` metrics
- **Span Events**: Fine-grained operation markers within long-running activities, beyond the current `invoice.soft_deleted`,
  `merchant.soft_deleted`, and `access.denied` events
- **Baggage Propagation**: Cross-service propagation of additional context (for example user preferences); today only `enduser.id` is added
  as baggage
- **Auto-Instrumentation**: Eliminate manual activity creation via source generators
- **OpenTelemetry Collector**: Deploy OTEL Collector for advanced filtering/routing
- **Distributed Context**: Propagate business context (tenant ID, user roles) across boundaries

### 10.2 Deprecation Plan

- **Phase Out Application Insights SDK**: Remove the unused `Microsoft.ApplicationInsights`, `Microsoft.ApplicationInsights.AspNetCore`, and
  `Microsoft.ApplicationInsights.DependencyCollector` package references, and decide whether to keep the App Service Application Insights
  agent
- **Timeline**: TBD (the original Q2 2026 target has passed)

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

The API uses Central Package Management. Versions are pinned in `sites/api.arolariu.ro/Directory.Packages.props`:

```xml
<PackageVersion Include="Azure.Monitor.OpenTelemetry.Exporter" Version="1.10.0" />
<PackageVersion Include="OpenTelemetry" Version="1.20.1" />
<PackageVersion Include="OpenTelemetry.Api" Version="1.20.1" />
<PackageVersion Include="OpenTelemetry.Exporter.Console" Version="1.20.1" />
<PackageVersion Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.20.1" />
<PackageVersion Include="OpenTelemetry.Extensions.Hosting" Version="1.20.1" />
<PackageVersion Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.20.1" />
<PackageVersion Include="OpenTelemetry.Instrumentation.EntityFrameworkCore" Version="1.20.1-beta.1" />
<PackageVersion Include="OpenTelemetry.Exporter.InMemory" Version="1.20.1" />
<PackageVersion Include="OpenTelemetry.Instrumentation.Http" Version="1.20.1" />
```

`sites/api.arolariu.ro/src/Common/arolariu.Backend.Common.csproj` references the runtime packages without versions, for example
`<PackageReference Include="OpenTelemetry" />`. `OpenTelemetry.Exporter.InMemory` is referenced only by the Core test project.

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
| where operation_Id == "4bf92f3577b34da6a3ce929d0e0e4736"
| project timestamp, itemType, name, message, duration
| order by timestamp asc
```

---

**Document Version**: 1.1.0 **Last Updated**: 2026-11-17 **Reviewed By**: Alexandru Olariu **Status**: Implemented
