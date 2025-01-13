/** @format */

"use server";

import {API_URL} from "@/lib/utils.server";
import Invoice from "@/types/invoices/Invoice";
import {UserInformation} from "@/types/UserInformation";

/**
 * Analyzes an invoice for a given user.
 *
 * @param invoiceIdentifier - The identifier of the invoice to be analyzed.
 * @param userInformation - The information of the user requesting the analysis.
 * @returns A promise that resolves to the analyzed Invoice object or null if the analysis fails.
 *
 * @throws Will log an error message if the analysis process encounters an error.
 */
export default async function analyzeInvoice(
  invoiceIdentifier: string,
  userInformation: UserInformation,
): Promise<Invoice | null> {
  try {
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
    else return null;
  } catch (error) {
    console.error("Error analyzing the invoice:", error);
    return null;
  }
}
