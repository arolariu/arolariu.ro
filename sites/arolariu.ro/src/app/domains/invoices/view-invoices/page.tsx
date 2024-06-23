/** @format */

import {fetchUser} from "@/lib/actions/fetchUser";
import {type Metadata} from "next";
import RenderViewInvoicesScreen from "./island";

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

  return (
    <main className='container mx-auto px-5 py-24'>
      <section className='mb-20 flex w-full flex-col text-center'>
        <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-2xl font-medium text-transparent sm:text-3xl'>
          Welcome, <span>{username}</span>!
        </h1>
        <article className='mx-auto text-base leading-relaxed lg:w-2/3'>
          This is your digital receipts inventory. <br /> Here you can find the receipts that you&apos;ve uploaded so
          far. <br />
          By clicking on a receipt, you will be redirected to that specific receipt&apos;s page.
        </article>
      </section>
      <RenderViewInvoicesScreen />
    </main>
  );
}
