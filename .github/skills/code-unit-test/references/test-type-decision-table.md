# Test-Type Decision Table

Use this table before choosing a test level. Start with the smallest observable
boundary, but do not force behavior that depends on several real boundaries
into a unit test.

## Decision Table

| Behavior to prove | Smallest suitable level | Keep real | Substitute only | Repository inspection targets |
| --- | --- | --- | --- | --- |
| Deterministic parsing, formatting, filtering, reducer, or value-object rule | Unit | Function/type and its repository helpers | Nothing | `sites/arolariu.ro/src/app/domains/invoices/_utils/labelUtilities.test.ts`; `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/DDD/ValueObjects/` |
| Rendered semantics, prop-driven state, or one user interaction | Component unit in Testing Library | Component tree and repository utilities/components | Browser/framework/external service boundary only when unavoidable | `sites/arolariu.ro/src/app/domains/invoices/_components/analysis/InvoiceAnalysisControls.test.tsx` |
| Hook state, latest-value dispatch, subscription, or cleanup | Hook/component unit | Hook and repository helpers | Time or browser API used by the hook | `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx`; `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx`; `sites/arolariu.ro/tests/helpers/hookAsync.test.tsx` |
| Zustand action with in-memory state only | Unit only when the real store can execute without a repository-module replacement; otherwise integration | Store factory/action, selectors, and repository storage boundary | External browser storage only | No approved unit pointer currently; existing store tests replace repository storage, so move outward or report structural pressure |
| Persistence serialization, rehydration, merge, version, or storage failure | Integration at the storage adapter/store boundary | Store plus storage adapter and configured IndexedDB test environment | Browser storage implementation only if the production boundary itself is unavailable | `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts` |
| Unknown HTTP success body becomes a domain value or typed failure | Contract/unit at the parser | Parser, guards, and domain types | Raw external response value | `sites/arolariu.ro/src/types/invoices/transport.test.ts` |
| Server action maps auth/network/status outcomes | Boundary test only if the external seam can be controlled without replacing repository modules | Action, auth/transport helpers, parser | Network, Clerk, or SDK boundary | No approved module-mocked action pointer; use a real action boundary, contract/integration/E2E coverage, or report structural pressure |
| One C# service validates, coordinates, or classifies a direct dependency | Unit at that service layer | Service, exception types, validators, telemetry helpers | Its injected direct-layer contract; use a strict substitute only for calls/classification being asserted | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Services/` |
| Exception-to-HTTP, request cancellation, middleware, DI registration, or endpoint result | Integration/contract | Mapper, endpoint/middleware, DI graph | Downstream application boundary where the protocol behavior requires it | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Integration/`; `sites/api.arolariu.ro/tests/arolariu.Backend.Core.Tests/Common/Http/` |
| Provider wire model, Cosmos partition behavior, Azure serialization, or SDK translation | Contract/integration at the Broker boundary | Broker mapping and provider model contract | External SDK transport/service | `sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Brokers/` |
| Navigation across pages, middleware/auth redirect, real browser focus, upload, or critical user path | E2E | Deployed/local application path | Only external systems already isolated by the E2E harness | Current `*.spec.ts` Playwright siblings and the nearest guide |
| Public API compatibility across caller and server | Contract or E2E | Both sides of the contract | Remote infrastructure only | Frontend transport tests plus backend DTO/endpoint contract tests |

## Escalation Rules

- Move outward one level when the unit would require replacing two or more
  repository modules, asserting private state, or reconstructing framework
  behavior.
- Stay at a unit boundary when a real parser, component, hook, store action, or
  service method exposes the behavior directly.
- A test that checks only a mock's configured return value is at the wrong
  boundary.
- Architecture reflection, DI resolution, HTTP mapping, and persistence are
  not made "unit" by mocking away the boundary they are meant to prove.
- If the expected behavior is ambiguous, stop before selecting a level.
