/** @format */

import type Invoice from "@/types/invoices/Invoice";
import {useMemo, useState} from "react";

/**
 * The header of the view-invoices page.
 * @returns The header of the view-invoices page.
 */
export default function InvoicesHeader({shownInvoices}: Readonly<{shownInvoices: Invoice[]}>) {
  const [currentCurrency, setCurrentCurrency] = useState<"USD" | "EUR" | "GBP">("USD");

  const totalCost = useMemo(() => {
    const amounts = shownInvoices
      .flatMap((invoice) => invoice.paymentInformation?.totalAmount)
      .filter((amount): amount is number => amount !== undefined);
    return amounts.reduce((acc, amount) => acc + amount, 0);
  }, [shownInvoices]);

  const totalSavings = useMemo(() => {
    const products = shownInvoices.flatMap((invoice) => invoice.items);
    const productsWithDiscount = products.filter((product) => product.price < 0);
    return productsWithDiscount.reduce((acc, product) => acc + product.price, 0);
  }, [shownInvoices]);

  const totalProducts = shownInvoices.flatMap((invoice) => invoice.items).length;

  return (
    <article className='container mx-auto px-5 pb-6'>
      <div className='-m-4 flex flex-wrap text-center'>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium sm:text-4xl'>{shownInvoices.length}</h2>
          <p className='leading-relaxed'>Shown Invoices</p>
        </div>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium text-red-400 sm:text-4xl'>{totalCost}</h2>
          <p className='leading-relaxed'>Total Cost ({currentCurrency})</p>
          <div className='flex flex-row items-center justify-center justify-items-center gap-2'>
            <button onClick={() => setCurrentCurrency("USD")}>$</button>
            <button onClick={() => setCurrentCurrency("EUR")}>€</button>
            <button onClick={() => setCurrentCurrency("GBP")}>£</button>
          </div>
        </div>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium text-green-400 sm:text-4xl'>{totalSavings}</h2>
          <p className='leading-relaxed'>Total Savings ({currentCurrency})</p>
          <div className='flex flex-row items-center justify-center justify-items-center gap-2'>
            <button onClick={() => setCurrentCurrency("USD")}>$</button>
            <button onClick={() => setCurrentCurrency("EUR")}>€</button>
            <button onClick={() => setCurrentCurrency("GBP")}>£</button>
          </div>
        </div>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium sm:text-4xl'>{totalProducts}</h2>
          <p className='leading-relaxed'>Products bought</p>
        </div>
      </div>
    </article>
  );
}
