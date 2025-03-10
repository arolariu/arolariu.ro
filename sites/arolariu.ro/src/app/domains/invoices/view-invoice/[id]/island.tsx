/** @format */

"use client";

import {FakeInvoice} from "@/data/mocks/invoices";
import {useUserInformation} from "@/hooks";

/**
 * This function renders the view invoice page.
 * @returns The JSX for the view invoice page.
 */
export default function RenderViewInvoiceScreen({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const {userInformation} = useUserInformation();
  // const {invoice, isLoading} = useInvoice(invoiceIdentifier);
  const invoice = FakeInvoice;

  return <section className='mx-auto py-12'></section>;
}
