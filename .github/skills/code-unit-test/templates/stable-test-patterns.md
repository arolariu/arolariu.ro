# Stable Test Patterns

Use a template only after a current sibling confirms the same behavior
category. Replace every placeholder from live source; templates never override
the current test harness or contract.

## Vitest Pure-Behavior Pattern

### Provenance

- `sites/arolariu.ro/src/app/domains/invoices/_utils/labelUtilities.test.ts`
- `sites/arolariu.ro/src/types/invoices/transport.test.ts`
- `sites/arolariu.ro/tests/helpers/builders/domain.ts`

### Invariants

- The real repository function and helpers execute.
- Fixtures are typed, deterministic, and vary only the condition under test.
- Arrange/Act/Assert exposes one public behavior.
- Invalid input asserts an exact typed failure or public fallback.
- No repository module is mocked.

### Live-derived values

Derive import paths, public function, input type, valid baseline fixture,
failure type/message or fallback, and parameterized edge cases from current
source and a colocated test.

### Invalidated when

Do not use when behavior requires rendering, hooks, storage, network,
framework runtime, provider serialization, or a multi-module contract.

```typescript
import {describe, expect, it} from "vitest";
import {publicFunction} from "./module";

describe("publicFunction", () => {
  it("condition produces the observable result", () => {
    // Arrange
    const input: Input = deterministicFixture;

    // Act
    const result = publicFunction(input);

    // Assert
    expect(result).toEqual(expectedResult);
  });

  it("invalid condition produces the exact typed failure", () => {
    expect(() => publicFunction(invalidInput)).toThrow(ExpectedError);
  });
});
```

## Testing Library Interaction Pattern

### Provenance

- `sites/arolariu.ro/src/app/domains/invoices/_components/analysis/InvoiceAnalysisControls.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx`
- `sites/arolariu.ro/vitest.setup.ts`

### Invariants

- Render the real component with the smallest typed props/provider wrapper.
- Query by role and accessible name.
- Perform the public interaction with `userEvent`.
- Assert the user-visible result and exact public callback contract.
- Cleanup or negative side effects are asserted when part of the behavior.
- Repository modules and shared components are not replaced.

### Live-derived values

Derive the configured provider wrapper, translated accessible name, input
fixture, callback/result type, loading/error state, and whether an external
browser/framework seam is already supplied by the test harness.

### Invalidated when

Do not use for a Server Component, middleware/navigation flow, behavior that
requires a real browser, or a component whose only usable seam would replace
repository modules.

```tsx
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import ComponentUnderTest from "./ComponentUnderTest";

describe("ComponentUnderTest", () => {
  it("interaction produces the user-visible result", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ComponentUnderTest
        value={deterministicFixture}
        onChange={onChange}
      />,
    );

    // Act
    await user.click(screen.getByRole(controlRole, {name: accessibleName}));

    // Assert
    expect(screen.getByRole(resultRole, {name: resultName})).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledExactlyOnceWith(expectedPublicValue);
  });
});
```

## MSTest Service Pattern

### Provenance

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/InvoiceStorageFoundationServiceExceptionsTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Management/InvoiceManagementServiceTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`

The live classifiers do not retain the same exception object at every path.
Derive the assertion variant below from the exact service method. Existing
siblings that use `CancellationToken.None` or `It.IsAny<CancellationToken>()`
confirm classification only; they are not token-forwarding templates.

### Invariants

- `[TestClass]` and `[TestMethod]` mark current MSTest tests.
- Names use `Method_Condition_Expected`.
- The real service executes against only its direct injected seam.
- Use a distinct caller-owned `CancellationToken`, match it exactly in setup
  and verification, and pass that same token to the real service.
- Name the exception thrown by the dependency separately from the cause the
  current classifier is contractually expected to retain or unwrap.
- Strict dependency behavior proves arguments, exact token, calls, and
  classification; a substitute cannot prove behavior owned by the dependency.
- Typed failures use `Assert.ThrowsExactly` or
  `Assert.ThrowsExactlyAsync`; assert reference identity for every retained
  exception object when classification is the behavior.
- Fixtures are deterministic.

### Live-derived values

Derive namespace, service constructor, direct-layer contract, method signature,
deterministic fixture, exact dependency and outer exception types, classifier
path, expected retained cause, expected calls/order, and XML documentation from
the closest current layer sibling and its live `*.Exceptions.cs`.

### Classifier variants

Select exactly one current shape; invalidate the template if the target method
uses a different classifier.

| Path | Inject into the direct dependency | Required identity proof |
| --- | --- | --- |
| Foundation `Classify` | A Broker exception such as `InvoiceFailedStorageException` | The outer `InnerException` is the same injected Broker exception. |
| Processing `Classify` used by CRUD/visibility paths | An Orchestration outer containing a raw cause | The Processing outer `InnerException` is the same raw cause; it is not the injected Orchestration outer. |
| Processing `ClassifyAnalysis` | An Analysis Orchestration outer containing a raw cause | The Processing outer `InnerException` is the same injected Orchestration outer, whose `InnerException` is the same raw cause. |
| Management `Classify` | A Processing outer whose chain contains the marker/cause | The Management outer `InnerException` is the same injected Processing outer; the retained cause remains at the corresponding nested depth. |

Foundation direct-wrap:

```csharp
var injectedDependencyException = new InvoiceFailedStorageException("storage unavailable");
Exception expectedRetainedCause = injectedDependencyException;

Assert.AreSame(expectedRetainedCause, exception.InnerException);
```

Processing non-analysis `Classify` unwrapping:

```csharp
var expectedRetainedCause = new TimeoutException("dependency timed out");
var injectedDependencyException =
  new InvoiceOrchestrationDependencyException(expectedRetainedCause);

Assert.AreSame(expectedRetainedCause, exception.InnerException);
Assert.AreNotSame(injectedDependencyException, exception.InnerException);
```

Processing `ClassifyAnalysis` retain-the-direct-outer:

```csharp
var expectedRetainedCause = new TimeoutException("dependency timed out");
var injectedDependencyException =
  new AnalysisOrchestrationDependencyException(expectedRetainedCause);

Assert.AreSame(injectedDependencyException, exception.InnerException);
Assert.AreSame(expectedRetainedCause, exception.InnerException.InnerException);
```

Management marker scan retaining the Processing outer:

```csharp
var expectedRetainedCause =
  new MerchantForbiddenAccessException(merchantId, userIdentifier);
var injectedDependencyException =
  new InvoiceProcessingServiceException(expectedRetainedCause);

Assert.AreSame(injectedDependencyException, exception.InnerException);
Assert.AreSame(expectedRetainedCause, exception.InnerException.InnerException);
```

### Invalidated when

Do not use when the behavior belongs to a real HTTP mapper, DI container,
architecture reflection, persistence/provider contract, Activity listener, or
when substituting the dependency would remove the behavior under test. Also
invalidate it when the method uses another classifier, rethrows an existing
same-layer exception, or the exception chain has no retained cause at the
depth shown. Cancellation propagation requires its own test because all three
live TryCatch layers rethrow `OperationCanceledException` before classification.

```csharp
/// <summary>Verifies <c>{{Method}}</c> behavior.</summary>
[TestClass]
public sealed class {{Service}}Tests
{
  /// <summary>Verifies {{condition}} produces {{expected behavior}}.</summary>
  [TestMethod]
  public async Task {{Method}}_{{Condition}}_{{Expected}}()
  {
    // Arrange
    using var callerCancellation = new CancellationTokenSource();
    CancellationToken callerToken = callerCancellation.Token;
    var expectedRetainedCause =
      new {{RetainedCauseException}}({{deterministic values}});
    var injectedDependencyException =
      new {{DirectLayerException}}(expectedRetainedCause);
    var dependency = new Mock<I{{DirectDependency}}>(MockBehavior.Strict);
    dependency
      .Setup(candidate => candidate.{{DependencyMethod}}(
        {{expected arguments}},
        It.Is<CancellationToken>(token => token == callerToken)))
      .ThrowsAsync(injectedDependencyException);
    var service = new {{Service}}(dependency.Object, NullLoggerFactory.Instance);

    // Act
    {{OuterException}} exception =
      await Assert.ThrowsExactlyAsync<{{OuterException}}>(
        () => service.{{Method}}({{arguments}}, callerToken));

    // Assert
    Assert.AreSame({{expected immediate inner object}}, exception.InnerException);
    {{assert retained nested cause identity when required}}
    dependency.Verify(candidate => candidate.{{DependencyMethod}}(
      {{expected arguments}},
      It.Is<CancellationToken>(token => token == callerToken)),
      Times.Once);
    dependency.VerifyNoOtherCalls();
  }
}
```
