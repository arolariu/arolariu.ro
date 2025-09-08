/** @format */

"use server";

import type {Merchant} from "@/types/invoices";
import {API_URL} from "../../utils.server";

/**
 * Server action that fetches all merchants for a user.
 * @param authToken The JWT token of the user.
 * @returns A promise of the merchants, or undefined if the request failed.
 */
export default async function fetchMerchants(authToken: string): Promise<Merchant[]> {
  console.info(">>> Executing server action::fetchMerchants, with:", {authToken});

  try {
    const response = await fetch(`${API_URL}/rest/v1/merchants`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return response.json() as Promise<Merchant[]>;
    } else {
      throw new Error(`Failed to fetch merchants. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching the merchants from the server:", error);
    throw error;
  }
}
