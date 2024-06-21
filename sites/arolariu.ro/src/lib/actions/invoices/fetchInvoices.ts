/** @format */

"use server";

import Invoice from "@/types/invoices/Invoice";
import {API_URL, generateJWT} from "../../utils.server";
import {fetchUser} from "../fetchUser";

/**
 * Server action that fetches all invoices for a user.
 * @param user The user for which to fetch the invoices.
 * @returns A promise of the invoices, or null if the request failed.
 */
export default async function fetchInvoices(): Promise<Invoice[] | null> {
  const {user} = await fetchUser();
  const userAuthorization = await generateJWT(user);

  const response = await fetch(`${API_URL}/rest/invoices/`, {
    headers: {
      Authorization: `Bearer ${userAuthorization}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 200) {
    return (await response.json()) as Invoice[];
  }
  return null;
}
