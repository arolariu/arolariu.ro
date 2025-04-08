/** @format */

/**
 * This component is used to display a message when the invoice is loading.
 * @returns The JSX for the loading invoice view.
 */
export default function LoadingInvoice({invoiceIdentifier}: Readonly<{invoiceIdentifier: string}>) {
  return (
    <section className='flex flex-row flex-nowrap'>
      <article className='2xsm:w-full mx-auto flex-initial lg:w-1/2'>
        <h1 className='text-center text-2xl font-bold'>Loading Invoice</h1>
        <p className='text-center'>Loading the invoice with the identifier {invoiceIdentifier}.</p>
      </article>
    </section>
  );
}
