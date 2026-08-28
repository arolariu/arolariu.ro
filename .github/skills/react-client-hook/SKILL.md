---
name: react-client-hook
description: Create or materially change a website or shared-package React client hook. Use for ownership, API, derived state, effects, cleanup, cancellation, races, exports, and colocated Vitest renderHook coverage.
---

# React Client Hook

## When to Use

- Create or materially change a custom React hook.
- Extract reusable client behavior from a route subtree or share it across
  unrelated website routes.
- Create or change an explicitly requested reusable hook in
  `packages/components`.
- Change a hook's public input/output contract, effect lifecycle, cancellation,
  stale-result handling, or cleanup.
- Add focused `renderHook` coverage for a hook contract.

## Boundaries

- This skill owns hook logic, not component markup.
- Route-local hooks belong under the owning route (normally `_hooks/`);
  website-shared hooks belong in `sites/arolariu.ro/src/hooks/`.
- Package hooks belong under the existing `packages/components/src` hook
  convention and follow package exports/tests and the component-library guide.
- Use `react-client-component` for markup and interaction semantics,
  `react-server-action` for a `"use server"` export, and
  `react-client-store` for an approved Zustand change.
- Authentication policy is owned by `react-auth`; a hook may consume an
  established auth snapshot but must not decide access.

## Required Inputs

- The hook's consumers, ownership scope, observable contract, and expected
  behavior on rerender and unmount.
- Inputs that are authoritative, values that are derived, and state that may
  intentionally diverge.
- Every external system synchronized by an effect and its disposal,
  cancellation, supersession, and failure behavior.
- Root and website guides, React/TypeScript/frontend instructions, the closest
  live hook and colocated test.

## Procedure

1. Read all direct consumers and a same-lifecycle sibling. Decide route-local
   versus website-shared ownership before defining the API.
2. Specify precise readonly inputs and outputs, callback identity guarantees,
   initial state, rerender semantics, errors, and cleanup responsibilities.
3. Derive values during render. Store only user intent or values that must
   outlive/reliably diverge from their source.
4. Use effects only for an external synchronization or the narrow latest-ref
   pattern supporting an intentionally stable callback. Include complete
   dependencies.
5. For timers, animation frames, subscriptions, object URLs, observers, or
   requests, define cleanup first. Track ownership so cleanup/supersession is
   not reported as an unexpected error.
6. For overlapping async work, define which invocation wins. Abort when the
   boundary supports it and also prevent stale or post-unmount commits.
7. Keep the returned surface minimal and stable only where consumers require
   stability; do not add memoization by reflex.
8. Write colocated Vitest/Testing Library hook tests for initial output,
   updates/rerenders, cleanup, and the applicable race/error branches.
9. For package hooks, update intentional public exports and run the package
   validation; otherwise run the smallest website verification required by
   changed imports or types.

## Resource Triggers

| Trigger | Resource |
| --- | --- |
| Before deciding ownership, state versus derivation, effect need, latest-ref use, or async winner | [Hook ownership and lifecycle decisions](references/ownership-and-lifecycle.md) |
| Need a verified sibling for derivation, object URL cleanup, animation-frame coalescing, timer cleanup, or current fetch debt | [Live hook examples](examples/live-hooks.md) |
| Before selecting hook test cases | [Hook test matrix](checklists/hook-test-matrix.md) |

## Verification

- Ownership is no broader than the consumer set.
- The API documents initial, rerender, callback identity, error, and cleanup
  behavior without exposing implementation-only state.
- Effects have a real lifecycle owner, complete dependencies, deterministic
  cleanup, and stale/post-unmount write protection where needed.
- Tests exercise the public hook result and real lifecycle rather than private
  refs or effect counts.

## Stop and Ask

- A new dependency, Zustand store, or persistence boundary is required.
- Authentication/authorization behavior would change.
- The work actually creates or materially changes a Server Action.
- Consumers require materially different API or cancellation semantics.

## Completion Contract

Report the ownership and API contract, derivation/state/effect choices,
cleanup/race behavior, exact targeted tests and verification run, and only
material residual risk or incomplete validation.
