"use client";

import EditInvoiceItemCard from "@/components/domains/invoices/edit-invoice/EditInvoiceItemCard";
import EditInvoicePhotoPreview from "@/components/domains/invoices/edit-invoice/EditInvoicePhotoPreview";
import {EditInvoiceTable} from "@/components/domains/invoices/edit-invoice/EditInvoiceTable";
import {useZustandStore} from "@/hooks/stateStore";
import useWindowSize from "@/hooks/useWindowSize";
import Invoice from "@/types/invoices/Invoice";
import Product from "@/types/invoices/Product";

interface Props {
  invoice: Invoice;
}

/**
 * This function renders the edit invoice page.
 * @returns The view for the edit invoice page.
 */
export default function RenderEditInvoicePage({invoice}: Readonly<Props>) {
  const setSelectedInvoice = useZustandStore((state) => state.setSelectedInvoice);
  const {windowSize} = useWindowSize();
  setSelectedInvoice(invoice);

  // TODO: invoice item card pagination to avoid slow performance that can be seen after 10 items for e.g.;
  // TODO: filtering, searching, sorting, etc for the invoice items.
  // TODO: saving mechanism for the invoice items.

  return (
    <section className='container mx-auto my-8 rounded-2xl border-2 p-2'>
      {typeof windowSize.width === "number" && windowSize.width < 1024 && (
        <div className='m-auto'>
          <EditInvoicePhotoPreview />
        </div>
      )}
      <div className='flex flex-row flex-nowrap'>
        <div className='mx-auto flex-initial 2xsm:w-full lg:w-1/2'>
          <EditInvoiceTable />
        </div>
        {typeof windowSize.width === "number" && windowSize.width >= 1024 && (
          <div className='m-auto p-4 2xsm:hidden lg:block'>
            <EditInvoicePhotoPreview />
          </div>
        )}
      </div>
      <hr />
      <div className='mx-auto flex flex-row gap-10'>
        <h2 className='mt-4 w-4/5 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text indent-8 text-2xl font-extrabold tracking-widest text-transparent'>
          Item List: ({invoice.items.length} items)
        </h2>
        <p className='mt-6 justify-end text-sm text-gray-500'>
          Filters:
          <button
            type='button'
            className='tooltip tooltip-top mx-2 rounded-full bg-gray-900 px-2 py-1 text-xs font-bold text-white'
            data-tip='Filter for only edited items.'>
            Edited
          </button>
          <button
            type='button'
            className='tooltip tooltip-bottom mx-2 rounded-full bg-gray-900 px-2 py-1 text-xs font-bold text-white'
            data-tip='Filter for only complete items.'>
            Complete
          </button>
        </p>
      </div>
      <div className='flex flex-row flex-wrap'>
        {invoice.items.map((item: Product, index: number) => (
          <div
            key={index}
            className='2xsm:w-full sm:w-1/2 lg:w-1/3 xl:w-1/4'>
            <EditInvoiceItemCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
