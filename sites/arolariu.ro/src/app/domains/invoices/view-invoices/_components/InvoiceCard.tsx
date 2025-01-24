/** @format */
"use client";

import type Invoice from "@/types/invoices/Invoice";
import Image from "next/image";
import Link from "next/link";

/**
 * Function that generates a card for an invoice.
 * @returns The invoice card component, CSR'ed.
 */
export default function InvoiceCard({invoice}: Readonly<{invoice: Invoice}>) {
  const isPdfDocument = invoice.photoLocation.endsWith(".pdf");
  const isAnalyzed = invoice.numberOfUpdates > 0;

  return (
    <article className='w-full p-2 md:w-1/3 lg:w-1/4'>
      <Link
        href={`/domains/invoices/view-invoice/${invoice.id}`}
        className='relative block h-48 overflow-hidden rounded'>
        {Boolean(isPdfDocument) && (
          <div className='flex h-full w-full items-center justify-center bg-gray-100'>
            <p className='text-2xl text-gray-500'>PDF</p>
          </div>
        )}
        {!isPdfDocument && (
          <Image
            alt='ecommerce'
            className='block h-full w-full object-cover object-center'
            src={invoice.photoLocation}
            width={420}
            height={260}
          />
        )}
      </Link>
      <div className='mt-4'>
        {!isAnalyzed && <h3 className='mb-1 text-center text-xs tracking-widest'>INVOICE NOT ANALYZED !</h3>}
        {Boolean(isAnalyzed) && (
          <>
            <h3 className='mb-1 text-xs tracking-widest dark:text-gray-500'>
              DATE: {new Date(invoice.paymentInformation?.transactionDate ?? Date.now()).toUTCString()}
            </h3>
            <h2 className='title-font text-base font-medium text-gray-500'>MERCHANT: {invoice.merchant?.name}</h2>
            <p className='mt-1'>
              Total: {invoice.paymentInformation?.totalCostAmount}
              {invoice.paymentInformation?.currencySymbol} ({invoice.items.length} items)
            </p>
          </>
        )}
      </div>
    </article>
  );
}
