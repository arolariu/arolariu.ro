import type {Metadata} from "next";
import React from "react";
import RenderViewInvoiceScreen from "./island";

export const metadata: Metadata = {
  title: "View Invoice",
  description: "View your uploaded invoice on `arolariu.ro`.",
};

/**
 * The view invoice page, which allows the user to view a specific invoice.
 * This page uses a dynamic route to display a specific invoice.
 * @returns Render the view invoice page, SSR'ed.
 */
export default async function ViewInvoicePage(
  props: Readonly<PageProps<"/domains/invoices/view-invoice/[id]">>,
): Promise<React.JSX.Element> {
  const resolvedParams = await props.params;
  const invoiceIdentifier = resolvedParams.id;

  return (
    <main className='overflow-hidden py-24'>
      <RenderViewInvoiceScreen invoiceIdentifier={invoiceIdentifier} />
    </main>
  );
}
