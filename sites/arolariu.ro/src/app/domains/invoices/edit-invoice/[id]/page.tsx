import {fetchUser} from "@/lib/actions/user/fetchUser";
import ForbiddenScreen from "@/presentation/ForbiddenScreen";
import type {Metadata} from "next";

export const metadata: Metadata = {
  title: "Invoice Management System - Edit Invoice",
  description: "Edit an invoice from the invoice management system.",
};

/**
 * The edit invoice page, for editing a specific invoice.
 * This page uses a dynamic route to display a specific invoice.
 * @returns The edit invoice page, SSR'ed.
 */
export default async function EditInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/edit-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const pageParams = await props.params;
  const invoiceIdentifier = pageParams.id;
  console.log("Invoice ID:", invoiceIdentifier);

  const {isAuthenticated} = await fetchUser();
  if (!isAuthenticated) {
    return <ForbiddenScreen />;
  }

  return (
    <main className='px-5 py-24'>
      <h1> WIP !!!!</h1>
    </main>
  );
}
