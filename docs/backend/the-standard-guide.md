# The Standard Implementation Guide

Practical, source-grounded guidance for the Invoices bounded context. RFC 2003
records the exact implemented graph; live source and architecture tests remain
authoritative.

## Implemented flow

```text
Endpoints / AnalysisWorker
  -> InvoiceManagementService
    -> InvoiceProcessingService
      -> InvoiceOrchestrationService
      -> MerchantOrchestrationService
      -> AnalysisOrchestrationService
        -> capability Foundation services
          -> Brokers
```

| Role | Current responsibility |
| --- | --- |
| Endpoint / worker | HTTP or host protocol, caller/access context, DTO/result mapping, cancellation classification |
| Management | Single application facade consumed by every Invoices adapter |
| Processing | Computation, use-case sequencing, persistence order, and durable analysis policy |
| Orchestration | Composition of approved Foundation capabilities |
| Foundation | Capability input validation and classification of direct Broker failures |
| Broker | Provider SDK/protocol calls and provider-neutral record mapping |

Core.Auth does not use this hierarchy. Framework-owned routes are registered
through `MapIdentityApi`; its custom logout handler uses
`SignInManager<IdentityUser>` directly.

## Exact direct-domain graph

| Implementation | Direct domain collaborators |
| --- | --- |
| `InvoiceManagementService` | `IInvoiceProcessingService` |
| `InvoiceProcessingService` | invoice, merchant, and analysis Orchestration contracts |
| `InvoiceOrchestrationService` | invoice storage Foundation |
| `MerchantOrchestrationService` | merchant storage Foundation |
| `AnalysisOrchestrationService` | analysis and analysis-queue Foundations |
| Invoice/merchant storage Foundations | database Broker |
| `AnalysisFoundationService` | document, generative, and taxonomy Brokers |
| `AnalysisQueueFoundationService` | queue Broker |

Root `AGENTS.md` owns the direct-domain collaborator budget. Exceeding it is a
signal to move coordination to the appropriate higher role, not to hide
dependencies inside a service locator, options object, or generic facade.
Logging, telemetry, and framework services are support dependencies and do not
count.

## Layer rules

### Management

- Exposes every request/worker use case through one stable application
  boundary.
- Delegates to the unified Processing service.
- Classifies Processing failures without calling Orchestration, Foundation, or
  Brokers directly.

### Processing

- Owns domain computation and multi-stage sequencing.
- Coordinates only its approved Orchestrations.
- Owns persistence order, partial analysis outcomes, queue replacement order,
  logical attempts, and visibility-renewal coordination.
- Does not call Foundations or Brokers.

### Orchestration

- Composes approved capabilities without Orchestration-to-Orchestration calls.
- Keeps aggregate-specific storage behind the corresponding Foundation.
- Does not choose HTTP results or provider clients.

### Foundation

- Validates capability inputs and domain invariants at the direct-dependency
  boundary.
- Calls only approved Brokers.
- Classifies direct Broker/provider failures into the Foundation exception
  family.
- Never calls another Foundation.

### Brokers

- Wrap external SDKs, protocols, and provider records.
- Select provider clients/containers/partitions and map records into
  provider-neutral contracts.
- Contain no workflow, aggregate coordination, application retry policy, or
  cross-capability business logic.

## Endpoint and worker adapters

Invoices endpoints and `AnalysisWorker` consume only
`IInvoiceManagementService`.

Endpoints own:

- route/query/body binding;
- claims and caller-access decisions already established at the adapter;
- DTO-to-domain and domain-to-response mapping;
- typed HTTP results and safe `ProblemDetails`;
- read versus write cancellation classification;
- endpoint Activity context and privacy.

Some current handlers perform documented multi-call Management coordination.
Preserve that behavior when touched, but place new domain sequencing behind
Management rather than expanding endpoint business logic.

The worker is singleton-hosted but creates a fresh async scope per poll and
resolves Management inside that scope. It must not capture scoped services in
its constructor or retain them across iterations.

## Exceptions and cancellation

Each service uses its existing TryCatch/classifier partial:

1. rethrow caller/host `OperationCanceledException` before general
   classification;
2. preserve the current exact outer type and required retained inner object;
3. classify only direct dependency failures;
4. add bounded telemetry without payload data.

Endpoint handlers catch cancellation before general exceptions. Reads observe
request abort. Writes use the application-owned timeout/shutdown scope so a
client disconnect does not abandon a mutation. Other failures use
`ExceptionToHttpResultMapper`, which selects the deepest classifiable marker
and returns non-leaking RFC 7807 details.

## Durable analysis

Azure Queue Storage owns delivery, not workflow state:

- `CorrelationId` connects logical work;
- `AttemptNumber` is the bounded logical retry count;
- `MessageId` plus the current `PopReceipt` identify the provider delivery;
- visibility renewal represents exclusive ownership;
- renewal failure cancels in-flight work and surfaces a dependency failure;
- partial success is persisted before the current message is deleted;
- deletion occurs before failed-only replacement enqueue;
- the terminal attempt deletes without publishing another replacement.

Do not add a poison queue, database workflow-state store, or alternate retry
order without an approved architecture change.

## Dependency injection

Registrations live once in the owning Invoices module and are grouped by role.
Ordinary Brokers and services are scoped. `JsonTaxonomyBroker` is the current
singleton exception because it loads immutable embedded taxonomy artifacts.

Constructor architecture tests and real service-collection resolution answer
different questions: reflection pins dependency direction, while resolution
proves implementation choice and lifetime.

## Evidence and tests

Use the smallest current evidence for the changed boundary:

- architecture tests for constructor direction and adapter entry points;
- exact exception tests for marker/inner-object behavior;
- controlled cancellation tests with no later dependency calls;
- deterministic operation lists for queue ordering;
- provider-boundary tests for SDK mapping;
- DTO/endpoint tests for serialized fields and HTTP outcomes;
- Activity listeners and privacy tests for trace lineage and safe tags.

Do not replace repository modules or the behavior owner with a fake and claim
that the real boundary was proven.

## Live source pointers

- `sites/api.arolariu.ro/src/Invoices/Services/Management/`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/`
- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/`
- `sites/api.arolariu.ro/src/Invoices/Brokers/`
- `sites/api.arolariu.ro/src/Invoices/Endpoints/`
- `sites/api.arolariu.ro/src/Invoices/Workers/AnalysisWorker.cs`
- `sites/api.arolariu.ro/src/Common/Http/`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/`

See [RFC 2001](../rfc/2001-domain-driven-design-architecture.md) for DDD intent
and [RFC 2003](../rfc/2003-the-standard-implementation.md) for the exact
implemented contracts.
