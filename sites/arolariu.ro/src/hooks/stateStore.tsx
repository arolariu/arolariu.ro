/**
 * eslint-disable
 * @format
 */

import Invoice from "@/types/invoices/Invoice";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

type States = {
  selectedInvoice: Invoice;
};

type Actions = {
  // Invoice actions:
  setSelectedInvoice: (invoice: Readonly<Invoice>) => void;
  removeSelectedInvoice: (invoice: Readonly<Invoice>) => void;
};

export const useZustandStore = create<States & Actions>()(
  devtools(
    persist(
      (set) => ({
        selectedInvoice: {} as Invoice,
        setSelectedInvoice: (invoice: Readonly<Invoice>) => set({selectedInvoice: invoice}),
        removeSelectedInvoice: () => set({selectedInvoice: {} as Invoice}),
      }),
      {name: "zustand-store", storage: createJSONStorage(() => sessionStorage)},
    ),
  ),
);
