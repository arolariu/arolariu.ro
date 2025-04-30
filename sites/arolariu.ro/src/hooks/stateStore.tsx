/** @format */

import type {Invoice, Merchant} from "@/types/invoices";
import {create} from "zustand";
import {createJSONStorage, devtools, persist} from "zustand/middleware";

type States = {
  invoices: Invoice[];
  selectedInvoices: Invoice[];
  merchants: Merchant[];
};

type Actions = {
  setInvoices: (invoices: Invoice[]) => void;
  setSelectedInvoices: (selectedInvoices: Invoice[]) => void;
  setMerchants: (merchants: Merchant[]) => void;
};

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
export const useZustandStore = isProduction ? prodStore : devStore;
