/**
 * @fileoverview Zustand store for managing invoices state with IndexedDB persistence.
 * Thin wrapper around the generic entity-store factory — all CRUD, selection, and
 * persistence behavior comes from {@link createEntityStore}.
 * @module stores/invoicesStore
 */

import type {Invoice} from "@/types/invoices";
import {isRecord} from "@/types/invoices/guards";
import {createEntityStore} from "./createEntityStore";

/**
 * Determines whether a cached entity carries the current {@link Invoice} domain shape.
 *
 * @remarks
 * **Why a local guard instead of {@link parseInvoiceResponse}?**
 * IndexedDB uses the Structured Clone Algorithm (via Dexie) which preserves native
 * `Date` instances. The transport parser's `parseDate` helper requires ISO strings —
 * running it against persisted domain objects would produce false-positive failures on
 * every valid cached entity. This guard deliberately avoids timestamp fields and only
 * checks the structural presence of keys that changed during the contract cutover.
 *
 * **Why not bump the persistence key or write a migration?**
 * By explicit decision (D7) no cache-key bump or migration was introduced — the premise
 * is that no active client holds legacy data. This guard is defence-in-depth only.
 *
 * **Discriminants (contract cutover spec):**
 * - `classification` key must be present (added in the cutover; absent in retired cached entries).
 * - `possibleRecipes` must be present as an array (type changed from flat `Recipe[]` to
 *   structured `RecipeSuggestion[]`; checking array-ness is sufficient to reject entries
 *   that are structurally unrecognisable at this level).
 *
 * @param value - Raw persisted entity from IndexedDB (unknown shape until validated).
 * @returns `true` when `value` carries the current Invoice domain shape.
 */
function isValidPersistedInvoice(value: unknown): value is Invoice {
  if (!isRecord(value)) return false;
  // 'classification' was added in the cutover; absent key identifies the retired shape.
  if (!("classification" in value)) return false;
  // 'possibleRecipes' must be an array (RecipeSuggestion[] — new structured contract).
  if (!Array.isArray(value["possibleRecipes"])) return false;
  return true;
}

/**
 * Invoices store built on the shared entity-store factory.
 *
 * @remarks
 * - State: `entities`, `selectedEntities`, `hasHydrated` — see {@link EntityStore}.
 * - Actions: full CRUD + selection API inherited from the factory.
 * - Persistence: IndexedDB table `invoices`, rehydrates each `Invoice` as an individual row.
 * - DevTools: enabled in development, disabled in production.
 *
 * **Hydration validation:**
 * The domain model changed shape (numeric `category` → `classification`; flat `Recipe[]` →
 * structured `RecipeSuggestion[]`; free-text allergens → `AllergenAssessment`). By explicit
 * decision (D7) no cache-key bump or migration was performed — active clients are assumed to
 * hold no legacy data. As defence-in-depth, every rehydration cycle silently drops entries
 * that fail {@link isValidPersistedInvoice}. A `console.warn` is emitted so dropped entries
 * remain diagnosable in production logs.
 *
 * @example
 * ```tsx
 * const invoices = useInvoicesStore((state) => state.entities);
 * const upsertInvoice = useInvoicesStore((state) => state.upsertEntity);
 * ```
 */
export const useInvoicesStore = createEntityStore<Invoice>({
  tableName: "invoices",
  storeName: "InvoicesStore",
  persistName: "invoices-store",
});

/**
 * Hydration-validation hook — registered once, runs after every rehydration cycle.
 *
 * `onFinishHydration` fires on every `persist.rehydrate()` call (unlike a `subscribe`
 * listener on `hasHydrated`, which would only fire on the first `false → true` transition
 * and miss subsequent re-hydrations triggered in tests or on session resume). Registering
 * here — after store creation, in the concrete store module — keeps the generic
 * {@link createEntityStore} factory completely unmodified. The factory is shared by scans,
 * preferences, and other stores that are out of scope for this change.
 *
 * No cache-key bump or migration was performed (explicit decision D7). This callback is
 * the sole protection against a retired persisted shape entering the current domain model.
 */
useInvoicesStore.persist.onFinishHydration((state) => {
  const valid = state.entities.filter((entity): entity is Invoice => isValidPersistedInvoice(entity));
  const dropped = state.entities.length - valid.length;
  if (dropped > 0) {
    console.warn(
      `[InvoicesStore] Dropped ${String(dropped)} persisted invoice(s) that failed the current domain ` +
        `shape guard (missing 'classification' or 'possibleRecipes'). ` +
        `No cache-key bump or migration was performed (explicit decision D7).`,
    );
    useInvoicesStore.getState().setEntities(valid);
  }
});
