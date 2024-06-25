/** @format */

"use client";

import useUserInformation from "@/hooks/useUserInformation";
import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import Invoice from "@/types/invoices/Invoice";
import Link from "next/link";
import {useEffect, useState} from "react";
import {InvoiceFilters} from "./_components/InvoiceFilters";
import {InvoiceList} from "./_components/InvoiceList";

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen() {
  const {userInformation} = useUserInformation();
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [shownInvoices, setShownInvoices] = useState<Invoice[]>(invoices ?? []);
  const [displayStyle, setDisplayStyle] = useState<"grid" | "list">("list");
  const [filters, setFilters] = useState({
    isImportant: false,
    dayOnly: false,
    nightOnly: false,
  });

  useEffect(() => {
    const fetchInvoicesForUser = async () => {
      if (userInformation === null) return console.info("User information is not available.");
      const invoices = await fetchInvoices(userInformation);
      setInvoices(invoices);
      setShownInvoices(invoices ?? []);
    };

    fetchInvoicesForUser();
  }, [userInformation]);

  useEffect(() => {
    let filteredInvoices = invoices!;

    const timeOfPurchase = (invoice: Invoice): number => {
      const date = new Date(invoice.paymentInformation?.dateOfPurchase ?? 0);
      return date.getHours();
    };

    if (filters.isImportant) {
      filteredInvoices = filteredInvoices.filter((invoice) => invoice.isImportant);
    }

    if (filters.dayOnly) {
      filteredInvoices = filteredInvoices.filter(
        (invoice) => timeOfPurchase(invoice) >= 6 && timeOfPurchase(invoice) < 18,
      );
    }

    if (filters.nightOnly) {
      filteredInvoices = filteredInvoices.filter(
        (invoice) => timeOfPurchase(invoice) < 6 || timeOfPurchase(invoice) >= 18,
      );
    }
    setShownInvoices(filteredInvoices);
  }, [filters, invoices]);

  if (!invoices)
    return (
      <div className='mb-20 flex w-full flex-col text-center'>
        <h1 className='mb-4 text-2xl font-medium sm:text-3xl'>Something is missing here... 😰</h1>
        <article className='mx-auto text-base leading-relaxed lg:w-2/3'>
          It seems that you do not have any invoices associated with your account... <br />
          Please upload some invoices and come back later. <br /> <br />
        </article>
        <Link
          href='./create-invoice'
          className='mx-auto mt-8 inline-flex rounded border-0 bg-indigo-500 px-6 py-2 text-lg text-white hover:bg-indigo-600 focus:outline-none'>
          Upload an invoice here.
        </Link>
      </div>
    );

  const calculateInvoiceTotalCost = (): number => {
    return shownInvoices.reduce((totalCost, invoice) => totalCost + (invoice?.paymentInformation?.totalAmount ?? 0), 0);
  };

  const calculateInvoiceTotalSavings = (): number => {
    return shownInvoices.reduce((totalSavings, invoice) => {
      const invoiceItems = invoice?.items;
      const savings =
        invoiceItems !== null
          ? invoiceItems.filter((item) => item.price < 0).reduce((subtotal, item) => subtotal + item.price, 0)
          : 0;
      return totalSavings + savings;
    }, 0);
  };

  const calculateNumberOfProductsBought = (): number => {
    return shownInvoices.reduce((total, invoice) => {
      const invoiceItems = invoice?.items;
      const productsBought = invoiceItems !== null ? invoiceItems.filter((item) => item.totalPrice > 0) : [];
      return total + productsBought.reduce((subtotal, item) => subtotal + item?.quantity, 0);
    }, 0);
  };

  return (
    <section>
      <article className='container mx-auto px-5 pb-6'>
        <div className='-m-4 flex flex-wrap text-center'>
          <div className='w-1/2 p-4 sm:w-1/4'>
            <h2 className='title-font text-3xl font-medium sm:text-4xl'>{invoices.length}</h2>
            <p className='leading-relaxed'>Invoices</p>
          </div>
          <div className='w-1/2 p-4 sm:w-1/4'>
            <h2 className='title-font text-3xl font-medium text-red-400 sm:text-4xl'>{calculateInvoiceTotalCost()}</h2>
            <p className='leading-relaxed'>Total Cost</p>
          </div>
          <div className='w-1/2 p-4 sm:w-1/4'>
            <h2 className='title-font text-3xl font-medium text-green-400 sm:text-4xl'>
              {calculateInvoiceTotalSavings()}
            </h2>
            <p className='leading-relaxed'>Total Savings</p>
          </div>
          <div className='w-1/2 p-4 sm:w-1/4'>
            <h2 className='title-font text-3xl font-medium sm:text-4xl'>{calculateNumberOfProductsBought()}</h2>
            <p className='leading-relaxed'>Products bought</p>
          </div>
        </div>
      </article>
      <InvoiceFilters
        filters={filters}
        displayStyle={displayStyle}
        setDisplayStyle={setDisplayStyle}
        setFilters={setFilters}
      />
      <hr className='pb-16' />
      <InvoiceList
        invoices={shownInvoices}
        displayStyle={displayStyle}
      />
    </section>
  );
}
