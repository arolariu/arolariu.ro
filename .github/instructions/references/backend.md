# API Reference Catalog

Owner: `.github/instructions/backend.instructions.md`. This catalog holds
extensive, repository-specific API architecture examples, anti-patterns, edge
cases, and rationale for `sites/api.arolariu.ro`. It does not define a
workflow; use `backend-vertical-slice` for implementing a change, `unit-test`
for coverage, or `fix-bug`/`refactor` for the corresponding narrower task. It
does not restate versions, global commands, or root safety policy — see root
`AGENTS.md` and `sites/api.arolariu.ro/AGENTS.md`. It does not duplicate the
`backend-vertical-slice` skill's own resources
(`references/layer-decision-table.md`, `references/exception-telemetry-catalog.md`,
`references/backend-edge-cases.md`), which own the layer-selection and
edge-case decision workflow; this catalog explains the architecture those
decisions operate on, with code, not procedure.

## Management-to-Broker layers

The Invoices bounded context is the fully implemented reference for The
Standard (RFC 2003). The exact, closed dependency graph is:

| Layer | Implementation | Direct domain dependencies |
| --- | --- | --- |
| Management | `InvoiceManagementService` | `IInvoiceProcessingService` |
| Processing | `InvoiceProcessingService` | `IInvoiceOrchestrationService`, `IMerchantOrchestrationService`, `IAnalysisOrchestrationService` |
| Orchestration | `InvoiceOrchestrationService` | `IInvoiceStorageFoundationService` |
| Orchestration | `MerchantOrchestrationService` | `IMerchantStorageFoundationService` |
| Orchestration | `AnalysisOrchestrationService` | `IAnalysisFoundationService`, `IAnalysisQueueFoundationService` |
| Foundation | `InvoiceStorageFoundationService` | `IDatabaseBroker` |
| Foundation | `MerchantStorageFoundationService` | `IDatabaseBroker` |
| Foundation | `AnalysisFoundationService` | `IDocumentIntelligenceBroker`, `IGenerativeAnalysisBroker`, `ITaxonomyBroker` |
| Foundation | `AnalysisQueueFoundationService` | `IQueueBroker` |

This graph is enforced by reflection, not just convention:

```csharp
// sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs
AssertConstructorDependencies(
  typeof(InvoiceProcessingService),
  typeof(IInvoiceOrchestrationService),
  typeof(IMerchantOrchestrationService),
  typeof(IAnalysisOrchestrationService),
  typeof(ILoggerFactory));
```

A current Foundation CRUD read exposes unresolved nullability drift:

```csharp
// sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs
public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
await TryCatchAsync(async () =>
{
  using var activity = InvoicePackageTracing.StartActivity(nameof(ReadInvoiceObject));
  ValidateIdentifierIsSet(identifier);
  var invoice = await invoiceNoSqlBroker
    .ReadInvoiceAsync(identifier, userIdentifier, cancellationToken)
    .ConfigureAwait(false);
  return invoice!;
}).ConfigureAwait(false);
```

`IDatabaseBroker.ReadInvoiceAsync` returns `Invoice?` and the cross-partition
Broker path returns `null` when no item exists. This Foundation method does
not prove non-null before `invoice!`; do not copy that assertion as a
canonical read pattern. A new or changed read must either classify not-found
explicitly or preserve a genuinely nullable contract. Resolving the existing
contract is behavior work, not documentation cleanup.

## Bounded contexts and dependency direction

| Context | Path | Layers present | Notable shape |
| --- | --- | --- | --- |
| Core | `src/Core/` | Host, middleware, health | No domain service hierarchy; hosts composition |
| Core.Auth | `src/Core.Auth/` | `Brokers/` (`AuthDbContext`), `Endpoints/` | No Management/Processing/Orchestration/Foundation — endpoints call ASP.NET Core Identity's `SignInManager<TUser>` directly |
| Invoices | `src/Invoices/` | Full Management → Processing → Orchestration → Foundation → Brokers | The reference implementation of RFC 2001/2003 |
| Common | `src/Common/` | Shared DDD, `Exceptions/`, `Http/`, `Telemetry/` | Cross-context primitives only; must not become a bypass route around a context's Management boundary |

Core.Auth is a deliberate exception to the five-layer shape (RFC 2001 §2.1:
"Not every bounded context requires every adapter type"). Do not treat its
direct Identity/DbContext calls as a precedent for skipping Management in
Invoices, and do not add a Foundation/Orchestration layer to Core.Auth without
confirming the change is in scope — auth behavior is always an escalation
regardless of layering questions.

```csharp
// sites/api.arolariu.ro/src/Core.Auth/Endpoints/AuthEndpoints.Handlers.cs
public static partial class AuthEndpoints
{
  // handlers inject SignInManager<TUser>/UserManager<TUser> directly — there is
  // no Core.Auth Management service to route through.
}
```

## CRUD, analysis, and queue patterns

Foundation CRUD (shown above) is the simplest shape. Analysis composition
lives in `AnalysisOrchestrationService`, which sequences OCR, generative, and
taxonomy Foundations and returns a tuple of the mutated aggregate plus the
options that failed or were dependency-blocked — it does not throw for a
partial capability failure; Processing decides what that means for
persistence and retry.

Durable queue work is validated at construction, not at enqueue time:

```csharp
// sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/QueueAnalysisMessage.cs
if (targetType == AnalysisTargetType.Invoice
    && (invoiceOptions is null || merchantOptions is not null))
{
  throw new ArgumentException(
    "Invoice analysis messages require invoice options only.",
    nameof(invoiceOptions));
}
// ...
if (attemptNumber is < 1 or > 3)
{
  throw new ArgumentOutOfRangeException(
    nameof(attemptNumber), attemptNumber,
    "Analysis attempt number must be in the inclusive range 1 to 3.");
}
```

A Foundation test shows the same layer classifying a direct provider failure
rather than letting it leak as an SDK exception type:

```csharp
// sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/AnalysisQueueFoundationServiceTests.cs
broker
  .Setup(candidate => candidate.DequeueMessageAsync(TimeSpan.FromMinutes(2), It.IsAny<CancellationToken>()))
  .ThrowsAsync(new RequestFailedException(503, "unavailable"));

await Assert.ThrowsExactlyAsync<AnalysisFoundationDependencyException>(
  () => service.DequeueAsync(TimeSpan.FromMinutes(2), CancellationToken.None))
  .ConfigureAwait(false);
```

Do not add a poison queue, external workflow-state store, or persistence
retry — RFC 2003 documents that the current design has none, and Processing's
three-attempt discard policy is the accepted terminal behavior.

## Exception and HTTP mapping

`ExceptionToHttpResultMapper` walks the inner-exception chain for the
*deepest* classifiable exception, not the outermost wrapper, and returns a safe
RFC 7807 `ProblemDetails`:

```csharp
// sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs
private static (int Status, string Title, string Type) SelectStatus(Exception ex) => ex switch
{
  IUnauthorizedException => (401, "Unauthorized", ProblemTypeUris.Unauthorized),
  IForbiddenException => (403, "Forbidden", ProblemTypeUris.Forbidden),
  INotFoundException => (404, "Resource not found", ProblemTypeUris.NotFound),
  IAlreadyExistsException => (409, "Resource conflict", ProblemTypeUris.Conflict),
  ILockedException => (423, "Resource locked", ProblemTypeUris.Locked),
  IRateLimitedException => (429, "Too many requests", ProblemTypeUris.RateLimited),
  ITimeoutException => (504, "Operation timed out", ProblemTypeUris.Timeout),
  BadHttpRequestException badReq => (badReq.StatusCode, "Bad request", ProblemTypeUris.Validation),
  IValidationException => (400, "Validation failed", ProblemTypeUris.Validation),
  IDependencyValidationException => (400, "Dependency validation", ProblemTypeUris.Validation),
  IDependencyException => (503, "Service unavailable", ProblemTypeUris.ServiceUnavailable),
  IServiceException => (500, "Internal server error", ProblemTypeUris.InternalServerError),
  // ...
};
```

Endpoint handlers classify cancellation *before* delegating to the mapper —
never let a client-disconnect masquerade as a 500:

```csharp
// sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs
catch (OperationCanceledException)
{
  return HandleCancellation(httpContext.HttpContext!, writeScope, "create", "invoice");
}
catch (Exception ex)
{
  Activity.Current?.RecordException(ex);
  Activity.Current?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
  return ExceptionToHttpResultMapper.ToHttpResult(ex, Activity.Current);
}
```

`RequestCancellation` shows *why* reads and writes classify cancellation
differently: reads bind `HttpContext.RequestAborted` directly because Minimal
API already does that binding, while writes deliberately do not observe client
disconnect (a half-finished mutation should not be abandoned mid-flight) and
instead bind only application shutdown plus an explicit timeout budget.

**Live drift, not a template:** `AnalysisWriteBudget` is defined, but the
invoice and merchant analysis handlers currently pass `CrudWriteBudget`, and
their mappings use `RequestTimeoutPolicies.Crud`. Do not assume the five-minute
analysis budget is active. A timeout change must inspect and update the handler
scope and endpoint timeout policy together, with approval when observable
request behavior changes.

The marker-interface families themselves and per-layer classification detail
are the `backend-vertical-slice` skill's exception-telemetry catalog; this
section shows the mapper and endpoint code those markers ultimately drive.

## Telemetry

Activities use bounded-context sources and add only approved semantic tags —
never payload content:

```csharp
// sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityExtensions.cs
private const string ServiceLayerKey = "service.layer";
private const string DbCosmosDbRequestChargeKey = "db.cosmosdb.request_charge";
private const string InvoiceIdKey = "invoice.id";
// ...
using var activity = InvoicePackageTracing.StartActivity("ReadInvoice", ActivityKind.Internal);
activity?
    .SetInvoiceContext(invoiceId, userId)
    .SetLayerContext("Foundation", "InvoiceStorageFoundationService")
    .RecordSuccess();
```

Source-generated logging avoids allocation and centralizes message
identifiers per bounded context:

```csharp
// sites/api.arolariu.ro/src/Invoices/Modules/Log.cs
[LoggerMessage(600_101, LogLevel.Debug, "Azure Storage Queue Broker operation {OperationName} is starting.")]
public static partial void LogQueueOperationStarted(this ILogger logger, string operationName);
```

Full safe/unsafe tag catalogs and Activity-ownership-per-boundary tables are
owned by the `backend-vertical-slice` skill's exception-telemetry resource;
this section anchors the constants and helper files those rules apply to.

## Partition and ownership

```text
invoices  container — partitioned by invoice UserIdentifier — Invoice CRUD/soft delete
merchants container — partitioned by ParentCompanyId          — Merchant CRUD/soft delete
```

Partition selection lives in the Broker, not in Foundation or above:

```csharp
// sites/api.arolariu.ro/src/Invoices/Brokers/DatabaseBroker/CosmosDatabaseBroker.Invoices.cs
public async ValueTask<Invoice> CreateInvoiceAsync(Invoice invoice, CancellationToken cancellationToken)
{
  ArgumentNullException.ThrowIfNull(invoice);
  using var activity = InvoicePackageTracing.StartActivity(nameof(CreateInvoiceAsync));
  activity?.SetCosmosDbContext("primary", "invoices", "create", invoice.UserIdentifier.ToString());
  var database = CosmosClient.GetDatabase("primary");
  var container = database.GetContainer("invoices");
  // ...
}
```

A `Guid? userIdentifier` parameter threaded through Foundation and Broker
reads (see `ReadInvoiceObject` above) is how an owner-scoped read is
distinguished from a deliberate cross-partition/admin read — never drop or
default that discriminator in an intermediate layer.

## Dependency injection

New services are registered exactly once, in the owning bounded context's
`WebApplicationBuilderExtensions`, grouped by layer:

```csharp
// sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs
// Broker services:
services.AddScoped<IDatabaseBroker, CosmosDatabaseBroker>();
services.AddScoped<IQueueBroker, AzureStorageQueueBroker>();
services.AddSingleton<ITaxonomyBroker, JsonTaxonomyBroker>();

// Foundation services:
services.AddScoped<IInvoiceStorageFoundationService, InvoiceStorageFoundationService>();

// Orchestration services:
services.AddScoped<IInvoiceOrchestrationService, InvoiceOrchestrationService>();

// Processing services:
services.AddScoped<IInvoiceProcessingService, InvoiceProcessingService>();

// Management services:
services.AddScoped<IInvoiceManagementService, InvoiceManagementService>();

// Hosted workers:
services.AddHostedService<AnalysisWorker>();
```

`ITaxonomyBroker` is the one `AddSingleton` among the Brokers because
`JsonTaxonomyBroker` loads immutable embedded GS1/ECOICOP/NACE artifacts at
startup; every other Broker and service is `AddScoped` to match Cosmos/EF Core
scoping. Do not default a new registration to `AddSingleton` without the same
immutable-state justification.

## Tests

The dependency graph itself is asserted through constructor reflection, not
just documented:

```csharp
// sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs
[TestMethod]
public void ServiceConstructors_ApprovedGraph_MatchesExpectedDependencies()
{
  AssertConstructorDependencies(
    typeof(InvoiceManagementService),
    typeof(IInvoiceProcessingService),
    typeof(ILoggerFactory));
  // ... one AssertConstructorDependencies call per layer, top to bottom
}
```

A representative Foundation test pairs a `MockBehavior.Strict` Broker double
with an exact classified-exception assertion:

```csharp
// sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/AnalysisQueueFoundationServiceTests.cs
[TestMethod]
public async Task EnqueueAsync_ValidMessage_ReturnsMessageId()
{
  QueueAnalysisMessage message = CreateMessage();
  var broker = new Mock<IQueueBroker>(MockBehavior.Strict);
  broker
    .Setup(candidate => candidate.EnqueueMessageAsync(message, It.IsAny<CancellationToken>()))
    .ReturnsAsync("message-1");
  var service = new AnalysisQueueFoundationService(broker.Object, NullLoggerFactory.Instance);

  string messageId = await service.EnqueueAsync(message, CancellationToken.None).ConfigureAwait(false);

  Assert.AreEqual("message-1", messageId);
  broker.VerifyAll();
}
```

Full behavior-category selection (valid/validation/dependency/cancellation/
partition/orchestration-call matrices) is the `unit-test` skill's backend test
matrix; this section anchors the architecture-reflection and Foundation-test
shapes those categories build on.

## Anti-pattern corrections summary

| Anti-pattern | Why it fails here | Correction |
| --- | --- | --- |
| An endpoint injecting `IInvoiceStorageFoundationService` directly | Bypasses Management's classification boundary and Processing's workflow policy | Inject only `IInvoiceManagementService`; extend Management if a use case is missing |
| A new Foundation calling another Foundation | Sideways coupling prohibited by RFC 2001 §2.3 | Route composition through an Orchestration |
| Adding a Foundation/Orchestration/Processing layer to Core.Auth for symmetry | Core.Auth intentionally has no Standard hierarchy; auth changes are an escalation regardless | Confirm the change is actually approved auth work before touching `Core.Auth/*` |
| Registering a new service as `AddSingleton` "to be safe" | Breaks Cosmos/EF Core per-request scoping used by every other Broker/service | Match `AddScoped` unless the type holds genuinely immutable startup state like `JsonTaxonomyBroker` |
| Dropping the `userIdentifier`/partition parameter in a pass-through layer | Silently converts an owner-scoped call into an unscoped one | Thread the discriminator unchanged from endpoint to Broker |
| Returning the outer wrapper exception's type in a new endpoint mapping instead of using `ExceptionToHttpResultMapper` | Duplicates status-mapping logic that already walks the inner-exception chain correctly | Call the shared mapper; do not hand-roll a second switch |

## Live source pointers

- `docs/rfc/2001-domain-driven-design-architecture.md` — layer responsibilities and bounded-context shape
- `docs/rfc/2003-the-standard-implementation.md` — exact dependency graph, durable analysis contract, exception-to-HTTP table
- `sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs` — DI registration by layer
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs` — Foundation CRUD shape
- `sites/api.arolariu.ro/src/Invoices/Brokers/DatabaseBroker/CosmosDatabaseBroker.Invoices.cs` — partition/provider call shape
- `sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/QueueAnalysisMessage.cs` — durable message validation
- `sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`, `RequestCancellation.cs` — HTTP mapping and cancellation classification
- `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityExtensions.cs` — semantic tag constants
- `sites/api.arolariu.ro/src/Core.Auth/Endpoints/AuthEndpoints.Handlers.cs` — the non-Standard bounded-context shape
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs` — reflection-based dependency-graph enforcement
