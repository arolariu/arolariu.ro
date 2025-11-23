"use server";

import {API_URL} from "@/lib/utils.server";
import type {CreateInvoiceScanDtoPayload} from "@/types/invoices";

/**
 * Server action to attach a scan to an existing invoice.
 * @param invoiceId The ID of the invoice to attach the scan to.
 * @param payload The scan payload containing type, location, and metadata.
 * @param authToken The authentication token for the backend.
 */
export async function attachInvoiceScan(invoiceId: string, payload: CreateInvoiceScanDtoPayload, authToken: string): Promise<void> {
  console.info(">>> Executing server action {{attachInvoiceScan}}, with:", {invoiceId, payload, authToken});

  try {
    const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}/scans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`BFF attach invoice scan request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    console.error("Error attaching the invoice scan:", error);
    throw error;
  }
}
