---
description: "Redux Toolkit rejected for boilerplate, React Context for no persistence, localStorage for 5MB limit, Jotai for poor entity collection fit, React Query for server-state focus"
type: decision
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Zustand chosen over Redux and Jotai for minimal boilerplate with persistence

The state management stack evaluated five alternatives against four requirements: local persistence, type safety, minimal boilerplate, and React 19 Server Component compatibility. Redux Toolkit was rejected despite its maturity because its action/reducer ceremony is disproportionate for an application managing a handful of domain entity collections. React Context was eliminated because it lacks built-in persistence and would require prop drilling for state shared across distant component subtrees. localStorage hit a hard 5MB ceiling that cannot accommodate thousands of invoice records. Jotai's atomic model excels at independent scalar values but becomes awkward when the primary data structures are entity arrays that need bulk operations like upsert and filter. React Query focuses on server cache synchronization, not offline-first local persistence.

Zustand's hook-based API requires no Provider wrapping, composes naturally with the [[zustand-stores-live-exclusively-in-client-island-components|Island pattern]], and integrates with persist middleware for pluggable storage backends. The trade-off is a smaller ecosystem and fewer opinionated patterns compared to Redux Toolkit, meaning the team must establish its own conventions for store structure and middleware composition.

---

Related Insights:
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] -- foundation: the store structure convention that compensates for Zustand's unopinionated design
- [[indexeddb-entity-level-storage-via-dexie-handles-large-offline-datasets]] -- enables: the persistence capability that localStorage could not provide

Domains:
- [[frontend-patterns]]
