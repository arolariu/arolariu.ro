---
description: "Components consuming entity stores must use useShallow to select only needed fields, avoiding re-renders when unrelated store fields change"
type: convention
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# useShallow selectors prevent unnecessary Zustand store re-renders

Every component consuming a Zustand entity store must wrap its selector in `useShallow` from Zustand's shallow middleware. Without `useShallow`, Zustand uses reference equality to detect changes -- since the selector returns a new object on every call, the component re-renders on every store update, regardless of whether the selected fields actually changed.

The convention pattern is:
```typescript
const {entities, upsertEntity, hasHydrated} = useInvoicesStore(
  useShallow((state) => ({
    entities: state.entities,
    upsertEntity: state.upsertEntity,
    hasHydrated: state.hasHydrated,
  }))
);
```

`useShallow` performs a shallow comparison of the returned object's values. If `entities`, `upsertEntity`, and `hasHydrated` all have the same references as the previous render, the component skips re-rendering. This is critical for entity stores where frequent upserts to other entities would otherwise cascade into re-renders across unrelated components.

The convention is especially important in the entity store context because stores hold arrays of entities. A single entity upsert creates a new `entities` array reference even if the component only cares about `selectedEntities`. Without `useShallow`, the component re-renders for every entity change even if its selected slice is unchanged.

Omitting `useShallow` is a performance bug, not a correctness bug -- the application works but renders unnecessarily. This makes it easy to miss during development and code review.

---

Related Insights:
- [[generic-entity-store-factory-eliminates-crud-boilerplate-through-zustand-generics]] — foundation: the stores this convention applies to
- [[dialog-context-uses-ref-plus-state-hybrid-for-reads-and-renders]] — example: similar concern about render optimization in dialog context

Domains:
- [[frontend-patterns]]
