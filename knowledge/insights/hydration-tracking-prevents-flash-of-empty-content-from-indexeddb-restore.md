---
description: "The hasHydrated boolean flag gates UI rendering until IndexedDB data is restored into the Zustand store, preventing a brief flash of empty lists"
type: pattern
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Hydration tracking prevents flash of empty content from IndexedDB restore

When a Zustand store is initialized with IndexedDB persistence via Dexie, there is an asynchronous gap between store creation (entities array starts empty) and persistence restoration (entities array is populated from IndexedDB). Without guarding against this gap, components render the empty state first, then snap to the populated state once IndexedDB finishes loading. This creates a visible flash of empty content that looks like a loading failure.

The `hasHydrated` flag in `EntityState<E>` starts as `false` and flips to `true` only after the persistence middleware completes restoration. Components check this flag before rendering entity lists: `if (!hasHydrated) return <Loading />`. This converts the async gap from a visual glitch into an intentional loading state that users expect.

The pattern is mandatory for any component consuming a persisted entity store. Skipping the hydration check is a subtle bug -- it passes basic testing (where IndexedDB is often pre-populated or fast) but manifests in production on slower devices or first-time visits where IndexedDB is empty and the async restore takes measurable time.

---

Related Insights:
- [[entity-store-state-splits-into-persisted-entities-and-transient-selection]] — foundation: hasHydrated belongs to transient state by design
- [[generic-entity-store-factory-eliminates-crud-boilerplate-through-zustand-generics]] — extends: every factory-created store includes hydration tracking automatically

Domains:
- [[frontend-patterns]]
