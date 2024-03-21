"use client";

import { InvoiceCard } from "@/components/Cards/InvoiceCard";
import Invoice from "@/types/invoices/Invoice";
interface Props {
  invoices: Invoice[] | undefined;
}

/**
 * This function renders the view invoices page.
 * @returns This function renders the view invoices page.
 */
export default function RenderViewInvoicesPage({ invoices }: Readonly<Props>) {
  if (!invoices) return;

  const calculateInvoiceTotalCost = (): number => {
    let totalCost = 0;
    for (const invoice of invoices) {
      totalCost += invoice.paymentInformation.totalAmount;
    }
    return totalCost;
  };

  const calculateInvoiceTotalSavings = (): number => {
    let totalSavings = 0;
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        if (item.price < 0) totalSavings += item.price;
      }
    }
    return -totalSavings;
  };

  const calculateNumberOfProductsBought = (): number => {
    let totalProducts = 0;
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        if (item.totalPrice > 0) totalProducts += item.quantity;
      }
    }
    return totalProducts;
  };

  return (
    <>
      <section className="dark:text-white">
        <div className="container px-5 pb-6 mx-auto">
          <div className="flex flex-wrap -m-4 text-center">
            <div className="w-1/2 p-4 sm:w-1/4">
              <h2 className="text-3xl font-medium title-font sm:text-4xl">{invoices.length}</h2>
              <p className="leading-relaxed">Invoices</p>
            </div>
            <div className="w-1/2 p-4 sm:w-1/4">
              <h2 className="text-3xl font-medium text-red-400 title-font sm:text-4xl">
                {calculateInvoiceTotalCost()} SEK
              </h2>
              <p className="leading-relaxed">Total Cost</p>
            </div>
            <div className="w-1/2 p-4 sm:w-1/4">
              <h2 className="text-3xl font-medium text-green-400 title-font sm:text-4xl">
                {calculateInvoiceTotalSavings()} SEK
              </h2>
              <p className="leading-relaxed">Total Savings</p>
            </div>
            <div className="w-1/2 p-4 sm:w-1/4">
              <h2 className="text-3xl font-medium title-font sm:text-4xl">{calculateNumberOfProductsBought()}</h2>
              <p className="leading-relaxed">Products bought</p>
            </div>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap -m-4">
        {invoices.map((invoice) => {
          return <InvoiceCard key={invoice.id} invoice={invoice} />;
        })}
      </div>
    </>
  );
}
