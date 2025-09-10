"use server";

import type {Invoice} from "@/types/invoices";
import {API_URL} from "../../utils.server";

/**
 * Server action that fetches a single invoice for a user.
 * @param id The id of the invoice to fetch.
 * @param authToken The JWT token of the user.
 * @returns A promise of the invoice, or undefined if the request failed.
 */
export default async function fetchInvoice(id: string, authToken: string): Promise<Invoice> {
  console.info(">>> Executing server action::fetchInvoice, with:", {id, authToken});

  try {
    const response = await fetch(`${API_URL}/rest/v1/invoices/${id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return response.json() as Promise<Invoice>;
    } else {
      throw new Error(`Failed to fetch invoice. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching the invoice from the server:", error);
    throw error;
  }
}
