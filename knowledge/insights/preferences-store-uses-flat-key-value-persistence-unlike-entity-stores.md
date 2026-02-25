---
description: "usePreferencesStore persists locale, theme, font, and gradient settings as a serialized snapshot in the 'shared' IndexedDB table, not as individual entity rows"
type: pattern
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Preferences store uses flat key-value persistence unlike entity stores

The preferences store (`usePreferencesStore`) breaks from the entity-per-row pattern used by the other three stores. Instead of mapping each preference to an individual IndexedDB row, it serializes the entire preferences object into the `shared` table as a single key-value entry. This is because preferences are a flat configuration object (locale, theme, fontType, gradient presets) rather than a collection of domain entities with unique IDs.

The `shared` table uses a `key: string` primary key with `value: string` containing the serialized snapshot. This keeps the IndexedDB schema clean -- domain entities get their own typed tables with proper primary keys, while singleton configuration objects share a general-purpose table. If additional non-entity stores are added in the future (e.g., user settings, feature flags), they would follow the same `shared` table pattern.

Despite the different storage mechanism, the preferences store still follows the same three-layer type pattern: `PreferencesPersistedState` (locale, theme, fonts, gradients), `PreferencesState` (adds `hasHydrated`), and `PreferencesActions` (setters for each preference). The `partialize` function and `onRehydrateStorage` callback work identically to entity stores. The persistence adapter is the only component that differs.

---

Related Insights:
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] -- foundation: the three-layer pattern applies regardless of storage strategy
- [[indexeddb-entity-level-storage-via-dexie-handles-large-offline-datasets]] -- contrast: entity stores use per-row storage; this store uses blob serialization

Domains:
- [[frontend-patterns]]
