/** @format */

"use client";

import {useInvoice} from "@/hooks";
import InvoiceNotAnalyzed from "../../_components/InvoiceNotAnalyzed";
import InvoiceNotFound from "../../_components/InvoiceNotFound";
import LoadingInvoice from "../../_components/LoadingInvoice";
import InvoicePhotoPreview from "./_components/InvoicePhotoPreview";
import ProductTable from "./_components/ProductTable";

/**
 * This function renders the edit invoice page.
 * @returns The view for the edit invoice page.
 */
export default function RenderEditInvoiceScreen({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const {invoice, isLoading} = useInvoice(invoiceIdentifier);

  if (isLoading) return <LoadingInvoice invoiceIdentifier={invoiceIdentifier} />;
  if (invoice === null) return <InvoiceNotFound invoiceIdentifier={invoiceIdentifier} />;
  if (invoice.numberOfUpdates === 0) return <InvoiceNotAnalyzed invoiceIdentifier={invoiceIdentifier} />;

  const {description, paymentInformation, isImportant} = invoice;
  return (
    <section className='mx-auto rounded-2xl border-2'>
      <div className='flex flex-row flex-nowrap'>
        <div className='mx-auto flex-initial 2xsm:w-full lg:w-1/2'>
          <div className='mb-12'>
            <table className='table table-auto text-center'>
              <thead className='mb-4 table-header-group bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl text-transparent'>
                <tr>
                  <th>
                    Property <br />
                    Name
                  </th>
                  <th>
                    Property <br />
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Currency</td>
                  <td>{paymentInformation?.currency.name}</td>
                </tr>
                <tr>
                  <td>Description</td>
                  <td>{description}</td>
                </tr>
                <tr className='table-row'>
                  <td>Is Important</td>
                  <td>{String(isImportant)}</td>
                </tr>
                <tr>
                  <td>Merchant Name</td>
                  <td>// TODO: complete</td>
                </tr>
                <tr className='table-row'>
                  <td>Merchant Address</td>
                  <td>// TODO: complete</td>
                </tr>
                <tr>
                  <td>Merchant Phone Number</td>
                  <td>// TODO: complete</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className='m-auto p-4 2xsm:hidden lg:block'>
          <InvoicePhotoPreview invoice={invoice} />
        </div>
      </div>
      <hr />
      <ProductTable invoice={invoice} />
    </section>
  );
}
