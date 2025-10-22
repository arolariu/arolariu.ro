/**
 * This component is used to display a message when the invoices are loading.
 * @returns The JSX for the loading invoices view.
 */
export default function LoadingInvoices() {
  return (
    <section className='flex flex-row flex-nowrap'>
      <article className='2xsm:w-full mx-auto flex-initial lg:w-1/2'>
        <h1 className='text-center text-2xl font-bold'>Loading Invoices</h1>
        <p className='text-center'>Loading invoices...</p>
      </article>
    </section>
  );
}
