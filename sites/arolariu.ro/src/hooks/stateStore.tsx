/** @format */

import type {Invoice, Merchant} from "@/types/invoices";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

type States = {
  invoices: Invoice[];
  merchants: Merchant[];
};

type Actions = {
  setInvoices: (invoices: Invoice[]) => void;
  setMerchants: (merchants: Merchant[]) => void;
};

const devStore = create<States & Actions>()(
  devtools(
    persist(
      (set) => ({
        invoices: [],
        merchants: [],
        setInvoices: (invoices: Invoice[]) => set((state) => ({...state, invoices})),
        setMerchants: (merchants: Merchant[]) => set((state) => ({...state, merchants})),
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
      merchants: [],
      setInvoices: (invoices: Invoice[]) => set((state) => ({...state, invoices})),
      setMerchants: (merchants: Merchant[]) => set((state) => ({...state, merchants})),
    }),
    {
      name: "zustand-store-prd",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useZustandStore = process.env.NODE_ENV === "production" ? prodStore : devStore;
