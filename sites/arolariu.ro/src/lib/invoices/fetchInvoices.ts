"use server";

import Invoice from "@/types/invoices/Invoice";
import {fetchUser} from "../actions/fetchUser";
import {API_URL, generateJWT} from "../utils.server";

/**
 * Server action that fetches all invoices for a user.
 * @param user The user for which to fetch the invoices.
 * @returns A promise of the invoices, or null if the request failed.
 */
export default async function fetchInvoices(): Promise<Invoice[] | undefined> {
  const {user} = await fetchUser();
  const userAuthorization = await generateJWT(user);

  const response = await fetch(`${API_URL}/rest/invoices/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAuthorization}`,
    },
  });

  let invoices: Invoice[] | undefined;

  switch (response.status) {
    case 200:
      invoices = (await response.json()) as Invoice[];
      break;
    case 401:
    case 403:
      break;
    case 500:
      break; // TODO: add alerting.
  }

  return invoices;
}
