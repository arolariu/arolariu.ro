# .NET MSTest Guidance

Owner: `.github/skills/code-unit-test/SKILL.md`. This reference is decision
support for focused .NET tests in `sites/api.arolariu.ro`; it is not a second
test workflow and intentionally contains no runner commands or tool versions.
Read the live implementation, its direct consumers, and the nearest sibling
test before applying any pattern below.

## Select the boundary that owns the assertion

| Contract under test | Keep real | Permitted injected seam | Evidence that belongs here |
| --- | --- | --- | --- |
| Aggregate or value-object invariant | Domain type and public operation | None | Exact valid value or exact domain/argument failure |
| Foundation validation/classification | Foundation service and its TryCatch/validation partials | Its direct Broker contract | Broker arguments and token; exact Foundation outer exception and retained Broker exception |
| Orchestration coordination | Orchestration service | Its direct Foundation contracts | Required calls, order/branching, result mutation, and no forbidden sideways call |
| Processing workflow | Processing service | Its direct Orchestration contracts | Multi-stage order, partial results, persistence/queue policy, exact classification |
| Management façade | Management service | `IInvoiceProcessingService` | Delegation through the application boundary and Management classification |
| Broker provider mapping | Real Broker and provider-neutral contract | Provider SDK client/transport only | Wire/provider record mapping, provider call, cancellation, and direct error translation |
| HTTP result or DTO shape | Real DTO mapper, endpoint, or `ExceptionToHttpResultMapper` | Downstream Management contract where needed | Status, `ProblemDetails`, exact serialized fields, safe detail, or cancellation result |
| Constructor graph | Real reflected service types | None | Exact approved direct dependencies and adapter-to-Management direction |
| Registration/lifetime | Real service collection and owning registration extension | Only unavoidable external configuration/provider clients | Resolution, implementation, scope/lifetime, and worker scope behavior |

Do not turn mapper, DI, provider serialization, or queue ownership behavior
into a service unit test by substituting the code that owns it. Conversely,
an injected direct-layer interface is an approved unit seam only when the real
service owns the validation, coordination, or classification being asserted.

## MSTest shape and AAA discipline

- Use the current public `[TestClass]`/`[TestMethod]` shape and name methods
  `Method_Condition_Expected`.
- Keep one visible Arrange, Act, and Assert story. Explicit `// Arrange`,
  `// Act`, and `// Assert` sections are useful when setup is non-trivial, as
  demonstrated by `InvoiceResponseTransportContractTests` and
  `InvoiceEndpointsTelemetryPrivacyTests`.
- Arrange deterministic identifiers, timestamps, provider records, and
  aggregate state. Change only the value that selects the branch under test.
- Act through one supported public boundary. Do not call a private validator,
  classifier, renewal loop, or mapper helper through reflection merely to
  simplify setup.
- Assert the result first, then contractually relevant calls, identity,
  ordering, and forbidden side effects. A mock returning its configured value
  is not a meaningful assertion.
- Use strict direct-dependency mocks for interaction-sensitive behavior.
  Verify exact arguments, exact token, call count, and `VerifyNoOtherCalls`
  when an extra call would violate the contract. Do not add incidental setups
  merely to make `VerifyAll` green.

## Exact failure and exception identity

Use `Assert.ThrowsExactly` or `Assert.ThrowsExactlyAsync` whenever the
exception family is part of The Standard contract. A base-type assertion can
hide a validation/dependency/service misclassification.

Read the exact method's live `*.Exceptions.cs` before choosing inner-depth
assertions. Current classifiers deliberately differ:

| Current path | Expected identity behavior |
| --- | --- |
| Invoice Storage Foundation | The Foundation outer directly retains the injected Broker exception as `InnerException`. |
| Processing `Classify` for ordinary Orchestration calls | The Processing outer generally retains the Orchestration exception's inner cause, not the injected Orchestration outer. |
| Processing `ClassifyAnalysis` | Analysis paths can retain the injected Orchestration outer, with its cause one level deeper. |
| Management `Classify` | Marker scanning chooses the Management category but the Management outer retains the injected Processing exception. |
| Shared HTTP mapper | It walks the whole chain and maps the deepest classifiable exception; it does not preserve only the outer layer's category. |

Keep separate variables such as `injectedDependencyException` and
`expectedRetainedCause`, then use `Assert.AreSame` for every identity the live
classifier promises. `Assert.IsExactInstanceOfType` proves type but not object
identity; use it only when identity is not contractual. Also assert that an
unwrapped wrapper is *not* the retained inner object when that distinction is
the regression risk.

Cancellation is a separate branch. Current TryCatch partials catch
`OperationCanceledException` before `Exception` and rethrow it unchanged.
Assert the exact live subtype when relevant: the retry-delay test currently
observes `TaskCanceledException`, while service boundaries generally promise
uncategorized cancellation rather than a domain failure.

## Async and cancellation assertions

- Test methods are asynchronous all the way through. Never use `.Result`,
  `.Wait()`, or another sync-over-async shortcut.
- Await service/library tasks with `.ConfigureAwait(false)`. Do not copy the
  few protocol-focused siblings that use another continuation choice when
  writing a service test.
- Use a distinct caller-owned `CancellationTokenSource` when forwarding is
  part of the contract. Match that exact token in setup and verification; an
  `It.IsAny<CancellationToken>()` setup cannot prove propagation.
- For pre-cancellation or mid-operation cancellation, assert no later retry,
  persistence, delete, enqueue, or dependency call occurs.
- Coordinate races with `TaskCompletionSource` configured for asynchronous
  continuations, controlled tokens, or provider callbacks. Do not use sleeps
  to guess that a renewal or cancellation branch has run.
- Visibility-renewal tests have a special ownership rule:
  caller/host cancellation propagates, but renewal failure cancels the
  in-flight operation and surfaces the recorded dependency failure because
  exclusive queue ownership was lost.

## Fixtures and builders

Prefer a live builder when it encodes domain invariants without obscuring the
condition:

- `ClassificationTestData` deterministically maintains
  `StandardClassification` hierarchy/code invariants.
- `InvoiceScanTestData` and `ReceiptDocumentTestData` provide focused scan and
  provider-record fixtures.
- Fixed inline aggregates are appropriate when exact ownership, ordering,
  serialization, dates, or exception evidence is the subject.

`InvoiceBuilder.CreateRandomInvoice` uses randomness and current time. It is a
live inventory helper, not a suitable default for regression,
classification, partition, ordering, or transport tests. If it is used for an
unrelated broad-shape case, explicitly override every behavior-relevant
field.

## Architecture and DI coverage

Constructor reflection and container resolution answer different questions:

- `InvoiceStandardLayeringArchitectureTests` pins the complete approved
  Management-to-Foundation constructor graph.
- `InvoiceUnifiedLayeringArchitectureTests` additionally pins
  endpoint/worker entry points, public service contracts, direct capability
  return types, and absence of obsolete contracts.
- A reflection test cannot prove that
  `WebApplicationBuilderExtensions.AddInvoicesDomainConfiguration` registers
  the implementation once, with the intended lifetime, or that a hosted
  worker can resolve a scoped Management service. Use a real service
  collection/resolution test when registration or scope is the behavior.
- A DI test cannot replace the architecture tests: duplicate or bypassing
  registrations may still resolve while violating the approved graph.

When a constructor, service contract, endpoint/worker dependency, registration,
or lifetime changes, select both forms only if both contracts are actually
affected. Do not update an architecture expectation merely to bless an
unapproved dependency.

## Live source pointers

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Exceptions.cs`
  — direct Broker classification and cancellation-first TryCatch.
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.Exceptions.cs`
  — distinct ordinary and analysis classifier behavior.
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`
  — marker-chain scanning and retained Processing wrapper.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`
  — strict direct-layer coordination, ordering, exception identity, and
  visibility-renewal cases.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/GenerativeAnalysisRetryPolicyCancellationTests.cs`
  — cancellation during retry delay and no later attempt.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/AzureStorageBrokerTests.cs`
  — provider SDK seam, payload/receipt mapping, and renewed pop receipt.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DTOs/InvoiceResponseTransportContractTests.cs`
  — deterministic AAA and exact serialized transport shape.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs`
  — client disconnect, server timeout, and write-scope protocol distinctions.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs`
  and `InvoiceUnifiedLayeringArchitectureTests.cs` — architecture contracts.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Builders/ClassificationTestData.cs`
  and `Builders/InvoiceBuilder.cs` — deterministic invariant builder versus
  random-data caveat.

The governing intent is in RFC 2001's testing strategy, RFC 2002's
observability/testing sections, and RFC 2003's testing and exception-mapping
sections. Live source remains authoritative when an RFC example has drifted.
