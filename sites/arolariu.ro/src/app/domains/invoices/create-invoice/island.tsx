/** @format */

"use client";

import InvoicePreview from "./_components/InvoicePreview";
import InvoiceSubmitForm from "./_components/InvoiceSubmitForm";
import InvoiceSubtitle from "./_components/InvoiceSubtitle";
import {InvoiceCreatorProvider} from "./_context/InvoiceCreatorContext";

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderCreateInvoiceScreen() {
  return (
    <InvoiceCreatorProvider>
      <section className='h-full w-full'>
        <InvoicePreview />
        <InvoiceSubtitle />
        <InvoiceSubmitForm />
      </section>
    </InvoiceCreatorProvider>
  );
}
