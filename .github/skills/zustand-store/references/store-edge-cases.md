# Store Edge Cases

Open for the matching state, persistence, or concurrency risk.

## Storage unavailable or failing

- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts` returns
  `null`/no-ops when IndexedDB is unavailable and logs adapter failures.
  Consumers must still reach a deterministic hydrated empty/default state.
- Do not leave a permanent loading shell when storage is blocked.
- Decide whether persistence failure is non-fatal cache loss or a user-visible
  failure. Never report data as durably saved if persistence is the product
  behavior.

## Corrupt or stale persisted state

- Shared JSON parsing can fail; entity rows can have an old domain shape.
- Validate durable data before behavior consumes it. Unknown/additive fields
  may be tolerated only when the domain parser/guard permits them.
- Use typed migration or deliberate invalidation for incompatible changes.
  Silent broad casts convert a recoverable cache problem into runtime UI drift.

## Hydration and refresh races

- Hydration, a client fetch, server-provided initial data, and cross-tab updates
  can complete in different orders.
- State the precedence rule and guard stale completions. A late old result must
  not overwrite a newer user action or account snapshot.
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.tsx`
  currently exposes persisted data after hydration and then refreshes it. A
  different merge policy needs its own tests.
- Keep `hasHydrated` transient; persisting it can falsely bypass loading on the
  next session.

## Entity identity and selection

- Upsert/update/remove compare stable `id` values. Test duplicate IDs,
  not-found IDs, and partial updates.
- When an entity updates or is removed, selected copies must update or be
  removed too; the generic factory owns this invariant.
- Bulk replacement can retain stale selection unless the store explicitly
  reconciles it. Inspect the live action rather than assuming.
- Do not use array index or mutable label as entity identity.

## Reset and durable clearing

- Test in-memory defaults/empty collections separately from persisted storage
  clearing and subsequent rehydration.
- Reset during an in-flight persistence write can be reordered. Await the
  repository storage operation when durable clearing is required.
- Decide whether hydration status remains true after a user reset; resetting it
  to false can reintroduce a loading state without a rehydrate operation.

## User/account ownership

- Domain caches can contain user-owned records. Current table selection alone
  is not an account partition.
- On account change, fail closed: do not briefly render the previous user's
  persisted entities while new auth/data loads.
- There is no generic logout cleanup contract to assume from the store barrel.
  Trace the actual auth owner and stop for approval before introducing or
  changing cross-user persistence.

## Selector and render stability

- Object selector without `useShallow` can re-render on every store change.
- A selector that allocates a new object/array each call can trigger React's
  external-store snapshot warning or render loop.
- Selecting the whole store makes unrelated changes observable. Use narrow
  scalar selectors or one shallow object selector.
- Actions created by the store are stable; do not wrap them in new selector
  closures without need.

## Cross-tab and concurrent writes

- Only the preferences owner currently broadcasts state between tabs. Its
  synchronization guard is time/lifecycle-sensitive and has cleanup tests.
- Entity adapter writes are transactional within IndexedDB operations, but that
  does not define business conflict resolution between tabs or network
  refreshes.
- If two writers can edit the same durable value, define last-write,
  revision/compare-and-swap, or server-authoritative behavior explicitly.
- Close channels/listeners and prevent echo loops.

## SSR and serialization

- Store hooks are client-only. Server Components may pass serializable initial
  data but must not read browser persistence.
- Do not import storage adapters into a server render path to “prehydrate” the
  store.
- Shared JSON storage cannot preserve rich runtime objects automatically;
  entity structured-clone behavior still does not validate domain meaning.
