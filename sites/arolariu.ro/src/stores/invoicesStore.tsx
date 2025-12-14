/**
 * @fileoverview Zustand store for managing invoices state with IndexedDB persistence.
 * Each invoice is stored as an individual row in the IndexedDB invoices table.
 * @module stores/invoicesStore
 */

import type {Invoice} from "@/types/invoices";
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";
import {createIndexedDBStorage} from "./storage/indexedDBStorage";

/**
 * Invoice store persisted state interface.
 * Only the invoices array is persisted to IndexedDB.
 */
interface InvoicesPersistedState {
  /** All invoices in the store */
  invoices: ReadonlyArray<Invoice>;
}

/**
 * Invoice store in-memory state interface
 * These fields are not persisted to IndexedDB.
 */
interface InvoicesState extends InvoicesPersistedState {
  /** Currently selected invoices (in-memory only, not persisted) */
  selectedInvoices: Invoice[];
  /** Indicates whether the store has been hydrated from IndexedDB */
  hasHydrated: boolean;
}

/**
 * Invoice store actions interface
 */
interface InvoicesActions {
  /**
   * Sets the complete list of invoices
   * @param invoices The new invoices array
   */
  setInvoices: (invoices: ReadonlyArray<Invoice>) => void;

  /**
   * Sets the selected invoices
   * @param selectedInvoices The new selected invoices array
   */
  setSelectedInvoices: (selectedInvoices: Invoice[]) => void;

  /**
   * Upserts a single invoice to the store (updates if exists, adds if not).
   * This is the preferred method for adding/updating invoices to avoid duplicates.
   * @param invoice The invoice to upsert
   */
  upsertInvoice: (invoice: Invoice) => void;

  /**
   * Removes an invoice by ID
   * @param invoiceId The ID of the invoice to remove
   */
  removeInvoice: (invoiceId: string) => void;

  /**
   * Updates an existing invoice
   * @param invoiceId The ID of the invoice to update
   * @param updates Partial invoice data to update
   */
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;

  /**
   * Toggles an invoice's selection status
   * @param invoice The invoice to toggle
   */
  toggleInvoiceSelection: (invoice: Invoice) => void;

  /**
   * Clears all selected invoices
   */
  clearSelectedInvoices: () => void;

  /**
   * Clears all invoices from the store
   */
  clearInvoices: () => void;

  /**
   * Sets the hydration status
   * @param hasHydrated Whether the store has been hydrated
   */
  setHasHydrated: (hasHydrated: boolean) => void;
}

/**
 * Combined store type
 */
type InvoicesStore = InvoicesState & InvoicesActions;

/**
 * IndexedDB storage configuration for invoices using Dexie.
 * Each invoice is stored as an individual row with id as primary key.
 */
const indexedDBStorage = createIndexedDBStorage<InvoicesPersistedState, Invoice>({
  table: "invoices",
  entityKey: "invoices",
});

/**
 * Persist middleware configuration
 */

const setHydratedCallback = (state: InvoicesStore | undefined) => {
  state?.setHasHydrated(true);
};

const persistConfig = {
  name: "invoices-store",
  storage: indexedDBStorage,
  partialize: (state: InvoicesStore): InvoicesPersistedState => ({
    invoices: [...state.invoices],
  }),
  onRehydrateStorage() {
    return setHydratedCallback;
  },
} as const;

/**
 * Create the initial state and actions
 */
const createInvoicesSlice = (
  set: (partial: Partial<InvoicesStore> | ((state: InvoicesStore) => Partial<InvoicesStore>)) => void,
): InvoicesStore => ({
  // State
  invoices: [],
  selectedInvoices: [],
  hasHydrated: false,

  // Actions
  setInvoices: (invoices) => set({invoices}),

  setSelectedInvoices: (selectedInvoices) => set({selectedInvoices}),

  upsertInvoice: (invoice) =>
    set((state) => {
      const existingIndex = state.invoices.findIndex((inv) => inv.id === invoice.id);
      if (existingIndex !== -1) {
        // Update existing invoice
        const updatedInvoices = [...state.invoices];
        updatedInvoices[existingIndex] = invoice;
        return {invoices: updatedInvoices};
      }
      // Add new invoice
      return {invoices: [...state.invoices, invoice]};
    }),

  removeInvoice: (invoiceId) =>
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.id !== invoiceId),
      selectedInvoices: state.selectedInvoices.filter((inv) => inv.id !== invoiceId),
    })),

  updateInvoice: (invoiceId, updates) =>
    set((state) => ({
      invoices: state.invoices.map((inv) => (inv.id === invoiceId ? {...inv, ...updates} : inv)),
      selectedInvoices: state.selectedInvoices.map((inv) => (inv.id === invoiceId ? {...inv, ...updates} : inv)),
    })),

  toggleInvoiceSelection: (invoice) =>
    set((state) => {
      const isSelected = state.selectedInvoices.some((inv) => inv.id === invoice.id);
      return {
        selectedInvoices: isSelected ? state.selectedInvoices.filter((inv) => inv.id !== invoice.id) : [...state.selectedInvoices, invoice],
      };
    }),

  clearSelectedInvoices: () => set({selectedInvoices: []}),

  clearInvoices: () => set({invoices: [], selectedInvoices: []}),

  setHasHydrated: (hasHydrated) => set({hasHydrated}),
});

/**
 * Development store with DevTools integration
 */
const createDevStore = () =>
  create<InvoicesStore>()(
    devtools(
      persist((set) => createInvoicesSlice(set), persistConfig),
      {
        name: "InvoicesStore",
        enabled: true,
      },
    ),
  );

/**
 * Production store without DevTools for better performance
 */
const createProdStore = () => create<InvoicesStore>()(persist((set) => createInvoicesSlice(set), persistConfig));

/**
 * Invoices store with conditional DevTools support based on environment.
 * Uses entity-level IndexedDB persistence where each invoice is stored as an individual row.
 * Only the invoices array is persisted; selectedInvoices remains in-memory only.
 * @remarks Persists data in IndexedDB for offline support.
 * @returns The invoices store with state and actions.
 * @example
 * ```tsx
 * function InvoicesList() {
 *   const { invoices, setInvoices, upsertInvoice } = useInvoicesStore();
 *
 *   return (
 *     <div>
 *       {invoices.map(invoice => (
 *         <div key={invoice.id}>{invoice.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useInvoicesStore = process.env.NODE_ENV === "development" ? createDevStore() : createProdStore();
