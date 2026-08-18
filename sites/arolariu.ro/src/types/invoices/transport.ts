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
import {isGuid, isStrictRfc3339Timestamp} from "./transportValidation";

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
const emptyGuid = "00000000-0000-0000-0000-000000000000";
const maximumDecimalValue = Number("79228162514264337593543950335");
const maximumInt32Value = 2_147_483_647;

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

function isBoundedDecimal(value: unknown): value is number {
  return isFiniteNumber(value) && Math.abs(value) <= maximumDecimalValue;
}

function isNonNegativeDecimal(value: unknown): value is number {
  return isBoundedDecimal(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= maximumInt32Value;
}

function isNonEmptyGuid(value: unknown): value is string {
  return isGuid(value) && value.toLocaleLowerCase("en-US") !== emptyGuid;
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
    && isNonNegativeDecimal(value["totalCostAmount"])
    && isNonNegativeDecimal(value["totalTaxAmount"])
    && isNonNegativeDecimal(value["subtotalAmount"])
    && isNonNegativeDecimal(value["tipAmount"])
  );
}

function isProductMetadata(value: unknown): value is ProductMetadata {
  return (
    isRecord(value)
    && hasExactKeys(value, ["isEdited", "isComplete", "isSoftDeleted", "confidence"])
    && typeof value["isEdited"] === "boolean"
    && typeof value["isComplete"] === "boolean"
    && typeof value["isSoftDeleted"] === "boolean"
    && isNonNegativeDecimal(value["confidence"])
    && value["confidence"] >= 0
    && value["confidence"] <= 1
  );
}

function hasComputedProductTotal(value: Readonly<Record<string, unknown>>): boolean {
  const {quantity, price, totalPrice} = value;

  if (!isNonNegativeDecimal(quantity) || !isNonNegativeDecimal(price) || !isNonNegativeDecimal(totalPrice)) {
    return false;
  }

  const computedTotal = quantity * price;
  const roundingAllowance = Number.EPSILON * Math.max(1, Math.abs(computedTotal), Math.abs(totalPrice)) * 4;
  return Math.abs(totalPrice - computedTotal) <= roundingAllowance;
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
    && isNonNegativeDecimal(value["quantity"])
    && isString(value["quantityUnit"])
    && isString(value["productCode"])
    && isNonNegativeDecimal(value["price"])
    && isNonNegativeDecimal(value["totalPrice"])
    && hasComputedProductTotal(value)
    && (value["allergenAssessment"] === null || isAllergenAssessment(value["allergenAssessment"]))
    && isProductMetadata(value["metadata"])
  );
}

function isTaxDetail(value: unknown): value is TaxDetail {
  return (
    isRecord(value)
    && hasExactKeys(value, ["amount", "rate", "netAmount", "description"])
    && isNonNegativeDecimal(value["amount"])
    && isBoundedDecimal(value["rate"])
    && isNonNegativeDecimal(value["netAmount"])
    && isString(value["description"])
  );
}

function isPaymentDetail(value: unknown): value is PaymentDetail {
  return isRecord(value) && hasExactKeys(value, ["method", "amount"]) && isString(value["method"]) && isNonNegativeDecimal(value["amount"]);
}

function isStringOrNullRecord(value: unknown): value is Readonly<Record<string, string | null>> {
  return isRecord(value) && Object.values(value).every((entry) => isString(entry) || entry === null);
}

const invoiceTransportKeys = [
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
] as const;

function hasValidInvoiceScalars(value: Readonly<Record<string, unknown>>): boolean {
  return (
    isNonEmptyGuid(value["id"])
    && isGuid(value["userIdentifier"])
    && isString(value["name"])
    && isString(value["description"])
    && (value["classification"] === null || isStandardClassification(value["classification"]))
    && isPaymentInformation(value["paymentInformation"])
    && isGuid(value["merchantReference"])
    && isStringOrNullRecord(value["additionalMetadata"])
    && isString(value["receiptType"])
    && isString(value["countryRegion"])
    && typeof value["isImportant"] === "boolean"
    && typeof value["isSoftDeleted"] === "boolean"
    && isStrictRfc3339Timestamp(value["createdAt"])
    && isGuid(value["createdBy"])
    && isStrictRfc3339Timestamp(value["lastUpdatedAt"])
    && isNonEmptyGuid(value["lastUpdatedBy"])
    && isNonNegativeInteger(value["numberOfUpdates"])
  );
}

function hasValidInvoiceCollections(value: Readonly<Record<string, unknown>>): boolean {
  return (
    Array.isArray(value["sharedWith"])
    && value["sharedWith"].every(isNonEmptyGuid)
    && Array.isArray(value["scans"])
    && value["scans"].every(isInvoiceScan)
    && Array.isArray(value["items"])
    && value["items"].every(isProductTransport)
    && Array.isArray(value["possibleRecipes"])
    && value["possibleRecipes"].every(isRecipeSuggestion)
    && Array.isArray(value["taxDetails"])
    && value["taxDetails"].every(isTaxDetail)
    && Array.isArray(value["payments"])
    && value["payments"].every(isPaymentDetail)
  );
}

/** Determines whether a value is the full exact invoice response DTO. */
export function isInvoiceTransport(value: unknown): value is InvoiceTransport {
  return isRecord(value) && hasExactKeys(value, invoiceTransportKeys) && hasValidInvoiceScalars(value) && hasValidInvoiceCollections(value);
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
    && isNonEmptyGuid(value["id"])
    && isString(value["name"])
    && isString(value["description"])
    && (value["classification"] === null || isStandardClassification(value["classification"]))
    && isContactInformation(value["address"])
    && isGuid(value["parentCompanyId"])
    && isNonNegativeInteger(value["referencedInvoiceCount"])
    && Array.isArray(value["referencedInvoiceIds"])
    && value["referencedInvoiceIds"].every(isNonEmptyGuid)
    && isStringRecord(value["additionalMetadata"])
    && typeof value["isImportant"] === "boolean"
    && typeof value["isSoftDeleted"] === "boolean"
    && isStrictRfc3339Timestamp(value["createdAt"])
    && isGuid(value["createdBy"])
    && isStrictRfc3339Timestamp(value["lastUpdatedAt"])
    && isNonEmptyGuid(value["lastUpdatedBy"])
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
