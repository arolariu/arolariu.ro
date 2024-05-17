"use client";

import Invoice from "@/types/invoices/Invoice";
import {useLayoutEffect, useState} from "react";
import {InvoiceFilters} from "./_components/InvoiceFilters";
import {InvoiceList} from "./_components/InvoiceList";

interface Props {
  invoices: Invoice[] | undefined;
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
  }, [filters]);

  const calculateInvoiceTotalCost = (): number => {
    let totalCost = 0;
    for (const invoice of shownInvoices) {
      totalCost += invoice.paymentInformation.totalAmount;
    }
    return totalCost;
  };

  const calculateInvoiceTotalSavings = (): number => {
    let totalSavings = 0;
    for (const invoice of shownInvoices) {
      for (const item of invoice.items) {
        if (item.price < 0) totalSavings += item.price;
      }
    }
    return -totalSavings;
  };

  const calculateNumberOfProductsBought = (): number => {
    let totalProducts = 0;
    for (const invoice of shownInvoices) {
      for (const item of invoice.items) {
        if (item.totalPrice > 0) totalProducts += item.quantity;
      }
    }
    return totalProducts;
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
