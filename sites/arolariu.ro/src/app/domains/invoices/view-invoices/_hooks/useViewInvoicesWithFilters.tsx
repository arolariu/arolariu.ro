/** @format */

"use client";

import type {Invoice} from "@/types/invoices";
import {type Dispatch, type SetStateAction, useEffect, useState} from "react";

type InvoiceFilters = {
  isImportant: boolean;
  dayOnly: boolean;
  nightOnly: boolean;
};

type HookReturnType = {
  filteredInvoices: Invoice[];
  filters: InvoiceFilters;
  setFilters: Dispatch<SetStateAction<InvoiceFilters>>;
};

export function useViewInvoicesWithFilters(invoices: Invoice[]): HookReturnType {
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(invoices);
  const [filters, setFilters] = useState<InvoiceFilters>({
    isImportant: false,
    dayOnly: false,
    nightOnly: false,
  });

  const timeOfPurchase = (invoice: Invoice): number => {
    const date = new Date(invoice.paymentInformation?.transactionDate ?? 0);
    return date.getHours();
  };

  useEffect(() => {
    let filterPass = Array.from(invoices); // start with all invoices

    if (filters.isImportant) {
      filterPass = filterPass.filter((invoice) => invoice.isImportant);
    }

    if (filters.dayOnly) {
      filterPass = filterPass.filter((invoice) => timeOfPurchase(invoice) >= 6 && timeOfPurchase(invoice) < 18);
    }

    if (filters.nightOnly) {
      filterPass = filterPass.filter((invoice) => timeOfPurchase(invoice) < 6 || timeOfPurchase(invoice) >= 18);
    }

    setFilteredInvoices(filterPass);
  }, [invoices, filters]);

  return {
    filteredInvoices,
    filters,
    setFilters,
  } as const;
}
