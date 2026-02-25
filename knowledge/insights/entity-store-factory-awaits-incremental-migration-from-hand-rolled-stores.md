---
description: "createEntityStore is tested and ready but useInvoicesStore, useMerchantsStore, and useScansStore are still hand-rolled -- migration is pending incremental adoption"
type: constraint
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Entity store factory awaits incremental migration from hand-rolled stores

The `createEntityStore<E>` factory function is fully implemented and tested at `sites/arolariu.ro/src/stores/createEntityStore.ts`, but the three production entity stores -- `useInvoicesStore`, `useMerchantsStore`, and `useScansStore` -- remain hand-rolled implementations that duplicate the factory's logic. RFC 1007 documents this as a deliberate partial adoption: the factory is proven through tests but has not yet replaced the production stores.

This creates a practical constraint for developers. New entity stores should use the factory, but modifying existing stores means working with the hand-rolled versions that may have subtle differences from the factory's behavior. A developer adding functionality to the invoice store cannot assume the factory's API -- they must read the actual `useInvoicesStore` implementation.

The migration path is incremental: replace one hand-rolled store at a time with a factory-generated equivalent, verifying that all consuming components behave identically. This is a refactoring task with high test coverage requirements, since the stores underpin critical invoice management workflows. The migration should be treated as a technical debt reduction effort, not a feature change.

Until migration completes, the codebase has two parallel patterns for entity state management. Code reviewers should flag new hand-rolled stores and direct authors to the factory instead.

---

Related Insights:
- [[generic-entity-store-factory-eliminates-crud-boilerplate-through-zustand-generics]] — foundation: the factory that should eventually replace hand-rolled stores
- [[entity-store-state-splits-into-persisted-entities-and-transient-selection]] — extends: hand-rolled stores may implement this split differently from the factory

Domains:
- [[frontend-patterns]]
