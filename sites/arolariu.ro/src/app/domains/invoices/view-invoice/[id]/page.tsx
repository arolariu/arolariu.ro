/** @format */

import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
import {type Metadata} from "next";
import RenderViewInvoiceScreen from "./island";

interface Props {
  params: {id: string};
}

export const metadata: Metadata = {
  title: "View Invoice",
  description: "View your uploaded invoice on `arolariu.ro`.",
};

/**
 * The view invoice page.
 * @returns Render the view invoice page.
 */
export default async function ViewInvoicePage({params}: Readonly<Props>) {
  // TODO: Add user information.
  const invoice = await fetchInvoice(params.id, userInformation);

  return (
    <main className='overflow-hidden px-5 py-24'>
      <RenderViewInvoiceScreen invoice={invoice} />
    </main>
  );
}
