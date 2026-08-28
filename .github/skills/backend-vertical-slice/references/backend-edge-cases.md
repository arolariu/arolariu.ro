# Backend Edge Cases

Load this catalog only when one of these conditions is present. Resolve the
questions from the current contract and tests before implementation.

## Ownership and Partition Scope

| Question | Boundary to inspect | Current evidence |
| --- | --- | --- |
| Who derives the authenticated identity and protocol authorization result? | Endpoint/worker adapter | `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs` |
| Is visibility a single-aggregate check or a cross-aggregate use case? | Existing Processing workflow | `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs` |
| Is the partition known, or is a cross-partition lookup deliberate? | Preserve the discriminator through services; Broker selects the provider operation | `sites/api.arolariu.ro/src/Invoices/Brokers/DatabaseBroker/CosmosDatabaseBroker.Invoices.cs` |
| Can a nullable partition value change cost, visibility, or ambiguity? | Public service contract and Broker branch | `sites/api.arolariu.ro/src/Invoices/Services/Processing/IInvoiceProcessingService.cs` |

- Never drop, synthesize, or replace an ownership/partition discriminator in an
  intermediate pass-through layer.
- Treat a null partition according to the live contract, not as a default
  convenience.
- Test owner, permitted non-owner, forbidden caller, known partition, deliberate
  cross-partition, and empty-result behavior when they are relevant.
- Escalate if the change alters a partition key, authorization rule, or data
  exposure boundary.

## Null, Missing, and Collection Results

There is no universal replacement for reading the sibling contract:

- A Broker may return null for a missing read or translate a provider not-found
  response into a typed inner exception.
- A service may preserve null for an adapter decision or wrap a typed not-found
  marker.
- Collection endpoints commonly distinguish an empty collection from a missing
  single resource.
- Null-forgiving syntax in an existing layer is not proof that null is
  impossible; inspect the direct dependency and endpoint tests.

Evidence:

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.cs`
- `sites/api.arolariu.ro/src/Common/Http/ExceptionToHttpResultMapper.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/InvoiceEndpointsStatusCodeTests.cs`

Define one outcome per path and test it exactly. Do not silently change a
nullable result into a thrown exception or vice versa.

## Batch Work

Before adding a loop or bulk call, decide:

- whether the operation is atomic, best-effort, or stop-on-first-failure;
- which layer owns enumeration and sequencing;
- whether cancellation is checked between provider calls;
- what is already persisted when a later item fails;
- whether duplicates and ordering matter;
- which counts are safe and useful telemetry.

Processing-level sequencing is represented by
`sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`;
provider-level paging and partition operations are represented by
`sites/api.arolariu.ro/src/Invoices/Brokers/DatabaseBroker/CosmosDatabaseBroker.Invoices.cs`.
Do not move domain partial-failure policy into a Broker merely because the
provider offers a batch API.

## Durable Queue Work

For queued behavior, define and test:

- provider-neutral serialization and malformed payload handling;
- receipt ownership and visibility renewal;
- cancellation when ownership can no longer be assumed;
- persistence, current-message deletion, and replacement-publication ordering;
- trace-context and correlation preservation;
- terminal failure/discard behavior from live policy;
- worker behavior when no item is visible or one iteration fails.

Live sources:

- `sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/QueueAnalysisMessage.cs`
- `sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/AzureStorageQueueBroker.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/AnalysisQueue/AnalysisQueueFoundationService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`
- `sites/api.arolariu.ro/src/Invoices/Workers/AnalysisWorker.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`

Read constants and ordering from live source. Do not copy retry counts, timeout
durations, or provider names into new guidance or templates.

## Partial Failure and Retries

| Failure shape | Owning decision | Required proof |
| --- | --- | --- |
| Independent capabilities can succeed or fail separately | Orchestration composes results; Processing owns persistence/requeue policy | Successful values survive, failed/dependency-blocked work is explicit, cancellation still escapes |
| A direct provider call is transient | Foundation may apply established capability retry policy | Only approved transient failures retry; caller cancellation and invalid output do not |
| Persistence fails after in-memory work | Processing policy | Assert whether failure is fatal, log-only, or replacement-worthy and verify side-effect order |
| Replacement publication fails | Processing durable policy | Assert the state of the current receipt and surface the classified failure |

Representative sources:

- `sites/api.arolariu.ro/src/Invoices/Services/Orchestration/AnalysisService/AnalysisOrchestrationService.Internals.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/Analysis/GenerativeAnalysisRetryPolicy.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`

Do not introduce a generic retry around non-idempotent work. Escalate when the
requested reliability contract cannot be derived from an existing sibling.

## External Provider Failure

- Keep SDK calls and provider response mapping in the Broker.
- Keep provider-independent input validation, resilience, and direct failure
  classification in the owning Foundation.
- Do not leak provider SDK types into domain contracts.
- Distinguish invalid structured/provider output from availability failure using
  current typed exceptions.
- Do not log provider payloads, prompts, responses, credentials, or raw error
  bodies.

Sources:

- `sites/api.arolariu.ro/src/Invoices/Brokers/GenerativeAnalysisBroker/AzureFoundryBroker.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/Analysis/AnalysisFoundationService.Exceptions.cs`

Adding or replacing a provider is an external-integration and dependency
escalation, even when an existing Broker interface looks reusable.

## Cross-Context Coordination

- Confirm which bounded context owns the use case and public contract.
- Shared code must not become a route around Management or service direction.
- Prefer provider-neutral contracts and explicit ownership over importing
  another context's internal service.
- A new cross-context call, new bounded context, or materially changed public
  contract requires approval before choosing a layer.

## Mandatory Escalation

Stop before implementation for:

- authentication, authorization, claims, or security behavior;
- schema, partition-key, storage-contract, or data migration changes;
- a new dependency, provider, or external integration;
- a new bounded context;
- a layer-direction, responsibility, or dependency-budget exception.
