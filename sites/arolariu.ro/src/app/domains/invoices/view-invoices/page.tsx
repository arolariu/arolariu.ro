import {fetchUser} from "@/lib/actions/fetchUser";
import fetchInvoices from "@/lib/invoices/fetchInvoices";
import {type Metadata} from "next";
import Link from "next/link";
import RenderViewInvoicesPage from "./island";

export const metadata: Metadata = {
  title: "Invoice Management System - List Invoices",
  description: "List all invoices from the invoice management system.",
};

/**
 * The view invoices page.
 * @returns The view invoices page.
 */
export default async function ViewInvoicesPage() {
  const {user} = await fetchUser();
  const username = user?.username ?? "dear guest";

  const invoices = await fetchInvoices();

  return (
    <main className='dark:text-gray-300'>
      <div className='container mx-auto px-5 py-24'>
        <div className='mb-20 flex w-full flex-col text-center'>
          <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-2xl font-medium text-transparent sm:text-3xl'>
            Welcome, <span>{username}</span>!
          </h1>
          <p className='mx-auto text-base leading-relaxed lg:w-2/3'>
            This is your digital receipts inventory. <br /> Here you can find the receipts that you&apos;ve uploaded so
            far. <br />
            By clicking on a receipt, you will be redirected to that specific receipt&apos;s page.
          </p>
        </div>
        <RenderViewInvoicesPage invoices={invoices} />
        {!invoices && (
          <div className='mb-20 flex w-full flex-col text-center'>
            <h1 className='mb-4 text-2xl font-medium sm:text-3xl'>Something is missing here... 😰</h1>
            <p className='mx-auto text-base leading-relaxed lg:w-2/3'>
              It seems that you do not have any invoices associated with your account... <br />
              Please upload some invoices and come back later. <br /> <br />
            </p>
            <Link
              href='./create-invoice'
              className='mx-auto mt-8 inline-flex rounded border-0 bg-indigo-500 px-6 py-2 text-lg text-white hover:bg-indigo-600 focus:outline-none'>
              Upload an invoice here.
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
