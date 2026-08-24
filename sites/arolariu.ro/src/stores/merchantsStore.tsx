/**
 * @fileoverview Zustand store for managing merchants state with IndexedDB persistence.
 * Thin wrapper around the generic entity-store factory — all CRUD, selection, and
 * persistence behavior comes from {@link createEntityStore}. Selection API
 * (`selectedEntities` / `toggleEntitySelection`) is now available even though the
 * prior hand-rolled implementation did not expose it.
 * @module stores/merchantsStore
 */

import type {Merchant} from "@/types/invoices";
import {createEntityStore} from "./createEntityStore";

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
