---
name: react-client-store
description: Create or extend an approved Zustand client store using current arolariu.ro persistence, hydration, selector, reset, and account-isolation patterns.
---

# React Client Store

## When to Use

- Extend an explicitly requested existing global client store.
- Share client state across unrelated mounted route branches.
- Change approved persistence, hydration, reset, selector, or account-isolation
  behavior.
- Create a new store only after explicit approval.

## When Not to Use

- Do not use for server-owned data, URL state, one component/form, one mounted
  subtree, or reusable hook logic.
- Prefer render derivation/local state for local interaction and Context for
  scoped coordination.
- Do not use a store as a replacement for transport validation, Server
  Actions, or authentication ownership.

## Required Inputs

- State owner and every current/proposed consumer.
- Why server, URL, local state, Context, hooks, and existing stores are
  insufficient.
- Persisted versus transient fields, actions, invariants, derived values,
  hydration UI, reset/logout, and user ownership.
- RFC 1005/1007, nearest guides/instructions, store barrel, closest
  store/factory/storage implementation and tests, and a live consumer.
- Explicit approval for a new store.

## Decision Points

1. Is global ownership justified and does an existing store already own it?
2. Does `createEntityStore`, the specialized scans store, or preferences store
   match the shape?
3. Which fields are durable, transient, or derived?
4. What is the hydration and stale-data precedence contract?
5. How do reset, persisted clearing, logout, and account switching behave?
6. Does a persisted shape change require versioning, migration, validation, or
   invalidation?
7. Which selectors are scalar and which require `useShallow`?

## Core Procedure

1. Trace consumers and prove narrower owners are insufficient. Obtain approval
   before creating a new store.
2. Read the closest store, `createEntityStore.ts`, IndexedDB storage, tests,
   barrel, and a live consumer.
3. Write a failing invariant test with the real store/storage setup and reset
   singleton state between cases.
4. Define precise state/action types; keep derived values out of stored state.
5. Persist only durable fields through `partialize`; keep selection, loading,
   errors, hydration, and sync state transient unless requirements prove
   otherwise.
6. Reuse the entity factory only when its contract fits; do not force
   specialized domain actions into it.
7. Define hydration, migration/validation, stale-data reconciliation, reset,
   and account isolation explicitly.
8. Update consumers with narrow stable selectors and `useShallow` for object
   selections.
9. Run targeted store/consumer tests and routine website validation when the
   client graph changes.

## Resource Triggers

| Trigger | Load |
| --- | --- |
| Before choosing server/URL/local/Context/hook/existing/new store ownership | [State placement decision table](references/state-placement-decision-table.md) |
| Persisted field, hydration, partialization, migration, reset, or cross-tab change | [Persistence and rehydration](references/persistence-and-rehydration.md) |
| Ownership, stale data, selection, race, serialization, storage, or concurrency edge | [Store edge cases](references/store-edge-cases.md) |
| Need a current store/factory/storage/consumer | [Live stores](examples/live-stores.md) |
| Sibling confirms a matching store test shape | [Stable store tests](templates/stable-store-tests.md) |
| Before selecting store test categories | [Store test matrix](checklists/store-test-matrix.md) |
| Concrete IndexedDB, serialization, hydration, render-loop, selector, stale-state, or isolation failure | [Troubleshooting](references/troubleshooting.md) |

## Verification

- Global ownership and any new-store approval are explicit.
- Persisted/transient/derived state has a compatibility, hydration, reset, and
  account-isolation contract.
- Consumers use narrow stable selectors.
- Changed defaults/actions/persistence/hydration/reset behavior is tested.

## Stop and Ask

- New store, persistence dependency, or schema.
- Cross-user/security-sensitive persisted data.
- Persisted-shape change without safe migration/invalidation.
- Unresolved logout/account-switch or cross-tab behavior.

## Completion Contract

Report why global ownership is justified, the persisted/transient split,
hydration/migration/reset/account behavior, selectors/consumers, tests, and
only material residual risk.
