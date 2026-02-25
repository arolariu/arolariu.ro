---
description: "Custom Dexie.js adapter stores each entity as a separate IndexedDB row rather than serializing the entire collection, enabling efficient partial updates and scaling to thousands of records"
type: pattern
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# IndexedDB entity-level storage via Dexie handles large offline datasets

The persistence layer uses a custom `createIndexedDBStorage` adapter built on Dexie.js that maps each domain entity to an individual IndexedDB row. When the invoices store persists, each Invoice object becomes its own row in the `invoices` table with its `id` as the primary key, rather than the entire `Invoice[]` array being serialized into a single blob. This design choice means updating one invoice writes only that row, not the full collection -- a critical efficiency gain when the store holds hundreds or thousands of entities.

The adapter accepts a configuration object specifying the table name and entity key: `createIndexedDBStorage<InvoicesPersistedState, Invoice>({ table: "invoices", entityKey: "invoices" })`. All domain stores (invoices, merchants, scans) share a single IndexedDB database named `zustand-store` with separate tables. The preferences store is the exception -- it uses a `shared` table with key-value semantics because its state is a flat object rather than an entity collection.

This architecture gives the application offline-first behavior by default. Since IndexedDB has no practical storage limit (browser-dependent, but typically hundreds of MB), it removes the 5MB ceiling that ruled out localStorage. The trade-off is that IndexedDB operations are asynchronous, which introduces the [[indexeddb-hydration-is-async-requiring-explicit-hashydrated-guards|hydration timing problem]] that every consuming component must handle.

---

Related Insights:
- [[zustand-chosen-over-redux-and-jotai-for-minimal-boilerplate-with-persistence]] -- enables: this adapter is what makes Zustand's persist middleware viable for large datasets
- [[indexeddb-hydration-is-async-requiring-explicit-hashydrated-guards]] -- extends: the async nature of this storage creates the hydration challenge
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] -- foundation: the three-layer pattern determines what gets written through this adapter

Domains:
- [[frontend-patterns]]
