/** @format */

import RenderForbiddenScreen from "@/app/domains/_components/RenderForbiddenScreen";
import {fetchUser} from "@/lib/actions/user/fetchUser";
import type {Metadata} from "next";
import RenderEditInvoiceScreen from "./island";

type Params = Promise<{id: string}>;

export const metadata: Metadata = {
  title: "Invoice Management System - Edit Invoice",
  description: "Edit an invoice from the invoice management system.",
};

/**
 * The edit invoice page.
 * @returns The edit invoice page.
 */
export default async function EditInvoicePage(props: Readonly<{params: Params}>) {
  const params = await props.params;
  const {isAuthenticated} = await fetchUser();

  if (!isAuthenticated) return <RenderForbiddenScreen />;
  return (
    <main className='px-5 py-24'>
      <RenderEditInvoiceScreen invoiceIdentifier={params.id} />
    </main>
  );
}
