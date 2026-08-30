# Hook Ownership and Lifecycle Decisions

Use this before implementing a custom hook.

## Ownership

| Signal | Owner |
| --- | --- |
| Knows one route's reducer, action, upload model, or route-only types | The route's `_hooks/` directory |
| Used by unrelated website routes and depends only on website-shared types | `sites/arolariu.ro/src/hooks/` |
| Only one component needs the behavior | Keep it in that component unless extraction creates a testable lifecycle boundary |
| Coordinates unrelated mounted branches or persists across navigation | Re-evaluate state ownership; route to the approved store workflow rather than hiding a store in a hook |

A hook's location follows its consumers, not its generic-sounding name. Moving
a route hook into `src/hooks/` widens its contract and requires reading every
consumer first.

## Derivation, state, event, or effect

| Need | Choice |
| --- | --- |
| Filter, clamp, sort, paginate, or combine current inputs | Derive during render; memoize only for structural or measured need |
| Remember a user's choice that may diverge from inputs | Local state/reducer |
| Run work because a consumer called a returned function | Event/callback |
| Subscribe to or synchronize with a browser/external system | Effect with cleanup |
| Keep a stable callback while reading the latest payload during later invocation/cleanup | Ref refreshed by a narrow effect |

Do not copy props into state merely to synchronize them. Document intentional
reset behavior when an input changes.

## Latest-ref pattern

Use a latest ref only when both are true:

1. callback or cleanup identity must remain stable for a consumer/external
   registration; and
2. that later callback must read the newest value without resubscribing.

Refresh the ref in a narrow effect keyed to the current value, then let the stable callback read
`ref.current`. Do not use a ref to conceal an ordinary missing dependency or
to bypass rerendering that the UI contract needs.

## Cleanup and async ownership

For each disposable resource, name its owner and terminal event:

| Resource | Required decision |
| --- | --- |
| Timer / animation frame | Cancel on replacement and unmount; decide whether queued work is discarded or flushed |
| Event listener / observer / subscription | Remove the exact registered instance |
| Object URL | Revoke once, only if owned, after the final consumer |
| Request / async operation | Identify current invocation, cancellation source, and stale-result policy |

Abort is not sufficient by itself: downstream code can still resolve or enter
`finally`. Pair cancellation with an invocation token, sequence number, or
owned signal check before every state commit. Cleanup and supersession aborts
are expected outcomes; surface only unexpected failures.

## Consumer contract

Specify:

- required/defaulted inputs and whether input identity matters;
- returned state and commands;
- which callbacks are stable and why;
- what rerendering with changed inputs resets or preserves;
- loading, success, empty, error, and cancellation states when applicable;
- whether cleanup is automatic or a returned command transfers ownership.

Avoid returning raw setters when a named command can preserve invariants.
