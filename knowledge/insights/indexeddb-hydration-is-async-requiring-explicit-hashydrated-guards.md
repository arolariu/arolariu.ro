---
description: "Every store includes a hasHydrated boolean and setHasHydrated action; client components must check hasHydrated before rendering persisted data to avoid flash-of-empty-state"
type: gotcha
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# IndexedDB hydration is async requiring explicit hasHydrated guards

Unlike localStorage (which is synchronous), IndexedDB reads are asynchronous. When a Zustand store initializes, its in-memory state starts empty -- the persisted data from IndexedDB arrives after a microtask delay. Without guarding against this timing gap, components will render an empty state (no invoices, no preferences) for one frame before the persisted data arrives, producing a visible flash-of-empty-state or, worse, triggering data-fetching side effects that overwrite the local cache with stale server data.

The solution is a `hasHydrated` boolean in every store's in-memory state layer, initialized to `false`. The persist middleware's `onRehydrateStorage` callback fires after IndexedDB data is loaded and calls `setHasHydrated(true)`. Every client component that reads persisted data must check this flag before rendering: `if (!hasHydrated) return <Loading />`. This is not optional -- skipping the guard means the component renders with default empty state and may dispatch actions (like fetching from the API) that race against the hydration callback.

The `hasHydrated` field deliberately lives in the in-memory state layer (not the persisted layer) because persisting a hydration flag would create a circular dependency -- the flag tracks whether persistence loading is complete, so it cannot itself be a persisted value.

---

Related Insights:
- [[indexeddb-entity-level-storage-via-dexie-handles-large-offline-datasets]] -- foundation: the async nature of this storage backend creates the problem
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] -- extends: hasHydrated belongs in the in-memory layer by design
- [[server-data-merges-into-zustand-store-after-hydration-completes]] -- enables: the hydration guard makes server-to-client data handoff safe

Domains:
- [[frontend-patterns]]
