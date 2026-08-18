"use server";

/**
 * @fileoverview Exact PATCH action for the public invoice contract.
 * @module app/domains/invoices/_actions/invoices/patchInvoice
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {isClassificationSelection, type ClassificationSelection, type Invoice, type PaymentInformation} from "@/types/invoices";
import {parseInvoiceTransport} from "@/types/invoices/transport";
import {isStrictRfc3339Timestamp} from "@/types/invoices/transportValidation";
import {revalidatePath} from "next/cache";

type JsonPrimitive = boolean | number | string | null;
interface JsonObject {
  readonly [key: string]: JsonValue;
}
type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

/** Exact client-editable PATCH fields accepted by `PatchInvoiceRequestDto`. */
export interface PatchInvoicePayload {
  /** New invoice name. */
  readonly name?: string;
  /** New invoice description. */
  readonly description?: string;
  /**
   * A changed manual ECOICOP selection.
   *
   * @remarks
   * Omit this property to retain persisted classification. The current backend
   * defines `null` as no change, not a clear operation, so callers must never
   * represent a clear request as `null`.
   */
  readonly classification?: ClassificationSelection;
  /** Replacement payment information. */
  readonly paymentInformation?: Omit<PaymentInformation, "transactionDate"> & Readonly<{transactionDate: Date | string}>;
  /** Merchant reference to link. */
  readonly merchantReference?: string;
  /** Importance flag. */
  readonly isImportant?: boolean;
  /** Replacement sharing list. */
  readonly sharedWith?: readonly string[];
  /** Safe scalar or structured metadata values for merge semantics. */
  readonly additionalMetadata?: Readonly<Record<string, JsonValue>>;
}

type PatchInvoiceInput = Readonly<{
  readonly invoiceId: string;
  readonly payload: PatchInvoicePayload;
}>;

type ServerActionOutput = ServerActionResult<Readonly<Invoice>>;

const patchKeys = [
  "name",
  "description",
  "classification",
  "paymentInformation",
  "merchantReference",
  "isImportant",
  "sharedWith",
  "additionalMetadata",
] as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || isFiniteNumber(value)) {
    return true;
  }

  return Array.isArray(value) ? value.every(isJsonValue) : isRecord(value) && Object.values(value).every(isJsonValue);
}

function isPaymentInformationInput(value: unknown): boolean {
  return (
    isRecord(value)
    && hasOnlyKeys(value, [
      "transactionDate",
      "paymentType",
      "currency",
      "totalCostAmount",
      "totalTaxAmount",
      "subtotalAmount",
      "tipAmount",
    ])
    && (value["transactionDate"] instanceof Date || isStrictRfc3339Timestamp(value["transactionDate"]))
    && typeof value["paymentType"] === "number"
    && isRecord(value["currency"])
    && hasOnlyKeys(value["currency"], ["name", "code", "symbol"])
    && typeof value["currency"]["name"] === "string"
    && typeof value["currency"]["code"] === "string"
    && typeof value["currency"]["symbol"] === "string"
    && isFiniteNumber(value["totalCostAmount"])
    && isFiniteNumber(value["totalTaxAmount"])
    && isFiniteNumber(value["subtotalAmount"])
    && isFiniteNumber(value["tipAmount"])
  );
}

function isPatchInvoiceInput(value: unknown): value is PatchInvoiceInput {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, ["invoiceId", "payload"])
    || typeof value["invoiceId"] !== "string"
    || !isRecord(value["payload"])
    || !hasOnlyKeys(value["payload"], patchKeys)
  ) {
    return false;
  }

  const payload = value["payload"];
  return (
    (payload["name"] === undefined || typeof payload["name"] === "string")
    && (payload["description"] === undefined || typeof payload["description"] === "string")
    && (payload["classification"] === undefined || isClassificationSelection(payload["classification"]))
    && (payload["paymentInformation"] === undefined || isPaymentInformationInput(payload["paymentInformation"]))
    && (payload["merchantReference"] === undefined || typeof payload["merchantReference"] === "string")
    && (payload["isImportant"] === undefined || typeof payload["isImportant"] === "boolean")
    && (payload["sharedWith"] === undefined
      || (Array.isArray(payload["sharedWith"]) && payload["sharedWith"].every((identifier) => typeof identifier === "string")))
    && (payload["additionalMetadata"] === undefined
      || (isRecord(payload["additionalMetadata"]) && Object.values(payload["additionalMetadata"]).every(isJsonValue)))
  );
}

function serializePayload(payload: PatchInvoicePayload): PatchInvoicePayload {
  if (payload.paymentInformation === undefined) {
    return payload;
  }

  const transactionDate = payload.paymentInformation.transactionDate;
  return {
    ...payload,
    paymentInformation: {
      ...payload.paymentInformation,
      transactionDate: transactionDate instanceof Date ? transactionDate.toISOString() : transactionDate,
    },
  };
}

/**
 * Sends a validated non-destructive invoice patch.
 *
 * @param input - The invoice identifier and exact supported PATCH fields.
 * @returns The fully parsed invoice response or a safe action error.
 */
export async function patchInvoice(input: unknown): Promise<ServerActionOutput> {
  return withSpan("api.actions.invoices.patchInvoice", async () => {
    if (!isPatchInvoiceInput(input)) {
      return {success: false, error: {code: "VALIDATION_ERROR", message: "Invoice patch request is invalid."}};
    }

    try {
      validateStringIsGuidType(input.invoiceId, "invoiceId");
      if (input.payload.merchantReference !== undefined) {
        validateStringIsGuidType(input.payload.merchantReference, "merchantReference");
      }
      input.payload.sharedWith?.forEach((identifier) => validateStringIsGuidType(identifier, "sharedWith"));
    } catch {
      return {success: false, error: {code: "VALIDATION_ERROR", message: "Invoice patch request is invalid."}};
    }

    try {
      const {userJwt} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/invoices/${input.invoiceId}`, {
        method: "PATCH",
        headers: {Authorization: `Bearer ${userJwt}`, "Content-Type": "application/json"},
        body: JSON.stringify(serializePayload(input.payload)),
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

      const invoice = parseInvoiceTransport(await response.json());
      if (invoice === null) {
        addSpanEvent("bff.request.patch-invoice.invalid-response");
        logWithTrace("error", "Invoice PATCH returned an invalid public DTO.", undefined, "server");
        return {success: false, error: {code: "SERVER_ERROR", message: "The invoice update response was invalid. Please try again."}};
      }

      revalidatePath(`/domains/invoices/edit-invoice/${input.invoiceId}`, "page");
      revalidatePath(`/domains/invoices/view-invoice/${input.invoiceId}`, "page");
      return {success: true, data: invoice};
    } catch (error) {
      addSpanEvent("bff.request.patch-invoice.error");
      return createErrorResult(error, "Unable to update the invoice. Please try again.");
    }
  });
}
