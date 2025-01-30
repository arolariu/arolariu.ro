/** @format */

"use server";

import {API_URL} from "@/lib/utils.server";
import type {UserInformation} from "@/types";
import type {Invoice} from "@/types/invoices";

/**
 * Server Action that updates an invoice.
 * @param invoiceInformation The invoice information to update.
 * @param userInformation The user information to use for the request.
 * @returns The updated invoice, or null if the request failed.
 */
export default async function updateInvoice(
  invoiceInformation: Invoice,
  userInformation: UserInformation,
): Promise<Invoice | null> {
  try {
    console.info(">>> Updating invoice for user:", userInformation);

    const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceInformation.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${userInformation.userJwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceInformation),
    });

    if (response.ok) return (await response.json()) as Invoice;
    else return null;
  } catch (error) {
    console.error("Error updating the invoice:", error);
    return null;
  }
}
