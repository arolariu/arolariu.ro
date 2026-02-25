---
description: "Passing a selector function to the store hook (e.g., useInvoicesStore(s => s.invoices.length)) subscribes only to that slice, avoiding full-store re-renders on unrelated state changes"
type: pattern
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Selective Zustand subscriptions prevent unnecessary re-renders

Zustand's hook API accepts an optional selector function that narrows the subscription to a specific slice of state. When a component calls `useInvoicesStore((state) => state.invoices.length)`, it re-renders only when the count changes, not when individual invoice fields are updated or when `selectedInvoices` changes. Without selectors, calling `useInvoicesStore()` with no arguments subscribes to the entire store object, meaning any state change -- even toggling an unrelated selection -- triggers a re-render.

This selector pattern is the primary performance mechanism for Zustand stores in this codebase. In the invoice management flow, a sidebar showing invoice count, a list showing invoice details, and a toolbar showing selection state can each subscribe to exactly the slice they need. The sidebar subscribes to `invoices.length`, the list subscribes to `invoices`, and the toolbar subscribes to `selectedInvoices`. When a user selects an invoice, only the toolbar re-renders.

Zustand uses `Object.is` equality by default for selector results. For derived values that produce new object references (e.g., `state.invoices.filter(i => i.status === "pending")`), components should either memoize the selector or use Zustand's `shallow` equality comparator to avoid false-positive re-renders. The RFC establishes selective subscriptions as the standard pattern -- destructuring the entire store in components is reserved for small, focused components where granular subscription is not worth the complexity.

---

Related Insights:
- [[server-data-merges-into-zustand-store-after-hydration-completes]] -- extends: after server data merge, selective subscriptions prevent cascading re-renders
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] -- foundation: the state/action separation makes selectors straightforward

Domains:
- [[frontend-patterns]]
