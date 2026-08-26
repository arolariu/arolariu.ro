# Backend Artifact Matrix

Use this matrix after layer ownership is selected and only when behavior crosses
more than one layer.

**Legend:** `R` = normally required, `C` = required when the contract changes or
a new implementation is introduced, `—` = do not add for symmetry.

| Change signal | Endpoint/worker | DTO/domain contract | Management | Processing | Orchestration | Foundation | Broker | Exceptions | DI | Telemetry | MSTest | XML docs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Protocol-only mapping over an existing Management method | R | C | — | — | — | — | — | C for new mapped outcome | — | C for observable protocol context | R at handler/mapper boundary | R on changed public contract |
| Expose an existing Processing capability to adapters | C | C | R | C only for contract exposure | — | — | — | C | C only for a new implementation | C | R at Management plus adapter when exposed | R |
| New computation, multi-stage use case, batch, or durable policy over existing Orchestrations | C | C | R | R | C | — | — | C | C only for new implementation types | R for observable workflow | R for ordering, failure, and cancellation | R |
| Compose existing Foundation capabilities | C if externally exposed | C | C | C | R | C only for needed capability surface | — | C | C only for new implementation types | C | R at Orchestration and affected upper boundary | R |
| Add CRUD/capability validation around an existing Broker operation | C if externally exposed | C | C | C | C | R | C for primitive operation | R when classification changes | C only for new implementation types | C | R at Foundation; Broker test when mapping changes | R |
| Add a primitive operation to an existing external-system Broker | C if externally exposed | Use provider-neutral contract only | C | C | C | R | R | R for provider translation/classification | C only for new implementation types | C without provider payload | R at Broker and owning Foundation | R |
| Change request/response or durable serialization shape | R | R | C if service contract changes | C | C | C | C only for provider mapping | C for invalid shape | — unless a new mapper/service type exists | C with privacy review | R for round trip/mapping and consumer | R |
| Add a new implementation behind an existing contract | — | — | R only if owner | R only if owner | R only if owner | R only if owner | R only if owner | C for changed provider/classification behavior | R in owning bounded-context module | R for newly observable work | R for constructor, behavior, and classification | R |

## Artifact Decisions

- **Endpoint/worker:** adapters resolve only Management and own protocol or host
  concerns.
- **DTO/domain contract:** keep provider SDK types below the Broker boundary and
  transport types out of domain services unless the current public Management
  contract explicitly owns them.
- **Services:** add only the highest owner and lower behavior actually needed;
  unchanged pass-through layers may need a method but not a new service type.
- **Exceptions:** reuse an established family when semantics match. Add a type
  only when callers must distinguish a new classified outcome.
- **DI:** update
  `sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs`
  only for a new/replaced implementation or lifetime requirement.
- **Telemetry:** add an Activity or bounded metric/log only when the operation is
  observable; never attach request/provider payload.
- **Tests:** cover behavior at its owning boundary and add mapping,
  serialization, telemetry, or architecture tests only for those changed
  contracts.
- **XML docs:** update every changed public contract and document nullability,
  cancellation, side effects, and classified failures accurately.

## Live Inventory Anchors

- Adapter and mapping:
  `sites/api.arolariu.ro/src/Invoices/Endpoints/`
- Services:
  `sites/api.arolariu.ro/src/Invoices/Services/`
- Brokers:
  `sites/api.arolariu.ro/src/Invoices/Brokers/`
- Registration:
  `sites/api.arolariu.ro/src/Invoices/Modules/WebApplicationBuilderExtensions.cs`
- Layer graph test:
  `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs`

An `—` is intentional: the hierarchy is a dependency rule, not a scaffolding
requirement.
