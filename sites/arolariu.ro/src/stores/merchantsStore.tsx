/**
 * @fileoverview Zustand store for managing merchants state with IndexedDB persistence.
 * Thin wrapper around the generic entity-store factory — all CRUD, selection, and
 * persistence behavior comes from {@link createEntityStore}. Selection API
 * (`selectedEntities` / `toggleEntitySelection`) is now available even though the
 * prior hand-rolled implementation did not expose it.
 * @module stores/merchantsStore
 */

import type {Merchant} from "@/types/invoices";
import {isRecord} from "@/types/invoices/guards";
import {createEntityStore} from "./createEntityStore";

/**
 * Determines whether a cached entity carries the current {@link Merchant} domain shape.
 *
 * @remarks
 * **Why a local guard instead of {@link parseMerchantResponse}?**
 * IndexedDB uses the Structured Clone Algorithm (via Dexie) which preserves native
 * `Date` instances. The transport parser's `parseDate` helper requires ISO strings —
 * running it against persisted domain objects would produce false-positive failures on
 * every valid cached entity. This guard deliberately avoids timestamp fields and only
 * checks the structural presence of keys that changed during the contract cutover.
 *
 * **Why not bump the persistence key or write a migration?**
 * By explicit decision (D7) no cache-key bump or migration was introduced. This guard
 * is defence-in-depth only.
 *
 * **Discriminants (contract cutover spec):**
 * - `classification` key must be present (added in the cutover; absent in retired cached entries).
 * - `parentCompanyId` key must be present (stable field confirming basic structural integrity).
 *
 * @param value - Raw persisted entity from IndexedDB (unknown shape until validated).
 * @returns `true` when `value` carries the current Merchant domain shape.
 */
function isValidPersistedMerchant(value: unknown): value is Merchant {
  if (!isRecord(value)) return false;
  // 'classification' was added in the cutover; absent key identifies the retired shape.
  if (!("classification" in value)) return false;
  // 'parentCompanyId' is a stable field confirming the basic merchant structure.
  if (!("parentCompanyId" in value)) return false;
  return true;
}

/**
 * Merchants store built on the shared entity-store factory.
 *
 * @remarks
 * - State: `entities`, `selectedEntities`, `hasHydrated`.
 * - Actions: full CRUD (`upsertEntity`, `removeEntity`, `updateEntity`), selection
 *   (`toggleEntitySelection`, `setSelectedEntities`, `clearSelectedEntities`),
 *   lookup (`getEntityById`), and `setEntities` / `clearEntities`.
 * - Persistence: IndexedDB table `merchants`.
 *
 * **Hydration validation:**
 * The domain model changed shape (numeric `category` → `classification`). By explicit
 * decision (D7) no cache-key bump or migration was performed. As defence-in-depth, every
 * rehydration cycle silently drops entries that fail {@link isValidPersistedMerchant}.
 * A `console.warn` is emitted so dropped entries remain diagnosable in production logs.
 *
 * @example
 * ```tsx
 * const merchants = useMerchantsStore((state) => state.entities);
 * ```
 */
export const useMerchantsStore = createEntityStore<Merchant>({
  tableName: "merchants",
  storeName: "MerchantsStore",
  persistName: "merchants-store",
});

/**
 * Hydration-validation hook — registered once, runs after every rehydration cycle.
 *
 * `onFinishHydration` fires on every `persist.rehydrate()` call (unlike a `subscribe`
 * listener on `hasHydrated`, which would only fire on the first `false → true` transition
 * and miss subsequent re-hydrations). Registering here keeps the generic
 * {@link createEntityStore} factory completely unmodified.
 *
 * No cache-key bump or migration was performed (explicit decision D7). This callback is
 * the sole protection against a retired persisted shape entering the current domain model.
 */
useMerchantsStore.persist.onFinishHydration((state) => {
  const valid = state.entities.filter((entity): entity is Merchant => isValidPersistedMerchant(entity));
  const dropped = state.entities.length - valid.length;
  if (dropped > 0) {
    console.warn(
      `[MerchantsStore] Dropped ${String(dropped)} persisted merchant(s) that failed the current domain ` +
        `shape guard (missing 'classification' or 'parentCompanyId'). ` +
        `No cache-key bump or migration was performed (explicit decision D7).`,
    );
    useMerchantsStore.getState().setEntities(valid);
  }
});
