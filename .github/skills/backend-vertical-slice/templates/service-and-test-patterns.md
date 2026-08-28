# Stable Service and Test Patterns

Use a template only after a current sibling in the same bounded context and
layer confirms the shape. Replace every placeholder from live source; templates
never override a changed contract.

## Interface and Implementation Pair

### Provenance

- `sites/api.arolariu.ro/src/Invoices/Services/Management/IInvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/AnalysisQueue/IAnalysisQueueFoundationService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/AnalysisQueue/AnalysisQueueFoundationService.cs`

### Invariants

- The interface describes one layer role and uses provider-neutral types.
- The implementation depends only on contracts for the next approved role.
- Public asynchronous contracts accept and forward cancellation.
- The method is wrapped by the service's TryCatch partial, owns an Activity, and
  awaits with `ConfigureAwait(false)`.
- Public APIs carry accurate XML documentation.

### Live-derived values

Derive namespace, class modifiers, layer/service names, direct dependency
contract, result nullability, method name, parameter semantics, Activity source,
exception docs, logger category, and DI lifetime from the target sibling.

### Invalidated when

Do not use when the change is adapter-only, Broker-only, fits an existing
contract without a new pair, or the target sibling does not use an
interface/partial service shape.

```csharp
/// <summary>Defines {{capability}} at the {{layer}} boundary.</summary>
public interface I{{Capability}}Service
{
  /// <summary>Performs {{behavior}}.</summary>
  /// <param name="request">{{live request contract}}.</param>
  /// <param name="cancellationToken">The token used to cancel the operation.</param>
  /// <returns>{{live result contract}}.</returns>
  Task<{{ResultType}}> {{MethodName}}Async(
    {{RequestType}} request,
    CancellationToken cancellationToken);
}

/// <summary>Implements {{capability}} over the approved next-layer contract.</summary>
public partial class {{Capability}}Service : I{{Capability}}Service
{
  /// <inheritdoc/>
  public async Task<{{ResultType}}> {{MethodName}}Async(
    {{RequestType}} request,
    CancellationToken cancellationToken) =>
    await TryCatchAsync(async () =>
    {
      using var activity = {{PackageTracing}}.StartActivity(nameof({{MethodName}}Async));
      return await {{nextLayerDependency}}
        .{{NextLayerMethod}}Async(request, cancellationToken)
        .ConfigureAwait(false);
    }).ConfigureAwait(false);
}
```

## TryCatch Partial

### Provenance

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/AnalysisService/AnalysisOrchestrationService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`

### Invariants

- Cancellation is rethrown unchanged before general classification.
- Only direct-dependency and current-layer failures are classified.
- The original exception remains reachable through the inner chain.
- Logging is coupled to classification, not duplicated by every public method.
- Result and no-result overloads follow the same classification semantics.

### Live-derived values

Derive the exact direct-dependency exception families, current outer exception
types, marker refinements, logger methods, whether the wrapper or its inner
exception is passed onward, and whether a generic or typed delegate overload
matches the sibling.

### Invalidated when

Do not use when the target is a Broker, an adapter with the shared mapper, or a
service whose established classifier intentionally distinguishes dependency
timeouts from caller cancellation with a different catch filter.

```csharp
public partial class {{Capability}}Service
{
  private async Task<TResult> TryCatchAsync<TResult>(Func<Task<TResult>> operation)
  {
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
  }

  private Exception Classify(Exception exception) => exception switch
  {
    // Populate only from the direct dependency's live exception contract.
    {{DirectValidationException}} => {{WrapValidation}}(exception),
    {{DirectDependencyValidationException}} => {{WrapDependencyValidation}}(exception),
    {{DirectDependencyException}} => {{WrapDependency}}(exception),
    {{DirectServiceException}} => {{WrapService}}(exception),
    _ => {{WrapService}}(exception),
  };
}
```

## Validation Partial

### Provenance

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Validations.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/Analysis/AnalysisFoundationService.Validations.cs`

### Invariants

- Validation covers only inputs/invariants owned by the current layer.
- It runs inside the TryCatch scope and before the direct dependency call.
- Validation throws a typed inner or argument exception that the current
  classifier maps deliberately.
- It performs no I/O and does not call another service.

### Live-derived values

Derive the validator helper versus BCL guard style, predicate, exception type,
parameter name, nullability, message policy, and whether validation belongs on
the domain type instead.

### Invalidated when

Do not use when the rule is protocol binding, authorization, cross-capability
sequencing, provider response translation, or already enforced by the aggregate
without a service guard.

```csharp
public partial class {{Capability}}Service
{
  private static void Validate{{Subject}}IsValid({{SubjectType}} subject)
  {
    Validator.ValidateAndThrow<{{SubjectType}}, {{InnerValidationException}}>(
      subject,
      static candidate => {{live invariant predicate}},
      "{{live non-sensitive validation message}}");
  }
}
```

## Activity Placement

### Provenance

- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`
- `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityExtensions.cs`

### Invariants

- The Activity lifetime encloses validation and awaited observable work.
- The display name is derived with `nameof`.
- The bounded-context Activity source and established enrichment helpers are
  used.
- Tags contain only approved identifiers, bounded values, counts, durations, or
  outcomes; payload content is excluded.
- Cancellation is not recorded as a classified service failure.

### Live-derived values

Derive the Activity source, operation kind, parent context, context helper,
operation name, safe tags, and success/error ownership from the live boundary.

### Invalidated when

Do not use this internal-service shape for an Endpoint server Activity, a
durable consumer requiring remote parent context, or work already fully owned by
automatic instrumentation.

```csharp
await TryCatchAsync(async () =>
{
  using var activity = {{PackageTracing}}.StartActivity(nameof({{MethodName}}));
  {{optional live-established safe enrichment}}

  await {{nextLayerDependency}}
    .{{NextLayerMethod}}Async({{arguments}}, cancellationToken)
    .ConfigureAwait(false);
}).ConfigureAwait(false);
```

## MSTest Arrange/Act/Assert and Exact Exceptions

### Provenance

- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Management/InvoiceManagementServiceTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/InvoiceStorageFoundationServiceExceptionsTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`

### Invariants

- The test class and public test methods have XML documentation and MSTest
  attributes.
- Test names follow `Method_Condition_Expected`.
- Arrange/Act/Assert remains visible; direct dependency contracts are the unit
  boundary.
- Exception expectations use `Assert.ThrowsExactly` or
  `Assert.ThrowsExactlyAsync`.
- When classification is the behavior, assert the exact outer type and exact
  inner type.
- Cancellation and passed arguments/tokens are verified when contractually
  relevant.

### Live-derived values

Derive the deterministic builder, direct dependency mock behavior, service
constructor, exact exception pair, expected call count/order, cancellation
token, and whether telemetry or side effects are externally observable.

### Invalidated when

Do not use when the behavior requires the real HTTP mapper, provider
serialization, Activity listener, architecture reflection, or a true external
boundary; choose the matching live test category instead.

```csharp
/// <summary>Verifies the {{service}} contract.</summary>
[TestClass]
public sealed class {{Service}}Tests
{
/// <summary>Verifies {{behavior}}.</summary>
[TestMethod]
public async Task {{Method}}_{{Condition}}_{{Expected}}()
{
  // Arrange
  var dependency = new Mock<I{{DirectDependency}}>(MockBehavior.Strict);
  dependency
    .Setup(candidate => candidate.{{DependencyMethod}}(
      {{expected arguments}},
      It.IsAny<CancellationToken>()))
    .ThrowsAsync(new {{DirectException}}({{deterministic values}}));
  var service = new {{Service}}(dependency.Object, NullLoggerFactory.Instance);

  // Act
  {{OuterException}} exception =
    await Assert.ThrowsExactlyAsync<{{OuterException}}>(
      () => service.{{Method}}({{arguments}}, CancellationToken.None));

  // Assert
  Assert.IsExactInstanceOfType<{{DirectException}}>(exception.InnerException);
  dependency.VerifyAll();
}
}
```
