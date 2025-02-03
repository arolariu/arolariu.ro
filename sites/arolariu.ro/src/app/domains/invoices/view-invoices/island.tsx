/** @format */

"use client";

import {useInvoices} from "@/hooks";
import {useState} from "react";
import InvoicesNotFound from "../_components/InvoicesNotFound";
import {InvoiceFilters} from "./_components/InvoiceFilters";
import InvoiceList from "./_components/InvoiceList";
import InvoicesHeader from "./_components/InvoicesHeader";
import {useViewInvoicesWithFilters} from "./_hooks/useViewInvoicesWithFilters";

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen() {
  const {invoices, isError} = useInvoices();
  const {filteredInvoices, filters, setFilters} = useViewInvoicesWithFilters(invoices);
  const [displayStyle, setDisplayStyle] = useState<"grid" | "list">("list");

  // TODO: Add a retry button for error.
  if (isError)
    return (
      <section>
        <p>There was an error loading the invoices.</p>
        <p>Please try again later.</p>
      </section>
    );

  if (invoices.length === 0) return <InvoicesNotFound />;
  return (
    <section>
      <InvoicesHeader shownInvoices={filteredInvoices} />
      <InvoiceFilters
        filters={filters}
        displayStyle={displayStyle}
        setDisplayStyle={setDisplayStyle}
        setFilters={setFilters}
      />
      <hr className='pb-16' />
      <InvoiceList
        invoices={filteredInvoices}
        displayStyle={displayStyle}
      />
    </section>
  );
}
