# Regression-Proof Patterns

These are dynamic examples. Read current source and tests; use the invariant,
not copied implementation detail.

## Malformed Successful Transport Response

**Live source**

- `sites/arolariu.ro/src/types/invoices/transport.ts`
- `sites/arolariu.ro/src/types/invoices/transport.test.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DTOs/InvoiceResponseTransportContractTests.cs`

**Why representative**

The parser consumes unknown data and rejects malformed success bodies before
they enter domain state, while the backend test anchors the emitted contract.
This permits a small raw-payload regression without replacing the parser.

**Inspect**

Use the exact production payload branch and assert the typed field path or
normalized result. Prove the test fails when only the owning validation/fix is
removed. Choose another parser/DTO sibling when the defect is request-side,
provider-specific, or a deliberate additive field.

## Latest Callback State, Abort, and Cleanup

**Live source**

- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx`
- `sites/arolariu.ro/src/workers/host/raceWithSignal.ts`
- `sites/arolariu.ro/src/workers/host/raceWithSignal.test.ts`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.ts`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx`

**Why representative**

These paths execute real repository code for latest-payload dispatch after a
rerender, abort-versus-body resolution, listener cleanup, and browser-resource
release exactly once.

**Inspect**

Control rerender, abort, promise completion, or unmount explicitly. Assert the
winning public result plus absence of stale state, late effects, or duplicate
cleanup, and restore timers/browser spies. If reproducing the defect would
require replacing a repository action, hook, context, store, or utility, move
outward to integration/E2E or report structural pressure.

## Persisted Lifecycle State

**Live source**

- `sites/arolariu.ro/src/stores/scansStore.tsx`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts`

**Why representative**

The scan store source has explicit transitions that remove stale attachment
and detachment metadata, while the real adapter tests own persisted entity
replacement and deletion. Existing store suites replace the repository
storage module, so they are migration debt rather than regression exemplars.

**Inspect**

Seed deterministic persisted state and execute the real adapter. A store
rehydration regression must execute the store and repository storage together
at an integration boundary; if the current harness cannot do that, report the
structural pressure. Assert both canonical fields and removed stale fields.

## Layered Exception Classification

**Live source**

- `sites/api.arolariu.ro/src/Invoices/Services/Foundation/InvoiceStorage/InvoiceStorageFoundationService.Exceptions.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/InvoiceStorageFoundationServiceExceptionsTests.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Management/InvoiceManagementServiceTests.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Processing/InvoiceProcessingService.Exceptions.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`

**Why representative**

The tests execute the real current layer against an injected direct-layer
failure. Foundation wraps the injected Broker exception directly; Processing
either unwraps one Orchestration layer or retains it depending on the selected
classifier; Management marker-scans the chain but retains the injected
Processing outer. Existing siblings vary in how deeply they assert identity,
so the live classifier source is part of the contract evidence.

**Inspect**

Match the exact method's classifier, direct dependency exception family,
distinct caller token, exact outer type, and every retained/unwrapped object by
identity. Verify logger effects only when contractually relevant and prove
absence of extra calls. Invalidate the pattern when another classifier or
retention depth applies.

## Cancellation to Protocol Outcome

**Live source**

- `sites/api.arolariu.ro/src/Common/Http/RequestCancellation.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/GenerativeAnalysisRetryPolicyCancellationTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Workers/AnalysisWorkerMidIterationCancellationTests.cs`

**Why representative**

These tests distinguish service cancellation, retry termination, worker
mid-iteration behavior, client disconnect, request timeout, and host shutdown
at their observable boundaries.

**Inspect**

Control the token source explicitly, assert the exact propagated exception or
protocol result, and verify no later retry/write/call occurs. Choose the test at
the earliest boundary that misclassifies cancellation; do not patch only the
endpoint if a service swallowed it first.

## Constructor Graph Regression

**Live source**

- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceStandardLayeringArchitectureTests.cs`
- `sites/api.arolariu.ro/src/Invoices/Modules/`
- Current service constructors under `sites/api.arolariu.ro/src/Invoices/Services/`

**Why representative**

The architecture test reflects the real constructors and fails when a layer
adds, removes, reorders, or bypasses an approved direct dependency.

**Inspect**

Use this proof only when the defect is registration or dependency direction.
Pair it with a real DI resolution test when lifetime/registration, rather than
constructor shape, is broken. Stop if the fix would change approved layer
responsibility.
