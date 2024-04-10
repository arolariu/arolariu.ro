import {fetchUser} from "@/lib/utils.server";
import {type Metadata} from "next";
import RenderInvoiceScreen from "./island";

export const metadata: Metadata = {
  title: "Invoice Management System - Create Invoice",
  description:
    "The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

/**
 * The create invoice page.
 * @returns The create invoice page.
 */
export default async function CreateInvoicePage() {
  const {isAuthenticated} = await fetchUser();

  return (
    <main className='flex flex-col flex-wrap items-center justify-center justify-items-center px-5 py-24 text-center'>
      <RenderInvoiceScreen />
      {!isAuthenticated && (
        <small className='2xsm:text-md mb-4 2xsm:p-8 md:text-xl lg:text-2xl'>
          (In order to save your invoice, please create an account or sign in.)
        </small>
      )}
    </main>
  );
}
