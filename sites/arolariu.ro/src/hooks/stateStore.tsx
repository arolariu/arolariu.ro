/**
 * @fileoverview Global Zustand state store for invoices and merchants.
 * @module hooks/stateStore
 *
 * @remarks
 * This module provides a centralized Zustand store for managing:
 * - User invoices collection
 * - Selected invoices for bulk operations
 * - Merchant information cache
 *
 * **Environment-Specific Behavior:**
 * - **Development**: Uses sessionStorage with Redux DevTools integration
 * - **Production**: Uses localStorage without DevTools overhead
 *
 * **Storage Strategy:**
 * - Session storage in dev prevents state pollution between test runs
 * - Local storage in prod persists user selections across sessions
 *
 * @see {@link https://docs.pmnd.rs/zustand/getting-started/introduction Zustand Documentation}
 */

import type {Invoice, Merchant} from "@/types/invoices";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

/**
 * State shape for the Zustand store.
 *
 * @remarks
 * All arrays are initialized empty and populated by server actions.
 */
type States = {
  /** All invoices fetched for the current user. */
  invoices: Invoice[];
  /** Invoices currently selected for bulk operations (delete, export, etc.). */
  selectedInvoices: Invoice[];
  /** All merchants associated with the user's invoices. */
  merchants: Merchant[];
};

/**
 * Actions available in the Zustand store.
 *
 * @remarks
 * All setters replace the entire array (no incremental updates).
 */
type Actions = {
  /** Replaces the entire invoices array with new data. */
  setInvoices: (invoices: Invoice[]) => void;
  /** Replaces the selected invoices array (for bulk operations). */
  setSelectedInvoices: (selectedInvoices: Invoice[]) => void;
  /** Replaces the entire merchants array with new data. */
  setMerchants: (merchants: Merchant[]) => void;
};

/**
 * Development-mode Zustand store with Redux DevTools and sessionStorage.
 *
 * @remarks
 * - **DevTools**: Enables Redux DevTools Extension integration for debugging
 * - **SessionStorage**: State cleared on tab/browser close (prevents test pollution)
 * - **Persistence Key**: "zustand-store-dev"
 */
const devStore = create<States & Actions>()(
  devtools(
    persist(
      (set) => ({
        invoices: [],
        selectedInvoices: [],
        merchants: [],
        setInvoices: (invoices: Invoice[]) => set((state) => ({...state, invoices})),
        setSelectedInvoices: (selectedInvoices: Invoice[]) => set((state) => ({...state, selectedInvoices})),
        setMerchants: (merchants: Merchant[]) => set((state) => ({...state, merchants})),
      }),
      {
        name: "zustand-store-dev",
        storage: createJSONStorage(() => sessionStorage),
      },
    ),
  ),
);

/**
 * Production-mode Zustand store with localStorage persistence.
 *
 * @remarks
 * - **No DevTools**: Optimized for production (no debugging overhead)
 * - **LocalStorage**: State persists across browser sessions
 * - **Persistence Key**: "zustand-store-prd"
 */
const prodStore = create<States & Actions>()(
  persist(
    (set) => ({
      invoices: [],
      selectedInvoices: [],
      merchants: [],
      setInvoices: (invoices: Invoice[]) => set((state) => ({...state, invoices})),
      setSelectedInvoices: (selectedInvoices: Invoice[]) => set((state) => ({...state, selectedInvoices})),
      setMerchants: (merchants: Merchant[]) => set((state) => ({...state, merchants})),
    }),
    {
      name: "zustand-store-prd",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

const isProduction = process.env.NODE_ENV === "production";

/**
 * Unified Zustand store hook for managing global invoice and merchant state.
 *
 * @remarks
 * **Environment Switching:**
 * - **Development**: Returns {@link devStore} (sessionStorage + DevTools)
 * - **Production**: Returns {@link prodStore} (localStorage, no DevTools)
 *
 * **Usage Pattern:**
 * ```typescript
 * const invoices = useZustandStore((state) => state.invoices);
 * const setInvoices = useZustandStore((state) => state.setInvoices);
 * ```
 *
 * **Performance:**
 * - Use selector functions to prevent unnecessary re-renders
 * - Store automatically persists to storage on state changes
 *
 * @returns Zustand store hook with state and actions
 *
 * @example
 * ```typescript
 * // Read state
 * const selectedInvoices = useZustandStore((state) => state.selectedInvoices);
 *
 * // Update state
 * const setSelectedInvoices = useZustandStore((state) => state.setSelectedInvoices);
 * setSelectedInvoices([invoice1, invoice2]);
 * ```
 */
export const useZustandStore = isProduction ? prodStore : devStore;
