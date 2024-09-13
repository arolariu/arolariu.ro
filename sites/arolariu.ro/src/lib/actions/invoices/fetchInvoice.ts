/** @format */

"use server";

import type {UserInformation} from "@/types/UserInformation";
import type Invoice from "@/types/invoices/Invoice";
import {API_URL} from "../../utils.server";

/**
 * Server action that fetches a single invoice for a user.
 * @param id The id of the invoice to fetch.
 * @returns A promise of the invoice, or undefined if the request failed.
 */
export default async function fetchInvoice(id: string, userInformation: UserInformation): Promise<Invoice | null> {
  try {
    const response = await fetch(`${API_URL}/rest/v1/invoices/${id}`, {
      headers: {
        Authorization: `Bearer ${userInformation.userJwt}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) return response.json() as Promise<Invoice>;
    else return null;
  } catch (error) {
    console.error("Error fetching the invoice from the server:", error);
    return null;
  }
}
