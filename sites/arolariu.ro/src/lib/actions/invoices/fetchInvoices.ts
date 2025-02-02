/** @format */

"use server";

import type {UserInformation} from "@/types";
import type {Invoice} from "@/types/invoices";
import {API_URL} from "../../utils.server";

/**
 * Fetches invoices for a given user.
 *
 * @param {UserInformation} userInformation - The information of the user whose invoices are to be fetched.
 * @returns {Promise<Invoice[] | null>} A promise that resolves to an array of invoices if the fetch is successful, or null if an error occurs or the response status is not 200.
 *
 * @throws {Error} If there is an issue with the fetch operation.
 */
export default async function fetchInvoices(userInformation: UserInformation): Promise<Invoice[]> {
  try {
    console.info(">>> Fetching invoices for user:", userInformation);
    const response = await fetch(`${API_URL}/rest/v1/invoices/`, {
      headers: {
        Authorization: `Bearer ${userInformation.userJwt}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 200) return (await response.json()) as Invoice[];
    else throw new Error(`Failed to fetch invoices. Status: ${response.status}`);
  } catch (error) {
    console.error("Error fetching the invoices from the server:", error);
    throw error;
  }
}
