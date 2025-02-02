/** @format */

import type {Invoice} from "@/types/invoices";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

type States = {
  invoices: Invoice[];
};

type Actions = {
  setInvoices: (invoices: Invoice[]) => void;
};

const devStore = create<States & Actions>()(
  devtools(
    persist(
      (set) => ({
        invoices: [],
        setInvoices: (invoices: Invoice[]) => set((state) => ({...state, invoices})),
      }),
      {
        name: "zustand-store-dev",
        storage: createJSONStorage(() => sessionStorage),
      },
    ),
  ),
);

const prodStore = create<States & Actions>()(
  persist(
    (set) => ({
      invoices: [],
      setInvoices: (invoices: Invoice[]) => set((state) => ({...state, invoices})),
    }),
    {
      name: "zustand-store-prd",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useZustandStore = process.env.NODE_ENV === "production" ? prodStore : devStore;
