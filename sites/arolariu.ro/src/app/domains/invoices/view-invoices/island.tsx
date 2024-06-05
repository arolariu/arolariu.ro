/** @format */

"use client";

import Invoice from "@/types/invoices/Invoice";
import {useLayoutEffect, useState} from "react";
import {InvoiceFilters} from "./_components/InvoiceFilters";
import {InvoiceList} from "./_components/InvoiceList";

interface Props {
  invoices: Invoice[] | null;
}

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesScreen({invoices}: Readonly<Props>) {
  const [displayStyle, setDisplayStyle] = useState<"grid" | "list">("list");
  const [shownInvoices, setShownInvoices] = useState<Invoice[]>(invoices!);
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
