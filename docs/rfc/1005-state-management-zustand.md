# RFC 1005: State Management with Zustand

- **Status**: Implemented
- **Date**: 2025-12-25
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `sites/arolariu.ro/src/stores/`

---

## Abstract

The website uses Zustand for genuinely global client state. Invoice and
merchant stores share a generic entity-store factory with entity-level
IndexedDB persistence. Scans retain a specialized store because their cached
lifecycle exceeds the generic entity contract. Preferences use a separate
key/value persisted shape.

Zustand stores are client-side boundaries. Server Components may pass
serializable initial data to client islands, but they do not subscribe to
Zustand directly.

## State placement

Choose URL state first when behavior is bookmarkable, shareable, or
navigation-owned. Otherwise choose the narrowest owner:

1. derive values during render when possible;
2. use local component state for one component lifetime;
3. use Context for one mounted subtree;
4. reuse an existing store when it already owns the global contract;
5. create/extend Zustand only when state is shared across unrelated client
   branches or must persist globally.

Creating a new store or persisted field changes architecture/data ownership
and requires the repository checkpoint.

## Current store inventory

| Store | Implementation | Persisted state | In-memory state |
| --- | --- | --- | --- |
| `useInvoicesStore` | `createEntityStore<Invoice>` | `entities` in the `invoices` table | `selectedEntities`, `hasHydrated` |
| `useMerchantsStore` | `createEntityStore<Merchant>` | `entities` in the `merchants` table | `selectedEntities`, `hasHydrated` |
| `useScansStore` | Specialized store | `scans` in the `scans` table | `selectedScans`, sync/cache state, `hasHydrated` |
| `usePreferencesStore` | Specialized key/value store | preference fields under the shared table | `hasHydrated` and derived actions |

Do not assume one field naming convention for every store. Invoice/merchant
consumers use `entities`; scan consumers use `scans`.

## Generic entity store

`createEntityStore<E>` requires an entity with a stable `id` and creates:

```typescript
type EntityState<E> = Readonly<{
  entities: ReadonlyArray<E>;
  selectedEntities: E[];
  hasHydrated: boolean;
}>;
```

Its actions include set/upsert/update/remove, selection, lookup, clearing, and
hydration state. The exact public types and implementation are owned by
`src/stores/createEntityStore.ts`.

Invoice and merchant stores configure the factory with their table, devtools
name, and persist key:

```typescript
export const useInvoicesStore = createEntityStore<Invoice>({
  tableName: "invoices",
  storeName: "InvoicesStore",
  persistName: "invoices-store",
});
```

Scans do not use the factory because they own scan-specific status, naming,
blob URL, metadata, archive, invoice-use, selection, and transient sync-state
transitions. Generalizing the factory for scans requires explicit
characterization and approval; it is not an automatic cleanup.

## IndexedDB adapter

`storage/indexedDBStorage.ts` owns the Dexie database:

```text
zustand-store
├── shared      key/value preference snapshots
├── invoices    id primary key, merchantReference index
├── merchants   id primary key, parentCompanyId index
└── scans       id primary key, status index
```

Entity tables store each domain object as one row. The adapter reconstructs
the persisted array on hydration and uses a transaction to synchronize
additions, updates, and removals.

The `persist` middleware name is not the IndexedDB table name; both values
belong to the store configuration and must remain stable unless a data
migration is approved.

## Hydration contract

Every persisted store starts with `hasHydrated: false`. An empty collection
before hydration is ambiguous; it does not mean the user has no data.

Client UI should select the exact fields/actions it needs:

```tsx
"use client";

const {entities, hasHydrated} = useInvoicesStore(
  useShallow((state) => ({
    entities: state.entities,
    hasHydrated: state.hasHydrated,
  })),
);

if (!hasHydrated) return <Loading />;
if (entities.length === 0) return <EmptyState />;
```

Use `useShallow` for object-shaped selectors. Preserve server-safe initial
state so the first client render does not contradict the server output.

## Persistence boundaries

Persist only fields intended to survive reload:

- invoice/merchant `entities`;
- scan records, excluding selection/sync state;
- the documented preference subset.

Selection, hydration flags, in-flight status, and ephemeral UI state remain
in-memory unless an approved contract says otherwise.

On removal, clear any selected entity that no longer exists. During hydration,
discard stale fields through the owning merge/partialization behavior rather
than preserving unknown state accidentally.

## Preferences

`usePreferencesStore` remains separate from the entity factory. It owns
locale, theme/font/gradient state and persistence under the shared table.
Browser cookie, BroadcastChannel, visibility, and DOM synchronization are
owned by `PreferencesSubscriptions`.

Do not move route-local visual state into preferences or treat the preference
shape as a generic entity collection.

## Devtools

Development builds wrap the current stores with Zustand devtools while
production uses persistence without that wrapper. Devtools names are useful
diagnostic identity and should remain stable when the store itself is not
being renamed.

## Testing

Test:

- initial state and public actions;
- upsert/update/remove and selection cleanup;
- `hasHydrated` transitions;
- partialization and stale-field removal;
- the real IndexedDB adapter's entity synchronization;
- consuming UI's loading versus genuinely empty behavior;
- preferences cross-tab/cookie behavior where changed.

Repository behavior should execute through real repository modules. Existing
store suites that replace `indexedDBStorage` cannot prove persistence or
hydration integration; use the configured external IndexedDB implementation
with the real store/adapter when that contract changes.

## Trade-offs

Entity-level IndexedDB avoids rewriting one large serialized snapshot and
supports efficient updates, but hydration is asynchronous and requires an
explicit UI state. Specialized stores remain appropriate when their lifecycle
cannot be represented by the generic entity contract without weakening type or
behavior ownership.

## References

- `sites/arolariu.ro/src/stores/createEntityStore.ts`
- `sites/arolariu.ro/src/stores/invoicesStore.tsx`
- `sites/arolariu.ro/src/stores/merchantsStore.tsx`
- `sites/arolariu.ro/src/stores/scansStore.tsx`
- `sites/arolariu.ro/src/stores/preferencesStore.ts`
- `sites/arolariu.ro/src/stores/storage/indexedDBStorage.ts`
- [RFC 1007](./1007-advanced-frontend-patterns.md)
- [Zustand](https://zustand.docs.pmnd.rs/)
- [Dexie](https://dexie.org/)
