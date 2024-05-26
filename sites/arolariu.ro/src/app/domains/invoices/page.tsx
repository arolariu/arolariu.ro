/** @format */

import {fetchUser} from "@/lib/actions/fetchUser";
import {type Metadata} from "next";
import RenderInvoiceDomainScreen from "./island";

export const metadata: Metadata = {
  title: "Invoice Management System",
  description:
    "The invoice management system provides users with detailed insights into their spending habits, according to their uploaded receipts.",
};

/**
 * The invoice management system homepage.
 * @returns The invoice management system homepage.
 */
export default async function InvoicePage() {
  const {isAuthenticated} = await fetchUser();
  return <RenderInvoiceDomainScreen isAuthenticated={isAuthenticated} />;
}
