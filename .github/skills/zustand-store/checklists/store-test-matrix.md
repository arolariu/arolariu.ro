# Store Test Matrix

Select rows owned by the change.

| Category | Prove | Live source |
| --- | --- | --- |
| Initial defaults | Every persisted/transient field starts correctly; hydration is initially incomplete where applicable | Tests under `sites/arolariu.ro/src/stores/` |
| Set/action behavior | Each changed action returns immutable state and preserves unrelated fields | `sites/arolariu.ro/src/stores/createEntityStore.test.ts` |
| Upsert/identity | Insert versus same-ID replacement, no duplicate, missing-ID behavior | Entity store tests |
| Selection consistency | Toggle/set/clear; update/remove reconciles selected copies; bulk replacement policy | Factory and scan tests |
| Derived getter | Reads current state and is not persisted as duplicate data | `sites/arolariu.ro/src/stores/preferencesStore.test.ts` |
| Reset | Live state returns to defaults/empty and related transient state is coherent | Preferences/entity/scan tests |
| Durable clear | Persisted rows/key are gone and do not return on rehydrate | Real storage/persist test |
| Partialization | Only approved durable fields are written; actions/loading/error/selection/hydration/sync remain transient | Factory/preferences/scan persist configs |
| Hydration | Empty and populated storage complete; `hasHydrated` transitions; loading distinguishes empty | Store plus consumer hook test |
| Compatibility | Old/additive/invalid shape follows merge, migration, validation, or invalidation policy | New focused migration test |
| Serialization | Dates/plain values round-trip according to the actual adapter; corrupt JSON is safe | `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts` |
| Storage unavailable/failure | SSR/blocked/error path resolves safely and does not hang hydration | `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts` |
| Stale refresh/race | Cached data appears only when allowed; fresh/current result wins over stale completion | `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.test.tsx` or owner-specific test |
| Selector behavior | Scalar/narrow object selector updates only for selected fields; object selector uses `useShallow` | `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoice.tsx`, `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.tsx` |
| Consumer UI | Not hydrated, hydrated empty, stale, success, and error render distinctly | Closest hook/island test |
| Cross-tab | Incoming update, echo suppression, visibility rehydrate, cleanup, unsupported-browser fallback | `sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.test.tsx` only when in scope |
| User ownership/logout | Previous account data cannot render; approved durable/device preferences remain or clear exactly | Security-sensitive integration test |
| Test isolation | Memory/storage/timers/channels/subscriptions do not leak across tests | Every singleton/persistence suite |

## Test discipline

- Run repository stores and storage adapters for real; fake IndexedDB is already
  part of website test setup.
- Use current domain builders for valid entities.
- Await persistence and rehydration through real observable APIs, not arbitrary
  sleeps.
- Restore globals and clear both memory and durable state.
- A migration test must prove both the old supported shape and invalid input
  behavior.
