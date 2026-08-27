# Store Troubleshooting

Use only after a concrete failure.

| Symptom | Inspect first | Correction |
| --- | --- | --- |
| IndexedDB warning, blocked/open error, or store always empty | `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`, browser availability/permissions, table selection, adapter test | Preserve graceful no-storage behavior; fix the live adapter/table contract rather than adding a second storage mechanism. |
| Shared snapshot JSON parse/serialization failure | `createSharedStorage`, persisted projection, stored value type | Persist plain data only; add validation/migration or deliberately clear incompatible cache. |
| `Date` is a string or method is missing after reload | Entity versus shared adapter and persisted field path | Normalize/validate during hydration or migration; do not cast the value back to the domain type. |
| Server/client hydration mismatch | Server render, first client selector, `hasHydrated` handling | Render deterministic defaults/loading until hydration; never read IndexedDB in a Server Component. |
| Component re-renders continuously or React warns that snapshot must be cached | Selector allocates object/array, whole-store subscription, effect writing selected state | Select scalars or use `useShallow`; derive filtered output outside the selector; remove write-back effects. |
| Consumer does not update | Selector omits changed field, entity mutated in place, stale closure | Return new state from actions and select the exact field; preserve stable action dependencies. |
| Persisted old data returns after reset | In-memory reset versus `persist.clearStorage`, pending async write, rehydrate call | Test and execute both live-state reset and durable clearing in the intended order; await required persistence work. |
| `hasHydrated` never becomes true | `onRehydrateStorage` signature, storage promise/error path, test mock | Follow the current callback shape and ensure both empty and populated storage completion set the flag. |
| Fresh server result is overwritten by stale cache/result | Hydration/fetch/cross-tab completion order | Add an explicit precedence/generation/revision rule and a race test. |
| One account sees another account's cached state | Logout/account-switch owner, table/key partition, initial client render | Stop and treat as security-sensitive; clear/partition durably and fail closed under an approved design. |
| Cross-tab preferences echo or stop syncing | `sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.tsx` message guard, timeout cleanup, visibility rehydrate | Preserve echo suppression and cleanup; test sender/receiver and unmount. Do not generalize to entity stores implicitly. |
| Tests pass alone but fail together | Singleton store state, persisted database rows, fake timers/channels/subscriptions | Reset live state, clear actual storage, close listeners/channels, and restore timers/mocks in each test. |

If a correction needs a new store, persistence dependency/schema, user
partition, logout behavior, or migration with ambiguous data loss, stop and
ask.
