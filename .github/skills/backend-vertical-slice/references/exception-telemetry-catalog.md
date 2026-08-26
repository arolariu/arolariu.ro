# Exception and Telemetry Catalog

Use this catalog when a service method, exception classifier, cancellation path,
or Activity changes. It describes current invariants and points to their live
owners; it is not a substitute for reading the sibling partials.

## TryCatch Partial-Class Pattern

The current service pattern separates observable work from classification:

1. The public method invokes `TryCatchAsync`.
2. The delegate starts the bounded-context Activity and performs validation and
   the direct next-layer call.
3. `OperationCanceledException` is caught first and rethrown unchanged.
4. The classifier translates only exceptions the current layer owns into that
   layer's outer exception family.
5. Logging occurs with classification; the original exception remains in the
   inner chain.
6. Unknown exceptions become the current layer's service exception rather than
   leaking implementation types.

Live variants:

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/InvoiceService/InvoiceOrchestrationService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`

Do not copy a classifier across layers. Derive its cases from the direct
dependency's actual exception types and the marker semantics that must survive.

## Marker Classification

Common marker contracts live under
`sites/api.arolariu.ro/src/Common/Exceptions/`.

| Marker family | Meaning to preserve | Review question |
| --- | --- | --- |
| `IValidationException` | The current caller supplied invalid input | Is this layer validating something it owns? |
| `IDependencyValidationException` and its not-found, conflict, locked, unauthorized, and forbidden refinements | A dependency rejected, could not find, conflicted with, locked, or denied the requested resource | Does the inner refinement need to survive through wrappers? |
| `IRateLimitedException` | A dependency asked the caller to retry later and supplied an optional retry hint | Does the retry refinement and hint survive the wrapper chain? |
| `IDependencyException` | A direct downstream capability is unavailable or failed | Is this truly a dependency failure rather than invalid provider output? |
| `ITimeoutException` | A server-side operation timed out | Can it be distinguished from caller cancellation? |
| `IServiceException` | An unexpected internal failure occurred | Was every known direct-dependency case handled first? |

The current HTTP outcome is owned by
`sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`.
Inspect that mapper rather than reproducing its status table. It walks the inner
exception chain, chooses the deepest classifiable exception, emits safe details,
and adds only mapper-owned extensions.

## Management Wrapping

Management is the application boundary seen by adapters. Its current classifier:

- preserves already classified Management exceptions;
- searches nested wrappers for common marker interfaces;
- wraps the result in a Management exception while preserving the inner chain;
- leaves cancellation untouched.

Source:
`sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`.

When a lower layer introduces a new refinement, test both the Management
exception type and the endpoint mapper outcome. Do not make endpoints understand
Foundation, Orchestration, or Processing exception classes.

## Endpoint and Global Mapper Boundary

Endpoint handlers:

- catch `OperationCanceledException` before general exceptions;
- classify timeout versus client disconnect with the shared cancellation helper;
- record non-cancellation failures on the current Activity;
- pass all other exceptions to `ExceptionToHttpResultMapper`.

`ExceptionMappingHandler` is the defense-in-depth path for failures thrown before
or around a handler and follows the same mapper contract.

Sources:

- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`
- `sites/api.arolariu.ro/src/Common/Http/RequestCancellation.cs`
- `sites/api.arolariu.ro/src/Common/Http/ExceptionMappingHandler.cs`
- `sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`

## Activity Ownership

| Boundary | Current ownership | Safe implementation check |
| --- | --- | --- |
| Endpoint | Server Activity around protocol work | Use the bounded-context source, route operation context, and safe result tags |
| Management through Foundation | Internal Activity owned by each observable public method | Start inside the TryCatch delegate and name with `nameof` |
| Durable consumer | Consumer Activity parented from validated propagated trace context | Keep correlation across queue publication and consumption |
| Broker | Activity around the provider operation | Add provider semantic context without payload content |

Tracing sources:

- `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityGenerators.cs`
- `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityExtensions.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`
- `sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/AzureStorageQueueBroker.cs`

### Safe Tags and Events

Prefer established helpers and bounded values:

- layer/component and operation category;
- opaque correlation or domain identifiers already approved by a live sibling;
- bounded enum outcomes and failure reasons;
- counts, durations, request charge, attempt state, and success/failure flags;
- parameterized provider statements without values.

Do not add:

- OCR or document text, product or merchant free text, prompts, responses, or
  raw queue payloads;
- scan locations, credentials, tokens, connection material, or provider error
  bodies;
- arbitrary request metadata or unbounded user-controlled strings;
- exception messages as new custom tags without confirming the existing
  redaction boundary.

Privacy-oriented test evidence lives in:

- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Telemetry/AnalysisTelemetryTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Integration/InvoiceEndpointsTelemetryPrivacyTests.cs`

## Cancellation

- Forward the supplied token through every asynchronous boundary that accepts
  it.
- Service TryCatch partials rethrow cancellation without wrapping, logging it as
  a classified failure, or converting it to a service exception.
- Endpoint cancellation owns protocol classification; middleware provides the
  fallback for cancellation outside a handler.
- A dependency-origin timeout may be classified as a dependency failure when
  the caller token itself was not cancelled. Confirm the live Foundation
  pattern before making that distinction.
- Durable ownership loss may cancel coordinated work and then surface the
  classified renewal failure. Test both cancellation of work and the final
  exception.

Cancellation tests:

- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/GenerativeAnalysisRetryPolicyCancellationTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Workers/AnalysisWorkerMidIterationCancellationTests.cs`

## Invalidated When

Re-read and revise this catalog if any of these live contracts change:

- common marker inheritance or the HTTP mapper;
- endpoint cancellation handling or the global exception handler;
- service exception family/partial layout;
- Activity source registration, trace propagation, or telemetry privacy rules;
- a direct dependency changes and therefore changes a layer's classifier cases.
