# Backend Layer Decision Table

Use this reference only when the skill reaches the owning-layer decision. Live
source is authoritative when a row and an established sibling differ.

## Ownership Signals

| Signal in the requested behavior | Owning layer | Owns | Does not own |
| --- | --- | --- | --- |
| HTTP, request, response, claim, route, timeout, or worker-host mapping | Endpoint or worker adapter | Protocol validation, authorization context, DTO mapping, cancellation classification, and response construction | Domain workflow or direct lower-service access |
| Application use case exposed to adapters | Management | One stable application-facing façade and classification of direct Processing failures | Broker access or bypassing Processing |
| Heavy computation, aggregate sequencing, batch policy, durable work, or a multi-stage domain workflow | Processing | Domain computation, workflow ordering, partial-persistence policy, and coordination of approved Orchestrations | Foundation or Broker calls |
| Composition of approved Foundation capabilities | Orchestration | Cross-capability sequencing over Foundation contracts | Calling another Orchestration or a Broker |
| CRUD, capability validation, or resilience policy adjacent to an external dependency | Foundation | Capability-specific validation and classification of direct Broker failures | Calling another Foundation or coordinating an application use case |
| Primitive SDK, storage, queue, file, or provider operation | Broker | Provider calls, provider response mapping, partition selection, and direct provider-error translation | Business validation, workflow branching, retry orchestration, or authorization |

## Allowed Direction

```text
Endpoint or worker
  -> Management
    -> Processing
      -> Orchestration
        -> Foundation
          -> Broker
```

- Each service consumes contracts for the next approved role.
- An adapter always resolves Management, including background workers.
- A layer may be unchanged when an existing contract already supplies the
  behavior; the call path does not require one new type per layer.
- Count direct **domain** collaborators when applying the two-or-three
  dependency budget. A logger or framework service does not justify a fourth
  domain collaborator or hidden sideways coordination.

## Prohibited Bypasses and Sideways Calls

| Prohibited dependency | Why it is a boundary violation |
| --- | --- |
| Endpoint/worker -> Processing, Orchestration, Foundation, or Broker | Bypasses the application façade and its classification contract |
| Management -> Orchestration, Foundation, or Broker | Moves use-case sequencing around Processing |
| Processing -> Foundation or Broker | Skips capability composition and direct-dependency classification |
| Orchestration -> Orchestration or Broker | Creates sideways workflow coupling or skips Foundation |
| Foundation -> Foundation or service above it | Creates sideways capability coupling or a dependency cycle |
| Broker -> any service | Pulls business policy into an external-system adapter |

## Extend Before Creating

| Existing capability | Minimal extension | Avoid |
| --- | --- | --- |
| Management already exposes the required domain result | Add or change only adapter/DTO mapping and adapter tests | Duplicating the use case in a new service path |
| Processing already owns the workflow and only its façade is missing | Extend Management and its direct Processing contract | New Orchestration, Foundation, and Broker types |
| Existing Processing can sequence the required Orchestrations | Extend that Processing service and focused tests | A second Processing service without a distinct responsibility |
| Existing Orchestration already composes the required Foundations | Add the orchestration operation and expose it upward as needed | Orchestration-to-Orchestration calls |
| Existing Foundation owns the Broker capability | Add validation/classification beside that Broker call | A second Foundation for the same direct capability |
| Existing Broker wraps the target provider/system | Add the primitive operation to that contract and its owning Foundation | A new Broker or provider-specific type above the Broker |
| Change is only documentation, telemetry tags, or exception coverage for existing behavior | Modify the established artifact and test boundary | Empty interfaces, partials, or registrations |

## Representative Live Sources

| Role | Live source |
| --- | --- |
| Endpoint adapter | `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs` |
| Worker adapter | `sites/api.arolariu.ro/src/Invoices/Workers/AnalysisWorker.cs` |
| Management | `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs` |
| Processing | `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs` |
| Orchestration | `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/AnalysisService/AnalysisOrchestrationService.cs` |
| Foundation | `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs` |
| Broker | `sites/api.arolariu.ro/src/Invoices/Brokers/DatabaseBroker/CosmosDatabaseBroker.Invoices.cs` |
| Dependency-graph test | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs` |

Re-read these sources when constructors, service contracts, adapter injection, or
the accepted RFC dependency graph changes. Do not preserve this table over a
newer live pattern without surfacing the drift.
