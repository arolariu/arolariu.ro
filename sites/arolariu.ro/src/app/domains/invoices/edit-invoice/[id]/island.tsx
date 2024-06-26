/** @format */

"use client";

import useUserInformation from "@/hooks/useUserInformation";
import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import Invoice from "@/types/invoices/Invoice";
import {useEffect, useState} from "react";
import InvoicePhotoPreview from "./_components/InvoicePhotoPreview";
import ProductTable from "./_components/ProductTable";

/**
 * This function renders the edit invoice page.
 * @returns The view for the edit invoice page.
 */
export default function RenderEditInvoiceScreen({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  const {userInformation} = useUserInformation();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const fetchInvoiceInformation = async () => {
      if (userInformation === null) return console.info("User information is not available.");
      const invoiceInformation = await fetchInvoice(invoiceIdentifier, userInformation);
      if (invoiceInformation) setInvoice(invoiceInformation);
    };

    fetchInvoiceInformation();
  }, [userInformation]);

  if (!invoice) return null;

  const {description, paymentInformation, isImportant, merchant, estimatedSurvivalDays} = invoice;

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
                  <td>{paymentInformation?.currency?.name}</td>
                </tr>
                <tr>
                  <td>Description</td>
                  <td>{description}</td>
                </tr>
                <tr>
                  <td>Estimated Survival Days</td>
                  <td>{estimatedSurvivalDays}</td>
                </tr>
                <tr className='table-row'>
                  <td>Is Important</td>
                  <td>{String(isImportant)}</td>
                </tr>
                <tr>
                  <td>Merchant Name</td>
                  <td>{merchant?.name}</td>
                </tr>
                <tr className='table-row'>
                  <td>Merchant Address</td>
                  <td>{merchant?.address}</td>
                </tr>
                <tr>
                  <td>Merchant Phone Number</td>
                  <td>{merchant?.phoneNumber}</td>
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
