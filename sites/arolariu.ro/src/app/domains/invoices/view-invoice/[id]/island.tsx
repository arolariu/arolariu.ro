"use client";

import ViewInvoiceAdditionalInformation from "@/components/domains/invoices/view-invoice/ViewInvoiceAdditionalInformation";
import ViewInvoiceFooter from "@/components/domains/invoices/view-invoice/ViewInvoiceFooter";
import {ViewInvoiceHeader} from "@/components/domains/invoices/view-invoice/ViewInvoiceHeader";
import {ViewInvoiceImageModal} from "@/components/domains/invoices/view-invoice/ViewInvoiceImageModal";
import ViewInvoiceItems from "@/components/domains/invoices/view-invoice/ViewInvoiceItems";
import {ViewInvoiceSummary} from "@/components/domains/invoices/view-invoice/ViewInvoiceSummary";
import Invoice from "@/types/invoices/Invoice";
import {useState} from "react";

interface Props {
  invoice: Invoice;
}

/**
 * This function renders the view invoice page.
 * @returns The JSX for the view invoice page.
 */
export function RenderViewInvoicePage({invoice}: Readonly<Props>) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const {id, description} = invoice;

  return (
    <div className='container mx-auto py-12'>
      <div className='mx-auto flex flex-wrap justify-center'>
        <div className='mb-6 w-full lg:mb-0 lg:w-1/2 lg:py-6 lg:pr-10'>
          <h2 className='title-font text-sm tracking-widest dark:text-gray-500'>
            Invoice id: <span>{id}</span>
          </h2>
          <h1 className='text-transparenttext-3xl mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-3xl font-medium text-transparent'>
            {description}
          </h1>
          <ViewInvoiceHeader
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />
          {currentStep === 1 && <ViewInvoiceSummary />}
          {currentStep === 2 && <ViewInvoiceItems />}
          {currentStep === 3 && <ViewInvoiceAdditionalInformation />}
          <ViewInvoiceFooter />
        </div>
      </div>
      <ViewInvoiceImageModal />
    </div>
  );
}
