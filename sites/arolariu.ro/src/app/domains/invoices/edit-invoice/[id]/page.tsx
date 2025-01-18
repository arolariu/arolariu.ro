/** @format */

import {fetchUser} from "@/lib/actions/user/fetchUser";
import ForbiddenScreen from "@/presentation/ForbiddenScreen";
import type {Metadata} from "next";
import RenderEditInvoiceScreen from "./island";

type Params = Promise<{id: string}>;

export const metadata: Metadata = {
  title: "Invoice Management System - Edit Invoice",
  description: "Edit an invoice from the invoice management system.",
};

/**
 * The edit invoice page, for editing a specific invoice.
 * This page uses a dynamic route to display a specific invoice.
 * @returns The edit invoice page, SSR'ed.
 */
export default async function EditInvoicePage(props: Readonly<{params: Params}>) {
  const params = await props.params;
  const {isAuthenticated} = await fetchUser();

  if (!isAuthenticated) return <ForbiddenScreen />;
  return (
    <main className='px-5 py-24'>
      <RenderEditInvoiceScreen invoiceIdentifier={params.id} />
    </main>
  );
}
