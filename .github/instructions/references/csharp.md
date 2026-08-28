# C# Reference Catalog

Owner: `.github/instructions/csharp.instructions.md`. This catalog holds
extensive, repository-specific C# language examples, anti-patterns, edge
cases, and rationale. It does not define a workflow; use `backend-vertical-slice`,
`code-fix-bug`, `code-refactor`, `code-unit-test`, or another skill for the procedure. It does
not restate versions, global commands, or root safety policy — see root
`AGENTS.md`. API layering and The Standard belong to the backend catalog
(`references/backend.md`).

## Nullable reference types

`Directory.Build.props` sets `<Nullable>enable</Nullable>` with
`TreatWarningsAsErrors` for every project under `sites/api.arolariu.ro`, so a
nullability mismatch is a build failure, not a warning to triage later.

The dominant guard pattern is `ArgumentNullException.ThrowIfNull` at the top
of a constructor or public method, not a manual `if (x is null) throw`:

```csharp
// sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs
public InvoiceStorageFoundationService(
  IDatabaseBroker invoiceNoSqlBroker,
  ILoggerFactory loggerFactory)
{
  ArgumentNullException.ThrowIfNull(invoiceNoSqlBroker);
  ArgumentNullException.ThrowIfNull(loggerFactory);
  this.invoiceNoSqlBroker = invoiceNoSqlBroker;
  this.logger = loggerFactory.CreateLogger<IInvoiceStorageFoundationService>();
}
```

A narrow null-forgiving operator is accepted only when the current layer has
already proven non-null through its own validation or the direct dependency's
documented contract, and the justification is visible at the call site.
The current invoice read does **not** meet that standard:

```csharp
// sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs
public async Task<Invoice> ReadInvoiceObject(Guid identifier, Guid? userIdentifier, CancellationToken cancellationToken) =>
await TryCatchAsync(async () =>
{
  ValidateIdentifierIsSet(identifier);
  var invoice = await invoiceNoSqlBroker
    .ReadInvoiceAsync(identifier, userIdentifier, cancellationToken)
    .ConfigureAwait(false);
  return invoice!;
}).ConfigureAwait(false);
```

`IDatabaseBroker.ReadInvoiceAsync` is nullable and can return `null`; this
Foundation method has no not-found check. Treat `invoice!` as live debt, not a
pattern to copy. A null-forgiving operator used merely to silence the compiler
at an unvalidated boundary hides a real not-found bug instead of surfacing it
through the classification chain described in `references/backend.md`.

## Primary constructors

Primary constructors are used when the constructor body needs no validation
or field-name translation beyond capturing dependencies:

```csharp
// sites/api.arolariu.ro/src/Common/Azure/BearerTokenHandler.cs
/// <param name="credential">The Azure token credential used to acquire tokens.</param>
/// <param name="scope">The scope to request when acquiring the token.</param>
public sealed class BearerTokenHandler(TokenCredential credential, string scope) : DelegatingHandler
{
  private readonly TokenRequestContext _tokenContext = new([scope]);
  // credential and scope are consumed directly as primary constructor parameters below.
}
```

```csharp
// sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs
/// <param name="proxyClient">The config proxy client used to fetch individual config values.</param>
/// <param name="featureSnapshotCache">The in-memory feature flag snapshot cache (retained for future use).</param>
/// <param name="optionsMonitor">The options monitor for reading the current <see cref="AzureOptions"/> snapshot.</param>
/// <param name="optionsCache">The options cache used to atomically swap refreshed option snapshots.</param>
/// <param name="logger">The logger for recording refresh events and errors.</param>
public sealed class ConfigRefreshHostedService(
    IConfigProxyClient proxyClient,
    FeatureSnapshotCache featureSnapshotCache,
    IOptionsMonitor<AzureOptions> optionsMonitor,
    IOptionsMonitorCache<AzureOptions> optionsCache,
    ILogger<ConfigRefreshHostedService> logger) : BackgroundService
```

Both examples document primary constructor parameters with `<param>` tags on
the class itself, because there is no separate constructor declaration to
carry them.

`InvoiceStorageFoundationService` above is the counter-example: it keeps a
conventional constructor with an explicit body because it needs
`ArgumentNullException.ThrowIfNull` calls before field assignment. Do not
convert a validating constructor to a primary constructor merely for brevity —
primary constructors have no statement body to validate in before the
implicit field capture runs.

## Collection expressions

```csharp
// sites/api.arolariu.ro/src/Common/Azure/BearerTokenHandler.cs
private readonly TokenRequestContext _tokenContext = new([scope]);

// sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs
private static readonly string[] ConfigKeys = [
  "Auth:JWT:Secret",
  "Auth:JWT:Issuer",
  // ...
];

// sites/api.arolariu.ro/src/Invoices/DDD/Entities/Merchants/Merchant.cs
[JsonPropertyOrder(6)]
public ICollection<Guid> ReferencedInvoices { get; init; } = [];
```

Collection expressions replace `new List<T> { ... }` / `new[] { ... }` /
`Array.Empty<T>()` call sites; they do not replace `IEnumerable<T>` yield
methods or LINQ pipelines, which stay as-is when a collection expression would
not improve readability. Match the neighboring member's style before
introducing a collection expression into an existing file that does not yet
use one.

## XML documentation (RFC 2004)

RFC 2004 requires `<summary>`, `<param>`, `<returns>`, and `<exception>` tags
that describe the contract, not the implementation, plus `<remarks>` for
non-obvious design rationale. A `<remarks>` block earns its place when it
explains a decision a reader could not derive from the signature:

```csharp
// sites/api.arolariu.ro/src/Common/Http/RequestCancellation.cs
/// <remarks>
/// <para><b>Two-tier policy.</b> Reads bind <see cref="HttpContext.RequestAborted"/> directly — ASP.NET
/// Core's Minimal API binds a handler's <see cref="CancellationToken"/> parameter to it automatically,
/// so reads need no helper here. Writes deliberately ignore client disconnect — aborting a
/// half-finished mutation leaves the caller unable to tell whether it landed — but still honour
/// application shutdown and an explicit budget so no operation is unbounded. That asymmetry is why
/// only the write tier has a factory.</para>
/// <para><b>Classification.</b> <see cref="HttpContext.RequestAborted"/> is cancelled both by a client
/// abort and by the request-timeout middleware, so it cannot distinguish them. The timeout feature's
/// token is cancelled only by the timeout, which makes it the reliable discriminator.</para>
/// </remarks>
```

### Anti-pattern corrections (RFC 2004 §"Common Anti-Patterns")

| Anti-pattern | Correction |
| --- | --- |
| `<summary>Creates an invoice.</summary>` with a `<param name="invoice">Invoice</param>` that repeats the type name | Describe the contract: what must be populated, what is validated, and add `<exception cref="ArgumentNullException">` |
| `<summary>Handles invoice operations.</summary>` on a class | Name the architectural role: "Foundation service responsible for CRUD operations on invoice aggregates with domain validation." |
| A thrown exception with no `<exception>` tag | Add `<exception cref="TheType">` describing the triggering condition and the parameter involved |
| `<summary>` describing the Cosmos SDK call instead of the domain operation | Keep `<summary>` at the domain level; move SDK/provider detail into `<remarks><para><b>Implementation:</b> ...` |
| A doc comment left describing old behavior after a signature/behavior change (for example "Returns all invoices" after the method became user-scoped) | Update the doc in the same change; the RFC's accuracy note makes source, not the comment, authoritative |

`GenerateDocumentationFile` is `true` for every project (`Directory.Build.props`),
so a missing `<summary>` on a public member is a `CS1591` build failure, not a
style nit — the smallest relevant build (see the C# instruction's Validation
section) catches it immediately.

## Async, cancellation, and `ConfigureAwait(false)`

Every `await` inside a library/service method uses `.ConfigureAwait(false)`,
including inside a lambda passed to a shared `TryCatchAsync` helper:

```csharp
// sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs
public async Task CreateInvoiceObject(Invoice invoice, Guid? userIdentifier, CancellationToken cancellationToken) =>
await TryCatchAsync(async () =>
{
  ArgumentNullException.ThrowIfNull(invoice);
  ValidateInvoiceInformationIsValid(invoice);
  await invoiceNoSqlBroker
    .CreateInvoiceAsync(invoice, cancellationToken)
    .ConfigureAwait(false);
}).ConfigureAwait(false);
```

Cancellation tokens are threaded through every layer to the Broker call, not
generated fresh at each boundary. `RequestCancellation.ForWrite` (above) is
the shared HTTP write-budget factory for operations that must survive client
disconnect, and it still links to
`IHostApplicationLifetime.ApplicationStopping`. Service-owned coordination
may create its own established scope: visibility renewal uses `renewalCts` to
couple queue ownership loss to the in-flight operation.

Caller- or host-originated `OperationCanceledException` is caught before a
general `catch (Exception)` and rethrown unchanged rather than reclassified as
a fault:

```csharp
// sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs
try
{
  return await operation().ConfigureAwait(false);
}
catch (OperationCanceledException)
{
  throw;
}
catch (Exception exception)
{
  throw Classify(exception);
}
```

An established exception exists in
`InvoiceProcessingService.ExecuteWithVisibilityRenewalAsync`: when visibility
renewal fails, the service cancels the in-flight operation, consumes that
induced cancellation, awaits cleanup, and throws the recorded dependency
exception because exclusive queue ownership was lost. Preserve that
coordination rule; do not replace internally induced ownership-loss
cancellation with a raw cancellation rethrow.

Anti-pattern correction: awaiting a Task without `.ConfigureAwait(false)` in a
service/library method is not merely a style choice here — the repository
convention assumes no captured `SyncContext` is required off the ASP.NET Core
request pipeline, and mixing conventions inside one file makes deadlock-prone
code harder to spot in review. Never introduce `.Result` or `.Wait()` to
"simplify" a signature; both defeat cancellation and can deadlock synchronous
callers of asynchronous code.

## Exception classification mechanics

C#-level exception handling in this repository:

1. Rethrows caller/host cancellation unmodified, except where an established
   coordination path intentionally converts internally induced cancellation
   back to the recorded owning failure.
2. Classifies only exceptions the current type can enrich or reclassify
   (never a bare `catch (Exception) { /* swallow */ }`).
3. Preserves the original exception as `InnerException` when wrapping.

```csharp
// sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs
private Exception Classify(Exception exception) => exception switch
{
  InvoiceManagementValidationException
    or InvoiceManagementDependencyException
    or InvoiceManagementDependencyValidationException
    or InvoiceManagementServiceException
    => exception,

  _ when ContainsExceptionMarker<IValidationException>(exception)
    => LogAndWrapValidation(exception),

  // ...

  _ => LogAndWrapService(exception),
};
```

The marker-interface families themselves (`IValidationException`,
`IDependencyException`, and so on) are owned by the
`backend-vertical-slice` exception/telemetry resource; their HTTP mapping is
owned by `references/minimal-apis.md`. This catalog covers only the C#
mechanics of the `switch` classifier and the catch-order rule above.

## Diagnostics and warnings-as-errors

```xml
<!-- sites/api.arolariu.ro/Directory.Build.props -->
<WarningLevel>9999</WarningLevel>
<TreatWarningsAsErrors>True</TreatWarningsAsErrors>
<AnalysisLevel>latest-all</AnalysisLevel>
<!-- S1135: TODO comments. NU1902/NU1903: transitive package vulnerability advisories. -->
<NoWarn>S1135, NU1903, NU1902</NoWarn>
```

The only repository-wide suppressions are the three listed above, each with an
inline justification comment. A live, narrowly scoped exception exists at the
member level:

```csharp
// sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs
// Suppress IDE warning – featureSnapshotCache is retained for future feature-flag refresh support.
#pragma warning disable CA1823 // Avoid unused private fields
private readonly FeatureSnapshotCache _featureSnapshotCache = featureSnapshotCache;
#pragma warning restore CA1823
```

This is accepted pre-existing debt with a documented reason and an immediate
`restore`, not a template. The C# instruction's rule against `NoWarn`,
`#pragma`, or weakened analyzers means: do not add a new suppression to make a
diagnostic disappear. If a new diagnostic looks unavoidable, escalate per the
instruction's escalation rule instead of copying this pattern.

## Anti-pattern corrections summary

| Anti-pattern | Why it fails here | Correction |
| --- | --- | --- |
| `catch (Exception) { }` with no rethrow/classification | Swallows cancellation and unknown failures alike, breaking the layer's classification contract | Catch `OperationCanceledException` first and rethrow; classify only what this layer owns |
| Missing `.ConfigureAwait(false)` on a service-layer `await` | Inconsistent with every sibling in the same file/layer | Add `.ConfigureAwait(false)` to match the TryCatch/Broker pattern above |
| `.Result` / `.Wait()` on a Task | Can deadlock and discards cancellation | Make the caller `async` and `await` the Task |
| A new `#pragma warning disable` or `NoWarn` entry | Hides a real diagnostic instead of fixing it; the build is warnings-as-errors by design | Fix the diagnostic at the source; escalate if it appears unavoidable |
| Null-forgiving operator (`!`) on an unvalidated Broker/DTO result | Hides a genuine not-found/invalid-state bug | Validate or classify the null case explicitly before forgiving it |
| Converting a validating constructor to a primary constructor | Primary constructors have no body to run `ArgumentNullException.ThrowIfNull` before capture | Keep the conventional constructor when validation is required |

## Live source pointers

- `sites/api.arolariu.ro/Directory.Build.props` — nullable/warnings-as-errors/analyzer configuration
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs` — validating constructor, null-forgiving rationale
- `sites/api.arolariu.ro/src/Common/Azure/BearerTokenHandler.cs` — primary constructor with class-level `<param>` docs
- `sites/api.arolariu.ro/src/Common/Configuration/ConfigRefreshHostedService.cs` — primary constructor, collection expression, scoped `#pragma`
- `sites/api.arolariu.ro/src/Invoices/DDD/Entities/Merchants/Merchant.cs` — collection-expression default for a persisted collection
- `sites/api.arolariu.ro/src/Common/Http/RequestCancellation.cs` — rationale-heavy `<remarks>` and cancellation-source ownership
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs` — `TryCatchAsync`/classification mechanics
- `docs/rfc/2004-comprehensive-xml-documentation-standard.md` — full anti-pattern and checklist reference
