/** @format */

import type {Metadata} from "next";
import RenderViewInvoiceScreen from "./island";

type Params = Promise<{id: string}>;

export const metadata: Metadata = {
  title: "View Invoice",
  description: "View your uploaded invoice on `arolariu.ro`.",
};

/**
 * The view invoice page.
 * @returns Render the view invoice page.
 */
export default async function ViewInvoicePage(props: Readonly<{params: Params}>) {
  const params = await props.params;
  return (
    <main className='overflow-hidden px-5 py-24'>
      <RenderViewInvoiceScreen invoiceIdentifier={params.id} />
    </main>
  );
}
