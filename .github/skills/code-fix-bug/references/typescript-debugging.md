# TypeScript Debugging Decisions

Use this reference after the `code-fix-bug` workflow has captured a concrete TypeScript, React, Svelte, or Node symptom. It maps symptoms to
live ownership boundaries and suitable regression proof. It does not replace the reproduction ladder, root-cause decision tree, or
fail-without/pass-with requirements.

Live source and the nearest project configuration are authoritative. Several current tests and RFC excerpts contain historical patterns;
treat the instruction catalogs' explicit debt labels as constraints, not as suggestions to reproduce those patterns.

## Find the First Broken Boundary

| First concrete symptom                    | Inspect before editing                                                                                | First invariant to prove                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Wrong or inaccessible React output        | Component props, provider, loading/error/empty branch, translation, semantic markup                   | The same public input produces the wrong role/name/value/state                          |
| Stale React callback or late state update | Hook effects, dependencies, refs, abort ownership, cleanup, promise order                             | A controlled rerender/unmount lets stale work win or survive                            |
| Hydration flash or mismatch               | Server snapshot, island props, browser-only read, store `hasHydrated`, persisted merge                | Pre-hydration state is being mistaken for settled client state                          |
| Server-only import/browser API failure    | `"use client"` directives and complete import graph                                                   | A client module imports server-only code, or server evaluation touches a browser API    |
| Server Action returns wrong category/data | Input guard, auth boundary, request helper, HTTP mapping, response parser                             | Exact request/status/raw body reaches the wrong discriminated result                    |
| Persisted entity returns or disappears    | Store actions, partialization, hydration callback, IndexedDB adapter, write order                     | Known persisted state merges or deletes incorrectly                                     |
| Svelte value does not update              | `$state` owner, `$derived`/`$derived.by`, reactive reads inside `$effect`, singleton lifetime         | The rune dependency is absent, stale, or owned by the wrong lifetime                    |
| Svelte/SSR import crashes                 | Module-scope singleton, `$app/environment`, browser guard, setup import order                         | Browser-only work occurs while the module is evaluated on the server/test collector     |
| Timer/RAF/listener leaks or doubles       | Setup location, replacement path, teardown, singleton mounts                                          | One public lifecycle creates multiple resources or fails to release one                 |
| Worker call hangs/rejects late            | Boot handshake, host state, abort race, timeout, dispose/restart, structured-clone contract           | A deterministic event order wedges state or allows the wrong completion                 |
| Node tool works manually but worker fails | Worker module URL/import, current working directory, config lookup, platform spawn wrapper            | The worker and direct process do not resolve the same module/config/tool boundary       |
| Import/config/build-only failure          | Nearest `tsconfig`, Vite/Vitest aliases, generated artifacts, package barrel, extension/module format | Source is valid under one graph but missing/widened/unresolvable under the owning graph |

Trace from the public entry point through real repository calls. A downstream toast, empty state, timeout, or generic error is evidence only
after the earlier parser, lifecycle, state, or import transition has been ruled out.

## React Client Diagnosis

### Render and interaction

Start with the accessible tree, not component internals. Confirm the component is past its loading/hydration branch, the localized
accessible name is the one actually rendered, and the control is enabled. Reproduce with a real provider and repository component tree. A
role/name mismatch may be an accessibility defect; switching to a test id only hides it.

For interaction failures, record:

- state before the action;
- the user event and exact callback/result;
- visible state after the action;
- any forbidden duplicate callback, navigation, or stale output.

`packages/components/src/components/ui/button.tsx` is a useful boundary for native versus composed-button semantics: styling alone is not a
fix if a non-native disabled target still activates.

### Effects, hooks, and stale work

Separate four causes that often look identical:

1. a missing effect dependency reads old state;
2. adding an unstable object dependency restarts work continuously;
3. cleanup aborts owned work but a `finally` or resolution still commits;
4. React Strict Mode setup-cleanup-remount exposes a resource that cannot be recreated.

Use controlled promise resolution, abort, `rerender`, and `unmount`. `DialogContext.test.tsx` proves a stable callback can still read the
latest payload through a refreshed ref. `usePreviewUrlLifecycle.test.tsx` proves idempotent browser-resource cleanup.
`workers/react/useWorker.test.tsx` exercises a disposed host across Strict Mode and the server snapshot.

Owned cleanup or supersession aborts are expected in every environment. They must not become user-visible failures or permit a late state
write. The current `useUserInformation.tsx` production-only abort behavior is catalogued debt, not a correction pattern.

## Next.js Server/Client and Action Diagnosis

### Server/client graph

Do not diagnose a file from its name or missing directive alone. Trace its parents and transitive imports:

- Pages, layouts, metadata, server-owned fetches, secrets, and private `server-only` helpers stay server-side.
- Hooks, event handlers, browser APIs, client Context, and Zustand require the smallest client island.
- Props crossing the boundary must remain serializable and stable between server output and first client render.

`src/app/domains/invoices/page.tsx` and `island.tsx` show the live route split. The page's current use of an RPC-capable user action for a
server-owned read is documented debt; do not “fix” another graph by turning a private helper into `"use server"` or by moving an entire page
client-side.

For hydration defects, inspect initial HTML, the island's first render, and the post-hydration/store state as three distinct observations.
An empty persisted array before `hasHydrated` is not evidence that the user has no entities.

### Server Actions and transport

Treat each `"use server"` export as a public RPC boundary. Follow the data in this order:

1. validate browser-controlled input;
2. enforce the established authentication/authorization contract;
3. build the request with the shared timeout/trace helper;
4. classify non-success HTTP status;
5. parse a successful body from `unknown`;
6. map thrown/parser failures to the established result union.

`fetchInvoice.ts` routes successful JSON through `parseInvoiceResponse`/`tryParse`; `types/invoices/transport.ts` owns runtime wire
validation; `lib/utils.server.ts` owns shared result/error mapping. A TypeScript cast, permissive partial object, or hand-built error shape
merely moves the failure deeper into the UI. A malformed successful body represents server/client contract drift and remains a server error
rather than a user input validation error.

Control only the actual HTTP, Clerk, or provider edge in a regression. Website Vitest aliases that replace `instrumentation.server`,
`configProxy`, `utils.server`, storage, or user actions with `tests/stubs/**` are migration debt and cannot prove behavior owned by those
modules. If the real action cannot execute with only its external edge controlled, use a contract or integration boundary and report the
pressure.

## Store, Persistence, and Hydration Diagnosis

Inspect the owning live store rather than assuming every store has the same field names. Invoice and merchant stores use the entity factory;
scans and preferences retain specialized contracts.

For a deterministic persistence reproduction:

- seed one typed persisted record, including the stale/invalid field relevant to the report;
- execute the real adapter, middleware, store merge, and hydration callback;
- observe `hasHydrated`, persisted fields, in-memory-only selection, and the final selector output separately;
- assert both the canonical state and the absence of stale or forbidden fields.

Do not clear all user storage as a generic correction. Do not replace `indexedDBStorage.ts` while claiming to test store persistence.
`indexedDBStorage.test.ts` is the real adapter pointer; existing store suites that mock the repository storage module are not valid
regression exemplars.

Race persistence writes against deletion/update only when ordering is part of the symptom. Control completion directly rather than adding
delays.

## Svelte Runes, Components, and SSR

### Reactive ownership

- Keep one-component state as local `$state`.
- Keep status-site reusable rune hooks in `*.svelte.ts`.
- In the CV site, shared cross-component state may be a module-level runes-class singleton exposed through a small hook.
- Use `$derived(expr)` for direct expressions and `$derived.by` for multi-statement computation.
- An `$effect` reruns only for reactive values read during its previous run. An apparently unused derived-value read may be the dependency
  that makes the effect work.

Reproduce rune-hook bugs inside `$effect.root`, flush after each state or scheduled transition, then dispose the root.
`useMinuteTick.svelte.test.ts` shows interval lifetime; `useCountTween.svelte.test.ts` shows controlled RAF, mid-animation replacement,
reduced motion, and effect teardown.

### Module and singleton lifetime

`sites/cv.arolariu.ro/src/hooks/useTheme.svelte.ts` creates shared state at module evaluation. Browser access must be guarded with
`$app/environment`, and its test environment must install browser shims before importing the module. The CV setup's module-scope
`localStorage` is intentional. Moving that setup to `beforeEach` causes collection-time failure before test hooks run.

Reset singleton state through its public API when possible. Use a fresh module only when import-time initialization itself is the contract,
and restore any framework shim afterward. A second mount of a documented layout singleton can duplicate global listeners; inspect mount
ownership before changing its cleanup.

For Svelte component failures, use role/name and keyboard/focus outcomes. `UptimeBar.svelte` also has an SSR-stable initial width and a
client `ResizeObserver`; distinguish initial markup, observed resize, and tooltip interaction rather than patching all three together.

## Workers and Async Races

Worker bugs often cross four independent contracts:

1. module loading and worker construction;
2. boot/ready handshake and host state;
3. call serialization, timeout, abort, and response correlation;
4. disposal/restart and listener cleanup.

Reproduce the earliest failing contract. `workers/host/raceWithSignal.ts` centralizes body-versus-abort resolution and listener cleanup. Its
regression must control pre-abort, mid-flight abort, body-first completion, the loser promise, and removal of the listener.

For React worker hooks, supply only the browser `Worker` runtime surface while running the real host/protocol. For Node lint/format workers,
separate the pure dispatch table from Piscina/thread loading and external tool execution. `scripts/workers/lint.worker.test.ts` proves only
ordered target steps. `scripts/workers/shell.test.ts` proves the real process-availability wrapper. A pass in either does not prove dynamic
config import, working directory, structured cloning, or worker startup.

Check that worker inputs and outputs contain cloneable data, not functions, errors with relied-upon prototypes, DOM objects, or repository
state containers. Verify fail-fast result fields and skipped-step reporting at the worker boundary when those are the symptom.

## Module, Import, and Configuration Failures

Classify these before changing source:

| Failure                                             | Probe                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Alias resolves in editor but not test/build         | Compare the nearest TypeScript paths with Vite/Vitest and package exports                           |
| SvelteKit `$app/*` import fails in unit tests       | Inspect project plugin, browser conditions, and existing virtual-module mappings                    |
| Dynamic worker import cannot load config            | Verify module URL/extension, runtime loader, working directory, and default export shape            |
| Public package import is missing                    | Inspect `packages/components/src/index.ts`, package exports, and built entry together               |
| Type changed after moving code                      | Compare explicit exported signature, literal inference, discriminants, and `satisfies` before/after |
| Browser API fails during SSR or test collection     | Find module-scope evaluation and add/restore the correct environment guard or external shim         |
| Generated locale/type artifact is missing           | Fix the source message/key or generator input; do not hand-edit generated output                    |
| Indexed access or optional field differs by project | Check the nearest merged `tsconfig`; strict flags are not uniform across website and CV             |

Do not solve a module error with a second barrel, broad alias, duplicate implementation, `any`, or a repository-module mock. Fix the owning
graph or move the regression to the boundary that can load it honestly.

## Fail-Without / Pass-With Proof by Boundary

The same input and assertion must run in both states:

| Boundary           | Fail-without must show                                       | Pass-with must show                                                 |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Render/interaction | Wrong visible/accessible result or forbidden callback        | Correct user result and exact callback with no forbidden effect     |
| Hook/lifecycle     | Controlled order commits stale state or leaks a resource     | Latest state wins and cleanup occurs exactly once                   |
| Hydration/store    | Seeded persisted state flashes/merges/deletes incorrectly    | Explicit hydration transition and canonical final state             |
| Transport/action   | Exact raw input/status reaches wrong parser/result branch    | Typed value or exact error code/path through the real boundary      |
| Svelte rune        | State/derived/effect fails after a named reactive transition | Same transition updates and teardown releases its resource          |
| Worker             | Named event order wedges/misclassifies host or result        | Same order settles once, remains serializable, and cleans listeners |
| Import/config      | Real owning environment fails to resolve/load/type-check     | Same environment resolves without a compatibility fake              |
| Node orchestration | Fixed external/process/filesystem input yields wrong result  | Same input yields correct structured output and cleanup             |

A setup, import, or collection failure is not fail-without evidence for an unrelated behavioral bug. A pass obtained by weakening
assertions, changing timing, clearing all state, or replacing repository code is not pass-with evidence.

## Live Inspection Pointers

- `sites/arolariu.ro/src/app/domains/invoices/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/island.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`
- `sites/arolariu.ro/src/types/invoices/transport.ts`
- `sites/arolariu.ro/src/lib/utils.server.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle.ts`
- `sites/arolariu.ro/src/stores/createEntityStore.ts`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`
- `sites/arolariu.ro/src/workers/host/raceWithSignal.ts`
- `sites/arolariu.ro/src/workers/react/useWorker.test.tsx`
- `packages/components/src/components/ui/button.tsx`
- `sites/cv.arolariu.ro/src/hooks/useTheme.svelte.ts`
- `sites/cv.arolariu.ro/vitest.setup.ts`
- `sites/status.arolariu.ro/src/lib/hooks/useCountTween.svelte.ts`
- `sites/status.arolariu.ro/src/lib/hooks/useMinuteTick.svelte.ts`
- `sites/status.arolariu.ro/src/lib/api/fetchStatusData.ts`
- `scripts/workers/lint.worker.ts`
- `scripts/workers/shell.ts`
