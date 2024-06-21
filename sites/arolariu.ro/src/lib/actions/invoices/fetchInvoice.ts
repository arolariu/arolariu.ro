/** @format */

"use server";

import type {UserInformation} from "@/types/UserInformation";
import type Invoice from "@/types/invoices/Invoice";
import {SITE_URL} from "../../utils.generic";
import {API_URL} from "../../utils.server";

/**
 * Server action that fetches a single invoice for a user.
 * @param id The id of the invoice to fetch.
 * @returns A promise of the invoice, or undefined if the request failed.
 */
export default async function fetchInvoice(id: string): Promise<Invoice | null> {
  const userInformation = await fetch(`${SITE_URL}/api/user`);
  const {userJwt} = (await userInformation.json()) as UserInformation;

  const response = await fetch(`${API_URL}/rest/v1/invoices/${id}`, {
    headers: {
      Authorization: `Bearer ${userJwt}`,
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    return response.json() as Promise<Invoice>;
  }

  return null;
}
