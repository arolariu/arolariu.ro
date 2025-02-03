/** @format */
"use client";

import {useUserInformation} from "@/hooks";
import updateInvoice from "@/lib/actions/invoices/updateInvoice";
import type {Invoice} from "@/types/invoices";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";

const InvoiceCardPreview = ({
  isFavorite,
  photoLocation,
  handleFavorite,
}: Readonly<{
  isFavorite: boolean;
  photoLocation: string;
  handleFavorite: (
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
  ) => Promise<void>;
}>) => {
  const isPdfDocument = photoLocation.endsWith(".pdf");

  switch (isPdfDocument) {
    case true:
      return (
        <div className='flex h-full w-full items-center justify-center bg-gray-100'>
          <p className='text-2xl text-gray-500'>PDF</p>
        </div>
      );

    case false:
      return (
        <div className='relative'>
          <button
            onClick={handleFavorite}
            className='btn btn-circle btn-outline btn-sm absolute right-2 top-2'>
            {isFavorite ? "❤️" : "🤍"}
          </button>
          <Image
            alt='ecommerce'
            className='relative block h-full w-full transform cursor-pointer overflow-hidden rounded object-cover object-center transition duration-300 ease-in-out hover:opacity-15'
            src={photoLocation}
            width={420}
            height={260}
          />
        </div>
      );
  }
};

const InvoiceCardInfo = ({invoice}: Readonly<{invoice: Invoice}>) => {
  const isAnalyzed = invoice.numberOfUpdates > 0;

  const totalSavingsAmount = invoice.items.filter((item) => item.price < 0).reduce((acc, item) => acc + item.price, 0);
  const totalSavings = `${totalSavingsAmount}${invoice.paymentInformation?.currency?.symbol}`;

  const transactionDate = new Date(invoice.paymentInformation?.transactionDate ?? Date.now()).toUTCString();
  const totalAmountCost = `${invoice.paymentInformation?.totalCostAmount}${invoice.paymentInformation?.currency?.symbol}`;
  const totalNumberOfProducts = invoice.items.length;

  const totalNumberOfEdits = invoice.numberOfUpdates;

  if (isAnalyzed) {
    return (
      <section className='flex flex-col'>
        <table className='table table-xs'>
          <thead>
            <tr>
              <th>Invoice</th>
              <th className='text-right'>#{invoice.id}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className='font-semibold'>Date</td>
              <td className='text-right'>{transactionDate}</td>
            </tr>
            <tr>
              <td className='font-semibold'>Cost</td>
              <td className='text-right text-red-500'>{totalAmountCost}</td>
            </tr>
            <tr>
              <td className='font-semibold'>Savings</td>
              <td className='text-right text-green-500'>{totalSavings}</td>
            </tr>
            <tr>
              <td className='font-semibold'># Products</td>
              <td className='text-right'>{totalNumberOfProducts}</td>
            </tr>
            <tr>
              <td className='font-semibold'># Edits</td>
              <td className='text-right'>{totalNumberOfEdits}</td>
            </tr>
          </tbody>
        </table>
      </section>
    );
  } else return <span className='mb-1 text-center text-xs tracking-widest'>INVOICE NOT ANALYZED !</span>;
};

/**
 * Function that generates a card for an invoice.
 * @returns The invoice card component, CSR'ed.
 */
export default function InvoiceCard({invoice}: Readonly<{invoice: Invoice}>) {
  const [isFavorite, setIsFavorite] = useState<boolean>(invoice.isImportant);
  const {userInformation} = useUserInformation();
  const router = useRouter();

  const handleFavorite = async (
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    setIsFavorite((prev) => {
      updateInvoice({...invoice, isImportant: !prev}, userInformation!);

      return !prev;
    });
  };

  const handleDelete = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      event.preventDefault();
      console.log("Delete clicked!");
    },
    [invoice.id],
  );

  const handleNavigation = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      event.preventDefault();
      router.push(`/domains/invoices/view-invoice/${invoice.id}`);
    },
    [invoice.id],
  );

  return (
    <article className='w-full rounded-xl border-2 p-2 md:w-1/3 lg:w-1/4'>
      <section>
        <InvoiceCardPreview
          isFavorite={isFavorite}
          photoLocation={invoice.photoLocation}
          handleFavorite={handleFavorite}
        />
      </section>
      <section className='mt-4'>
        <InvoiceCardInfo invoice={invoice} />
      </section>
      <section className='flex flex-row items-center justify-evenly justify-items-center gap-4'>
        <button
          onClick={handleDelete}
          className='btn btn-outline h-6 max-h-6 min-h-6'>
          DELETE
        </button>
        <button
          onClick={handleDelete}
          className='btn btn-secondary h-6 max-h-6 min-h-6'>
          Quick View
        </button>
        <button
          onClick={handleNavigation}
          className='btn btn-success h-6 max-h-6 min-h-6'>
          View
        </button>
      </section>
    </article>
  );
}
