/** @format */

"use client";

import {useZustandStore} from "@/hooks/stateStore";
import type Invoice from "@/types/invoices/Invoice";
import {useEffect, useState} from "react";
import {FakeInvoiceShortList} from "../../../../data/mocks/invoices";
import InvoicesNotFound from "../_components/InvoicesNotFound";
import {InvoiceFilters} from "./_components/InvoiceFilters";
import InvoiceList from "./_components/InvoiceList";
import InvoicesHeader from "./_components/InvoicesHeader";

type InvoiceFilters = {
  isImportant: boolean;
  dayOnly: boolean;
  nightOnly: boolean;
};

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen() {
  const {invoices: previousInvoices, setInvoices: setPreviousInvoices} = useZustandStore();
  // const {invoices: currentInvoices, isLoading} = useInvoices();
  const currentInvoices = FakeInvoiceShortList;
  const [shownInvoices, setShownInvoices] = useState<Invoice[]>(previousInvoices);
  const [displayStyle, setDisplayStyle] = useState<"grid" | "list">("list");
  const [filters, setFilters] = useState<InvoiceFilters>({
    isImportant: false,
    dayOnly: false,
    nightOnly: false,
  });

  useEffect(() => {
    if (currentInvoices && currentInvoices !== previousInvoices) setPreviousInvoices(currentInvoices);
    let filteredInvoices = previousInvoices;

    const timeOfPurchase = (invoice: Invoice): number => {
      const date = new Date(invoice.paymentInformation?.dateOfPurchase ?? 0);
      return date.getHours();
    };

    if (filters.isImportant) {
      filteredInvoices = filteredInvoices.filter((invoice) => invoice.isImportant);
    }

    if (filters.dayOnly) {
      filteredInvoices = filteredInvoices.filter(
        (invoice) => timeOfPurchase(invoice) >= 6 && timeOfPurchase(invoice) < 18,
      );
    }

    if (filters.nightOnly) {
      filteredInvoices = filteredInvoices.filter(
        (invoice) => timeOfPurchase(invoice) < 6 || timeOfPurchase(invoice) >= 18,
      );
    }
    setShownInvoices(filteredInvoices);
  }, [filters, previousInvoices, currentInvoices /* isLoading */]);

  if (currentInvoices?.length === 0 || previousInvoices.length === 0) return <InvoicesNotFound />;
  return (
    <section>
      <InvoicesHeader shownInvoices={shownInvoices} />
      <InvoiceFilters
        filters={filters}
        displayStyle={displayStyle}
        setDisplayStyle={setDisplayStyle}
        setFilters={setFilters}
      />
      <hr className='pb-16' />
      <InvoiceList
        invoices={shownInvoices}
        displayStyle={displayStyle}
      />
    </section>
  );
}
