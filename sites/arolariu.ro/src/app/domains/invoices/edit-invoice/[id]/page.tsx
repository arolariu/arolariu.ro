/** @format */

import RenderForbiddenScreen from "@/app/domains/_components/RenderForbiddenScreen";
import {fetchUser} from "@/lib/actions/fetchUser";
import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import {type Metadata} from "next";
import RenderEditInvoiceScreen from "./island";

interface Props {
  params: {id: string};
}

export const metadata: Metadata = {
  title: "Invoice Management System - Edit Invoice",
  description: "Edit an invoice from the invoice management system.",
};

/**
 * The edit invoice page.
 * @returns The edit invoice page.
 */
export default async function EditInvoicePage({params}: Readonly<Props>) {
  const {isAuthenticated} = await fetchUser();
  const invoice = await fetchInvoice(params.id);

  if (!isAuthenticated || !invoice) {
    return <RenderForbiddenScreen />;
  }
  return (
    <main className='px-5 py-24'>
      <RenderEditInvoiceScreen invoice={invoice} />
    </main>
  );
}
