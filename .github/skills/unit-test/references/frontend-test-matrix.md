# Frontend Test Matrix

Choose only rows exercised by the requested behavior. Use the real source and
repository helpers; consult the mock-boundary catalog before introducing a
double.

| Behavior category | Cases to consider | Observable assertions | Current inspection target |
| --- | --- | --- | --- |
| Semantics and render | Default state; prop variants; semantic landmark/control; localized accessible name | Role, name, value, text, relationship, enabled/disabled state | `sites/arolariu.ro/src/app/domains/invoices/_components/analysis/InvoiceAnalysisControls.test.tsx` |
| Interaction | Click/type/select/clear; valid and rejected action; one callback per action | User-visible state and exact public callback/result shape | `sites/arolariu.ro/src/app/domains/invoices/_components/allergens/AllergenAssessmentEditor.test.tsx` |
| Keyboard, focus, accessibility | Tab order; arrows/Enter/Escape; focus return; alert/status; native semantics | Role/name, `aria-expanded`, selected option, focus owner, announced error/status | `packages/components/src/components/ui/select.test.tsx`; `packages/components/src/components/ui/dialog.test.tsx` |
| Loading, error, empty | Initial loading; successful resolution; typed failure; no data; retry/recovery | Status/alert/empty copy, disabled controls, retry outcome, absence of stale content | `sites/arolariu.ro/src/app/error.test.tsx`; `packages/components/src/components/ui/async-boundary.test.tsx`; `packages/components/src/components/ui/empty.test.tsx` |
| Async cleanup and latest values | Unmount/rerender cleanup; latest callback/payload; abort; rejected promise; timer completion | Latest public value, cleanup exactly once, no late effect, settled public state | `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx`; `sites/arolariu.ro/src/workers/host/raceWithSignal.test.ts`; `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx`; `sites/arolariu.ro/tests/helpers/hookAsync.test.tsx` |
| URL state | Initial search params; supported update; invalid/empty input; back/replace semantics | Public filter/selection and expected navigation call/path | `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.test.tsx`; an external Next shim can prove only the repository consumer's navigation call |
| Store state | Initial state; each changed action; dedup/update/removal; selection cleanup; reset | Public selectors/getState results before and after `act` | No approved unit pointer currently: existing store suites replace repository storage; run store plus storage at an integration boundary or report structural pressure |
| Persistence | Partialized shape; write/read/remove; hydration completion; stale/invalid data; storage failure | Real adapter result, merged state, dropped invalid data, `hasHydrated`, no leaked selection | `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts`; then inspect the owning store source |
| Transport validation | Valid payload; malformed success payload; missing/wrong fields; optional/additive fields; sentinels | Exact domain value or typed validation error with field path | `sites/arolariu.ro/src/types/invoices/transport.test.ts` |
| Server/transport result | Auth/network/status/success parsing; non-`Error` failure | Public discriminated result and request/response contract | Keep action, auth/transport helpers, and parser real while controlling only network/Clerk/SDK; if aliases redirect repository modules to substitutes, use contract/integration/E2E coverage or report structural pressure |
| Browser boundary | Clipboard, object URL, event listener, observer, media query | User outcome plus narrow call and cleanup | `sites/arolariu.ro/src/app/domains/invoices/_utils/copySvgToClipboard.test.ts`; `usePreviewUrlLifecycle.test.tsx` |

## False-Positive Avoidance

- Assert the initial condition, perform the public action, then assert the
  changed outcome. A final-state-only assertion can pass from fixture setup.
- For callbacks, assert exact arguments and call count; also assert the
  rendered state when the component owns it.
- For rejected input, assert both the failure and absence of the forbidden
  side effect.
- Do not use `toBeDefined`, snapshots, test IDs, or mock call counts when a
  role/name/value or typed result expresses the contract.
- Await the user interaction or public hook callback. Use `waitFor` only when
  work is scheduled independently.
- When using fake timers, prove the pre-threshold and post-threshold states and
  restore timers.
- A transport test must execute the real parser; a store persistence test must
  execute the real persistence boundary.
- A test that succeeds after replacing the code that owns the behavior is not
  evidence.
