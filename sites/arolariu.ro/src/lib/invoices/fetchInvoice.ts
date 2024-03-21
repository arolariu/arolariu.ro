"use server";

import Invoice from "@/types/invoices/Invoice";
import { API_URL } from "../../constants";
import generateJWT from "../generateJWT";
import fetchUser from "../fetchUser";

/**
 * Server action that fetches a single invoice for a user.
 * @param id The id of the invoice to fetch.
 * @param user The user for which to fetch the invoice.
 * @returns A promise of the invoice, or null if the request failed.
 */
export default async function fetchInvoice(id: string): Promise<Invoice | undefined> {
  const { user } = await fetchUser();
  const authorizationHeader = await generateJWT(user);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authorizationHeader}`,
  };

  // To understand if the invoice was shared with the user, we will hit the API on both the user's behalf and the guest's behalf.
  // If the invoice is found on the user's behalf, we will return it. Otherwise, we will check if we get a good response from the guest.
  // If neither of the requests return a success, we will return null.

  const userResponse = await fetch(`${API_URL}/rest/user/${user?.id ?? ''}/invoices/${id}`, {
    method: "GET",
    headers: headers,
  });
  if (userResponse.status === 200) { return await userResponse.json() as Invoice; }


  const guestResponse = await fetch(`${API_URL}/rest/invoices/${id}`, {
    method: "GET",
    headers: headers,
  });
  if (guestResponse.status === 200) { return await guestResponse.json() as Invoice; }


  return undefined;
}
