/** @format */

"use server";

import {API_URL} from "@/lib/utils.server";
import Invoice from "@/types/invoices/Invoice";
import {UserInformation} from "@/types/UserInformation";

export default async function analyzeInvoice(
  invoiceIdentifier: string,
  userInformation: UserInformation,
): Promise<Invoice | null> {
  console.info(">>> Analyzing invoice for user:", userInformation);

  const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userInformation.userJwt}`,
      "Content-Type": "application/json",
    },
    body: "1",
  });

  if (response.ok) return (await response.json()) as Invoice;
  return null;
}
