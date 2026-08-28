# .NET Bug Diagnosis

Owner: `.github/skills/code-fix-bug/SKILL.md`. Use this catalog after a
concrete .NET symptom has been reproduced. It narrows the owning boundary and
the evidence needed for a correction; it does not repeat the bug-fix workflow
or prescribe copied commands and versions.

## Diagnose the first violated .NET boundary

| Symptom | Inspect first | Decisive evidence | Common wrong turn |
| --- | --- | --- | --- |
| Wrong outer exception or HTTP status | The invoked service's `*.Exceptions.cs`, direct dependency exception, then `ExceptionToHttpResultMapper` | Exact injected failure, complete inner chain, and resulting marker/status | Patching only the endpoint or broadening the assertion |
| Cancellation becomes a domain/HTTP fault | Catch ordering at the earliest TryCatch boundary, retry loop, request cancellation owner | Controlled token produces unchanged cancellation and no later call | Treating `OperationCanceledException` as an ordinary dependency failure |
| Service cannot resolve | Concrete constructor, owning DI module, lifetime, and worker scope | Reflection graph plus real container resolution at the affected scope | Adding a duplicate fallback registration |
| Endpoint succeeds but emits the wrong body | Request DTO mapper, Management call, response DTO projection, serializer contract | Fixed raw/request aggregate maps to the exact public JSON fields | Returning domain types directly or changing frontend expectations |
| Correct service exception maps to the wrong protocol result | Full marker chain and shared mapper's deepest-classifiable rule | Exact `ProblemDetails` status/type/safe detail from the real mapper | Hand-writing a second endpoint status switch |
| Provider-shaped failure leaks above Broker | Broker SDK call and provider-to-domain mapping, then Foundation classifier | Provider SDK fixture/failure reaches a provider-neutral result or typed Broker failure | Mocking the Broker and claiming provider behavior is fixed |
| Queue item duplicates, disappears, or is processed concurrently | Receipt `MessageId`/`PopReceipt`, renewal timing, delete/enqueue order, logical attempt | Deterministic operation order and receipt transition | Sleeping, using dequeue count as logical retry state, or creating the queue in application code |
| Request or worker hangs under load | First `.Result`/`.Wait()`, unawaited task, token owner, and cleanup/renewal task | Fully asynchronous call chain completes or cancels with every task awaited | Increasing timeouts or wrapping sync-over-async in another task |
| Test passes but runtime still fails | Registration/lifetime, serializer/provider transport, middleware, or hosted scope | Same behavior through the real boundary that fails at runtime | Expanding unit mocks around the missing runtime contract |

## TryCatch classification chains

Trace classification one layer at a time. Do not infer category from the
outermost name alone.

1. Identify the exact public method and whether it uses the ordinary
   `TryCatchAsync`/`Classify` path or the analysis-specific path.
2. Record the exception object thrown by the direct dependency.
3. Follow every wrapper and marker through Foundation, Orchestration,
   Processing, and Management only as far as the public symptom requires.
4. Compare both exact types and reference identity. Processing ordinary paths
   may unwrap the direct Orchestration outer; analysis paths can retain it;
   Management scans markers through the chain but retains the Processing
   outer.
5. If HTTP is affected, pass the real chain to
   `ExceptionToHttpResultMapper`. The mapper selects the deepest
   classifiable exception and uses safe detail rules for server/auth failures.

Current TryCatch partials rethrow `OperationCanceledException` before the
general catch. A missing or reordered cancellation catch explains both wrong
classification and retries that continue after cancellation. The one
intentional exception is ownership-loss coordination:
`ExecuteWithVisibilityRenewalAsync` consumes cancellation induced by a failed
renewal, awaits renewal cleanup, and throws the recorded dependency exception.
That is not caller cancellation and must not be “fixed” into a raw
`OperationCanceledException`.

For a hang, inspect the first `.Result`, `.Wait()`, forgotten await, or cleanup
task that outlives its token owner. The correction must remain async end to end,
await service/library work with `.ConfigureAwait(false)`, and preserve the
existing cancellation token; moving sync-over-async behind `Task.Run` only
hides the blocked boundary.

Useful live boundaries:

- `InvoiceStorageFoundationService.Exceptions.cs`
- `AnalysisQueueFoundationService.Exceptions.cs`
- `InvoiceProcessingService.Exceptions.cs`
- `InvoiceManagementService.Exceptions.cs`
- `Common/Http/ExceptionToHttpResultMapper.cs`
- `ExceptionToHttpResultMapperTests.cs`

## Constructor graph and DI diagnosis

Use constructor evidence before changing registrations:

- Invoices adapters resolve only `IInvoiceManagementService`.
- Management has one direct domain dependency.
- Processing has the approved three Orchestration dependencies.
- Orchestrations call only their approved Foundations.
- Foundations call only their approved Brokers.
- Framework/support dependencies such as `ILoggerFactory` do not count toward
  the root-owned direct domain dependency budget.

`InvoiceStandardLayeringArchitectureTests` reflects the full graph;
`InvoiceUnifiedLayeringArchitectureTests` also checks adapter entry points and
public contract presence/absence. If those pass while startup resolution
fails, the likely defect is registration, lifetime, factory construction, or
configuration in
`Invoices/Modules/WebApplicationBuilderExtensions.cs`, not constructor shape.

For worker-only failures, inspect `AnalysisWorker`: it is singleton-hosted but
creates a fresh async scope per poll and resolves Management inside that
scope. Capturing a scoped service in the worker constructor or retaining it
between iterations is a lifetime defect even if direct service unit tests
pass.

Do not resolve a missing registration by making an endpoint/worker inject
Processing, Foundation, or a Broker. That turns a composition defect into a
layer violation.

## Transport, DTO, and HTTP mapping

Separate four contracts that can produce the same “wrong response” symptom:

| Boundary | Live owner | Evidence |
| --- | --- | --- |
| Request body to domain | Request DTO methods such as `CreateInvoiceRequestDto.ToInvoice` | Exact accepted fields, generated/domain identifiers, metadata normalization, and invalid input |
| Endpoint to application | `InvoiceEndpoints.Handlers.cs` | Correct ownership identifier, request token/write scope, and Management method/arguments |
| Domain to response body | `*ResponseDto.From*` projections | Exact public fields, nullability, enum strings, and excluded internal fields |
| Exception to HTTP | `ExceptionToHttpResultMapper` plus endpoint cancellation branch | Status/type/detail/trace extension and timeout-versus-client-disconnect result |

`InvoiceResponseTransportContractTests` is the live source for exact serialized
key sets and forbidden internal/legacy fields. `EndpointCancellationTests`
proves that client disconnect, request timeout, and server-owned write
cancellation are not interchangeable. A DTO unit test cannot prove endpoint
token selection, and an endpoint mock cannot prove provider serialization.

If correcting request/response shape would change a website-consumed public
contract, stop for approval rather than treating the mismatch as an internal
mapper bug.

## Provider and Broker boundaries

Brokers own SDK/protocol calls, provider records, provider-neutral mapping, and
only the error translation promised by their live contract. If that contract
explicitly exposes a raw provider exception, the direct Foundation classifies
it and the provider failure must not escape above Foundation. Diagnose at the
lowest boundary that still reproduces the issue:

- Use an SDK client/transport substitute with the real Broker for Azure record,
  serialization, receipt, or provider-exception defects.
- Use a strict Broker contract substitute with the real Foundation only for
  Foundation-owned validation or classification.
- Preserve the provider-neutral DTO/domain contract above the Broker.
- Verify the exact cancellation token reaches the SDK call.
- Do not add orchestration, retry policy, or domain decisions to a Broker as a
  “local” fix.

`AzureStorageBrokerTests` demonstrates real queue-Broker mapping from
`QueueMessage`/`UpdateReceipt`; `DocumentMappingTests` and
`DocumentIntelligenceRecordContractTests` cover document-provider mapping;
`InvoiceNoSqlBrokerExceptionTranslationTests` and
`MerchantNoSqlBrokerExceptionTranslationTests` cover persistence translation.

## Queue, visibility, and ordering races

The durable analysis contract has several non-equivalent identifiers and
orders:

- `CorrelationId` links logical work; it is not the Azure message ID.
- `AttemptNumber` is the logical bounded retry count; a replacement message
  resets provider dequeue count.
- `MessageId` and the *current* `PopReceipt` identify the provider delivery.
  Renewal must replace the receipt's pop receipt before later deletion.
- Visibility renewal represents exclusive ownership. Renewal failure cancels
  in-flight work and surfaces as dependency failure.
- The current accepted replacement order is: persist partial success, delete
  the current message, then enqueue the failed-only replacement.
- A replacement enqueue failure after deletion is an accepted retry-loss
  window and must surface; silently enqueueing first changes duplicate/loss
  semantics.
- Attempt three deletes without publishing another replacement. Malformed
  payload policy is based on provider deliveries and preserves receipt
  metadata without logging payload content.

Make races deterministic with controlled tasks/tokens and an explicit
operation list. The live tests
`ProcessAnalysisAsync_Success_PersistsBeforeDelete`,
`ProcessAnalysisAsync_ReplacementEnqueueFails_DeletesBeforeSurfacingFailure`,
`ExecuteWithVisibilityRenewalAsync_LongOperation_RenewsVisibility`, and
`ExecuteWithVisibilityRenewalAsync_RenewalFailure_ThrowsDependencyException`
show the relevant boundaries. Do not add delays or retries to hide ordering.

## Fail-without / pass-with for .NET

The regression proof must execute the real owner:

- **Classification:** same direct failure; exact wrong outer/inner chain
  without the correction, exact intended chain with it.
- **Cancellation:** same controlled token; unwanted wrapping/later call
  without, unchanged cancellation and no later call with.
- **DI:** same service collection/scope; resolution or lifetime assertion
  fails without, succeeds with.
- **Transport:** same fixed request/raw provider record; exact field/status
  assertion fails without, succeeds with.
- **Queue race:** same controlled task ordering; stale pop receipt, wrong
  operation order, or duplicate/lost side effect appears without and is absent
  with.

Do not count setup/build failure as fail-without evidence. Do not change the
input, broaden exception assertions, loosen mocks, add retries, or alter
timing between the two runs. If safely removing the owned fix would overwrite
pre-existing work, retain the recorded pre-fix run rather than resetting the
tree.

## Telemetry as diagnostic evidence

Use existing Activities and source-generated logs to correlate the failing
path, but do not invent a parallel tracing mechanism. Queue diagnostics may
use bounded identifiers, target enums, attempts, counts, and durations.
Never add payload text, OCR content, names, prompts, scan URLs, provider
responses, credentials, or exception details that can contain them.

`InvoiceEndpointsTelemetryPrivacyTests` and the activity assertions in
`InvoiceProcessingServiceCurrentArchitectureTests` are the live privacy and
trace-continuity references. RFC 2002 defines the observability intent; RFC
2003 defines queue ordering, classification, and HTTP mapping. Live source is
authoritative where older RFC snippets still show superseded endpoint/service
shapes.

## Live source pointers

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Exceptions.cs`
  and
  `Services/Foundation/AnalysisQueue/AnalysisQueueFoundationService.Exceptions.cs`
  — Foundation classifiers and cancellation-first catch ordering.
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`
  and `.Exceptions.cs` — queue sequencing, visibility ownership, and the two
  Processing classifier paths.
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`
  — nested-marker scan at the application boundary.
- `sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs` and
  `src/Common/Http/RequestCancellation.cs` — deepest-marker HTTP mapping and
  cancellation ownership.
- `sites/api.arolariu.ro/src/Invoices/DTOs/Requests/CreateInvoiceRequestDto.cs`,
  `src/Invoices/DTOs/Responses/InvoiceResponseDto.cs`, and
  `src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs` — request, response,
  and endpoint mapping boundaries.
- `sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs`
  and `src/Invoices/Workers/AnalysisWorker.cs` — DI registration and hosted
  scope graph.
- `sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/AzureStorageQueueBroker.cs`
  — provider message/receipt translation.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`
  — deterministic queue order, renewal failure, and exact classification.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/AzureStorageBrokerTests.cs`
  — SDK seam and latest-pop-receipt behavior.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DTOs/InvoiceResponseTransportContractTests.cs`
  and `tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs`
  — transport and protocol regressions.
