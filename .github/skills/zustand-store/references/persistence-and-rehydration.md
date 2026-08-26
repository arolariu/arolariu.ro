# Persistence and Rehydration

Use whenever durable state or hydration behavior changes.

## Live persistence owners

| Shape | Store owner | Storage owner |
| --- | --- | --- |
| Generic ID-based entities | `sites/arolariu.ro/src/stores/createEntityStore.ts` | `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts` entity adapter |
| Invoice and merchant collections | Thin wrappers in `sites/arolariu.ro/src/stores/invoicesStore.tsx` and `sites/arolariu.ro/src/stores/merchantsStore.tsx` | Dedicated entity tables |
| Scan collection plus scan-specific transient lifecycle state | `sites/arolariu.ro/src/stores/scansStore.tsx` | Entity adapter targeting the scans table |
| Preference snapshot | `sites/arolariu.ro/src/stores/preferencesStore.ts` | Shared key/value adapter |

The entity adapter stores each entity as a row and performs transactional
diff-based delete/upsert. The shared adapter serializes a Zustand
`StorageValue` snapshot as JSON. Re-read the adapters before relying on
serialization behavior.

## Persisted versus transient

Persist only values that must survive reload and are safe for the approved
user/device lifetime.

| Usually persisted in current owners | Usually transient |
| --- | --- |
| Entity collection or approved preference fields | Selection |
| Stable user preference values | `hasHydrated` |
| Durable cached scan records | Loading/error flags |
| | In-flight/sync flags and last in-memory operation state |
| | Actions and render-derived values |

`partialize` is the executable persistence contract. Keep its return type
explicit and test it through behavior. When adding a field, decide separately
whether it belongs in state and whether it belongs in `partialize`.

## Hydration timing

- Stores start with defaults and `hasHydrated: false`.
- Current stores set the flag from `onRehydrateStorage`, including when storage
  returns no value.
- Consumers that depend on persisted data must distinguish “not hydrated” from
  “hydrated and empty.” See
  `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.tsx`.
- Avoid server-rendering browser-persisted values as though they were already
  known. Use a deterministic shell/fallback until hydration or pass
  server-owned initial data with an explicit precedence rule.
- A background refresh may show stale persisted data after hydration. Define
  whether fresh server data replaces, merges, or rejects the cached snapshot.

## Merge, validation, version, and migration

The Dexie database schema version and Zustand persisted-state version are
different contracts. A storage table migration does not migrate a changed
Zustand state shape.

The current persist configurations should be inspected for `version`,
`migrate`, and `merge` before every shape change; do not assume a migration
exists. Choose one explicit policy:

| Change | Safe policy |
| --- | --- |
| Add optional field with a trustworthy default | Validate/merge old state with current defaults |
| Rename/remove/change meaning or type | Persist version plus typed migration |
| Cached data can be discarded safely | Invalidate/clear old persisted data deliberately |
| Security/user ownership changes | Stop and ask; migration must fail closed |

Do not spread unknown persisted objects directly over current state. Parse or
guard the durable subset, reject invalid entities/fields, and preserve current
actions/transient defaults.

## Dates and serialization

- Entity rows use IndexedDB structured data; shared snapshots use JSON.
- Confirm the actual adapter and domain type before assuming `Date` survives.
- Transport parsers normalize backend timestamps, but persisted stale data may
  predate a parser change. Validate/migrate at the persistence boundary when
  methods or date semantics are required.
- Never persist `Error`, function, DOM, request/response, signal, class behavior,
  or another non-data object.

## Reset, logout, and user ownership

- An in-memory reset action and `persist.clearStorage()` are separate
  operations.
- Entity `clearEntities`/scan `clearScans` and preference `resetToDefaults`
  update live state; inspect middleware behavior and tests before claiming
  durable data is cleared.
- The current storage adapter uses domain tables/shared keys rather than an
  account-partition parameter. Do not add user-sensitive durable state without
  an explicit account-switch/logout isolation design.
- Before logout/account switch, define which caches are cleared, which device
  preferences intentionally remain, how in-flight writes are handled, and what
  another tab should observe. This is security-sensitive and requires approval.

## Selector stability

- Select a scalar/function directly when possible.
- Wrap object-shaped selectors with `useShallow`; current examples live in
  `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoice.tsx`
  and
  `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.tsx`.
- Do not return a newly allocated filtered array/object from a selector on every
  store update unless using a suitable equality strategy. Prefer selecting the
  stable source and deriving in the component.
- Avoid whole-store subscriptions such as `usePreferencesStore()` in new code
  when only a few fields are needed.

## Cross-tab behavior

Cross-tab synchronization is currently implemented for preferences by
`sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.tsx`, using
BroadcastChannel plus visibility-triggered rehydration and feedback-loop
suppression. Its tests are colocated.

Do not infer the same behavior for invoice, merchant, or scan stores. Adding
cross-tab concurrency, conflict resolution, or account-wide propagation is a
separate behavior decision. Reuse the preference implementation only when the
state owner and security semantics match and approval covers the change.
