/**
 * @fileoverview Zustand store for managing invoices state with IndexedDB persistence.
 * Thin wrapper around the generic entity-store factory — all CRUD, selection, and
 * persistence behavior comes from {@link createEntityStore}.
 * @module stores/invoicesStore
 */

import type {Invoice} from "@/types/invoices";
import {createEntityStore} from "./createEntityStore";

/**
 * Invoices store built on the shared entity-store factory.
 *
 * @remarks
 * - State: `entities`, `selectedEntities`, `hasHydrated` — see {@link EntityStore}.
 * - Actions: full CRUD + selection API inherited from the factory.
 * - Persistence: IndexedDB table `invoices`, rehydrates each `Invoice` as an individual row.
 * - DevTools: enabled in development, disabled in production.
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
