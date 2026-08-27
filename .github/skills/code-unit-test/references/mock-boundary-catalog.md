# Mock-Boundary Catalog

Load this catalog whenever any test double is considered.

## Non-Negotiable Repository-Module Rule

Do not add `vi.mock(...)`, `vi.doMock(...)`, alias replacement, or a hand-built
facsimile for repository modules such as `@/...`, relative application
modules, stores, actions, utilities, contexts, or `@arolariu/components`.
Execute repository code as repository code.

Aliases that redirect repository modules to stubs or fake implementations,
including those already configured by `sites/arolariu.ro/vitest.config.ts`,
`sites/arolariu.ro/vitest.setup.ts`, or `sites/arolariu.ro/tests/stubs/` are
migration debt, not approved unit seams. A passing test under one of those
replacements cannot prove behavior owned by the replaced repository module.
Do not configure, copy, or expand that strategy.

An external runtime or provider substitute may prove how real repository code
consumes that external boundary. It cannot prove behavior owned by the
external system. If repository behavior cannot execute without replacing
repository modules, move outward to an integration/E2E boundary or report the
structural pressure.

For C#, substituting an injected direct-layer interface is permitted only when
the selected unit owns coordination, validation, or exception classification
at that seam. It is not permission to mock arbitrary repository collaborators
or to bypass an integration behavior.

## Boundary Catalog

| Boundary | Allowed double | Required assertions | Prefer real when |
| --- | --- | --- | --- |
| HTTP/network | Controlled `fetch`/response or test server at the external network seam | Request contract plus parsed observable result/failure | Testing the repository parser or request builder directly |
| Azure SDK/provider | SDK client/transport substitute or provider record fixture | Repository mapping, call contract, classification, cancellation; never SDK behavior | A real repository Broker mapper can consume a deterministic provider model |
| Clerk/auth provider | External Clerk shim or injected provider result | Repository auth-dependent outcome, never Clerk behavior or private token details | Testing repository claim/identifier parsing with deterministic values |
| Next runtime | External navigation/cache/font shim | Repository consumer's observable call only, never Next runtime behavior | Rendering repository components and helpers |
| Time | Fake timers or injected clock at the public seam | Scheduled boundary, elapsed behavior, cleanup; restore real timers | A fixed timestamp fixture is sufficient |
| Browser API | Narrow spy/fake for clipboard, `URL`, observer, media query, or event target | User result and cleanup, not merely spy invocation | The configured DOM implementation supports the behavior |
| IndexedDB/storage | Configured external IndexedDB implementation only | Real store/adapter persisted shape, rehydration, deletion/merge, and failure result | Never replace the repository adapter or store whose behavior is asserted |
| C# Foundation dependency | Strict injected Broker contract substitute | Exact arguments/token, result, and exception translation owned by Foundation | The Broker mapping or provider contract is under test |
| C# Orchestration/Processing/Management dependency | Strict injected direct-layer contract substitute | Coordination/order, no-extra-calls, exact outer/inner failure owned by the real layer | Behavior does not depend on interaction or classification at that layer |
| Logging/telemetry | Listener or logger substitute only when observability is public behavior | Safe event/tag/level and absence of sensitive data | Logging is incidental to the domain assertion |

A direct-layer injected substitute proves only behavior owned by the real
service under test. It does not prove the substituted Broker or service.

## Time, Browser, and Storage Discipline

- Activate fake timers only in tests that own scheduled behavior. Pair setup
  and restoration, advance through the public interaction, and flush the
  promise work created by the timer.
- Spy on the narrow browser method, not all of `window`, `document`, or `URL`.
  Assert cleanup on rerender/unmount for subscriptions, observers, object URLs,
  and event listeners.
- Use the configured IndexedDB environment for persistence behavior while the
  repository store and adapter remain real. If storage success/failure cannot
  be induced at that external API seam, move outward or report structural
  pressure instead of substituting a repository storage implementation.
- Fixed dates, identifiers, ordering, and culture are fixtures, not mocks.

## When a Fake Signals a Production Boundary Problem

Stop a test-only task and report the design pressure when the test requires:

- mocking a private helper or deep repository import;
- replacing several repository modules to render one component;
- duplicating a production DTO, store, or service in the test;
- mutating module globals or import order solely to reach behavior;
- a fake with business rules that can drift from production;
- exposing a new production seam only for the test.

Route a separately approved structural improvement to `code-refactor`; do not hide
it inside test work.

## Current Source Pointers

### Representative boundaries

- `sites/arolariu.ro/src/app/domains/invoices/_utils/labelUtilities.test.ts`
  runs repository utilities directly.
- `sites/arolariu.ro/src/types/invoices/transport.test.ts` feeds unknown
  transport values to the real parser.
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx`
  substitutes only the browser URL cleanup boundary.
- `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/Processing/InvoiceProcessingServiceCurrentArchitectureTests.cs`
  uses strict direct-layer contracts to prove coordination and classification.

### Existing patterns not to extend

- `sites/arolariu.ro/src/stores/createEntityStore.test.ts` replaces the
  repository storage module.
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.test.ts`
  replaces repository auth/transport helpers.
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContainer.test.tsx`
  replaces many repository components.
- `sites/arolariu.ro/vitest.config.ts` aliases repository server modules to
  fake implementations under `sites/arolariu.ro/tests/stubs/`.

Those tests are evidence of current migration debt, not approval for new
repository-module mocks. Preserve them unless the requested scope includes
improvement, but do not copy their isolation strategy.
