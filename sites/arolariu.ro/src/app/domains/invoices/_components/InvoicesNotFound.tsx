/** @format */

import Link from "next/link";

/**
 * This component is displayed when the user does not have any invoices associated with their account.
 * @returns The JSX for the invoices not found view.
 */
export default function InvoicesNotFound() {
  return (
    <div className='mb-20 flex w-full flex-col text-center'>
      <h1 className='mb-4 text-2xl font-medium sm:text-3xl'>Something is missing here... 😰</h1>
      <article className='mx-auto text-base leading-relaxed lg:w-2/3'>
        It seems that you do not have any invoices associated with your account... <br />
        Please upload some invoices and come back later. <br /> <br />
      </article>
      <Link
        href='/domains/invoices/create-invoice'
        className='mx-auto mt-8 inline-flex rounded border-0 bg-indigo-500 px-6 py-2 text-lg text-white hover:bg-indigo-600 focus:outline-none'>
        Upload an invoice here.
      </Link>
    </div>
  );
}
