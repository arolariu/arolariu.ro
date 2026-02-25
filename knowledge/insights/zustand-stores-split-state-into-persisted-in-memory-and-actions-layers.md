---
description: "Each store defines three TypeScript interfaces: PersistedState (IndexedDB), State (extends persisted with transient fields), and Actions (mutations), combined into a union store type"
type: pattern
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Zustand stores split state into persisted in-memory and actions layers

Every Zustand store in the codebase follows a mandatory three-interface pattern that makes the persistence boundary explicit at the type level. The first interface, `{Entity}PersistedState`, defines only the fields that survive page reloads via IndexedDB -- typically the entity collection itself (e.g., `invoices: ReadonlyArray<Invoice>`). The second interface, `{Entity}State`, extends the persisted interface and adds transient fields that exist only in memory: selection arrays like `selectedInvoices` and the `hasHydrated` boolean flag. The third interface, `{Entity}Actions`, declares all mutation functions: `set`, `upsert`, `remove`, `update`, `toggle`, and `clear` operations.

The combined store type is the intersection of State and Actions: `type InvoicesStore = InvoicesState & InvoicesActions`. This three-layer split serves two purposes. First, the `partialize` option in persist middleware references only the PersistedState interface, so transient UI state like selections is never accidentally written to IndexedDB. Second, TypeScript enforces that every field in the store has a clear lifecycle -- either it persists across sessions or it resets on reload. Without this convention, developers would need to manually track which fields the persist middleware serializes, creating a class of bugs where ephemeral UI state gets stale-persisted or important data gets silently dropped.

---

Related Insights:
- [[zustand-chosen-over-redux-and-jotai-for-minimal-boilerplate-with-persistence]] -- foundation: the decision that requires this compensating convention
- [[indexeddb-hydration-is-async-requiring-explicit-hashydrated-guards]] -- extends: the hasHydrated field in the in-memory layer exists because of this gotcha
- [[store-naming-follows-use-entity-store-convention-with-camelcase]] -- convention: the naming rule applied to these store types

Domains:
- [[frontend-patterns]]
