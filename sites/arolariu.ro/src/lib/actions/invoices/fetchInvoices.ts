/** @format */

"use server";

import {UserInformation} from "@/types/UserInformation";
import Invoice from "@/types/invoices/Invoice";
import {API_URL} from "../../utils.server";

/**
 * Server action that fetches all invoices for a user.
 * @param user The user for which to fetch the invoices.
 * @returns A promise of the invoices, or null if the request failed.
 */
export default async function fetchInvoices(userInformation: UserInformation): Promise<Invoice[] | null> {
  const response = await fetch(`${API_URL}/rest/v1/invoices/`, {
    headers: {
      Authorization: `Bearer ${userInformation.userJwt}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 200) return (await response.json()) as Invoice[];
  return null;
}
