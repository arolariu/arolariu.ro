# Characterization Decision Table

Use this table before structural edits. Characterization records what the live
system does at a stable boundary; it does not decide what the system ought to
do.

## Choose the Smallest Sufficient Boundary

| Situation | Choose | Required evidence | Not sufficient when |
| --- | --- | --- | --- |
| Existing focused tests cover every affected branch and externally visible result | Existing sufficient tests | Name the tests, run them unchanged, and record the passing baseline | Assertions cover implementation details, omit an affected branch, or mock the code being moved |
| A stable public function/component/service behavior lacks direct coverage | Focused characterization test | Assert inputs, outputs, errors, side effects, ordering, cancellation, or rendered semantics through the public boundary | The expected result requires a product decision or is inferred only from the current implementation |
| The refactor touches serialization, transport, reflection-visible contracts, or exported shape | Contract snapshot | Assert selected fields, discriminants, method signatures, or provider-neutral records explicitly | A broad UI/file snapshot would hide meaningful drift or bless unrelated output |
| Behavior exists only across a real adapter, middleware, DI, persistence, or route boundary | Integration boundary | Use the narrowest existing integration harness and real repository modules; isolate only true external systems | A unit test would bypass the contract that the move can break |
| Source, consumers, tests, and accepted intent disagree | Stop: behavior is ambiguous | Capture the conflicting evidence and the decision required | Never continue by choosing the easiest existing assertion |

## Behavior Surface Inventory

Before choosing a row, mark each affected surface:

- return value, emitted event, render semantics, focus, URL, or stored state;
- accepted and rejected inputs, exact errors, and exception classification;
- side effects and their ordering;
- ownership/partition identifiers and serialization shape;
- async completion, cleanup, retries, and cancellation propagation;
- public exports, method/prop signatures, and DI-visible constructors;
- telemetry names or attributes when observers consume them.

Characterization should fail on a meaningful change to one of these surfaces,
not on a harmless internal rearrangement.

## Live Grounding

- Frontend pure behavior:
  [`upload-scans/_intake/validation.test.ts`](../../../../sites/arolariu.ro/src/app/domains/invoices/upload-scans/_intake/validation.test.ts)
  exercises the public validation result rather than component internals.
- Frontend lifecycle behavior:
  [`usePreviewUrlLifecycle.test.tsx`](../../../../sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx)
  is a focused boundary for observable cleanup.
- Website transport shape:
  [`types/invoices/transport.test.ts`](../../../../sites/arolariu.ro/src/types/invoices/transport.test.ts)
  is preferable to a broad snapshot when transport fields move.
- Backend service graph:
  [`InvoiceUnifiedLayeringArchitectureTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceUnifiedLayeringArchitectureTests.cs)
  pins constructors, adapter entry points, and public service contracts.
- Backend behavior and exact exception mapping:
  [`InvoiceProcessingServiceCurrentArchitectureTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs).
- Cross-boundary HTTP behavior:
  [`InvoiceEndpointsStatusCodeTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/InvoiceEndpointsStatusCodeTests.cs).

Inspect the current test and production source together. These are decision
examples, not templates.

## Characterization Quality Gate

- The test passes before the refactor.
- It observes a supported boundary and does not duplicate private control flow.
- It does not mock a repository module merely to preserve its old location.
- It uses deterministic inputs and exact assertions for contract-sensitive
  behavior.
- It remains valuable after the old structure disappears.

If a candidate assertion would encode a suspected bug, stop and request the
behavior decision rather than freezing it into a refactor.
