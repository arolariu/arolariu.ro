"use server";

/**
 * @fileoverview Exact PUT action for complete invoice replacement.
 * @module app/domains/invoices/_actions/invoices/updateInvoice
 */

import {withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import type {Invoice, UpdateInvoiceDtoPayload} from "@/types/invoices";
import {parseInvoiceTransport} from "@/types/invoices/transport";

type UpdateInvoiceInput = Readonly<{
  /** URL invoice identifier. */
  readonly invoiceId: string;
  /** Exact `UpdateInvoiceRequestDto` client payload. */
  readonly invoice: UpdateInvoiceDtoPayload;
}>;

/**
 * Replaces invoice-editable values using the backend's PUT DTO.
 *
 * @param input - Invoice path identifier and complete replacement payload.
 * @returns Parsed invoice DTO or a safe action error.
 */
export async function updateInvoice({invoiceId, invoice}: UpdateInvoiceInput): Promise<ServerActionResult<Readonly<Invoice>>> {
  return withSpan("api.actions.invoices.updateInvoice", async () => {
    try {
      validateStringIsGuidType(invoiceId, "invoiceId");
      if (invoice.id !== invoiceId) {
        return {success: false, error: {code: "VALIDATION_ERROR", message: "Invoice update request is invalid."}};
      }

      const {userJwt} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        method: "PUT",
        headers: {Authorization: `Bearer ${userJwt}`, "Content-Type": "application/json"},
        body: JSON.stringify({
          name: invoice.name,
          description: invoice.description,
          classification: invoice.classification,
          paymentInformation: {
            ...invoice.paymentInformation,
            transactionDate: invoice.paymentInformation.transactionDate.toISOString(),
          },
          merchantReference: invoice.merchantReference,
          isImportant: invoice.isImportant,
          additionalMetadata: invoice.additionalMetadata,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: mapHttpStatusToErrorCode(response.status),
            message:
              response.status >= 500
                ? "A server error occurred. Please try again later."
                : "Failed to update the invoice. Please check your input and try again.",
            status: response.status,
          },
        };
      }

      const parsedInvoice = parseInvoiceTransport(await response.json());
      return parsedInvoice === null
        ? {success: false, error: {code: "SERVER_ERROR", message: "The invoice update response was invalid. Please try again."}}
        : {success: true, data: parsedInvoice};
    } catch (error) {
      return createErrorResult(error, "Unable to update the invoice. Please try again.");
    }
  });
}
