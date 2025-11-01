"use server";

import {API_URL} from "@/lib/utils.server";

/**
 * Server action to create a new invoice by uploading a scan file.
 * This action handles the file upload and metadata submission to the backend API.
 * @param formData FormData containing the file and metadata
 * @param userIdentifier The user's unique identifier
 * @param userJwt The user's JWT token for authentication
 * @returns Promise resolving to the response from the API
 */
export async function createInvoiceAction(
  formData: FormData,
  userIdentifier: string,
  userJwt: string,
): Promise<{success: boolean; error?: string; data?: unknown}> {
  try {
    if (!API_URL) {
      return {
        success: false,
        error: "API URL is not configured",
      };
    }

    if (!userIdentifier || !userJwt) {
      return {
        success: false,
        error: "User authentication is required",
      };
    }

    // Submit to backend API
    const response = await fetch(`${API_URL}/rest/v1/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Error in createInvoiceAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
