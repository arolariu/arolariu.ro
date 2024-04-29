import RenderForbiddenScreen from "@/components/domains/RenderForbiddenScreen";
import {fetchUser} from "@/lib/actions/fetchUser";
import fetchInvoice from "@/lib/invoices/fetchInvoice";
import {type Metadata} from "next";
import RenderEditInvoicePage from "./island";

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
    <main>
      <RenderEditInvoicePage invoice={invoice} />
    </main>
  );
}
