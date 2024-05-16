/* eslint-disable */

import Invoice from "@/types/invoices/Invoice";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

type States = {
  selectedInvoice: Invoice;
};

type Actions = {
  // Invoice actions:
  setSelectedInvoice: (invoice: Invoice) => void;
  removeSelectedInvoice: (invoice: Invoice) => void;
};

export const useZustandStore = create<States & Actions>()(
  devtools(
    persist(
      (set) => ({
        selectedInvoice: {} as Invoice,
        setSelectedInvoice: (invoice: Invoice) => set({selectedInvoice: invoice}),
        removeSelectedInvoice: () => set({selectedInvoice: {} as Invoice}),
      }),
      {name: "zustand-store", storage: createJSONStorage(() => sessionStorage)},
    ),
  ),
);

/* eslint-enable */
