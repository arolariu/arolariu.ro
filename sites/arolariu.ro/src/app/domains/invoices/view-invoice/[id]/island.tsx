/** @format */

"use client";

import {FakeInvoice, FakeMerchant} from "@/data/mocks/invoices";
import InvoiceCard from "./_components/InvoiceCard";

/**
 * This function renders the view invoice page.
 * @returns The JSX for the view invoice page.
 */
export default function RenderViewInvoiceScreen({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  return (
    <section className='mx-auto py-12'>
      <InvoiceCard
        invoice={FakeInvoice}
        merchant={FakeMerchant}
      />
    </section>
  );
}

