/** @format */

import Invoice from "@/types/invoices/Invoice";

/**
 * The header of the view-invoices page.
 * @returns The header of the view-invoices page.
 */
export default function InvoicesHeader({shownInvoices}: Readonly<{shownInvoices: Invoice[]}>) {
  const totalCostOfShownInvoices = () => {
    const amounts = shownInvoices.flatMap((invoice) => invoice.paymentInformation?.totalAmount) as number[];
    return amounts.reduce((acc, amount) => acc + amount, 0);
  };

  const totalSavingsOfShownInvoices = () => {
    const products = shownInvoices.flatMap((invoice) => invoice.items);
    const productsWithDiscount = products.filter((product) => product.price < 0);
    return productsWithDiscount.reduce((acc, product) => acc + product.price, 0);
  };

  const numberOfProductsBought = () => shownInvoices.flatMap((invoice) => invoice.items).length;

  return (
    <article className='container mx-auto px-5 pb-6'>
      <div className='-m-4 flex flex-wrap text-center'>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium sm:text-4xl'>{shownInvoices.length}</h2>
          <p className='leading-relaxed'>Shown Invoices</p>
        </div>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium text-red-400 sm:text-4xl'>{totalCostOfShownInvoices()}</h2>
          <p className='leading-relaxed'>Total Cost</p>
        </div>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium text-green-400 sm:text-4xl'>
            {totalSavingsOfShownInvoices()}
          </h2>
          <p className='leading-relaxed'>Total Savings</p>
        </div>
        <div className='w-1/2 p-4 sm:w-1/4'>
          <h2 className='title-font text-3xl font-medium sm:text-4xl'>{numberOfProductsBought()}</h2>
          <p className='leading-relaxed'>Products bought</p>
        </div>
      </div>
    </article>
  );
}
