"use server";

/**
 * @fileoverview Strict server action for creating invoices.
 * @module app/domains/invoices/_actions/invoices/createInvoice
 *
 * @remarks
 * The backend derives invoice ownership from the authenticated token. This
 * action validates only the client-editable creation DTO and never accepts or
 * forwards an owner identifier.
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {
  InvoiceScanType,
  PaymentType,
  isClassificationSelection,
  type CreateInvoiceDtoPayload,
  type Invoice,
  type PaymentInformation,
} from "@/types/invoices";
import {parseInvoiceTransport} from "@/types/invoices/transport";

type CreateInvoiceInput = Readonly<CreateInvoiceDtoPayload>;
type MetadataValue = string | number | boolean | null;
const paymentTypeValues = new Set<unknown>(Object.values(PaymentType));

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isMetadata(value: unknown): value is Readonly<Record<string, MetadataValue>> {
  return (
    isRecord(value)
    && Object.entries(value).every(
      ([key, entry]) =>
        key.trim() !== "" && (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean" || entry === null),
    )
  );
}

function isSupportedInvoiceScanType(value: unknown): value is InvoiceScanType {
  return (
    value === InvoiceScanType.JPG
    || value === InvoiceScanType.JPEG
    || value === InvoiceScanType.PNG
    || value === InvoiceScanType.PDF
    || value === InvoiceScanType.BMP
    || value === InvoiceScanType.TIFF
    || value === InvoiceScanType.HEIF
  );
}

function isCreateScan(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, ["type", "location", "metadata"]) || !isSupportedInvoiceScanType(value["type"])) {
    return false;
  }

  if (typeof value["location"] !== "string" || !isMetadata(value["metadata"])) {
    return false;
  }

  try {
    return new URL(value["location"]).protocol === "https:";
  } catch {
    return false;
  }
}

function isPaymentInformation(value: unknown): value is PaymentInformation {
  return (
    isRecord(value)
    && hasExactKeys(value, [
      "transactionDate",
      "paymentType",
      "currency",
      "totalCostAmount",
      "totalTaxAmount",
      "subtotalAmount",
      "tipAmount",
    ])
    && value["transactionDate"] instanceof Date
    && !Number.isNaN(value["transactionDate"].valueOf())
    && paymentTypeValues.has(value["paymentType"])
    && isRecord(value["currency"])
    && hasExactKeys(value["currency"], ["name", "code", "symbol"])
    && typeof value["currency"]["name"] === "string"
    && typeof value["currency"]["code"] === "string"
    && typeof value["currency"]["symbol"] === "string"
    && ["totalCostAmount", "totalTaxAmount", "subtotalAmount", "tipAmount"].every(
      (key) => typeof value[key] === "number" && Number.isFinite(value[key]) && (value[key] as number) >= 0,
    )
    && (value["totalTaxAmount"] as number) <= (value["totalCostAmount"] as number)
  );
}

function isCreateProduct(value: unknown): boolean {
  return (
    isRecord(value)
    && hasExactKeys(value, ["name", "classification", "quantity", "quantityUnit", "productCode", "price"])
    && typeof value["name"] === "string"
    && (value["classification"] === null || isClassificationSelection(value["classification"]))
    && typeof value["quantity"] === "number"
    && Number.isFinite(value["quantity"])
    && value["quantity"] >= 0
    && typeof value["quantityUnit"] === "string"
    && typeof value["productCode"] === "string"
    && typeof value["price"] === "number"
    && Number.isFinite(value["price"])
    && value["price"] >= 0
  );
}

function hasValidCreateInvoiceFields(value: Readonly<Record<string, unknown>>): boolean {
  return (
    typeof value["name"] === "string"
    && value["name"].trim() !== ""
    && (typeof value["description"] === "string" || value["description"] === null)
    && (value["classification"] === null || isClassificationSelection(value["classification"]))
    && (value["paymentInformation"] === null || isPaymentInformation(value["paymentInformation"]))
    && (typeof value["merchantReference"] === "string" || value["merchantReference"] === null)
    && typeof value["isImportant"] === "boolean"
  );
}

function hasValidCreateInvoiceCollections(value: Readonly<Record<string, unknown>>): boolean {
  return (
    Array.isArray(value["scans"])
    && value["scans"].length > 0
    && value["scans"].every((scan) => isCreateScan(scan))
    && (value["items"] === null || (Array.isArray(value["items"]) && value["items"].every((item) => isCreateProduct(item))))
    && (value["metadata"] === null || isMetadata(value["metadata"]))
  );
}

function isCreateInvoiceInput(value: unknown): value is CreateInvoiceInput {
  if (
    !isRecord(value)
    || !hasExactKeys(value, [
      "name",
      "description",
      "classification",
      "paymentInformation",
      "merchantReference",
      "isImportant",
      "scans",
      "items",
      "metadata",
    ])
  ) {
    return false;
  }

  return hasValidCreateInvoiceFields(value) && hasValidCreateInvoiceCollections(value);
}

function serializeCreateInvoicePayload(payload: CreateInvoiceInput): Omit<CreateInvoiceInput, "paymentInformation">
  & Readonly<{
    paymentInformation: (Omit<PaymentInformation, "transactionDate"> & Readonly<{transactionDate: string}>) | null;
  }> {
  return {
    ...payload,
    paymentInformation:
      payload.paymentInformation === null
        ? null
        : {
            ...payload.paymentInformation,
            transactionDate: payload.paymentInformation.transactionDate.toISOString(),
          },
  };
}

function createSafeCreateInvoiceMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "You are not authorized to create invoices.";
  }

  if (status === 400 || status === 422) {
    return "Unable to create invoice with the provided details.";
  }

  return status >= 500 ? "Invoice creation is temporarily unavailable. Please try again." : "Unable to create invoice. Please try again.";
}

/**
 * Creates an invoice from the exact client-editable creation DTO.
 *
 * @param input - Untrusted complete create DTO; owner identity is intentionally absent.
 * @returns A fully parsed Date-rich invoice response or a client-safe action error.
 */
export async function createInvoice(input: unknown): ServerActionResult<Readonly<Invoice>> {
  return withSpan("api.actions.invoices.createInvoice", async () => {
    if (!isCreateInvoiceInput(input)) {
      return {success: false, error: {code: "VALIDATION_ERROR", message: "Invoice creation request is invalid."}};
    }

    try {
      addSpanEvent("bff.invoice.create.start");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout("/rest/v1/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializeCreateInvoicePayload(input)),
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.invoice.create.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "invoice.create.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {
          success: false,
          error: {code, message: createSafeCreateInvoiceMessage(response.status), status: response.status},
        };
      }

      const responseBody: unknown = await response.json();
      const invoice = parseInvoiceTransport(responseBody);
      if (invoice === null) {
        addSpanEvent("bff.invoice.create.invalid-response");
        logWithTrace("warn", "invoice.create.invalid-response", undefined, "server");
        return {success: false, error: {code: "SERVER_ERROR", message: "The invoice response was invalid. Please try again."}};
      }

      addSpanEvent("bff.invoice.create.complete");
      logWithTrace("info", "invoice.create.complete", undefined, "server");
      return {success: true, data: invoice};
    } catch (error) {
      addSpanEvent("bff.invoice.create.failed");
      logWithTrace("error", "invoice.create.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to create invoice. Please try again.");
    }
  });
}
