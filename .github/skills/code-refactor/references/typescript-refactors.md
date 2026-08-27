# TypeScript Refactor Decisions

Use this reference with the `code-refactor` workflow for behavior-preserving TypeScript, React, Svelte, and Node transformations. It
supplies ownership and preservation decisions, not another refactor procedure. Establish characterization through a stable public boundary
before using any table below, and keep live code/configuration authoritative over historical RFC examples.

## Inventory the Behavior That Must Not Move

Mark every applicable surface before changing the graph:

- rendered HTML, loading/error/empty state, focus, keyboard order, accessible names, and reduced-motion behavior;
- localized copy, message key shape, metadata, URL state, and navigation;
- public props, hook return shape, exported types, discriminants, default values, callback arguments, and errors;
- server data, auth/ownership checks, transport parsing, status mapping, and OpenTelemetry boundary;
- async ordering, abort/cancellation, timer/listener/resource cleanup, and hydration output;
- Zustand persisted fields, in-memory-only fields, merge/version behavior, and `hasHydrated`;
- Svelte prerender/SSR/CSR behavior, rune dependency, singleton lifetime, and global listener ownership;
- worker module location, structured-clone input/result, working directory, fail-fast order, and process/platform behavior;
- package entry points, barrels, CSS loading, and standalone deployment boundaries.

A passing test of the new internal arrangement is not characterization. Prefer assertions that remain useful after the old files and names
disappear.

## Website Ownership Matrix

| Artifact                                 | Keep or move here when                                                             | Must remain outside                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `page.tsx` / layout                      | Route contract, metadata, server-owned data/auth, and route boundaries             | Browser state, event handlers, client hooks            |
| `island.tsx` / smallest client component | One interactive subtree needs hooks, state, browser APIs, or handlers              | Secrets, server-only helpers, route metadata           |
| Route `_components/`                     | Used only by that route/domain                                                     | Premature website-wide or package API                  |
| Route `_hooks/`                          | Cohesive reusable client behavior within the route family                          | Markup, server data access, unrelated global state     |
| Website `src/hooks/`                     | A real client lifecycle contract is reused across unrelated website routes         | Route policy or one-off extraction                     |
| Local state                              | One component owns the lifetime                                                    | Shared persistence or unrelated branch state           |
| Context                                  | A few related components in one mounted subtree share state/actions                | Cross-route persistence                                |
| URL state                                | Navigation state is shareable/bookmarkable                                         | Ephemeral component-only state                         |
| Approved Zustand store                   | Existing global state is consumed across unrelated mounted branches                | New route-local state or an unapproved persisted shape |
| Private `server-only` helper             | Server Component/server code owns a read and the browser never invokes it          | Browser-callable mutation/RPC                          |
| `"use server"` action                    | A client must invoke the operation and the export enforces its public RPC contract | Convenience wrapper for a server-only read             |
| `src/types` / transport module           | Website-wide public/domain type or runtime trust boundary                          | Component-only props or package-neutral UI types       |

Moving a function into a `use*` file does not make it a Hook. Moving a file under `lib/actions` does not make it a Server Action. Ownership
is determined by behavior, directives, imports, and consumers.

## Preserve the Server/Client Graph

The canonical website split is visible in `src/app/domains/invoices/page.tsx` and `island.tsx`: metadata and server data remain in the page;
the serializable authenticated snapshot enters the client island that composes interactive sections.

When extracting a client island:

- trace transitive imports before and after adding `"use client"`;
- move only code that directly needs a hook, browser API, client Context, Zustand, or an event handler;
- keep server-only data/auth/metadata in the server parent;
- pass the smallest serializable prop shape;
- preserve server HTML and the first client render so hydration does not flash a false empty/authenticated state;
- retain route-local loading, error, and not-found ownership;
- preserve established auth and resource-ownership checks on the server.

Do not convert a whole page to a Client Component to resolve one interactive leaf. Do not turn a private `server-only` helper into a
browser-callable action. The invoices page's current action-backed server read is documented debt, not an extraction template.

When extracting a Hook, leave markup with the component and give the Hook one cohesive lifecycle/state contract. Preserve effect
dependencies, cleanup, abort ownership, stable callbacks, and latest-value semantics. `DialogContext.tsx` deliberately splits state and
actions and uses a ref to combine stable action identity with a current payload; a mechanical “simplification” that merges contexts or adds
payload to the callback dependency changes rerender behavior.

## State and Persistence Refactors

Use the narrowest existing owner. A refactor may move state downward from a global owner when characterization proves no other consumer
needs it. Moving local/Context state into a new Zustand store, or extending an existing persisted shape, is an architecture change that
requires approval.

For an approved store refactor, preserve:

- action names and update/upsert/dedup/removal semantics;
- selector results and `useShallow` behavior for object-shaped selections;
- persisted versus in-memory-only fields;
- storage table/key, serialized shape, merge/version behavior, and stale-field removal;
- `hasHydrated` timing and UI gating;
- selection cleanup when entities are removed;
- server-safe initial state and devtools identity where externally observed.

`createEntityStore.ts` currently owns invoice/merchant common behavior. `scansStore.tsx` remains specialized because its cached scan
lifecycle exceeds that generic contract. Generalizing it merely to remove duplicate lines is not behavior-preserving unless every extra
transition is characterized.

Persistence characterization must run the real store and `storage/indexedDBStorage.ts` with the configured external IndexedDB
implementation. Existing store tests that replace the repository adapter cannot prove a storage refactor.

## Route, Website, Package, and Barrel Boundaries

| Proposed reuse                                                        | Default decision                                                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| One route                                                             | Keep in that route's `_components`, `_hooks`, `_model`, or `_types`                                                         |
| Two unrelated website routes                                          | Consider website-shared `src/components`, `src/hooks`, `src/lib`, or `src/types` after proving the contract is website-wide |
| Domain-agnostic public primitive explicitly requested for the library | Use `@arolariu/components` and its full public API obligations                                                              |
| Website domain behavior in component library                          | Reject; let the website compose domain data/copy around the primitive                                                       |
| CV/status behavior imported from website or component package         | Reject by default; both Svelte sites remain standalone                                                                      |
| Shared Node worker/process decision                                   | Extract only when worker inputs, output serialization, platform handling, and working directories are equivalent            |

For `@arolariu/components`:

- never import from `sites/**`;
- preserve Base UI `useRender`/`mergeProps`, ref forwarding, and native-first interaction;
- retain existing `asChild` compatibility but do not spread it to new APIs;
- colocate component, CSS Module, focused test, and Storybook story;
- export every supported component and public type from `src/index.ts`;
- validate both direct implementation imports and the package entry point.

Moving a component file without its style/test/story or forgetting the barrel creates an orphaned or unreachable API even if its local test
passes. `button.tsx`, `button.module.css`, `button.test.tsx`, `button.stories.tsx`, and `src/index.ts` are the live inspection set.

For ordinary TypeScript barrels, avoid widening an internal symbol into a public contract merely to shorten imports. Preserve
framework-required default exports for pages, layouts, configuration, and worker entry points; prefer named exports for reusable internal
utilities and types.

## CSS Modules, i18n, Metadata, and Accessibility

### Styling ownership

- Website route/component styles remain colocated CSS/SCSS Modules and use bracket access such as `styles["title"]` under the website's
  active type settings. Preserve class application order, responsive behavior, focus styles, theme variables, and reduced motion.
- The component library uses colocated `.module.css` and its existing `cn()` helper. A refactor must not replace Base UI state/focus
  semantics with visual classes alone.
- The CV site keeps local `.module.scss` files and shared local token/effect partials; it does not import website or library styling.
- The status site keeps CSS custom properties and its established scoped stylesheet/component styles. Do not fold `SegmentTooltip` into the
  generic `Popover` merely because both float; its viewport-flip math is an explicit specialized boundary.

Moving class names is not behavior-neutral when tests, animation names, custom-property consumers, focus state, or server/client initial
layout rely on them. Preserve semantic markup alongside CSS so accessibility does not become dependent on appearance.

### Copy and metadata

If a structural move touches user-visible website copy, preserve the same typed selector and identical key shape in `en`, `ro`, and `fr`; do
not rename keys as cleanup. Generated message declarations follow source messages and must not be maintained by hand.

Keep route metadata in the server route and build it through the shared metadata helper. Preserve the route family's live `metadata` versus
`__metadata__` namespace shape; reconciling that drift is a separate schema decision.

### Accessibility

Preserve native element choice, accessible name, focus order/return, keyboard activation, disabled behavior, live error/status announcement,
and reduced motion. Moving handlers between wrapper and child can alter event order or Base UI merging even when the rendered text looks
unchanged. Characterize role/name plus keyboard/focus behavior before extraction.

## Svelte Standalone and Rune Boundaries

Both Svelte sites own their implementations and deployment graphs locally. Do not introduce `@arolariu/components`, website aliases, React
state patterns, or another monorepo package to remove apparent duplication.

### CV site

- Preserve the root static-first prerender/SSR/CSR options.
- Keep one-component state local with `$state`.
- Keep shared cross-component state in the established `*.svelte.ts` runes-class pattern only when its current singleton lifetime is
  required.
- Guard browser-only constructor/effect work.
- Preserve documented layout-singleton ownership for global listeners.
- Keep component styles beside the component and reuse CV-local tokens.

### Status site

- Extract deterministic route calculations and event decisions to plain `.ts` only when they have no rune/lifecycle/DOM ownership.
  `lib/routes/keyboardShortcuts.ts` and `pageLogic.ts` are the live examples.
- Keep reusable rune lifecycle in `lib/hooks/*.svelte.ts`.
- Characterize `$effect` reactive reads, `flushSync` transitions, RAF/timer cleanup, SSR fallback values, and observer teardown before
  moving them.
- Preserve the component folder taxonomy (`chrome`, `summary`, `table`, `charts`, `incidents`) and update all consumers plus colocated tests
  in one coherent move.

An extraction from `+page.svelte` is safe only when the route remains binding glue and the extracted function receives/returns all state
explicitly. DOM node ownership, runes, `onMount`, and global listener cleanup usually stay in the component.

## TypeScript Public-Type Preservation

Compare the consumer-visible type before and after every move:

- explicit exported return type and readonly input/prop contract;
- optionality and nullability;
- literal union members and discriminants;
- generic constraints and inference;
- callback parameter order and variance;
- `satisfies`-checked literal keys without widening;
- type-only versus runtime imports;
- class/error identity used by `instanceof`;
- default versus named export shape;
- runtime parser/guard paired with transport types.

Never use `any`, a broad assertion, or a non-null assertion to force a move through the compiler. A `type` moved across a barrel can create
a runtime cycle if its import is not type-only. A config object moved under an explicit `Record<string, ...>` annotation can lose
literal-key inference; retain `satisfies` where that inference is public.

Transport types do not replace validation. Keep unknown-data parsing at `types/invoices/transport.ts` and reuse the existing identifier
guard rather than consolidating casts or regexes.

## Worker and Node Module Refactors

Separate pure planning from effects without pretending they are the same test boundary:

- exported target-to-step planning may be plain TypeScript;
- worker entry points retain the expected default export and serializable input/result;
- dynamic config imports retain module format, export shape, and resolution base;
- per-worker caches retain their intended process/thread lifetime;
- platform command wrapping, output merging, working directory, and tool-not-found classification remain in the shell boundary;
- step order, fail-fast behavior, skipped-step reporting, and cleanup remain observable.

`scripts/workers/lint.worker.ts` plus `lint.worker.test.ts` shows the split between pure step composition and effectful execution.
`shell.ts` owns platform spawn behavior. Moving either across modules requires both a pure contract test and the appropriate process/worker
validation; one does not substitute for the other.

## Incremental Validation Map

Use the same passing characterization after each coherent transformation, then add the smallest graph-specific check:

| Transformation                  | Re-run immediately                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Extract pure utility            | Original caller behavior plus focused utility cases                                                |
| Extract React Hook              | Component behavior plus hook state/rerender/cleanup                                                |
| Split Server/Client component   | Route/component characterization, hydration-sensitive case, and website graph/build check          |
| Move route component            | Every direct import consumer, colocated test, styles, messages, and route behavior                 |
| Change Context structure        | State and action consumers, stable/latest callback contract, render-sensitive behavior             |
| Refactor Zustand store          | Actions/selectors, real persistence/hydration boundary, and consuming empty/loading UI             |
| Move Server Action/helper       | RPC/server-only identity, input/auth/transport/result contract, and server graph                   |
| Move component-library API      | Component interaction/a11y test, story/type surface, barrel/package build, and a consumer import   |
| Extract Svelte pure logic       | Original route/component behavior plus plain TypeScript branch tests                               |
| Move Svelte rune hook/component | Rune/component tests, teardown, SSR/prerender, imports, and site build                             |
| Split Node worker logic         | Pure planner tests, serialized worker contract, module loading, and process boundary as applicable |
| Move public TypeScript types    | Type/build check plus every public consumer and runtime parser/export                              |

Stop on the first drift. Correct or roll back that one transformation before combining another extraction, rename, formatting pass, or
modernization.

## Drift and Disqualifiers

The following are not behavior-preserving:

- changing copy, metadata keys, visible loading/empty behavior, or route auth;
- moving server checks to a client island;
- promoting local state to global persistence;
- accepting additional malformed transport data;
- altering callback identity, effect timing, cleanup count, or race winner;
- changing a Svelte singleton/global-listener mount count;
- importing a monorepo package into a standalone Svelte site;
- removing/renaming a package export without preserving supported consumers;
- changing Base UI/native keyboard or focus behavior;
- mixing a worker move with new step order, timeout, or tool policy;
- updating tests to the new internals or replacing moved repository modules with mocks.

Route a discovered defect to `code-fix-bug`; route a desired contract, UX, state, auth, dependency, or architecture change for explicit
approval.

## Live Inspection Pointers

- `sites/arolariu.ro/src/app/domains/invoices/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/island.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_types/index.ts`
- `sites/arolariu.ro/src/app/domains/invoices/upload-scans/_model/constants.ts`
- `sites/arolariu.ro/src/stores/createEntityStore.ts`
- `sites/arolariu.ro/src/stores/scansStore.tsx`
- `sites/arolariu.ro/src/types/invoices/transport.ts`
- `packages/components/src/components/ui/button.tsx`
- `packages/components/src/index.ts`
- `sites/cv.arolariu.ro/src/hooks/useTheme.svelte.ts`
- `sites/cv.arolariu.ro/src/components/CommandPalette.svelte`
- `sites/cv.arolariu.ro/src/routes/+layout.ts`
- `sites/status.arolariu.ro/src/routes/+page.svelte`
- `sites/status.arolariu.ro/src/lib/routes/keyboardShortcuts.ts`
- `sites/status.arolariu.ro/src/lib/routes/pageLogic.ts`
- `sites/status.arolariu.ro/src/lib/hooks/useCountTween.svelte.ts`
- `scripts/workers/lint.worker.ts`
- `scripts/workers/shell.ts`
