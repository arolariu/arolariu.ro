# TypeScript Test Decisions

Use this reference with the `code-unit-test` workflow when the selected boundary is TypeScript, React, Svelte, or Node. It adds
repository-specific test decisions; it does not repeat the workflow, its mock catalog, or project verification commands. Re-open every live
pointer before imitating it because test configuration and application boundaries can drift.

## Select the Runtime Boundary First

The nearest `vitest.config.ts` is authoritative. The root configuration is only a base: the website, CV, and status projects merge different
plugins, aliases, environments, setup files, include patterns, and coverage ownership into it.

| Behavior under test                                                   | Smallest useful boundary                            | Harness                                          | Keep real                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------- |
| Parser, guard, formatter, reducer, ordering, or command-plan decision | Pure unit                                           | Vitest without rendering                         | Function, types, and repository helpers                        |
| React markup or interaction                                           | Component                                           | Testing Library `render` and user interaction    | Component tree, repository components, contexts, and utilities |
| React state or lifecycle with no owned markup                         | Hook                                                | Testing Library `renderHook`                     | Hook, provider, and repository helpers                         |
| Svelte markup or interaction                                          | Component                                           | `@testing-library/svelte`                        | Component, local runes, and repository modules                 |
| Svelte rune hook                                                      | Rune scope                                          | `$effect.root` plus `flushSync`                  | The `*.svelte.ts` hook and its effects                         |
| Node transformation or orchestration decision                         | Pure Node unit                                      | Vitest in the Node environment                   | Exported planner/parser and Node standard library              |
| Browser worker lifecycle                                              | Host/hook contract, then browser coverage if needed | Real host plus the narrow runtime shim           | Worker host, protocol, hook, and repository race helpers       |
| Unknown wire data                                                     | Parser contract                                     | Raw `unknown` fixture into the real guard/parser | Transport validation and domain types                          |
| Persisted client state                                                | Adapter/store integration                           | Configured IndexedDB implementation              | Store, persistence middleware, and repository adapter          |
| Server Action behavior                                                | Server/contract boundary                            | Control only network, Clerk, or provider edge    | Action, auth/result helpers, request builder, and parser       |

Move outward when a nominal unit would have to replace a repository action, store, component, utility, parser, or persistence adapter. A
smaller test that removes the owner of the behavior is not stronger evidence.

## React Components: Assert the User Contract

- Render the real component with the smallest typed props and provider wrapper. Query by role, accessible name, label, value, or
  relationship.
- Drive the same event a user can perform. Prefer `userEvent` for React click/type/keyboard sequences and await it.
- Assert both the visible result and an exact callback/result contract when the component exposes one. For a rejected action, also assert
  that the forbidden callback, navigation, or state update did not occur.
- Preserve native semantics in assertions. A disabled composed button, for example, must be non-activatable as well as visually styled.
- Verify focus, Escape, arrow-key selection, `aria-expanded`, live error announcements, and focus return only when those are part of the
  public component contract.

`packages/components/src/components/ui/button.test.tsx` contains useful role/name and disabled-interaction cases for the real Base UI
wrapper. `sites/status.arolariu.ro/src/lib/components/table/UptimeBar.test.ts` shows a Svelte component exposing one accessible button per
bucket and exact hover payloads. Do not copy their weaker test-id or class-name assertions when a semantic outcome is available.

Server Components are not made unit-testable by mocking Next internals. Characterize their private pure/server helper where that is the real
owner, or use the route/build/integration boundary. Keep an App Router page's metadata, auth, server data, and serialization graph real when
those are the behavior.

## React Hooks: Public State, Rerenders, and Teardown

Use `renderHook` when the contract is the hook's returned state/actions rather than rendered markup:

- Wrap provider-owned hooks with the real provider.
- Put synchronous state transitions in `act`; await public async callbacks in async `act`.
- Use `rerender` to prove changed inputs, latest callback/payload behavior, and stale-work suppression.
- Use `unmount` to prove resource cleanup. Assert the released object URL, removed listener, canceled work, or disposed host, not merely
  that unmount did not throw.
- Test initial state before the action so the final assertion cannot pass from fixture setup.

Live distinctions:

- `src/hooks/usePagination.test.tsx` exercises generic hook state and derived pagination with `renderHook`.
- `DialogContext.test.tsx` uses a real provider, rerenders with a new payload, and proves that a stable `open` callback dispatches the
  latest payload.
- `usePreviewUrlLifecycle.test.tsx` controls only `URL.revokeObjectURL` and proves idempotent and unmount cleanup.
- `workers/react/useWorker.test.tsx` exercises the real worker host, React Strict Mode remounting, cleanup, and the server snapshot while
  supplying only the missing browser `Worker` runtime surface.

## Svelte Components and Rune Hooks

Svelte component tests stay colocated as `*.test.ts` and use accessible Testing Library queries. `ThemeToggle.test.ts` resets the CV site's
module-singleton theme through its public API before each test, then verifies the named button and resulting shared theme. This reset is
load-bearing: cleanup of the DOM does not recreate a module singleton.

For a status-site hook implemented in `*.svelte.ts`:

1. Create an `$effect.root` scope.
2. Instantiate the hook inside that scope.
3. Use `flushSync` after a rune write or scheduled callback.
4. Dispose the root and assert the owned cleanup.

`useMinuteTick.svelte.test.ts` demonstrates controlled interval advancement and interval teardown. `useCountTween.svelte.test.ts`
demonstrates deterministic RAF callbacks, a controlled clock, target changes during an animation, reduced-motion behavior, and root
teardown. Its current cleanup-only “does not throw” assertion is not a pattern to extend; a new cleanup regression should spy on the exact
pending frame identifier and prove it is canceled.

Keep SvelteKit virtual modules and browser APIs available before import-time singleton code runs. The CV setup installs `localStorage` at
setup-module scope because `useTheme.svelte.ts` constructs its singleton during import. The CV configuration maps `$app/*` virtual modules
to test-environment shims. Those are framework/runtime boundaries, not permission to replace local hooks, components, or data modules.

## Pure Node and Worker Tests

Use the Node environment for code that owns filesystem, child-process, worker, or CLI behavior. Do not render it through a DOM project
merely because the repository's base runner has a DOM default.

- Prefer an exported pure decision surface from an effectful worker. `scripts/workers/lint.worker.test.ts` executes `stepsForTarget` and
  verifies the ordered labels without spawning tools or pretending to test Piscina.
- Exercise a real, stable platform boundary when economical. `scripts/workers/shell.test.ts` uses the running Node executable for the
  available-tool path and a deterministic impossible name for the failure path.
- For filesystem orchestration, isolate all writes to a test-owned disposable directory and remove it in teardown.
  `sites/status.arolariu.ro/scripts/probe.test.ts` combines real JSONL writing with controlled external `fetch` responses and fixed
  timestamps.
- A worker result must remain structured-cloneable. Test the serializable input/result contract separately from tool execution and thread
  startup.
- Dynamic-import, config lookup, cache-file naming, platform shim, and fail-fast behavior belong to the module that owns those decisions. A
  test of the exported step list does not prove child-process execution, worker thread loading, or the external tool.

## External-Only Substitution

Allowed seams are the system outside the repository behavior being asserted:

| External seam      | Control                                                                          | Also assert                                                     |
| ------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| HTTP               | `fetch` response/rejection or a test server                                      | Request shape, parsed result, and exact failure category        |
| Browser resource   | Narrow clipboard, object URL, observer, media-query, timer, or event-target shim | User result and cleanup/restoration                             |
| Framework/provider | Next runtime, Clerk, Azure SDK, or SvelteKit virtual-module shim                 | Repository consumer outcome, never provider internals           |
| Time               | Fixed clock, fake timers, or controlled RAF queue                                | State before threshold, at/after threshold, and teardown        |
| Storage engine     | Configured IndexedDB implementation                                              | Real adapter/store serialization, merge, removal, and hydration |
| Filesystem/process | Test-owned directory or real stable executable                                   | Public files/result/exit classification and cleanup             |

Do not add or retain `vi.mock` for `@/...`, relative application modules, stores, actions, parsers, contexts, or `@arolariu/components`. The
website Vitest aliases that redirect repository server modules to `tests/stubs/**` are documented migration debt. Likewise,
`sites/status.arolariu.ro/src/lib/api/fetchStatusData.test.ts` currently replaces the neighboring `mockData` repository module; its cache cases
are useful behavior inventory, but that replacement is not a seam to copy.

## Timing, Cleanup, Races, Hydration, and Transport

| Risk                           | Required proof                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fake timer                     | Install before creating the timer, assert pre-threshold state, advance only the meaningful duration, flush queued work, and restore real timers        |
| Subscription/listener/observer | Register through the public boundary, rerender or unmount, and prove exact removal/disconnect with no later callback                                   |
| Object URL/RAF/interval        | Prove each resource is released once, including replacement during in-flight work                                                                      |
| Promise/abort race             | Control which side settles first, assert the winner and loser suppression, and verify listener cleanup                                                 |
| Latest-value race              | Rerender with a new value while retaining the stable callback, then assert only the latest payload is committed                                        |
| React Strict Mode              | Treat setup-cleanup-remount as expected; ensure a disposed resource is recreated and owned aborts do not surface as failures                           |
| Hydration                      | Distinguish “not hydrated” from a genuinely empty store; assert the `hasHydrated` transition before empty/content UI                                   |
| Persistence                    | Seed stale/invalid persisted input at the external storage boundary; run the real store and adapter; assert partialized fields and removed stale state |
| Transport                      | Pass `unknown` into the real parser; cover valid, malformed, optional, additive, date, identifier, enum, and sentinel branches as applicable           |
| Server result                  | Narrow the real discriminated result and verify status/error mapping; a malformed successful body is a server-contract error, not user validation      |

`workers/host/raceWithSignal.test.ts` is the live promise/abort reference. `types/invoices/transport.test.ts` is the live unknown-payload
reference. `stores/storage/indexedDBStorage.test.ts` is the adapter reference, but a store-hydration claim additionally requires the real
owning store and persistence middleware rather than a storage-module replacement.

## Colocation and Sensitivity

- Website and component-library tests use sibling `*.test.ts` or `*.test.tsx`; Svelte tests remain beside the `.svelte`/`.svelte.ts` owner;
  Node script tests remain beside the script.
- Reuse typed deterministic builders only when they expose the invariant. Prefer a minimal inline fixture when a broad builder hides it.
- Use contrasting inputs for distinct public branches, exact callback arguments/counts, and negative assertions for forbidden work.
- Avoid broad snapshots, `toBeDefined`, arbitrary sleeps, final-state-only assertions, or coverage-only branches that do not express a
  contract.
- Restore spies, timers, browser globals, singleton state, filesystem state, and module cache behavior explicitly. A test that passes alone
  but not with siblings usually has an ownership or cleanup failure.

## Live Inspection Pointers

- `sites/arolariu.ro/src/app/domains/invoices/_components/analysis/InvoiceAnalysisControls.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.test.tsx`
- `sites/arolariu.ro/src/workers/host/raceWithSignal.test.ts`
- `sites/arolariu.ro/src/workers/react/useWorker.test.tsx`
- `sites/arolariu.ro/src/types/invoices/transport.test.ts`
- `packages/components/src/components/ui/button.test.tsx`
- `sites/cv.arolariu.ro/src/components/ThemeToggle.test.ts`
- `sites/cv.arolariu.ro/src/hooks/useTheme.svelte.test.ts`
- `sites/status.arolariu.ro/src/lib/hooks/useCountTween.svelte.test.ts`
- `sites/status.arolariu.ro/src/lib/hooks/useMinuteTick.svelte.test.ts`
- `sites/status.arolariu.ro/src/lib/api/fetchStatusData.test.ts`
- `sites/status.arolariu.ro/scripts/probe.test.ts`
- `scripts/workers/lint.worker.test.ts`
- `scripts/workers/shell.test.ts`
