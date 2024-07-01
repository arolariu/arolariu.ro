/** @format */

"use client";

export default function InvoiceNotAnalyzed({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  return (
    <section className='flex flex-col flex-nowrap items-center justify-center justify-items-center'>
      <article className='mx-auto flex-initial 2xsm:w-full lg:w-1/2'>
        <h1 className='text-center text-2xl font-bold'>Invoice {invoiceIdentifier} has not been analyzed!</h1>
      </article>
      <article>
        <p className='text-center'>The invoice with the identifier {invoiceIdentifier} has not been analyzed yet.</p>
        <div className='mx-auto flex flex-nowrap items-center justify-center'>
          <button className='mx-auto rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700'>
            Analyze Invoice
          </button>
          <button className='mx-auto rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700'>
            Delete Invoice
          </button>
        </div>
      </article>
    </section>
  );
}
