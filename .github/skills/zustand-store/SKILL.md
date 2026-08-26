---
name: zustand-store
description: Create or extend a Zustand store using current arolariu.ro state-management patterns. Use only for genuinely global client state after confirming local state or Context is insufficient; inspect existing stores and RFC 1005 first.
---

# Zustand Store

## When to Use

- Extend an explicitly requested existing global client store.
- Share client state across unrelated mounted route branches.
- Change approved persistence, hydration, reset, or selector behavior.
- Create a new store only after the required explicit approval.

## When Not to Use

- Do not use for request/server-owned data, shareable URL state, one component,
  one form, or one mounted subtree.
- Prefer render derivation/local state for local interaction and Context for
  scoped coordination.
- Do not treat Zustand as a replacement for transport validation, server
  actions, or authentication ownership.
- Do not create a new store merely because an existing component has prop
  drilling.

## Required Inputs

- State owner and every current/proposed consumer.
- Why Server Component/URL/local state/Context and existing stores are
  insufficient.
- Persisted versus transient fields, actions, invariants, derived values,
  hydration UI, reset/logout, and user-ownership behavior.
- RFC 1005 and relevant RFC 1007 sections; website/TypeScript/React/frontend
  guidance; store barrel; closest store/factory/storage implementation and
  tests; at least one live consumer.
- Explicit approval if the requested behavior requires a new store.

## Decision Points

Before editing, decide:

1. The narrowest correct state owner and whether an existing store already
   owns it.
2. Whether the generic entity-store factory, the hand-rolled scans pattern, or
   preferences/shared storage matches the state shape.
3. The exact persisted projection and which fields must remain transient or
   derived.
4. The first-render/hydration contract and stale-versus-fresh data precedence.
5. Reset, persisted-storage clearing, logout, and cross-user isolation.
6. Whether a persisted shape change needs an explicit persist version,
   migration, merge/validation, or safe invalidation strategy.
7. Selector granularity and whether an object selector requires `useShallow`.
8. Which behavior tests prove defaults, actions, persistence, hydration, reset,
   and selector stability without mocking repository modules.

## Core Procedure

1. Trace consumers and prove the state cannot be server/URL/local/Context-owned.
   If a new store remains necessary, obtain explicit approval before creation.
2. Read the full closest store,
   `sites/arolariu.ro/src/stores/createEntityStore.ts`,
   `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`, their tests, the
   barrel, and a live consumer.
3. Write a failing test for the requested invariant using the real store and
   repository storage/test setup. Isolate singleton state and persisted data.
4. Define or update precise state/action types. Keep derived values out of
   stored state and keep actions cohesive with the existing owner.
5. Project only durable fields through `partialize`; keep selection, loading,
   errors, hydration flags, sync flags, and other session state transient unless
   live requirements prove otherwise.
6. Reuse `createEntityStore` for an ID-based entity collection whose required
   actions match it. Extend an existing specialized store rather than forcing
   domain actions into the generic factory.
7. Define hydration completion and stale-data reconciliation explicitly.
   Validate or migrate old persisted shape before exposing it to consumers.
8. Implement reset and persisted clearing according to the approved user
   ownership contract. Do not infer logout safety from an in-memory reset.
9. Update consumers with scalar selectors or `useShallow` for object selectors;
   keep selector outputs stable and avoid whole-store subscriptions.
10. Update the store barrel only for an intentional public export, then run
    targeted store/consumer tests and routine website verification when the
    client graph changes.

## Resource Triggers

| Named trigger | Resource |
| --- | --- |
| Before choosing Server/URL/local/Context/existing store/new store | [State placement decision table](references/state-placement-decision-table.md) |
| Any persisted field, hydration, partialization, migration, reset, or cross-tab change | [Persistence and rehydration](references/persistence-and-rehydration.md) |
| User ownership, stale data, selection consistency, races, serialization, unavailable storage, or concurrency edge case | [Store edge cases](references/store-edge-cases.md) |
| Need a current store/factory/storage/consumer example | [Live stores](examples/live-stores.md) |
| A live sibling confirms a matching default/action/reset/persistence/hydration/selector test shape | [Stable store tests](templates/stable-store-tests.md) |
| Before choosing store behavior test categories | [Store test matrix](checklists/store-test-matrix.md) |
| Only after an IndexedDB, serialization, hydration, render-loop, selector, stale-state, or isolation failure | [Store troubleshooting](references/troubleshooting.md) |

## Verification

- Global ownership is justified and a new store, if any, was explicitly
  approved.
- Persisted projection excludes transient/derived state and has a defined
  compatibility, hydration, reset, and user-isolation contract.
- Consumers use narrow stable selectors; object selections use `useShallow`.
- Defaults, changed actions/invariants, selection consistency, reset,
  persistence/rehydration, stale data, and selector behavior are tested as
  applicable with isolated real repository modules.
- Targeted tests pass; run routine website verification when imports, generated
  types, or client rendering are affected.

## Stop and Ask

- New store
- New persistence dependency or schema
- Cross-user/security-sensitive persisted data
- Public behavior ambiguity
- Persisted-shape change without a safe migration/invalidation policy
- Logout/account-switch semantics or cross-tab behavior not already owned by
  live code

## Completion Contract

State why global ownership is justified, the exact persisted/transient split,
hydration/merge/reset/user-ownership behavior, selectors and consumers changed,
tests/verification run, and only material residual risk or incomplete
validation.
