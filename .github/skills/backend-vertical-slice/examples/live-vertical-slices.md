# Live Backend Vertical Slices

These are dynamic examples. Read the current files rather than copying their
implementations; the excerpts show only the invariant to trace.

## Owner-Aware Invoice Read

**Live source**

- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/InvoiceService/InvoiceOrchestrationService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs`
- `sites/api.arolariu.ro/src/Invoices/Brokers/DatabaseBroker/CosmosDatabaseBroker.Invoices.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/InvoiceEndpointsStatusCodeTests.cs`

**Why representative**

It demonstrates an adapter consuming Management, partition information flowing
through the service path, a Broker choosing scoped versus deliberate
cross-partition access, and the endpoint making protocol-level visibility and
result decisions.

```text
handler -> Management.ReadInvoice -> Processing.ReadInvoice
        -> Invoice Orchestration -> Invoice Storage Foundation -> Database Broker
```

**Inspect guidance**

- Locate `RetrieveSpecificInvoiceAsync` and follow the exact argument and
  cancellation token through every signature.
- Compare missing, forbidden, owner, shared, and public outcomes with endpoint
  tests.
- Inspect the Broker's partition branch; do not infer null-partition semantics
  from a higher layer.
- Choose another sibling when the change is a collection operation, a write, or
  does not share this visibility contract.

## Durable Invoice Analysis

**Live source**

- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`
- `sites/api.arolariu.ro/src/Invoices/Workers/AnalysisWorker.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/AnalysisService/AnalysisOrchestrationService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/AnalysisQueue/AnalysisQueueFoundationService.cs`
- `sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/AzureStorageQueueBroker.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`

**Why representative**

It shows both HTTP and worker adapters using the same Management boundary while
Processing owns durable ordering, visibility ownership, partial persistence,
replacement policy, and consumer trace continuation.

```text
endpoint -> Management -> Processing -> queue Orchestration -> Foundation -> Broker
worker   -> Management -> Processing -> analysis/resource Orchestrations
```

**Inspect guidance**

- Trace queue acceptance separately from worker execution.
- Inspect where target visibility is verified, where trace context is created
  and consumed, and where receipt ownership is renewed.
- Read operation-order tests before changing persistence, deletion, replacement,
  or terminal-failure behavior.
- Choose another sibling for non-durable work or when no replacement/partial
  failure policy exists.

## Best-Effort Analysis Composition

**Live source**

- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/AnalysisService/AnalysisOrchestrationService.Internals.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/Analysis/AnalysisFoundationService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/Analysis/AnalysisFoundationService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Invoices/Brokers/GenerativeAnalysisBroker/AzureFoundryBroker.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Orchestration/AnalysisOrchestrationCurrentArchitectureTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Telemetry/AnalysisTelemetryTests.cs`

**Why representative**

It separates provider calls from Foundation validation/resilience and
Orchestration composition. Independent capabilities may run safely together,
dependent capabilities become explicitly blocked, and only bounded outcome
metadata reaches telemetry.

```text
Orchestration composition -> capability Foundation -> provider-neutral Broker
```

**Inspect guidance**

- Identify which capabilities are independent, dependent, or supplied by
  persisted aggregate state.
- Follow one provider failure through Foundation classification,
  Orchestration best-effort capture, and Processing retry policy.
- Verify cancellation escapes best-effort handling and that payload content is
  absent from telemetry.
- Choose another sibling when the capability must fail atomically or the direct
  dependency is not an external provider.

## Exception-to-HTTP Boundary

**Live source**

- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`
- `sites/api.arolariu.ro/src/Common/Exceptions/`
- `sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`
- `sites/api.arolariu.ro/src/Common/Http/ExceptionMappingHandler.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Core.Tests/Common/Http/ExceptionToHttpResultMapperTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs`

**Why representative**

It demonstrates nested marker preservation, Management wrapping, one shared
ProblemDetails boundary, safe response details, and cancellation as a distinct
protocol path.

```text
typed inner failure -> layer wrappers -> Management wrapper
                    -> shared mapper -> protocol result
```

**Inspect guidance**

- Follow the deepest classifiable inner exception rather than only the outer
  type.
- Compare validation, dependency-validation refinement, dependency, service,
  timeout, and cancellation cases.
- Choose another sibling when the adapter uses a non-HTTP protocol, while still
  preserving Management as its application boundary.
