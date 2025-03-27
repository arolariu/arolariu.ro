/** @format */

"use client";

import {FakeInvoiceBigList} from "@/data/mocks/invoices";
import InvoicesNotFound from "../_components/InvoicesNotFound";

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen() {
  //const {invoices, isError} = useInvoices();
  const invoices = FakeInvoiceBigList;

  if (invoices.length === 0) return <InvoicesNotFound />;
  return <section />;
}
