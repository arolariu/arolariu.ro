/** @format */

/**
 * This component is used to display a message when an invoice is not found.
 * @returns The JSX for the invoice not found view.
 */
export default function InvoiceNotFound({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  return (
    <section className='flex flex-row flex-nowrap'>
      <article className='2xsm:w-full mx-auto flex-initial lg:w-1/2'>
        <h1 className='text-center text-2xl font-bold'>Invoice Not Found</h1>
        <p className='text-center'>The invoice with the identifier {invoiceIdentifier} was not found.</p>
      </article>
    </section>
  );
}
