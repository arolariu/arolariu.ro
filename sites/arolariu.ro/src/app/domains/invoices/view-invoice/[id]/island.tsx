/** @format */

"use client";

import useInvoice from "@/hooks/useInvoice";
import useUserInformation from "@/hooks/useUserInformation";
import updateInvoice from "@/lib/actions/invoices/updateInvoice";
import Link from "next/link";
import {useState} from "react";
import InvoiceNotAnalyzed from "../../_components/InvoiceNotAnalyzed";
import InvoiceNotFound from "../../_components/InvoiceNotFound";
import LoadingInvoice from "../../_components/LoadingInvoice";
import {InvoiceImagePreview} from "./_components/InvoiceImagePreview";
import {InvoiceInformation} from "./_components/InvoiceInformation";
import {InvoiceProducts} from "./_components/InvoiceProducts";
import {InvoiceSummary} from "./_components/InvoiceSummary";

/**
 * This function renders the view invoice page.
 * @returns The JSX for the view invoice page.
 */
export default function RenderViewInvoiceScreen({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const {userInformation} = useUserInformation();
  const {invoice, isLoading} = useInvoice({invoiceIdentifier});
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (isLoading) return <LoadingInvoice invoiceIdentifier={invoiceIdentifier} />;
  if (invoice === null) return <InvoiceNotFound invoiceIdentifier={invoiceIdentifier} />;
  if (invoice.numberOfUpdates === 0) return <InvoiceNotAnalyzed invoiceIdentifier={invoiceIdentifier} />;

  const {id, description, paymentInformation, isImportant} = invoice;
  const buttonStyle = ["border-indigo-500", "border-gray-300"];

  return (
    <section className='mx-auto py-12'>
      <div className='mx-auto flex flex-wrap justify-center'>
        <div className='mb-6 w-full lg:mb-0 lg:w-1/2 lg:py-6 lg:pr-10'>
          <h2 className='text-md tracking-widest text-gray-500 2xsm:text-xs'>
            Invoice id: <span>{id}</span>{" "}
          </h2>
          <h3 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-3xl font-medium text-transparent'>
            {description?.length && description.length > 0 ? description : "NO DESCRIPTION AVAILABLE"}
          </h3>
          <div className='mb-4 flex'>
            <button
              type='button'
              className={`${currentStep === 1 ? String(buttonStyle[0]) : String(buttonStyle[1])} flex-grow cursor-pointer border-b-2 px-1 py-2 text-lg`}
              onClick={() => setCurrentStep(1)}>
              Summary
            </button>
            <button
              type='button'
              className={`${currentStep === 2 ? String(buttonStyle[0]) : String(buttonStyle[1])} mx-1 flex-grow cursor-pointer border-b-2 px-1 py-2 text-lg`}
              onClick={() => setCurrentStep(2)}>
              Items
            </button>
            <button
              type='button'
              className={`${currentStep === 3 ? String(buttonStyle[0]) : String(buttonStyle[1])} flex-grow cursor-pointer border-b-2 px-1 py-2 text-lg`}
              onClick={() => setCurrentStep(3)}>
              Additional Information
            </button>
          </div>
          {currentStep === 1 && <InvoiceSummary invoice={invoice} />}
          {currentStep === 2 && <InvoiceProducts invoice={invoice} />}
          {currentStep === 3 && <InvoiceInformation invoice={invoice} />}
          <div className='flex'>
            <span className='title-font text-2xl font-medium dark:text-gray-300'>
              Total Cost: {paymentInformation?.totalAmount}
              {paymentInformation?.currency?.symbol}
            </span>
            <Link
              href={`/domains/invoices/edit-invoice/${id}`}
              className='ml-auto flex rounded border-0 bg-indigo-500 px-6 py-2 text-white hover:bg-indigo-600 focus:outline-none'>
              Edit this invoice
            </Link>
            <button
              type='button'
              className='my-auto ml-4 inline-flex h-10 w-10 items-center justify-center rounded-full border-0 bg-gray-200 p-0 text-gray-500'
              title='Bookmark (mark as important) the invoice'
              onClick={() => {
                // TODO: Update the invoice in the database.
                void updateInvoice(invoice, userInformation!);
              }}>
              <svg
                fill='currentColor'
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                className={`${isImportant ? "text-red-600" : ""} h-5 w-5`}
                viewBox='0 0 24 24'>
                <path d='M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z' />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <InvoiceImagePreview invoice={invoice} />
    </section>
  );
}
