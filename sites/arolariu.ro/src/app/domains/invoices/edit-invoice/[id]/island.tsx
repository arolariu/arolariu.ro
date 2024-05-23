/** @format */

"use client";

import EditInvoicePhotoPreview from "@/components/domains/invoices/edit-invoice/EditInvoicePhotoPreview";
import useWindowSize from "@/hooks/useWindowSize";
import Invoice from "@/types/invoices/Invoice";
import ProductTable from "./_components/ProductTable";

/**
 * This function renders the edit invoice page.
 * @returns The view for the edit invoice page.
 */
export default function RenderEditInvoiceScreen({invoice}: Readonly<{invoice: Invoice}>) {
  const {windowSize} = useWindowSize();
  const {merchant, additionalMetadata, description, isImportant, estimatedSurvivalDays, paymentInformation} = invoice;
  const {name, address, phoneNumber} = merchant;

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
                  <td>{paymentInformation.currency.name}</td>
                </tr>
                <tr>
                  <td>Description</td>
                  <td>{description}</td>
                </tr>
                <tr>
                  <td>Estimated Survival Days</td>
                  <td>{estimatedSurvivalDays}</td>
                </tr>
                <tr>
                  <td>Identified Date</td>
                  <td>{paymentInformation.dateOfPurchase.toUTCString()}</td>
                </tr>
                <tr className='table-row'>
                  <td>Is Important</td>
                  <td>{String(isImportant)}</td>
                </tr>
                <tr>
                  <td>Merchant Name</td>
                  <td>{name}</td>
                </tr>
                <tr className='table-row'>
                  <td>Merchant Address</td>
                  <td>{address}</td>
                </tr>
                <tr>
                  <td>Merchant Phone Number</td>
                  <td>{phoneNumber}</td>
                </tr>
                {additionalMetadata.flatMap((metadata, index) => (
                  <tr key={index}>
                    <td>{Object.keys(metadata)[index]}</td>
                    <td>{String(Object.values(metadata)[index])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className='mt-8'>
              <form className='rounded-xl border-2 p-4'>
                <label htmlFor='additionalMetadataKey'>Additional Metadata - Key</label>
                <input
                  className='mt-2 block w-full rounded-md border-gray-300 bg-gray-100 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500'
                  type='text'
                  name='additionalMetadataKey'
                  id='additionalMetadataKey'
                />
                <label htmlFor='additionalMetadataValue'>Additional Metadata - Value</label>
                <input
                  className='mt-2 block w-full rounded-md border-gray-300 bg-gray-100 px-4 py-2 text-gray-900 focus:border-pink-500 focus:ring-pink-500'
                  type='text'
                  name='additionalMetadataValue'
                  id='additionalMetadataValue'
                />
                <div className='mt-4 flex flex-col gap-4'>
                  <button
                    type='submit'
                    className='btn btn-primary'>
                    Add Additional Metadata
                  </button>
                  <button
                    type='submit'
                    className='btn btn-secondary'>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {typeof windowSize.width === "number" && windowSize.width >= 1024 && (
          <div className='m-auto p-4 2xsm:hidden lg:block'>
            <EditInvoicePhotoPreview />
          </div>
        )}
      </div>
      <hr />
      <ProductTable invoice={invoice} />
    </section>
  );
}
