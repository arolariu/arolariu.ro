"use server";

/**
 * @fileoverview Strict server action for supported invoice PATCH mutations.
 * @module app/domains/invoices/_actions/invoices/patchInvoice
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {
  InvoiceCategory,
  InvoiceScanType,
  PaymentType,
  ProductCategory,
  RecipeComplexity,
  isClassificationSelection,
  isStandardClassification,
  type ClassificationSelection,
  type Invoice,
  type PaymentInformation,
  type Product,
} from "@/types/invoices";
import {isStrictRfc3339Timestamp} from "@/types/invoices/transportValidation";
import {revalidatePath} from "next/cache";

type JsonPrimitive = boolean | number | string | null;

interface JsonObject {
  readonly [key: string]: JsonValue;
}

type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;

type PatchPaymentInformation = Omit<PaymentInformation, "transactionDate"> & Readonly<{transactionDate: Date | string}>;

type PatchInvoicePayload = Readonly<{
  readonly name?: string;
  readonly description?: string;
  /**
   * A manual ECOICOP selection. Null is excluded because the backend treats it
   * as no change rather than a clear mutation.
   */
  readonly classification?: ClassificationSelection;
  readonly paymentInformation?: PatchPaymentInformation;
  readonly merchantReference?: string;
  readonly isImportant?: boolean;
  readonly sharedWith?: readonly string[];
  readonly additionalMetadata?: Readonly<Record<string, JsonValue>>;
}>;

type ServerActionInputType = Readonly<{
  readonly invoiceId: string;
  readonly payload: PatchInvoicePayload;
}>;

type InvoiceTransportPaymentInformation = Omit<PaymentInformation, "transactionDate"> & Readonly<{transactionDate: string}>;

type InvoiceTransport = Omit<Invoice, "createdAt" | "lastUpdatedAt" | "paymentInformation">
  & Readonly<{
    readonly createdAt: string;
    readonly lastUpdatedAt: string;
    readonly paymentInformation: InvoiceTransportPaymentInformation;
  }>;

type ServerActionOutputType = ServerActionResult<Readonly<Invoice>>;

const patchPayloadKeys = [
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
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, allowedKeys: readonly string[]): boolean {
  return Reflect.ownKeys(record).every((key) => typeof key === "string" && allowedKeys.includes(key));
}

function hasRequiredKeys(record: Readonly<Record<string, unknown>>, requiredKeys: readonly string[]): boolean {
  return requiredKeys.every((key) => Object.hasOwn(record, key));
}

function hasOptionalValue(record: Readonly<Record<string, unknown>>, key: string, predicate: (value: unknown) => boolean): boolean {
  return !Object.hasOwn(record, key) || predicate(record[key]);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || isFiniteNumber(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isJsonRecord(value: unknown): value is Readonly<Record<string, JsonValue>> {
  return isRecord(value) && Object.values(value).every(isJsonValue);
}

function isValidInputDate(value: unknown): value is Date | string {
  return (value instanceof Date && !Number.isNaN(value.getTime())) || isStrictRfc3339Timestamp(value);
}

function isPaymentType(value: unknown): value is PaymentType {
  return typeof value === "number" && Object.values(PaymentType).some((paymentType) => paymentType === value);
}

function isInvoiceCategory(value: unknown): value is InvoiceCategory {
  return typeof value === "number" && Object.values(InvoiceCategory).some((category) => category === value);
}

function isInvoiceScanType(value: unknown): value is InvoiceScanType {
  return typeof value === "number" && Object.values(InvoiceScanType).some((scanType) => scanType === value);
}

function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === "number" && Object.values(ProductCategory).some((category) => category === value);
}

function isRecipeComplexity(value: unknown): value is RecipeComplexity {
  return typeof value === "number" && Object.values(RecipeComplexity).some((complexity) => complexity === value);
}

function isCurrency(value: unknown): boolean {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["name", "code", "symbol"])
    && typeof value["name"] === "string"
    && typeof value["code"] === "string"
    && typeof value["symbol"] === "string"
  );
}

function isPaymentInformation(value: unknown, isTransactionDate: (value: unknown) => boolean): boolean {
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
    && hasRequiredKeys(value, [
      "transactionDate",
      "paymentType",
      "currency",
      "totalCostAmount",
      "totalTaxAmount",
      "subtotalAmount",
      "tipAmount",
    ])
    && isTransactionDate(value["transactionDate"])
    && isPaymentType(value["paymentType"])
    && isCurrency(value["currency"])
    && isFiniteNumber(value["totalCostAmount"])
    && isFiniteNumber(value["totalTaxAmount"])
    && isFiniteNumber(value["subtotalAmount"])
    && isFiniteNumber(value["tipAmount"])
  );
}

function isClassificationOrNull(value: unknown): boolean {
  return value === null || isStandardClassification(value);
}

function isProduct(value: unknown): value is Product {
  if (
    !isRecord(value)
    || !hasRequiredKeys(value, [
      "name",
      "category",
      "quantity",
      "quantityUnit",
      "productCode",
      "price",
      "totalPrice",
      "detectedAllergens",
      "metadata",
    ])
    || typeof value["name"] !== "string"
    || !isProductCategory(value["category"])
    || !isFiniteNumber(value["quantity"])
    || typeof value["quantityUnit"] !== "string"
    || typeof value["productCode"] !== "string"
    || !isFiniteNumber(value["price"])
    || !isFiniteNumber(value["totalPrice"])
    || !Array.isArray(value["detectedAllergens"])
    || !isRecord(value["metadata"])
  ) {
    return false;
  }

  if (
    !value["detectedAllergens"].every(
      (allergen) =>
        isRecord(allergen)
        && hasOnlyKeys(allergen, ["name", "description", "learnMoreAddress"])
        && typeof allergen["name"] === "string"
        && typeof allergen["description"] === "string"
        && typeof allergen["learnMoreAddress"] === "string",
    )
  ) {
    return false;
  }

  const metadata = value["metadata"];
  return (
    hasOnlyKeys(metadata, ["isEdited", "isComplete", "isSoftDeleted", "confidence"])
    && typeof metadata["isEdited"] === "boolean"
    && typeof metadata["isComplete"] === "boolean"
    && typeof metadata["isSoftDeleted"] === "boolean"
    && isFiniteNumber(metadata["confidence"])
    && (!Object.hasOwn(value, "classification") || isClassificationOrNull(value["classification"]))
  );
}

function isInvoiceScan(value: unknown): boolean {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["scanType", "location", "metadata"])
    && hasRequiredKeys(value, ["scanType", "location", "metadata"])
    && isInvoiceScanType(value["scanType"])
    && typeof value["location"] === "string"
    && isRecord(value["metadata"])
    && Object.values(value["metadata"]).every((metadata) => typeof metadata === "string" || typeof metadata === "object")
  );
}

function isRecipe(value: unknown): boolean {
  return (
    isRecord(value)
    && hasOnlyKeys(value, [
      "name",
      "description",
      "approximateTotalDuration",
      "complexity",
      "ingredients",
      "instructions",
      "preparationTime",
      "cookingTime",
      "referenceForMoreDetails",
    ])
    && hasRequiredKeys(value, [
      "name",
      "description",
      "approximateTotalDuration",
      "complexity",
      "ingredients",
      "instructions",
      "preparationTime",
      "cookingTime",
      "referenceForMoreDetails",
    ])
    && typeof value["name"] === "string"
    && typeof value["description"] === "string"
    && isFiniteNumber(value["approximateTotalDuration"])
    && isRecipeComplexity(value["complexity"])
    && Array.isArray(value["ingredients"])
    && value["ingredients"].every((ingredient) => typeof ingredient === "string")
    && typeof value["instructions"] === "string"
    && isFiniteNumber(value["preparationTime"])
    && isFiniteNumber(value["cookingTime"])
    && typeof value["referenceForMoreDetails"] === "string"
  );
}

function isTaxDetail(value: unknown): boolean {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["amount", "rate", "netAmount", "description"])
    && hasRequiredKeys(value, ["amount", "rate", "netAmount", "description"])
    && isFiniteNumber(value["amount"])
    && isFiniteNumber(value["rate"])
    && isFiniteNumber(value["netAmount"])
    && typeof value["description"] === "string"
  );
}

function isPaymentDetail(value: unknown): boolean {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["method", "amount"])
    && hasRequiredKeys(value, ["method", "amount"])
    && typeof value["method"] === "string"
    && isFiniteNumber(value["amount"])
  );
}

function isPatchInvoicePayload(value: unknown): value is PatchInvoicePayload {
  return (
    isRecord(value)
    && hasOnlyKeys(value, patchPayloadKeys)
    && hasOptionalValue(value, "name", (entry) => typeof entry === "string")
    && hasOptionalValue(value, "description", (entry) => typeof entry === "string")
    && hasOptionalValue(value, "classification", isClassificationSelection)
    && hasOptionalValue(value, "paymentInformation", (entry) => isPaymentInformation(entry, isValidInputDate))
    && hasOptionalValue(value, "merchantReference", (entry) => typeof entry === "string")
    && hasOptionalValue(value, "isImportant", (entry) => typeof entry === "boolean")
    && hasOptionalValue(value, "sharedWith", (entry) => Array.isArray(entry) && entry.every((identifier) => typeof identifier === "string"))
    && hasOptionalValue(value, "additionalMetadata", isJsonRecord)
  );
}

function isPatchInvoiceInput(value: unknown): value is ServerActionInputType {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["invoiceId", "payload"])
    && hasRequiredKeys(value, ["invoiceId", "payload"])
    && typeof value["invoiceId"] === "string"
    && isPatchInvoicePayload(value["payload"])
  );
}

function isInvoiceTransport(value: unknown): value is InvoiceTransport {
  const numberOfUpdates = isRecord(value) ? value["numberOfUpdates"] : undefined;
  if (
    !isRecord(value)
    || !hasRequiredKeys(value, [
      "id",
      "name",
      "description",
      "userIdentifier",
      "sharedWith",
      "category",
      "scans",
      "paymentInformation",
      "merchantReference",
      "items",
      "possibleRecipes",
      "additionalMetadata",
      "receiptType",
      "countryRegion",
      "taxDetails",
      "payments",
      "createdAt",
      "createdBy",
      "lastUpdatedAt",
      "lastUpdatedBy",
      "numberOfUpdates",
      "isImportant",
      "isSoftDeleted",
    ])
    || typeof value["id"] !== "string"
    || typeof value["name"] !== "string"
    || typeof value["description"] !== "string"
    || typeof value["userIdentifier"] !== "string"
    || !Array.isArray(value["sharedWith"])
    || !value["sharedWith"].every((identifier) => typeof identifier === "string")
    || !isInvoiceCategory(value["category"])
    || !Array.isArray(value["scans"])
    || !value["scans"].every(isInvoiceScan)
    || !isPaymentInformation(value["paymentInformation"], isStrictRfc3339Timestamp)
    || typeof value["merchantReference"] !== "string"
    || !Array.isArray(value["items"])
    || !value["items"].every(isProduct)
    || !Array.isArray(value["possibleRecipes"])
    || !value["possibleRecipes"].every(isRecipe)
    || !isRecord(value["additionalMetadata"])
    || !Object.values(value["additionalMetadata"]).every((metadata) => typeof metadata === "string")
    || typeof value["receiptType"] !== "string"
    || typeof value["countryRegion"] !== "string"
    || !Array.isArray(value["taxDetails"])
    || !value["taxDetails"].every(isTaxDetail)
    || !Array.isArray(value["payments"])
    || !value["payments"].every(isPaymentDetail)
    || !isStrictRfc3339Timestamp(value["createdAt"])
    || typeof value["createdBy"] !== "string"
    || !isStrictRfc3339Timestamp(value["lastUpdatedAt"])
    || typeof value["lastUpdatedBy"] !== "string"
    || typeof numberOfUpdates !== "number"
    || !Number.isInteger(numberOfUpdates)
    || numberOfUpdates < 0
    || typeof value["isImportant"] !== "boolean"
    || typeof value["isSoftDeleted"] !== "boolean"
  ) {
    return false;
  }

  return !Object.hasOwn(value, "classification") || isClassificationOrNull(value["classification"]);
}

function parseInvoiceTransport(transport: InvoiceTransport): Invoice {
  const transactionDate = new Date(transport.paymentInformation.transactionDate);
  const createdAt = new Date(transport.createdAt);
  const lastUpdatedAt = new Date(transport.lastUpdatedAt);
  const {transactionDate: _transportTransactionDate, ...paymentInformation} = transport.paymentInformation;

  return {
    id: transport.id,
    name: transport.name,
    description: transport.description,
    userIdentifier: transport.userIdentifier,
    sharedWith: [...transport.sharedWith],
    category: transport.category,
    scans: [...transport.scans],
    paymentInformation: {...paymentInformation, transactionDate},
    merchantReference: transport.merchantReference,
    items: [...transport.items],
    possibleRecipes: [...transport.possibleRecipes],
    additionalMetadata: {...transport.additionalMetadata},
    receiptType: transport.receiptType,
    countryRegion: transport.countryRegion,
    taxDetails: [...transport.taxDetails],
    payments: [...transport.payments],
    createdAt,
    createdBy: transport.createdBy,
    lastUpdatedAt,
    lastUpdatedBy: transport.lastUpdatedBy,
    numberOfUpdates: transport.numberOfUpdates,
    isImportant: transport.isImportant,
    isSoftDeleted: transport.isSoftDeleted,
    ...(transport.classification === undefined ? {} : {classification: transport.classification}),
  };
}

function createValidationResult(): Awaited<ServerActionOutputType> {
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Invoice patch request is invalid.",
    },
  };
}

/**
 * Patches only backend-supported invoice fields and validates the full response.
 *
 * @remarks
 * The action rejects unknown outer and payload keys before authentication,
 * forwards only the safe PATCH DTO contract, and parses the returned transport
 * object before cache invalidation. Manual classification clearing is excluded
 * until the backend offers explicit clear semantics.
 *
 * @param input - Untrusted invoice identifier and exact supported patch payload.
 * @returns A validated updated invoice or a safe server-action error result.
 */
export async function patchInvoice(input: unknown): ServerActionOutputType {
  return withSpan("api.actions.invoices.patchInvoice", async () => {
    if (!isPatchInvoiceInput(input)) {
      addSpanEvent("bff.request.patch-invoice.validation-error");
      return createValidationResult();
    }

    const {invoiceId, payload} = input;
    try {
      validateStringIsGuidType(invoiceId, "invoiceId");
      if (payload.merchantReference !== undefined) {
        validateStringIsGuidType(payload.merchantReference, "merchantReference");
      }
      for (const sharedUserIdentifier of payload.sharedWith ?? []) {
        validateStringIsGuidType(sharedUserIdentifier, "sharedWith");
      }
    } catch {
      addSpanEvent("bff.request.patch-invoice.validation-error");
      return createValidationResult();
    }

    try {
      addSpanEvent("bff.user.jwt.fetch.start");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      addSpanEvent("bff.request.patch-invoice.start");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.patch-invoice.complete");

      if (!response.ok) {
        addSpanEvent("bff.request.patch-invoice.error", {"http.response.status_code": response.status});
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

      const responseData: unknown = await response.json();
      if (!isInvoiceTransport(responseData)) {
        addSpanEvent("bff.request.patch-invoice.invalid-response");
        logWithTrace("error", "Invoice patch returned an invalid response.", undefined, "server");
        return {
          success: false,
          error: {
            code: "SERVER_ERROR",
            message: "The invoice update response was invalid. Please try again.",
          },
        };
      }

      const invoice = parseInvoiceTransport(responseData);
      revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
      revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
      return {success: true, data: invoice};
    } catch (error) {
      addSpanEvent("bff.request.patch-invoice.error");
      logWithTrace("error", "Invoice patch request failed.", undefined, "server");
      return createErrorResult(error, "Unable to update the invoice. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
