/**
 * @fileoverview Strict parsers for public invoice and merchant transport DTOs.
 * @module types/invoices/transport
 *
 * @remarks
 * JSON returned by the BFF is untrusted. These parsers reject unknown keys at
 * every nested boundary and convert RFC 3339 timestamps into the Date values
 * used by existing application consumers.
 */

import {isAllergenAssessment} from "./Allergen";
import {isStandardClassification} from "./Classification";
import {InvoiceScanType, type Invoice, type InvoiceScan} from "./Invoice";
import {type ContactInformation, type Merchant} from "./Merchant";
import {PaymentType, type PaymentDetail, type PaymentInformation, type TaxDetail} from "./Payment";
import {type Product, type ProductMetadata} from "./Product";
import {isRecipeSuggestion} from "./Recipe";
import {isStrictRfc3339Timestamp} from "./transportValidation";

type TransportPaymentInformation = Omit<PaymentInformation, "transactionDate"> & Readonly<{transactionDate: string}>;
type InvoiceTransport = Omit<Invoice, "createdAt" | "lastUpdatedAt" | "paymentInformation">
  & Readonly<{
    readonly createdAt: string;
    readonly lastUpdatedAt: string;
    readonly paymentInformation: TransportPaymentInformation;
  }>;
type MerchantTransport = Omit<Merchant, "createdAt" | "lastUpdatedAt">
  & Readonly<{
    readonly createdAt: string;
    readonly lastUpdatedAt: string;
  }>;

const scanTypeValues: ReadonlySet<number> = new Set([
  InvoiceScanType.JPG,
  InvoiceScanType.JPEG,
  InvoiceScanType.PNG,
  InvoiceScanType.PDF,
  InvoiceScanType.OTHER,
  InvoiceScanType.UNKNOWN,
  InvoiceScanType.BMP,
  InvoiceScanType.TIFF,
  InvoiceScanType.HEIF,
]);
const paymentTypeValues: readonly number[] = Object.values(PaymentType);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isInvoiceScan(value: unknown): value is InvoiceScan {
  return (
    isRecord(value)
    && hasExactKeys(value, ["type", "location"])
    && typeof value["type"] === "number"
    && scanTypeValues.has(value["type"])
    && isString(value["location"])
  );
}

function isCurrency(value: unknown): boolean {
  return (
    isRecord(value)
    && hasExactKeys(value, ["name", "code", "symbol"])
    && isString(value["name"])
    && isString(value["code"])
    && isString(value["symbol"])
  );
}

function isPaymentInformation(value: unknown): value is TransportPaymentInformation {
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
    && isStrictRfc3339Timestamp(value["transactionDate"])
    && typeof value["paymentType"] === "number"
    && paymentTypeValues.includes(value["paymentType"])
    && isCurrency(value["currency"])
    && isFiniteNumber(value["totalCostAmount"])
    && isFiniteNumber(value["totalTaxAmount"])
    && isFiniteNumber(value["subtotalAmount"])
    && isFiniteNumber(value["tipAmount"])
  );
}

function isProductMetadata(value: unknown): value is ProductMetadata {
  return (
    isRecord(value)
    && hasExactKeys(value, ["isEdited", "isComplete", "isSoftDeleted", "confidence"])
    && typeof value["isEdited"] === "boolean"
    && typeof value["isComplete"] === "boolean"
    && typeof value["isSoftDeleted"] === "boolean"
    && isFiniteNumber(value["confidence"])
    && value["confidence"] >= 0
    && value["confidence"] <= 1
  );
}

/** Determines whether a value is an exact product response DTO. */
export function isProductTransport(value: unknown): value is Product {
  return (
    isRecord(value)
    && hasExactKeys(value, [
      "name",
      "classification",
      "quantity",
      "quantityUnit",
      "productCode",
      "price",
      "totalPrice",
      "allergenAssessment",
      "metadata",
    ])
    && isString(value["name"])
    && (value["classification"] === null || isStandardClassification(value["classification"]))
    && isFiniteNumber(value["quantity"])
    && isString(value["quantityUnit"])
    && isString(value["productCode"])
    && isFiniteNumber(value["price"])
    && isFiniteNumber(value["totalPrice"])
    && (value["allergenAssessment"] === null || isAllergenAssessment(value["allergenAssessment"]))
    && isProductMetadata(value["metadata"])
  );
}

function isTaxDetail(value: unknown): value is TaxDetail {
  return (
    isRecord(value)
    && hasExactKeys(value, ["amount", "rate", "netAmount", "description"])
    && isFiniteNumber(value["amount"])
    && isFiniteNumber(value["rate"])
    && isFiniteNumber(value["netAmount"])
    && isString(value["description"])
  );
}

function isPaymentDetail(value: unknown): value is PaymentDetail {
  return isRecord(value) && hasExactKeys(value, ["method", "amount"]) && isString(value["method"]) && isFiniteNumber(value["amount"]);
}

function isStringOrNullRecord(value: unknown): value is Readonly<Record<string, string | null>> {
  return isRecord(value) && Object.values(value).every((entry) => isString(entry) || entry === null);
}

/** Determines whether a value is the full exact invoice response DTO. */
export function isInvoiceTransport(value: unknown): value is InvoiceTransport {
  return (
    isRecord(value)
    && hasExactKeys(value, [
      "id",
      "userIdentifier",
      "sharedWith",
      "name",
      "description",
      "classification",
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
      "isImportant",
      "isSoftDeleted",
      "createdAt",
      "createdBy",
      "lastUpdatedAt",
      "lastUpdatedBy",
      "numberOfUpdates",
    ])
    && isString(value["id"])
    && isString(value["userIdentifier"])
    && Array.isArray(value["sharedWith"])
    && value["sharedWith"].every(isString)
    && isString(value["name"])
    && isString(value["description"])
    && (value["classification"] === null || isStandardClassification(value["classification"]))
    && Array.isArray(value["scans"])
    && value["scans"].every(isInvoiceScan)
    && isPaymentInformation(value["paymentInformation"])
    && isString(value["merchantReference"])
    && Array.isArray(value["items"])
    && value["items"].every(isProductTransport)
    && Array.isArray(value["possibleRecipes"])
    && value["possibleRecipes"].every(isRecipeSuggestion)
    && isStringOrNullRecord(value["additionalMetadata"])
    && isString(value["receiptType"])
    && isString(value["countryRegion"])
    && Array.isArray(value["taxDetails"])
    && value["taxDetails"].every(isTaxDetail)
    && Array.isArray(value["payments"])
    && value["payments"].every(isPaymentDetail)
    && typeof value["isImportant"] === "boolean"
    && typeof value["isSoftDeleted"] === "boolean"
    && isStrictRfc3339Timestamp(value["createdAt"])
    && isString(value["createdBy"])
    && isStrictRfc3339Timestamp(value["lastUpdatedAt"])
    && isString(value["lastUpdatedBy"])
    && isNonNegativeInteger(value["numberOfUpdates"])
  );
}

/** Parses an exact invoice DTO or returns null when the transport boundary is invalid. */
export function parseInvoiceTransport(value: unknown): Invoice | null {
  if (!isInvoiceTransport(value)) {
    return null;
  }

  return {
    ...value,
    paymentInformation: {
      ...value.paymentInformation,
      transactionDate: new Date(value.paymentInformation.transactionDate),
    },
    createdAt: new Date(value.createdAt),
    lastUpdatedAt: new Date(value.lastUpdatedAt),
  };
}

function isContactInformation(value: unknown): value is ContactInformation {
  return (
    isRecord(value)
    && hasExactKeys(value, ["fullName", "address", "phoneNumber", "emailAddress", "website"])
    && isString(value["fullName"])
    && isString(value["address"])
    && isString(value["phoneNumber"])
    && isString(value["emailAddress"])
    && isString(value["website"])
  );
}

function isStringRecord(value: unknown): value is Readonly<Record<string, string>> {
  return isRecord(value) && Object.values(value).every(isString);
}

/** Determines whether a value is the full exact merchant response DTO. */
export function isMerchantTransport(value: unknown): value is MerchantTransport {
  return (
    isRecord(value)
    && hasExactKeys(value, [
      "id",
      "name",
      "description",
      "classification",
      "address",
      "parentCompanyId",
      "referencedInvoiceCount",
      "referencedInvoiceIds",
      "additionalMetadata",
      "isImportant",
      "isSoftDeleted",
      "createdAt",
      "createdBy",
      "lastUpdatedAt",
      "lastUpdatedBy",
      "numberOfUpdates",
    ])
    && isString(value["id"])
    && isString(value["name"])
    && isString(value["description"])
    && (value["classification"] === null || isStandardClassification(value["classification"]))
    && isContactInformation(value["address"])
    && isString(value["parentCompanyId"])
    && isNonNegativeInteger(value["referencedInvoiceCount"])
    && Array.isArray(value["referencedInvoiceIds"])
    && value["referencedInvoiceIds"].every(isString)
    && isStringRecord(value["additionalMetadata"])
    && typeof value["isImportant"] === "boolean"
    && typeof value["isSoftDeleted"] === "boolean"
    && isStrictRfc3339Timestamp(value["createdAt"])
    && isString(value["createdBy"])
    && isStrictRfc3339Timestamp(value["lastUpdatedAt"])
    && isString(value["lastUpdatedBy"])
    && isNonNegativeInteger(value["numberOfUpdates"])
  );
}

/** Parses an exact merchant DTO or returns null when the transport boundary is invalid. */
export function parseMerchantTransport(value: unknown): Merchant | null {
  if (!isMerchantTransport(value)) {
    return null;
  }

  return {
    ...value,
    createdAt: new Date(value.createdAt),
    lastUpdatedAt: new Date(value.lastUpdatedAt),
  };
}

/** Parses an exact product DTO or returns null when the transport boundary is invalid. */
export function parseProductTransport(value: unknown): Product | null {
  return isProductTransport(value) ? value : null;
}
