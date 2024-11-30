/**
 * eslint-disable
 * @format
 */

import type Invoice from "@/types/invoices/Invoice";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

type States = {
  invoices: Invoice[];
};

type Actions = {
  setInvoices: (invoices: Invoice[]) => void;
};

export const useZustandStore = create<States & Actions>()(
  devtools(
    persist(
      (set) => ({
        invoices: [],
        setInvoices: (invoices: Invoice[]) => set({invoices}),
      }),
      {name: "zustand-store", storage: createJSONStorage(() => sessionStorage)},
    ),
  ),
);
