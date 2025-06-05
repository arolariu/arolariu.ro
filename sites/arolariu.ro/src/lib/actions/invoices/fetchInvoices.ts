/** @format */

"use server";

import type {Invoice} from "@/types/invoices";
import {API_URL} from "../../utils.server";

/**
 * Server action that fetches all invoices for a user.
 * @param authToken The JWT token of the user.
 * @returns A promise of the invoices, or undefined if the request failed.
 */
export default async function fetchInvoices(authToken: string): Promise<Invoice[]> {
  console.info(">>> Executing server action::fetchInvoices, with:", {authToken});

  try {
    const response = await fetch(`${API_URL}/rest/v1/invoices/`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) return response.json() as Promise<Invoice[]>;
    else throw new Error(`Failed to fetch invoices. Status: ${response.status}`);
  } catch (error) {
    console.error("Error fetching the invoices from the server:", error);
    throw error;
  }
}
