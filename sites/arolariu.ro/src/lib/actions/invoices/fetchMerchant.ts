/** @format */

"use server";

import type {Merchant} from "@/types/invoices";
import {API_URL} from "../../utils.server";

/**
 * Server action that fetches a single Merchant for a user.
 * @param id The id of the merchant to fetch.
 * @param authToken The JWT token of the user.
 * @returns A promise of the merchant, or undefined if the request failed.
 */
export default async function fetchMerchant(id: string, authToken: string): Promise<Merchant> {
  console.info(">>> Executing server action::fetchMerchant, with:", {id, authToken});

  try {
    const response = await fetch(`${API_URL}/rest/v1/merchants/${id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return response.json() as Promise<Merchant>;
    } else {
      throw new Error(`Failed to fetch merchant. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching the merchant from the server:", error);
    throw error;
  }
}
