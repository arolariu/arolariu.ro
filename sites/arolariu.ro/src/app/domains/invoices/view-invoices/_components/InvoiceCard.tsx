/** @format */

import Invoice from "@/types/invoices/Invoice";
import Image from "next/image";
import Link from "next/link";

export const InvoiceCard = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const isPdfImage = invoice.photoLocation.endsWith(".pdf");

  return (
    <article className='w-full p-4 md:w-1/2 lg:w-1/4'>
      <Link
        href={`/domains/invoices/view-invoice/${invoice.id}`}
        className='relative block h-48 overflow-hidden rounded'>
        {Boolean(isPdfImage) && (
          <div className='flex h-full w-full items-center justify-center bg-gray-100'>
            <p className='text-2xl text-gray-500'>PDF</p>
          </div>
        )}
        {!isPdfImage && (
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
        <h3 className='title-font mb-1 text-xs tracking-widest dark:text-gray-500'>
          DATE: {new Date(invoice.paymentInformation?.dateOfPurchase ?? Date.now()).toUTCString()}
        </h3>
        <h2 className='title-font text-base font-medium text-gray-500'>MERCHANT: {invoice.merchant?.name}</h2>
        <p className='mt-1'>
          Total: {invoice.paymentInformation?.totalAmount}
          {invoice.paymentInformation?.currency?.symbol}
        </p>
      </div>
    </article>
  );
};
