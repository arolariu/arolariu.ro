---
description: "createEntityStore<E> generates a full Zustand store with IndexedDB persistence, selection management, upsert, and DevTools from a 3-field config object"
type: pattern
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Generic entity store factory eliminates CRUD boilerplate through Zustand generics

The `createEntityStore<E>` factory at `sites/arolariu.ro/src/stores/createEntityStore.ts` accepts a configuration object with three fields -- `tableName`, `storeName`, and `persistName` -- and produces a complete Zustand store typed to the entity `E extends BaseEntity`. The generated store includes CRUD operations (set, upsert, update, remove, clear), multi-select with toggle, hydration tracking, IndexedDB persistence via Dexie, and Redux DevTools integration in development.

The key design insight is the separation between the store's generic infrastructure and the entity-specific type parameter. All entity stores share identical CRUD mechanics; only the shape of the stored data changes. By encoding this observation into a factory function, the codebase avoids duplicating ~80% of store code for each new entity type. A new entity store becomes a three-line declaration instead of a 100+ line file.

The factory enforces the `BaseEntity` constraint (requires a string `id` field), which guarantees that upsert can reliably detect whether an entity already exists. This constraint propagates through the type system -- attempting to create an entity store for a type without `id` produces a compile error, not a runtime bug.

Since [[entity-store-state-splits-into-persisted-entities-and-transient-selection]], the factory also encodes the decision about what survives page refresh and what resets. Selection state and hydration flags are transient by design, while entity data persists through IndexedDB.

---

Related Insights:
- [[entity-store-state-splits-into-persisted-entities-and-transient-selection]] — foundation: the state split this factory encodes
- [[hydration-tracking-prevents-flash-of-empty-content-from-indexeddb-restore]] — extends: hydration is a built-in concern of every factory-created store
- [[useShallow-selectors-prevent-unnecessary-zustand-store-re-renders]] — enables: factory stores work best with selective subscriptions
- [[entity-store-factory-awaits-incremental-migration-from-hand-rolled-stores]] — constraint: adoption status of this factory

Domains:
- [[frontend-patterns]]
