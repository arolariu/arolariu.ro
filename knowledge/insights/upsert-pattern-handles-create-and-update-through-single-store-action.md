---
description: "Each entity store exposes an upsertEntity action that checks for existing ID and either inserts or replaces, preventing duplicate entries when syncing with the API"
type: pattern
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Upsert pattern handles create and update through single store action

Every domain entity store (invoices, merchants, scans) exposes an `upsert{Entity}` action alongside the standard `set`, `remove`, and `update` actions. The upsert checks whether an entity with the given ID already exists in the store's collection: if it exists, the entity is replaced; if not, it is appended. This eliminates a common bug class in offline-first applications where syncing data from the API creates duplicate entries because the calling code does not know whether the entity was already cached locally.

The upsert is the preferred action when receiving data from the server, because the client cannot reliably know whether an entity was previously persisted in IndexedDB from a prior session. A component calling `syncInvoice` fetches from the API and passes the result to `upsertInvoice` without needing to check local state first. This simplifies the sync logic to a single code path: fetch then upsert.

The `update{Entity}` action (which accepts `Partial<Entity>`) is reserved for local modifications where the entity is known to exist -- for example, editing a field in a form. The `set{Entities}` action replaces the entire collection and is used only during the initial server-to-client merge after hydration.

---

Related Insights:
- [[server-data-merges-into-zustand-store-after-hydration-completes]] -- enables: upsert is the safe action for API sync flows
- [[indexeddb-entity-level-storage-via-dexie-handles-large-offline-datasets]] -- foundation: entity-level storage makes individual upserts efficient at the persistence layer

Domains:
- [[frontend-patterns]]
