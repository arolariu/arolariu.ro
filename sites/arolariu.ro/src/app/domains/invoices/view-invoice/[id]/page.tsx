/** @format */

import type {Metadata} from "next";
import RenderViewInvoiceScreen from "./island";

type Props = {params: Promise<{id: string}>};

export const metadata: Metadata = {
  title: "View Invoice",
  description: "View your uploaded invoice on `arolariu.ro`.",
};

/**
 * The view invoice page, which allows the user to view a specific invoice.
 * This page uses a dynamic route to display a specific invoice.
 * @returns Render the view invoice page, SSR'ed.
 */
export default async function ViewInvoicePage({params}: Readonly<Props>) {
  const resolvedParams = await params;
  const invoiceIdentifier = resolvedParams.id;

  return (
    <main className='overflow-hidden py-24'>
      <RenderViewInvoiceScreen invoiceIdentifier={invoiceIdentifier} />
    </main>
  );
}
