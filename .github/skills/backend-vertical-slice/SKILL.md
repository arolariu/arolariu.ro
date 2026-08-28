---
name: backend-vertical-slice
description: Implement or extend an Invoices API endpoint and its required The Standard service path. Use for Invoices behavior that needs endpoint, Management/Processing/Orchestration/Foundation/Broker changes, DI, telemetry, XML docs, and MSTest coverage.
---

# Backend Vertical Slice

## When to Use

- Add or change API or worker behavior in the Invoices bounded context.
- Expose an existing domain capability through the Management façade.
- Extend a service path when ownership, failure behavior, and persistence or
  provider boundaries are understood.
- Implement a change that may span an adapter, Management, and only the lower
  layers required by the behavior.

## When Not to Use

- Do not use for frontend, infrastructure, deployment, or CI workflow files.
- Do not apply the Invoices service hierarchy to Core.Auth, Core, or Common;
  inspect their established topology and use the narrower task workflow.
- Do not use to scaffold every layer for symmetry when an existing layer already
  owns the behavior.
- Do not use for an unapproved bounded context, dependency, external
  integration, authentication or authorization change, or schema/data
  migration.
- Use `code-fix-bug`, `code-refactor`, or `code-unit-test` when no new API
  behavior or service-path implementation changes.

## Required Inputs

- The existing Invoices aggregate or capability owner.
- The route or worker contract, request/response shape, and expected protocol
  outcomes.
- Ownership, partition, validation, null/not-found, cancellation, and retry or
  partial-failure semantics.
- `AGENTS.md`, `sites/api.arolariu.ro/AGENTS.md`,
  `.github/instructions/csharp.instructions.md`, and
  `.github/instructions/backend.instructions.md`.
- The relevant sections of
  `docs/rfc/2001-domain-driven-design-architecture.md`,
  `docs/rfc/2002-opentelemetry-backend-observability.md`,
  `docs/rfc/2003-the-standard-implementation.md`, and
  `docs/rfc/2004-comprehensive-xml-documentation-standard.md`.
- One live sibling implementation and its tests in the same bounded context and
  intended layer.
- The current Management contract, exception-to-HTTP mapper, tracing helpers,
  and bounded-context registration module.

## Decision Points

1. Which highest existing layer owns the new decision rather than merely
   transporting it?
2. Does the behavior need a new contract or implementation, or only an
   extension to an existing type?
3. Which inputs and failures belong to the adapter, each service boundary, and
   the Broker?
4. Must ownership or partition information remain scoped, or is a deliberate
   cross-partition operation part of the contract?
5. Is work atomic, best-effort, batched, queued, or retryable, and where is that
   policy owned?
6. Which Activity, exception classification, DI, XML documentation, and tests
   are observable requirements of the changed behavior?

## Core Procedure

1. Read the required guidance and trace the live adapter-to-Management path
   through each existing lower layer to its Broker boundary.
2. Select the highest owning layer before choosing files. Adapters and workers
   consume Management contracts, even when the behavior ultimately reaches a
   Broker.
3. Define the behavior contract, including ownership/partition handling,
   null/not-found semantics, cancellation, side-effect ordering, and classified
   failures.
4. Inventory the minimum artifact set. Do not add a layer, interface, exception,
   DTO, registration, or test double that the behavior does not require.
5. Write the smallest failing MSTest at the owning boundary. Add focused
   adapter, mapping, telemetry, or architecture coverage only for externally
   observable behavior.
6. Implement the Management contract and only the required flow-forward
   changes. Keep Foundation services independent, Brokers policy-free, and
   service constructors within the direct-domain-dependency budget.
7. Match the live sibling's partial-class, TryCatch, validation, Activity,
   exception, cancellation, asynchronous, and XML-documentation patterns.
8. Update DTO mapping and bounded-context registration only when the changed
   contract or a new implementation requires them.
9. Run the targeted test, then the smallest API build or broader test selection
   that proves the affected contract.

## Resource Triggers

Load only the resource whose named trigger applies:

| Trigger | Resource |
| --- | --- |
| Before choosing or changing an owning layer | [Layer decision table](references/layer-decision-table.md) |
| Adding or changing service exception, cancellation, or Activity behavior | [Exception and telemetry catalog](references/exception-telemetry-catalog.md) |
| Ownership, partition, queue, batch, retry, partial, provider, or cross-context behavior | [Backend edge cases](references/backend-edge-cases.md) |
| New behavior crosses more than one layer | [Artifact matrix](checklists/artifact-matrix.md) |
| Before selecting behavior-test categories | [Test matrix](checklists/test-matrix.md) |
| A live sibling confirms the same stable service or MSTest shape | [Service and test patterns](templates/service-and-test-patterns.md) |
| Current representative slices are needed to choose a sibling | [Live vertical slices](examples/live-vertical-slices.md) |
| A concrete build, test, DI, trace, mapping, serialization, or runtime failure occurs | [Troubleshooting](references/troubleshooting.md) |

## Verification

- The targeted MSTest demonstrates the changed behavior and exact failure
  contract.
- Invoices adapter and worker dependencies stop at its Management contract.
- Dependencies remain flow-forward, with no Foundation-to-Foundation or
  Orchestration-to-Orchestration calls and no lower-layer bypass.
- Each service remains within the root direct-domain collaborator budget;
  support services do not hide extra domain coordination.
- Cancellation is forwarded and is not reclassified as a fault.
- Activities use the bounded-context source and contain only approved,
  non-sensitive context.
- New implementations are registered once in the owning bounded-context
  module; existing implementations are not re-registered unnecessarily.
- Public contracts have accurate XML documentation, and the smallest relevant
  build is warning-free.
- The final diff contains no unused layer artifacts or out-of-scope changes.

## Stop and Ask

- A new or replaced dependency or external integration.
- Authentication, authorization, claims, or other security behavior.
- Schema, partition-key, persistence-contract, or data migration changes.
- A new bounded context or a public contract with materially different valid
  outcomes.
- A change to layer direction, layer responsibility, or the root-owned direct
  domain-dependency budget.
- Infrastructure, deployment, destructive, or production-cost implications.

## Completion Contract

- List changed files and the adapter/service layers that own the behavior.
- State the implemented protocol and domain behavior, including material
  failure or cancellation semantics.
- Report the targeted test and build evidence actually obtained.
- Report only material assumptions, architecture drift, residual risk,
  incomplete validation, or blockers; do not claim success without evidence.
