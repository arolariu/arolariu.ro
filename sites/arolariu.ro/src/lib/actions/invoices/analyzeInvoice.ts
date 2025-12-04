"use server";

import {API_URL} from "@/lib/utils.server";
import type {Invoice} from "@/types/invoices";

/**
 * Analyzes an invoice for a given user.
 * @param id The identifier of the invoice to be analyzed.
 * @param authToken The JWT token of the user.
 * @returns A promise that resolves to the analyzed Invoice object or null if the analysis fails.
 */
export default async function analyzeInvoice(id: string, authToken: string): Promise<Invoice | null> {
  console.info(">>> Executing server action {{analyzeInvoice}}, with:", {id, authToken});

  try {
    const response = await fetch(`${API_URL}/rest/v1/invoices/${id}/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: "1",
    });

    return response.ok ? (response.json() as Promise<Invoice>) : null;
  } catch (error) {
    console.error("Error analyzing the invoice:", error);
    throw error;
  }
}
