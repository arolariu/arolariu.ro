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
    <main>
      <RenderInvoiceScreen />
      {!isAuthenticated && (
        <div className='mx-auto mb-32 flex flex-col'>
          <p className='2xsm:text-md mb-4 text-center 2xsm:p-8 md:text-2xl'>
            In order to save your invoice, please create an account or sign in.
          </p>
        </div>
      )}
    </main>
  );
}
