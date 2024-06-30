/**
 * eslint-disable
 * @format
 */

import Invoice from "@/types/invoices/Invoice";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

type States = {
  selectedInvoice: Invoice;
  invoices: Invoice[];
};

type Actions = {
  // Invoice actions:
  setSelectedInvoice: (invoice: Readonly<Invoice>) => void;
  removeSelectedInvoice: (invoice: Readonly<Invoice>) => void;
  setInvoices: (invoices: Invoice[]) => void;
};

export const useZustandStore = create<States & Actions>()(
  devtools(
    persist(
      (set) => ({
        selectedInvoice: {} as Invoice,
        invoices: [],
        setSelectedInvoice: (invoice: Readonly<Invoice>) => set({selectedInvoice: invoice}),
        removeSelectedInvoice: () => set({selectedInvoice: {} as Invoice}),
        setInvoices: (invoices: Invoice[]) => set({invoices}),
      }),
      {name: "zustand-store", storage: createJSONStorage(() => sessionStorage)},
    ),
  ),
);
