/** @format */

"use client";

import UploadArea from "./_components/UploadArea";
import UploadPreview from "./_components/UploadPreview";
import UploadProgress from "./_components/UploadProgress";
import UploadStats from "./_components/UploadStats";
import {InvoiceCreatorProvider} from "./_context/InvoiceCreatorContext";

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderCreateInvoiceScreen() {
  return (
    <InvoiceCreatorProvider>
      <section className='mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8'>
        <UploadPreview />
        <UploadProgress />
        <UploadArea />
        <UploadStats />
      </section>
    </InvoiceCreatorProvider>
  );
}
