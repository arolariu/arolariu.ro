# React Client Reference Catalog

Owner: `.github/instructions/react.instructions.md`. Load this catalog only
after directives and the transitive import graph prove client execution. It
holds repository-specific client-runtime edge cases that cross component and
Hook boundaries; artifact procedures, accessibility matrices, store design,
and test selection remain in their skills.

## Client graph and first render

A file needs a client boundary when it directly uses a Hook, event handler,
browser API, client Context, Zustand selector, or other client runtime
capability. A directive also makes its transitive component imports part of the
client graph even when those imported files have no directive of their own.

Keep `"use client"` on the smallest module that needs it. Props received from
a Server Component must produce a deterministic first client render; browser
storage, media queries, locale/theme state, and persisted stores should not
replace server output before hydration is established.

When persisted state is involved, distinguish:

1. server output;
2. first client render before hydration;
3. post-hydration state.

The website's persisted stores expose `hasHydrated` because an empty collection
before hydration is not proof that the user's collection is genuinely empty.
Store implementation and persistence decisions remain with
`react-client-store`.

## Owned cancellation and stale commits

`sites/arolariu.ro/src/hooks/useUserInformation.tsx` is useful live evidence
but contains debt rather than a pattern to copy. It owns an
`AbortController`, replaces an earlier request, and aborts during cleanup.
Current behavior suppresses some owned abort effects only in development and
still asserts the JSON body as a domain type without runtime validation.

New client work should distinguish:

- cleanup or supersession owned by the component/Hook;
- caller- or platform-owned cancellation that remains observable;
- stale completion after a newer request wins;
- post-unmount state writes;
- malformed successful transport data.

Aborting a request does not by itself prevent later `finally` or completion
logic from committing state. The implementation must guard the winner and
mounted/current ownership explicitly. The ordered procedure and test matrix
belong to `react-client-hook`.

## Context, refs, and callback identity

`sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
demonstrates two separate decisions:

- state and actions use separate contexts, and the actions value is stable for
  the provider lifetime; current exported hooks subscribe to both contexts and
  still re-render on dialog state changes, while the split preserves a future
  action-only seam;
- `useDialog` keeps `open` stable while a ref is refreshed after each render
  so the callback reads the latest payload.

The ref is justified because callback identity is intentionally stable while
the payload must stay current. Do not use a ref to hide an ordinary effect
dependency or to avoid rerendering state that the UI must display.

Changing the payload ref to a callback dependency alters callback identity and
can retrigger consumers. Removing the ref can make a stable callback dispatch
stale data. Preserve both behaviors with rerender-focused tests when that
boundary changes.

## Strict Mode and resource ownership

Development Strict Mode intentionally exercises setup-cleanup-remount. A
resource owner must be able to recreate timers, listeners, workers,
subscriptions, object URLs, observers, and requests after cleanup.

Treat these as defects when reachable:

- cleanup reports its own cancellation as a user-visible error;
- setup creates duplicate resources after remount;
- a disposed resource is reused instead of recreated;
- cleanup releases the wrong generation of a replaced resource;
- an earlier async completion wins after a newer invocation;
- module-scope browser access crashes SSR or test collection.

Use the actual public lifecycle in tests. Do not assert private ref values or
effect invocation counts when the contract is released resources, final
state, or absence of stale work.

## Client-specific anti-patterns

| Anti-pattern | Failure | Correct owner |
| --- | --- | --- |
| Broadening a page to `"use client"` for one interactive leaf | Ships server-compatible work to the client and can expose invalid imports | Extract the smallest `react-client-component` |
| Treating every abort as an error | Surfaces owned cleanup/supersession and can leave false error state | Track cancellation ownership in the Hook |
| Using a ref to suppress every dependency | Hides stale behavior rather than synchronizing intentionally | Keep ordinary dependencies; use the narrow latest-value pattern only when identity is contractual |
| Reading persisted state as settled before hydration | Produces false empty/default UI | Gate through the owning store's hydration contract |
| Casting `response.json()` to a domain type | Lets malformed wire data enter state | Parse `unknown` at the transport boundary |

## Live inspection pointers

- `sites/arolariu.ro/src/hooks/useUserInformation.tsx`
- `sites/arolariu.ro/src/hooks/useUserInformation.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.test.tsx`
- `sites/arolariu.ro/src/contexts/FontContext.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/island.tsx`
- `sites/arolariu.ro/src/workers/react/useWorker.test.tsx`
- `sites/arolariu.ro/src/stores/createEntityStore.ts`

Use `react-client-component`, `react-client-hook`, or `react-client-store` for
the actual procedure after the owning artifact is known.
