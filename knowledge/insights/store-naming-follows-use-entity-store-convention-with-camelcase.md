---
description: "Store hooks are named use{Entity}Store (useInvoicesStore, useMerchantsStore, useScansStore, usePreferencesStore), exported from a barrel at src/stores/index.ts"
type: convention
source: "docs/rfc/1005-state-management-zustand.md"
status: current
created: 2026-02-25
---

# Store naming follows use-entity-store convention with camelCase

All Zustand stores use the `use{PluralEntity}Store` naming pattern: `useInvoicesStore`, `useMerchantsStore`, `useScansStore`, and `usePreferencesStore`. The `use` prefix signals React hook semantics (these are callable only inside client components or custom hooks), the plural entity name identifies the domain collection, and the `Store` suffix distinguishes state containers from other hooks like `useInvoice` (a data-fetching hook) or `useInvoiceSync` (a synchronization hook).

Store files live in `src/stores/` with one file per store: `invoicesStore.tsx`, `merchantsStore.tsx`, `scansStore.tsx`, `preferencesStore.ts`. The `.tsx` extension is used for stores that include JSX-aware type imports. All stores are re-exported from `src/stores/index.ts` as a barrel, so consumers import from `@/stores` rather than individual store files. Internal types (`InvoicesPersistedState`, `InvoicesState`, `InvoicesActions`) stay unexported -- only the hook and the combined store type are public.

The custom IndexedDB storage adapter lives separately at `src/stores/storage/indexedDBStorage.ts`, keeping the storage infrastructure decoupled from domain store definitions.

---

Related Insights:
- [[zustand-stores-split-state-into-persisted-in-memory-and-actions-layers]] -- extends: the naming convention applies to the three-interface pattern inside each store file
- [[zustand-stores-live-exclusively-in-client-island-components]] -- constraint: these hooks are only callable in the client boundary

Domains:
- [[frontend-patterns]]
