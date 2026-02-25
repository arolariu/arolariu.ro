---
description: "EntityPersistedState holds only the entities array in IndexedDB; selection state and hydration flags live in memory and reset on page load"
type: decision
source: "docs/rfc/1007-advanced-frontend-patterns.md"
status: current
created: 2026-02-25
---

# Entity store state splits into persisted entities and transient selection

Every entity store in the frontend distinguishes between two layers of state: persisted state that survives page refresh through IndexedDB, and transient state that exists only in memory. The `EntityPersistedState<E>` interface contains the `entities: ReadonlyArray<E>` -- the authoritative entity collection. The full `EntityState<E>` extends this with `selectedEntities` (the user's current multi-select) and `hasHydrated` (whether IndexedDB restoration is complete).

This split is deliberate. Entity data represents server-sourced truth that is expensive to re-fetch, so persisting it locally provides instant page loads and offline resilience. Selection state, by contrast, is ephemeral UI context -- a user's selection should not survive a page refresh because the page context that made those selections meaningful is gone. Similarly, the hydration flag is a one-time lifecycle signal with no meaning after the current session.

The `ReadonlyArray<E>` type on the persisted entities further signals intent: entity mutations must go through store actions (upsert, update, remove), never through direct array manipulation. This guards against accidental state corruption that would propagate to IndexedDB.

---

Related Insights:
- [[generic-entity-store-factory-eliminates-crud-boilerplate-through-zustand-generics]] — extends: the factory encodes this state split automatically
- [[hydration-tracking-prevents-flash-of-empty-content-from-indexeddb-restore]] — enables: the transient hydration flag makes this guard possible

Domains:
- [[frontend-patterns]]
