# Behavior-Preserving .NET Refactors

Owner: `.github/skills/code-refactor/SKILL.md`. This catalog supplements the
generic characterization, dependency-boundary, incremental-validation, and
rollback resources for `sites/api.arolariu.ro`. It supplies .NET-specific
preservation decisions, not another refactor procedure, and intentionally
contains no copied commands or version values.

## Preservation surface

Before selecting a structural move, characterize every affected item:

- public method/interface/DTO shape and serialized field names;
- aggregate invariants, ownership and partition identifiers;
- exact exception outer types, marker interfaces, inner-object identity, and
  HTTP mapping;
- dependency call order, partial-success behavior, retry/delete/enqueue order,
  and worker scope lifetime;
- caller/host cancellation, internally induced ownership-loss cancellation,
  and token forwarding;
- Activity source/name/kind, parent context, safe tags, metrics, and
  source-generated logging;
- constructor shape, direct domain dependency count, DI registration and
  lifetime;
- public XML documentation, including parameter constraints, return
  nullability, cancellation, and classified failure modes.

A passing happy-path service test does not characterize the rest of this
surface. Add only the focused characterization needed for the boundary being
moved.

## Preserve The Standard ownership

| Code being moved | Existing owner to preserve | Refactor guardrail |
| --- | --- | --- |
| Endpoint/worker protocol concerns | Endpoint or worker adapter | Invoices adapters continue to consume only Management; no business decision moves into the adapter |
| Application use-case exposure | Management | Management continues to delegate to Processing and does not acquire Orchestration/Foundation/Broker dependencies |
| Heavy computation or multi-stage sequencing | Processing | Processing calls only approved Orchestrations and preserves workflow order |
| Coordination of existing capabilities | Orchestration | No Orchestration-to-Orchestration or direct Broker call appears |
| CRUD/capability validation and direct dependency classification | Foundation | No Foundation-to-Foundation call appears |
| Provider SDK/protocol and provider-neutral mapping | Broker | No domain workflow, aggregate coordination, or application retry policy moves into the Broker |
| Cross-context primitive | Existing context unless genuinely reused | `Common` must not become a bypass around context ownership |

Moving behavior to a different Standard layer is not automatically
behavior-preserving. It is valid only when the approved refactor explicitly
restores established ownership and the same exceptions, telemetry,
cancellation, and calls remain observable. A new external integration, bounded
context, auth behavior, persisted shape, or public endpoint contract is not a
refactor.

## Constructors, dependencies, and DI

Services preserve the direct-domain collaborator budget owned by root
`AGENTS.md`; framework/support dependencies such as `ILoggerFactory` are
outside that count. During extraction:

- Do not hide a domain dependency beyond the root budget in a service locator, `IServiceProvider`,
  options bag, generic façade, delegate bundle, or factory closure.
- Management currently depends on one Processing contract; Processing
  currently depends on the three approved Orchestrations.
- Keep constructor validation (`ArgumentNullException.ThrowIfNull`) and
  logger creation behavior when moving fields or changing constructor style.
  Do not convert a validating constructor to a primary constructor merely to
  shorten it.
- Update interface, constructor, registration, lifetime, consumer, and
  architecture expectation as one coherent unit only when that graph change
  is the approved refactor.
- Preserve scoped lifetimes for ordinary Brokers/services. The live taxonomy
  Broker singleton has an immutable-startup-state rationale and is not a
  default for extracted services.
- Preserve `AnalysisWorker`'s singleton-hosted/fresh-async-scope-per-poll
  model and its Management-only resolution.

`InvoiceStandardLayeringArchitectureTests` pins all concrete constructor
dependencies. `InvoiceUnifiedLayeringArchitectureTests` adds adapter entry
points and public contract presence/absence. Use a real service-collection
resolution test as well when registration, implementation selection, or
lifetime changes; reflection alone cannot prove DI wiring.

## Partial-class boundaries

The Invoices services and endpoint surface use partial classes to separate
responsibilities without changing the public type:

- service operation bodies in the principal `*.cs`;
- TryCatch and classification in `*.Exceptions.cs`;
- validation in the service's validation partials;
- endpoint handlers, mappings, metadata, and internals in dedicated
  `InvoiceEndpoints.*.cs` files;
- some Brokers split provider regions/concerns across partial files.

Prefer an existing partial boundary when splitting a large type. Preserve:

- namespace, accessibility, `sealed` status where present, and implemented
  interfaces;
- exactly one constructor/field ownership location;
- classifier selection for each method (`TryCatchAsync` versus
  analysis-specific handling);
- generated logging declarations and Activity ownership;
- public metadata/XML documentation declaration location;
- method and initialization order where it affects behavior.

Do not create a parallel service/interface merely for symmetry when an
existing partial and contract can express the responsibility. Splitting files
must not become a layer extraction or expose formerly private helpers.

## Exceptions and cancellation

Behavior preservation requires more than retaining a catch block:

- `OperationCanceledException` remains before `Exception` in every TryCatch
  chain and is rethrown unchanged for caller/host cancellation.
- Exact marker categories and inner-object retention remain unchanged.
  Ordinary Processing classification and analysis classification have
  different retention depth; do not consolidate them without proof of
  equivalence for every caller.
- Management continues to scan nested markers while retaining the injected
  Processing exception as its immediate inner object.
- `ExceptionToHttpResultMapper` continues to select the deepest classifiable
  marker and apply safe details.
- `ExecuteWithVisibilityRenewalAsync` continues to convert renewal-owned
  cancellation back to the recorded dependency failure after awaiting cleanup.
- Tokens continue through every layer and provider call. Do not replace a
  supplied token with `CancellationToken.None`, a fresh unrelated source, or a
  token with a different ownership lifetime.
- Async library/service work remains fully awaited with
  `.ConfigureAwait(false)`; never introduce `.Result` or `.Wait()`.

Characterize exact outer/inner identity and no-later-call cancellation behavior
before consolidating TryCatch delegates, extracting retry logic, or moving
queue coordination.

## Telemetry preservation

An internal move can still break observability. Preserve the existing
observable boundary:

- Activity source, operation name, `ActivityKind`, parent/remote context, and
  success/error status;
- safe semantic tags and their layer/operation values;
- queue `TraceParent`, correlation identifier, and logical attempt continuity;
- source-generated log event ownership and level;
- metric outcome/category and ordering relative to domain side effects.

Do not duplicate an Activity at both the old and new helper, silently remove
one, or add a new tracing abstraction. Do not move payload values into tags or
logs. The privacy contract excludes OCR content, product/merchant names,
prompts, provider responses, scan URLs, credentials, and other customer
content. `InvoiceEndpointsTelemetryPrivacyTests` and the consumer-Activity
assertions in `InvoiceProcessingServiceCurrentArchitectureTests` are live
preservation checks.

## DTOs, public contracts, and XML documentation

Moving mapping code must preserve request acceptance, domain normalization,
response nullability, enum representation, exact serialized key sets, and
excluded internal fields. `InvoiceResponseTransportContractTests` is the live
transport characterization; do not replace its explicit field assertions with
a broad snapshot.

Public types and members retain useful XML documentation because documentation
generation and warnings-as-errors make missing public docs a build contract:

- `<summary>` describes the contract and layer role, not the new file layout;
- `<param>` retains constraints, ownership, nullability, and token meaning;
- `<returns>` retains empty/null and asynchronous completion semantics;
- `<exception>` retains exact documented validation/dependency/cancellation
  conditions;
- `<remarks>` is updated only when structural rationale genuinely changed.

When a declaration moves between partial files, move its documentation with
it. Do not use `<inheritdoc/>` if the move loses information that existed only
on the implementation, and do not “improve” documented behavior beyond what
live source and consumers prove. RFC 2004's examples are subordinate to
current signatures.

## Queue refactor invariants

Queue and visibility code is especially order-sensitive. Preserve all of:

1. one visible message processed per worker iteration;
2. fresh scoped Management resolution per poll;
3. provider `MessageId` and mutable current `PopReceipt`;
4. periodic visibility renewal while work owns the delivery;
5. ownership-loss cancellation and recorded dependency failure;
6. partial-success persistence before current-message deletion;
7. deletion before failed-only replacement enqueue;
8. preserved correlation/trace context and incremented logical attempt;
9. terminal attempt deletion without another replacement; and
10. malformed-payload receipt metadata without payload telemetry.

An extracted queue coordinator that changes any of those is behavior work, not
a refactor. The operation-order and renewal tests in
`InvoiceProcessingServiceCurrentArchitectureTests`, together with
`AzureStorageBrokerTests`, are the current characterization sources.

## Rollback units

Prepare rollback at the same boundary as the structural move:

| Refactor | Atomic rollback content |
| --- | --- |
| Split/merge partial files | Move declarations and XML docs back, restore modifiers and constructor/field ownership, then remove only the new unreferenced file |
| Constructor/dependency reduction | Restore interface, constructor parameters, fields, caller direction, DI registrations/lifetimes, and architecture expectations together |
| Move coordination between established layers | Restore method body, direct-layer calls, TryCatch/validation ownership, telemetry, interfaces, and tests as one unit |
| Extract queue/async helper | Restore token source ownership, cleanup awaiting, operation order, Activity/log ownership, and original call site together |
| Move DTO/projection | Restore mapper declaration and every consumer before removing the new path; retain exact serialized contract |

Rollback triggers include any changed exact exception chain, cancellation
result, Activity lineage, queue order, serialized shape, constructor graph,
registration resolution, or focused characterization result. Reverse only
owned hunks; never reset or overwrite unrelated work. Re-establish the
pre-refactor characterization and architecture baseline before attempting a
smaller transformation.

## Live source pointers

- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs`
  and `.Exceptions.cs` — validating constructor, partial split, façade,
  telemetry, and marker scanning.
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.cs`
  and `.Exceptions.cs` — workflow/visibility order and distinct classifiers.
- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/`
  — Foundation operation, validation, and exception partial boundaries.
- `sites/api.arolariu.ro/src/Invoices/Endpoints/InvoiceEndpoints.Handlers.cs`,
  `.Mappings.cs`, `.Metadata.cs`, and `.Internals.cs` — established endpoint
  partial-class split.
- `sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs`
  — current registration grouping and lifetimes.
- `sites/api.arolariu.ro/src/Invoices/Workers/AnalysisWorker.cs` — scoped
  Management-only worker resolution and cancellation behavior.
- `sites/api.arolariu.ro/src/Invoices/Brokers/QueueBroker/AzureStorageQueueBroker.cs`
  — provider boundary and mutable receipt behavior.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs`
  and `InvoiceUnifiedLayeringArchitectureTests.cs` — graph and contract checks.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`
  — behavior, ordering, classification, trace, and renewal preservation.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DTOs/InvoiceResponseTransportContractTests.cs`
  — public transport shape.
- `sites/api.arolariu.ro/Directory.Build.props` — documentation generation,
  nullable analysis, and warnings-as-errors policy.

RFC 2001 owns DDD/layer intent, RFC 2002 observability intent, RFC 2003 the
implemented Standard and durable-analysis contract, and RFC 2004 public XML
documentation intent. Live source and current architecture tests decide the
behavior that a refactor must preserve.
