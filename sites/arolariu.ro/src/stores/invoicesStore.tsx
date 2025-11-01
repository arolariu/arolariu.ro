/**
 * @fileoverview Zustand store for managing invoices state with IndexedDB persistence
 * @module stores/invoicesStore
 */

import type {Invoice} from "@/types/invoices";
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";
import {createIndexedDBStorage} from "./storage/indexedDBStorage";

/**
 * Invoice store state interface
 */
interface InvoicesState {
  /** All invoices in the store */
  invoices: Invoice[];
  /** Currently selected invoices */
  selectedInvoices: Invoice[];
}

/**
 * Invoice store actions interface
 */
interface InvoicesActions {
  /**
   * Sets the complete list of invoices
   * @param invoices The new invoices array
   */
  setInvoices: (invoices: Invoice[]) => void;

  /**
   * Sets the selected invoices
   * @param selectedInvoices The new selected invoices array
   */
  setSelectedInvoices: (selectedInvoices: Invoice[]) => void;

  /**
   * Adds a single invoice to the store
   * @param invoice The invoice to add
   */
  addInvoice: (invoice: Invoice) => void;

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
}

/**
 * Combined store type
 */
type InvoicesStore = InvoicesState & InvoicesActions;

/**
 * IndexedDB storage configuration for invoices using Dexie
 */
const indexedDBStorage = createIndexedDBStorage<InvoicesStore>();

/**
 * Development store with DevTools support
 */
const devStore = create<InvoicesStore>()(
  devtools(
    persist(
      (set) => ({
        // State
        invoices: [],
        selectedInvoices: [],

        // Actions
        setInvoices: (invoices) => set((state) => ({...state, invoices}), false, "invoices/setInvoices"),

        setSelectedInvoices: (selectedInvoices) => set((state) => ({...state, selectedInvoices}), false, "invoices/setSelectedInvoices"),

        addInvoice: (invoice) =>
          set(
            (state) => ({
              ...state,
              invoices: [...state.invoices, invoice],
            }),
            false,
            "invoices/addInvoice",
          ),

        removeInvoice: (invoiceId) =>
          set(
            (state) => ({
              ...state,
              invoices: state.invoices.filter((inv) => inv.id !== invoiceId),
              selectedInvoices: state.selectedInvoices.filter((inv) => inv.id !== invoiceId),
            }),
            false,
            "invoices/removeInvoice",
          ),

        updateInvoice: (invoiceId, updates) =>
          set(
            (state) => ({
              ...state,
              invoices: state.invoices.map((inv) => (inv.id === invoiceId ? {...inv, ...updates} : inv)),
              selectedInvoices: state.selectedInvoices.map((inv) => (inv.id === invoiceId ? {...inv, ...updates} : inv)),
            }),
            false,
            "invoices/updateInvoice",
          ),

        toggleInvoiceSelection: (invoice) =>
          set(
            (state) => {
              const isSelected = state.selectedInvoices.some((inv) => inv.id === invoice.id);
              return {
                ...state,
                selectedInvoices: isSelected
                  ? state.selectedInvoices.filter((inv) => inv.id !== invoice.id)
                  : [...state.selectedInvoices, invoice],
              };
            },
            false,
            "invoices/toggleInvoiceSelection",
          ),

        clearSelectedInvoices: () => set((state) => ({...state, selectedInvoices: []}), false, "invoices/clearSelectedInvoices"),

        clearInvoices: () => set((state) => ({...state, invoices: [], selectedInvoices: []}), false, "invoices/clearInvoices"),
      }),
      {
        name: "invoices-store",
        storage: indexedDBStorage,
      },
    ),
    {
      name: "InvoicesStore",
      enabled: process.env.NODE_ENV === "development",
    },
  ),
);

/**
 * Production store without DevTools
 */
const prodStore = create<InvoicesStore>()(
  persist(
    (set) => ({
      // State
      invoices: [],
      selectedInvoices: [],

      // Actions
      setInvoices: (invoices) => set((state) => ({...state, invoices})),

      setSelectedInvoices: (selectedInvoices) => set((state) => ({...state, selectedInvoices})),

      addInvoice: (invoice) =>
        set((state) => ({
          ...state,
          invoices: [...state.invoices, invoice],
        })),

      removeInvoice: (invoiceId) =>
        set((state) => ({
          ...state,
          invoices: state.invoices.filter((inv) => inv.id !== invoiceId),
          selectedInvoices: state.selectedInvoices.filter((inv) => inv.id !== invoiceId),
        })),

      updateInvoice: (invoiceId, updates) =>
        set((state) => ({
          ...state,
          invoices: state.invoices.map((inv) => (inv.id === invoiceId ? {...inv, ...updates} : inv)),
          selectedInvoices: state.selectedInvoices.map((inv) => (inv.id === invoiceId ? {...inv, ...updates} : inv)),
        })),

      toggleInvoiceSelection: (invoice) =>
        set((state) => {
          const isSelected = state.selectedInvoices.some((inv) => inv.id === invoice.id);
          return {
            ...state,
            selectedInvoices: isSelected
              ? state.selectedInvoices.filter((inv) => inv.id !== invoice.id)
              : [...state.selectedInvoices, invoice],
          };
        }),

      clearSelectedInvoices: () => set((state) => ({...state, selectedInvoices: []})),

      clearInvoices: () => set((state) => ({...state, invoices: [], selectedInvoices: []})),
    }),
    {
      name: "invoices-store",
      storage: indexedDBStorage,
    },
  ),
);

/**
 * Invoices store hook - automatically uses development or production version
 * based on NODE_ENV.
 * @remarks Persists data in IndexedDB for offline support.
 * @returns The invoices store with state and actions.
 * @example
 * ```tsx
 * function InvoicesList() {
 *   const { invoices, setInvoices, addInvoice } = useInvoicesStore();
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
export const useInvoicesStore = process.env.NODE_ENV === "production" ? prodStore : devStore;
