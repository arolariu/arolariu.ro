/** @format */

"use client";

import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
import {UserInformation} from "@/types/UserInformation";
import Invoice from "@/types/invoices/Invoice";
import Link from "next/link";
import {useEffect, useLayoutEffect, useState} from "react";
import {InvoiceFilters} from "./_components/InvoiceFilters";
import {InvoiceList} from "./_components/InvoiceList";

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [displayStyle, setDisplayStyle] = useState<"grid" | "list">("list");
  const [shownInvoices, setShownInvoices] = useState<Invoice[]>(invoices!);
  const [userInformation, setUserInformation] = useState<UserInformation | null>(null);
  const [filters, setFilters] = useState({
    isImportant: false,
    dayOnly: false,
    nightOnly: false,
  });

  useLayoutEffect(() => {
    let filteredInvoices = invoices!;
    if (filters.isImportant) {
      filteredInvoices = filteredInvoices.filter((invoice) => invoice.isImportant);
    }
    if (filters.dayOnly) {
      filteredInvoices = filteredInvoices.filter(
        (invoice) =>
          invoice.paymentInformation.dateOfPurchase.getHours() >= 6 &&
          invoice.paymentInformation.dateOfPurchase.getHours() < 18,
      );
    }
    if (filters.nightOnly) {
      filteredInvoices = filteredInvoices.filter(
        (invoice) =>
          invoice.paymentInformation.dateOfPurchase.getHours() >= 18 ||
          invoice.paymentInformation.dateOfPurchase.getHours() < 6,
      );
    }
    setShownInvoices(filteredInvoices);
  }, [filters, invoices]);

  useEffect(() => {
    const fetchUserInformation = async () => {
      const response = await fetch(`/api/user-information`);
      const data = await response.json();
      setUserInformation(data as UserInformation);
    };

    const fetchInvoicesForUser = async () => {
      const invoices = await fetchInvoices(userInformation!);
      setInvoices(invoices);
    };

    fetchUserInformation();
    fetchInvoicesForUser();

    return () => {
      setInvoices(null);
      setUserInformation(null);
    };
  }, [invoices]);

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
    return shownInvoices.reduce((totalCost, invoice) => totalCost + invoice.paymentInformation.totalAmount, 0);
  };

  const calculateInvoiceTotalSavings = (): number => {
    return shownInvoices.reduce((totalSavings, invoice) => {
      const savings = invoice.items
        .filter((item) => item.price < 0)
        .reduce((subtotal, item) => subtotal + item.price, 0);
      return totalSavings + savings;
    }, 0);
  };

  const calculateNumberOfProductsBought = (): number => {
    return shownInvoices.reduce((total, invoice) => {
      const productsBought = invoice.items.filter((item) => item.totalPrice > 0);
      return total + productsBought.reduce((subtotal, item) => subtotal + item.quantity, 0);
    }, 0);
  };

  return (
    <section>
      <article className='container mx-auto px-5 pb-6'>
        <div className='-m-4 flex flex-wrap text-center'>
          <div className='w-1/2 p-4 sm:w-1/4'>
            <h2 className='title-font text-3xl font-medium sm:text-4xl'>{shownInvoices.length}</h2>
            <p className='leading-relaxed'>Invoices</p>
          </div>
          <div className='w-1/2 p-4 sm:w-1/4'>
            <h2 className='title-font text-3xl font-medium text-red-400 sm:text-4xl'>
              {calculateInvoiceTotalCost()} SEK
            </h2>
            <p className='leading-relaxed'>Total Cost</p>
          </div>
          <div className='w-1/2 p-4 sm:w-1/4'>
            <h2 className='title-font text-3xl font-medium text-green-400 sm:text-4xl'>
              {calculateInvoiceTotalSavings()} SEK
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
      />{" "}
      <hr className='pb-16' />
      <InvoiceList
        invoices={shownInvoices}
        displayStyle={displayStyle}
      />
    </section>
  );
}
