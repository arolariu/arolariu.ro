# Live Tests and Builders

These are dynamic examples. Re-open every path and inspect the current source;
do not copy an excerpt or fixture shape after its contract changes.

## Pure TypeScript and Transport Contracts

**Live source**

- `sites/arolariu.ro/src/app/domains/invoices/_utils/labelUtilities.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_utils/labelUtilities.test.ts`
- `sites/arolariu.ro/src/types/invoices/transport.ts`
- `sites/arolariu.ro/src/types/invoices/transport.test.ts`

**Why representative**

The utility tests execute repository code with no doubles, while the transport
tests feed unknown wire shapes into the real parser and assert valid,
malformed, optional, additive, and sentinel cases.

**Inspect**

Trace each assertion to a public branch, preserve exact validation paths, and
derive fixtures from current wire/domain types. Choose a different sibling for
rendered behavior, a request builder, or a provider-specific payload.

## React Interaction, Accessibility, and Lifecycle

**Live source**

- `sites/arolariu.ro/src/app/domains/invoices/_components/analysis/InvoiceAnalysisControls.test.tsx`
- `packages/components/src/components/ui/select.test.tsx`
- `packages/components/src/components/ui/dialog.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx`
- `sites/arolariu.ro/tests/helpers/hookAsync.ts`
- `sites/arolariu.ro/tests/helpers/hookAsync.test.tsx`

**Why representative**

Together they demonstrate role/name queries, exact callback payloads,
keyboard selection and Escape behavior, current-payload dispatch after
rerender, asynchronous callback flushing, and unmount cleanup while executing
the real repository component or hook.

**Inspect**

Match the live component/hook boundary and its configured environment. If a
component cannot render without replacing a repository action, context,
utility, store, or child component, move outward to integration/E2E coverage
or report the missing seam instead of copying a module mock.

## Persistence Boundaries and Store Structural Pressure

**Live source**

- `sites/arolariu.ro/src/stores/createEntityStore.ts`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts`
- `sites/arolariu.ro/src/stores/scansStore.tsx`

**Why representative**

The real adapter tests cover entity-level IndexedDB operations. The current
store source exposes in-memory actions, selected state, hydration, and
partialization, but no listed store unit is an approved exemplar because the
existing store suites replace the repository storage module.

**Inspect**

Use the real adapter/configured IndexedDB environment for persistence. For
store behavior, execute the store and repository storage together at an
integration boundary; if that is not currently possible, report structural
pressure rather than introducing or copying a storage-module replacement.

## Deterministic Frontend Builders

**Live source**

- `sites/arolariu.ro/tests/helpers/builders/domain.ts`
- `sites/arolariu.ro/tests/helpers/builders/http.ts`
- `sites/arolariu.ro/tests/helpers/builders/auth.ts`
- `sites/arolariu.ro/tests/helpers/builders/azure.ts`
- `sites/arolariu.ro/tests/helpers/builders/serverActions.ts`
- `sites/arolariu.ro/tests/helpers/builders/stores.ts`
- `sites/arolariu.ro/tests/helpers/builders/testDataBuilder.ts`
- `sites/arolariu.ro/tests/helpers/builders/azure.test.ts`
- `sites/arolariu.ro/tests/helpers/builders/serverActions.test.ts`
- `sites/arolariu.ro/tests/helpers/builders/stores.test.ts`

**Why representative**

The domain builders use stable defaults and partial typed overrides; the HTTP
builders create real `Response` values for transport boundaries; Azure
builders represent the external SDK seam; server-action builders construct the
shared result union; store builders support selector-facing state. The facade
collects these current entry points.

**Inspect**

Read the production type before using an override, change only values relevant
to the behavior, and verify the builder itself still has deterministic dates
and identifiers. Choose a minimal inline fixture when a shared builder hides
the invariant under test.

## Backend Layer Tests and Exact Failures

**Live source**

- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Foundation/InvoiceStorageFoundationServiceExceptionsTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Orchestration/InvoiceOrchestrationServiceExceptionsTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Management/InvoiceManagementServiceTests.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/EndpointCancellationTests.cs`

**Why representative**

They cover the live Foundation-to-Management test seams, strict coordination,
exact outer/inner exception classification, cancellation preservation, and
protocol-level cancellation mapping.

**Inspect**

Match only the target layer, direct dependency, exception family, and
cancellation contract. Prefer strict setups for calls that define behavior.
Choose endpoint/mapper integration tests when HTTP results, DI, or middleware
are the real contract.

## Deterministic Backend Test Data

**Live source**

- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Builders/ClassificationTestData.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Helpers/InvoiceScanTestData.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Helpers/ReceiptDocumentTestData.cs`
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Builders/InvoiceBuilder.cs`

**Why representative**

The first three helpers encode current classification, scan, and provider
record invariants with fixed values. `InvoiceBuilder.cs` is also a live
inventory source, but it generates random values and is therefore unsuitable
for a deterministic regression or exact-boundary assertion without explicit
overrides.

**Inspect**

Select the smallest helper whose invariant matches the test and replace
behavior-relevant values explicitly. Do not use current time, unseeded
randomness, or arbitrary identifiers when failure evidence must be repeatable.
Choose another helper when testing a different aggregate or provider record.
