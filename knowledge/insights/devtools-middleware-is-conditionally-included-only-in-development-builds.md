---
description: "Store creation branches on NODE_ENV: development builds wrap persist in devtools() for Redux DevTools time-travel; production builds use persist alone to eliminate overhead"
type: convention
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Devtools middleware is conditionally included only in development builds

Each store defines two factory functions -- `createDevStore` and `createProdStore` -- and selects between them at module scope via `process.env.NODE_ENV === "development"`. The development factory wraps the persist middleware inside `devtools()`, which connects the store to Redux DevTools browser extension for time-travel debugging, action logging, and state inspection. The production factory applies only the persist middleware, removing all devtools overhead from the production bundle.

This conditional composition happens at store creation time, not at middleware level. The exported hook (e.g., `useInvoicesStore`) is a stable reference regardless of environment -- consuming components do not need to be aware of whether devtools are active. The `devtools()` wrapper receives a descriptive name like `{ name: "InvoicesStore", enabled: true }` so that each store appears as a labeled panel in the Redux DevTools extension.

The pattern ensures zero-cost abstraction in production: the `devtools` import and its runtime code are tree-shaken by the bundler when the condition evaluates to false at compile time. The trade-off is two nearly-identical factory functions per store, which is minor boilerplate compared to the debugging value gained during development.

---

Related Insights:
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] -- foundation: the store structure that both factories create
- [[zustand-chosen-over-redux-and-jotai-for-minimal-boilerplate-with-persistence]] -- extends: devtools integration is one of Zustand's advantages over bare Context

Domains:
- [[frontend-patterns]]
