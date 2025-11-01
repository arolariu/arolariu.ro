"use server";

import {API_URL} from "@/lib/utils.server";

type ActionInputType = Readonly<{
  formData: FormData;
  userIdentifier: string;
  userJwt: string;
}>;

type ActionOutputType = Readonly<{
  success: boolean;
  error?: string;
  data?: unknown;
}>;

/**
 * Server action to create a new invoice by uploading a scan file.
 * This action handles the file upload and metadata submission to the backend API.
 * @param input The input parameters for creating an invoice
 * @returns Promise resolving to the response from the API
 */
export async function createInvoiceAction({
  formData,
  userIdentifier,
  userJwt,
}: ActionInputType): Promise<ActionOutputType> {
  try {
    // Submit to backend API
    const response = await fetch(`${API_URL}/rest/v2/invoices`, {
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
