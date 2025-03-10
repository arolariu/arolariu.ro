/** @format */

import {fetchUser} from "@/lib/actions/user/fetchUser";
import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import RenderCreateInvoiceScreen from "./island";

export const metadata: Metadata = {
  title: "Invoice Management System - Create Invoice",
  description:
    "The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

/**
 * The create invoice page, where users can create a new invoice.
 * Unaunthenticated users have a small disclaimer at the bottom of the page.
 * @returns The create invoice page, SSR'ed.
 */
export default async function CreateInvoicePage() {
  const t = await getTranslations("Domains.services.invoices.service.create-page");
  const {isAuthenticated} = await fetchUser();

  return (
    <main className='flex flex-col flex-wrap items-center justify-center justify-items-center px-5 py-24 text-center'>
      <RenderCreateInvoiceScreen />
      {!isAuthenticated && <small className='2xsm:text-md md:text-md mb-4 p-8 lg:text-xl 2xl:text-2xl'>({t("disclaimer")})</small>}
    </main>
  );
}
