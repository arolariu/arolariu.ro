---
description: "Server Components fetch fresh data and pass it as props; client islands wait for hasHydrated, then call setEntities to merge server data over persisted IndexedDB state"
type: pattern
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Server data merges into Zustand store after hydration completes

The RSC-to-Zustand handoff follows a specific sequence: the Server Component fetches data from the API, wraps the client island in a Suspense boundary, and passes the fetched data as `initialData` props. Inside the client island, a `useEffect` waits for `hasHydrated` to become `true` before calling `setInvoices(initialData)`. This ordering is critical -- if the effect fires before hydration, it would overwrite data that IndexedDB is about to restore, creating a race condition where the store alternates between server state and persisted state.

The merge strategy is "server wins": when both IndexedDB and the server provide data, server data takes precedence because it is assumed to be more current. The persisted IndexedDB data serves as a fallback for offline scenarios where the server fetch fails or the page loads without network connectivity. This is a deliberate trade-off -- if the user modifies data locally while offline and then reconnects, the server fetch will overwrite those local changes. Conflict resolution beyond "server wins" is not currently implemented.

The `useEffect` dependency array includes `[hasHydrated, initialData, setInvoices]`, ensuring the merge runs exactly once after hydration and does not re-trigger on unrelated re-renders. The Suspense boundary on the server side prevents the client island from mounting until the server data is available, avoiding a second race where the island mounts with `undefined` initialData.

---

Related Insights:
- [[zustand-stores-live-exclusively-in-client-island-components]] -- foundation: the Island pattern that creates this server-to-client boundary
- [[indexeddb-hydration-is-async-requiring-explicit-hashydrated-guards]] -- foundation: the hydration guard that makes this merge safe
- [[selective-zustand-subscriptions-prevent-unnecessary-re-renders]] -- extends: after the merge, components should subscribe selectively to avoid re-render storms

Domains:
- [[frontend-patterns]]
