import { type Metadata } from "next";
import RenderViewInvoicesPage from "./island";
import fetchInvoices from "@/lib/invoices/fetchInvoices";
import {fetchUser} from "@/lib/utils.server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Invoice Management System - List Invoices",
  description: "List all invoices from the invoice management system.",
};

/**
 * The view invoices page.
 * @returns The view invoices page.
 */
export default async function ViewInvoicesPage() {
  const { user } = await fetchUser();
  const username = user?.username ?? "dear guest";

  const invoices = await fetchInvoices();

  return (
    <main className="dark:text-gray-300">
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-col w-full mb-20 text-center">
          <h1 className="mb-4 text-2xl font-medium text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:text-3xl">
            Welcome, <span>{username}</span>!
          </h1>
          <p className="mx-auto text-base leading-relaxed lg:w-2/3">
            This is your digital receipts inventory. <br /> Here you can find the receipts that you&apos;ve uploaded so
            far. <br />
            By clicking on a receipt, you will be redirected to that specific receipt&apos;s page.
          </p>
        </div>
        <RenderViewInvoicesPage invoices={invoices} />
        {!invoices && <div className="flex flex-col w-full mb-20 text-center">
          <h1 className="mb-4 text-2xl font-medium sm:text-3xl">Something is missing here... 😰</h1>
          <p className="mx-auto text-base leading-relaxed lg:w-2/3">
            It seems that you do not have any invoices associated with your account... <br />
            Please upload some invoices and come back later. <br /> <br />
          </p>
          <Link
            href="./create-invoice"
            className="inline-flex px-6 py-2 mx-auto mt-8 text-lg text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none">
            Upload an invoice here.
          </Link>
        </div>}
      </div>
    </main>
  );
}
