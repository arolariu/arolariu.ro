/**
 * @fileoverview Runtime transport validation boundary for the invoices bounded context.
 * @module types/invoices/transport
 *
 * @remarks
 * Every server action that calls the invoices API must route its response through
 * one of these parsers. TypeScript `as Invoice` casts do NOT validate at runtime —
 * this module is the permanent runtime boundary that rejects drifted or malformed
 * API JSON before it reaches the UI layer.
 *
 * ## Design Rules
 *
 * 1. **Entity parsers** (Invoice, Product, Merchant) tolerate additive backend
 *    properties by design — they do NOT call `hasOnlyKeys`. Unknown JSON fields are
 *    silently ignored so that a new backend field never breaks an old client.
 *
 * 2. **Value-object guards** (AllergenAssessment, RecipeSuggestion) are intentionally
 *    closed and use `hasOnlyKeys` internally. Their contracts are stable by design.
 *
 * 3. **Timestamps** (`createdAt`, `lastUpdatedAt`, `paymentInformation.transactionDate`)
 *    are parsed with `new Date()` and throw if the result is `NaN`.
 *
 * 4. A field that is **present but invalid** always throws. A field that is **absent**
 *    may receive a safe default only when the TypeScript type has a clear zero value and
 *    the backend legitimately omits it (e.g. deprecated or transitional fields).
 *
 * 5. The GUID predicate reuses the existing `validateStringIsGuidType` assertion from
 *    `@/lib/utils.generic` — no second UUID regex is introduced.
 */

import {validateStringIsGuidType} from "@/lib/utils.generic";
import {isAllergenAssessment} from "./Allergen";
import {
  isClassificationOrigin,
  isClassificationSystem,
  type ClassificationEvidence,
  type ClassificationNode,
  type StandardClassification,
} from "./Classification";
import {isFiniteNumber, isNonEmptyString, isRecord} from "./guards";
import {
  InvoiceScanType,
  type Invoice,
  type InvoiceScan,
  type InvoiceScanMetadataValue,
} from "./Invoice";
import {type ContactInformation, type Merchant} from "./Merchant";
import {PaymentType, type PaymentDetail, type PaymentInformation, type TaxDetail} from "./Payment";
import {type Product, type ProductMetadata} from "./Product";
import {isRecipeSuggestion} from "./Recipe";
import type {Currency} from "../DDD";

// ============================================================
// TransportValidationError
// ============================================================

/**
 * Thrown by every parser in this module when the received JSON does not satisfy
 * the expected contract.
 *
 * @remarks
 * The `path` field encodes a dot-separated location within the parsed value
 * (e.g. `"invoice.classification.system"`) so that server logs can pinpoint
 * exactly which backend field caused the rejection.
 *
 * @example
 * ```typescript
 * try {
 *   const invoice = parseInvoiceResponse(body);
 * } catch (err) {
 *   if (err instanceof TransportValidationError) {
 *     logger.error(`Validation failed at ${err.path}: ${err.message}`);
 *   }
 * }
 * ```
 */
export class TransportValidationError extends Error {
  /** Dot-separated path within the parsed value where validation failed. */
  readonly path: string;

  /**
   * @param path - Dot-separated location within the parsed value.
   * @param detail - Human-readable description of the specific failure.
   */
  constructor(path: string, detail: string) {
    super(`Transport validation failed at "${path}": ${detail}`);
    this.name = "TransportValidationError";
    this.path = path;
  }
}

// ============================================================
// Private helpers
// ============================================================

/**
 * Boolean predicate wrapping the existing `validateStringIsGuidType` assertion.
 * Returns `true` when `value` is a UUIDv4 or UUIDv7 string.
 * Reuses the upstream regex — no second UUID pattern is introduced.
 */
function isGuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    validateStringIsGuidType(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses an ISO date string into a `Date`, throwing if the value is not a string
 * or produces a `NaN` timestamp.
 */
function parseDate(value: unknown, path: string): Date {
  if (typeof value !== "string") {
    throw new TransportValidationError(path, "expected an ISO date string");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TransportValidationError(path, `"${value}" is not a valid date`);
  }
  return date;
}

/** Parses a {@link Currency} value object. */
function parseCurrency(value: unknown, path: string): Currency {
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");
  const name = value["name"];
  const code = value["code"];
  const symbol = value["symbol"];
  if (typeof name !== "string") throw new TransportValidationError(`${path}.name`, "expected string");
  if (typeof code !== "string") throw new TransportValidationError(`${path}.code`, "expected string");
  if (typeof symbol !== "string") throw new TransportValidationError(`${path}.symbol`, "expected string");
  return {name, code, symbol};
}

/** Parses a {@link PaymentInformation} value object. */
function parsePaymentInformation(value: unknown, path: string): PaymentInformation {
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");

  const transactionDate = parseDate(value["transactionDate"], `${path}.transactionDate`);

  const rawPaymentType = value["paymentType"];
  const validPaymentTypes: readonly number[] = Object.values(PaymentType);
  if (typeof rawPaymentType !== "number" || !validPaymentTypes.includes(rawPaymentType)) {
    throw new TransportValidationError(`${path}.paymentType`, `unrecognised payment type: ${String(rawPaymentType)}`);
  }
  const paymentType = rawPaymentType as PaymentType;

  const currency = parseCurrency(value["currency"], `${path}.currency`);

  const totalCostAmount = value["totalCostAmount"];
  if (!isFiniteNumber(totalCostAmount)) {
    throw new TransportValidationError(`${path}.totalCostAmount`, "expected finite number");
  }

  const totalTaxAmount = value["totalTaxAmount"];
  if (!isFiniteNumber(totalTaxAmount)) {
    throw new TransportValidationError(`${path}.totalTaxAmount`, "expected finite number");
  }

  // subtotalAmount / tipAmount: present + invalid → throw; absent → default 0
  const rawSubtotal = value["subtotalAmount"];
  if (rawSubtotal !== undefined && rawSubtotal !== null && !isFiniteNumber(rawSubtotal)) {
    throw new TransportValidationError(`${path}.subtotalAmount`, "expected finite number");
  }
  const subtotalAmount = isFiniteNumber(rawSubtotal) ? rawSubtotal : 0;

  const rawTip = value["tipAmount"];
  if (rawTip !== undefined && rawTip !== null && !isFiniteNumber(rawTip)) {
    throw new TransportValidationError(`${path}.tipAmount`, "expected finite number");
  }
  const tipAmount = isFiniteNumber(rawTip) ? rawTip : 0;

  return {transactionDate, paymentType, currency, totalCostAmount, totalTaxAmount, subtotalAmount, tipAmount};
}

/** Parses one {@link InvoiceScan} from the backend `{type, location}` wire shape. */
function parseScan(value: unknown, path: string): InvoiceScan {
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");

  const rawType = value["type"];
  const validScanTypes: readonly number[] = Object.values(InvoiceScanType);
  if (typeof rawType !== "number" || !validScanTypes.includes(rawType)) {
    throw new TransportValidationError(`${path}.type`, `unrecognised scan type: ${String(rawType)}`);
  }
  const type = rawType as InvoiceScanType;

  const location = value["location"];
  if (!isNonEmptyString(location)) {
    throw new TransportValidationError(`${path}.location`, "expected non-empty string");
  }

  // metadata: present → validate as record; absent → default {}
  const rawMetadata = value["metadata"];
  const metadata: Record<string, InvoiceScanMetadataValue> = {};
  if (rawMetadata !== undefined && rawMetadata !== null) {
    if (!isRecord(rawMetadata)) {
      throw new TransportValidationError(`${path}.metadata`, "expected object");
    }
    for (const key of Object.keys(rawMetadata)) {
      const val: unknown = rawMetadata[key];
      if (typeof val === "string" || (typeof val === "object" && val !== null)) {
        metadata[key] = val;
      }
    }
  }

  return {type, location, metadata};
}

/** Parses a {@link ProductMetadata} value object. */
function parseProductMetadata(value: unknown, path: string): ProductMetadata {
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");
  const isEdited = value["isEdited"];
  const isComplete = value["isComplete"];
  const isSoftDeleted = value["isSoftDeleted"];
  const confidence = value["confidence"];
  if (typeof isEdited !== "boolean") throw new TransportValidationError(`${path}.isEdited`, "expected boolean");
  if (typeof isComplete !== "boolean") throw new TransportValidationError(`${path}.isComplete`, "expected boolean");
  if (typeof isSoftDeleted !== "boolean") throw new TransportValidationError(`${path}.isSoftDeleted`, "expected boolean");
  if (!isFiniteNumber(confidence)) throw new TransportValidationError(`${path}.confidence`, "expected finite number");
  return {isEdited, isComplete, isSoftDeleted, confidence};
}

/** Parses a {@link ContactInformation} value object. */
function parseContactInformation(value: unknown, path: string): ContactInformation {
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");

  // Bind the narrowed record before the closure: TypeScript widens `value` back to
  // `unknown` inside a nested function because the guard cannot be proven to still hold.
  const record: Readonly<Record<string, unknown>> = value;

  function parseContactField(field: string): string {
    const val: unknown = record[field];
    if (val === undefined) return "";
    if (typeof val !== "string") throw new TransportValidationError(`${path}.${field}`, "expected string");
    return val;
  }

  return {
    fullName: parseContactField("fullName"),
    address: parseContactField("address"),
    phoneNumber: parseContactField("phoneNumber"),
    emailAddress: parseContactField("emailAddress"),
    website: parseContactField("website"),
  };
}

/**
 * Internal entity parser for Product — accepts a caller-supplied `path` so that
 * nested calls from `parseInvoiceResponse` produce precise error locations.
 */
function parseProductInternal(value: unknown, path: string): Product {
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");

  const rawName = value["name"];
  if (!isNonEmptyString(rawName)) {
    throw new TransportValidationError(`${path}.name`, "expected non-empty string");
  }

  const rawQuantity = value["quantity"];
  if (!isFiniteNumber(rawQuantity)) {
    throw new TransportValidationError(`${path}.quantity`, "expected finite number");
  }

  const rawQuantityUnit = value["quantityUnit"];
  if (typeof rawQuantityUnit !== "string") {
    throw new TransportValidationError(`${path}.quantityUnit`, "expected string");
  }

  const rawProductCode = value["productCode"];
  if (typeof rawProductCode !== "string") {
    throw new TransportValidationError(`${path}.productCode`, "expected string");
  }

  const rawPrice = value["price"];
  if (!isFiniteNumber(rawPrice)) {
    throw new TransportValidationError(`${path}.price`, "expected finite number");
  }

  const rawTotalPrice = value["totalPrice"];
  if (!isFiniteNumber(rawTotalPrice)) {
    throw new TransportValidationError(`${path}.totalPrice`, "expected finite number");
  }

  // metadata (required)
  const metadata = parseProductMetadata(value["metadata"], `${path}.metadata`);

  // classification (nullable — absent treated as null)
  const rawClassification = value["classification"] !== undefined ? value["classification"] : null;
  const classification = parseStandardClassification(rawClassification, `${path}.classification`);

  // allergenAssessment (nullable — absent treated as null)
  const rawAllergenAssessment = value["allergenAssessment"];
  let allergenAssessment = null;
  if (rawAllergenAssessment !== null && rawAllergenAssessment !== undefined) {
    if (!isAllergenAssessment(rawAllergenAssessment)) {
      throw new TransportValidationError(`${path}.allergenAssessment`, "invalid allergen assessment");
    }
    allergenAssessment = rawAllergenAssessment;
  }

  return {
    name: rawName,
    quantity: rawQuantity,
    quantityUnit: rawQuantityUnit,
    productCode: rawProductCode,
    price: rawPrice,
    totalPrice: rawTotalPrice,
    metadata,
    classification,
    allergenAssessment,
  };
}

/**
 * Internal entity parser for Merchant — accepts a caller-supplied `path`.
 */
function parseMerchantInternal(value: unknown, path: string): Merchant {
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");

  const rawId = value["id"];
  if (!isGuid(rawId)) throw new TransportValidationError(`${path}.id`, "expected GUID string");

  const rawName = value["name"];
  if (!isNonEmptyString(rawName)) {
    throw new TransportValidationError(`${path}.name`, "expected non-empty string");
  }

  const rawDescription = value["description"];
  const description = typeof rawDescription === "string" ? rawDescription : "";

  const address = parseContactInformation(value["address"], `${path}.address`);

  const rawParentCompanyId = value["parentCompanyId"];
  const parentCompanyId = typeof rawParentCompanyId === "string" ? rawParentCompanyId : "";

  const rawClassification = value["classification"] !== undefined ? value["classification"] : null;
  const classification = parseStandardClassification(rawClassification, `${path}.classification`);

  const createdAt = parseDate(value["createdAt"], `${path}.createdAt`);
  const lastUpdatedAt = parseDate(value["lastUpdatedAt"], `${path}.lastUpdatedAt`);

  const rawCreatedBy = value["createdBy"];
  const createdBy = typeof rawCreatedBy === "string" ? rawCreatedBy : "";

  const rawLastUpdatedBy = value["lastUpdatedBy"];
  const lastUpdatedBy = typeof rawLastUpdatedBy === "string" ? rawLastUpdatedBy : "";

  const rawNumberOfUpdates = value["numberOfUpdates"];
  const numberOfUpdates = isFiniteNumber(rawNumberOfUpdates) ? rawNumberOfUpdates : 0;

  const rawIsImportant = value["isImportant"];
  const isImportant = typeof rawIsImportant === "boolean" ? rawIsImportant : false;

  const rawIsSoftDeleted = value["isSoftDeleted"];
  const isSoftDeleted = typeof rawIsSoftDeleted === "boolean" ? rawIsSoftDeleted : false;

  return {
    id: rawId,
    name: rawName,
    description,
    address,
    parentCompanyId,
    classification,
    createdAt,
    createdBy,
    lastUpdatedAt,
    lastUpdatedBy,
    numberOfUpdates,
    isImportant,
    isSoftDeleted,
  };
}

// ============================================================
// Public exports
// ============================================================

/**
 * Parses an unknown value as a {@link StandardClassification}, returning `null` when
 * the value is `null` or `undefined`.
 *
 * @remarks
 * This parser intentionally does NOT call `hasOnlyKeys` — additive backend fields on
 * the classification object are silently ignored. Only the fields required by the
 * {@link StandardClassification} interface are validated.
 *
 * @param value - The raw JSON value to validate (may be `null` for unclassified entities).
 * @param path - Dot-separated path used in error messages (e.g. `"invoice.classification"`).
 * @returns A valid {@link StandardClassification} or `null`.
 *
 * @throws {TransportValidationError} When `value` is non-null and fails structural validation.
 *   Common failure paths: `path.system` for unrecognised taxonomy systems,
 *   `path.origin` for unrecognised origins, `path.hierarchy[n].code` for malformed nodes.
 */
export function parseStandardClassification(value: unknown, path: string): StandardClassification | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) {
    throw new TransportValidationError(path, "expected an object or null");
  }

  const system = value["system"];
  if (!isClassificationSystem(system)) {
    throw new TransportValidationError(
      `${path}.system`,
      `unrecognised classification system: "${String(system)}"`,
    );
  }

  const version = value["version"];
  if (!isNonEmptyString(version)) {
    throw new TransportValidationError(`${path}.version`, "expected non-empty string");
  }

  const code = value["code"];
  if (!isNonEmptyString(code)) {
    throw new TransportValidationError(`${path}.code`, "expected non-empty string");
  }

  const officialLabel = value["officialLabel"];
  if (!isNonEmptyString(officialLabel)) {
    throw new TransportValidationError(`${path}.officialLabel`, "expected non-empty string");
  }

  const rawHierarchy = value["hierarchy"];
  if (!Array.isArray(rawHierarchy)) {
    throw new TransportValidationError(`${path}.hierarchy`, "expected array");
  }
  const hierarchy: ClassificationNode[] = [];
  for (let i = 0; i < rawHierarchy.length; i++) {
    const item: unknown = rawHierarchy[i];
    if (!isRecord(item)) {
      throw new TransportValidationError(`${path}.hierarchy[${i}]`, "expected object");
    }
    const nodeLevel = item["level"];
    const nodeCode = item["code"];
    const nodeLabel = item["officialLabel"];
    if (!isNonEmptyString(nodeLevel)) {
      throw new TransportValidationError(`${path}.hierarchy[${i}].level`, "expected non-empty string");
    }
    if (!isNonEmptyString(nodeCode)) {
      throw new TransportValidationError(`${path}.hierarchy[${i}].code`, "expected non-empty string");
    }
    if (!isNonEmptyString(nodeLabel)) {
      throw new TransportValidationError(`${path}.hierarchy[${i}].officialLabel`, "expected non-empty string");
    }
    hierarchy.push({level: nodeLevel, code: nodeCode, officialLabel: nodeLabel});
  }

  const origin = value["origin"];
  if (!isClassificationOrigin(origin)) {
    throw new TransportValidationError(
      `${path}.origin`,
      `unrecognised classification origin: "${String(origin)}"`,
    );
  }

  const rawConfidence = value["confidence"];
  let confidence: number | null = null;
  if (rawConfidence !== null && rawConfidence !== undefined) {
    if (!isFiniteNumber(rawConfidence)) {
      throw new TransportValidationError(`${path}.confidence`, "expected finite number or null");
    }
    confidence = rawConfidence;
  }

  const rawEvidence = value["evidence"];
  if (!Array.isArray(rawEvidence)) {
    throw new TransportValidationError(`${path}.evidence`, "expected array");
  }
  const evidence: ClassificationEvidence[] = [];
  for (let i = 0; i < rawEvidence.length; i++) {
    const item: unknown = rawEvidence[i];
    if (!isRecord(item)) {
      throw new TransportValidationError(`${path}.evidence[${i}]`, "expected object");
    }
    const src = item["source"];
    const val = item["value"];
    if (!isNonEmptyString(src)) {
      throw new TransportValidationError(`${path}.evidence[${i}].source`, "expected non-empty string");
    }
    if (!isNonEmptyString(val)) {
      throw new TransportValidationError(`${path}.evidence[${i}].value`, "expected non-empty string");
    }
    evidence.push({source: src, value: val});
  }

  return {system, version, code, officialLabel, hierarchy, origin, confidence, evidence};
}

/**
 * Parses an unknown API response value as a single {@link Invoice}.
 *
 * @remarks
 * Additive backend properties are silently ignored — this parser does NOT call
 * `hasOnlyKeys`. Every required field that is present but structurally invalid
 * causes an immediate throw; missing required fields also throw. Absent transitional
 * or deprecated fields receive safe defaults.
 *
 * Timestamp fields (`createdAt`, `lastUpdatedAt`, `paymentInformation.transactionDate`)
 * are converted from ISO strings to `Date` instances.
 *
 * @param value - The raw response body from an invoice API endpoint.
 * @returns A validated {@link Invoice} with `Date` timestamps.
 *
 * @throws {TransportValidationError} On any structural or type mismatch in the payload.
 */
export function parseInvoiceResponse(value: unknown): Invoice {
  const path = "invoice";
  if (!isRecord(value)) throw new TransportValidationError(path, "expected object");

  const rawId = value["id"];
  if (!isGuid(rawId)) {
    throw new TransportValidationError(`${path}.id`, "expected GUID string");
  }

  const rawUserIdentifier = value["userIdentifier"];
  if (!isGuid(rawUserIdentifier)) {
    throw new TransportValidationError(`${path}.userIdentifier`, "expected GUID string");
  }

  const rawName = value["name"];
  if (!isNonEmptyString(rawName)) {
    throw new TransportValidationError(`${path}.name`, "expected non-empty string");
  }

  const rawDescription = value["description"];
  const description = typeof rawDescription === "string" ? rawDescription : "";

  const rawClassification = value["classification"] !== undefined ? value["classification"] : null;
  const classification = parseStandardClassification(rawClassification, `${path}.classification`);

  const rawScans = value["scans"];
  if (!Array.isArray(rawScans)) {
    throw new TransportValidationError(`${path}.scans`, "expected array");
  }
  const scansArr: unknown[] = rawScans;
  const scans: InvoiceScan[] = scansArr.map((item, i) => parseScan(item, `${path}.scans[${i}]`));

  const paymentInformation = parsePaymentInformation(value["paymentInformation"], `${path}.paymentInformation`);

  const rawMerchantRef = value["merchantReference"];
  if (!isGuid(rawMerchantRef)) {
    throw new TransportValidationError(`${path}.merchantReference`, "expected GUID string");
  }

  const rawItems = value["items"];
  if (!Array.isArray(rawItems)) {
    throw new TransportValidationError(`${path}.items`, "expected array");
  }
  const itemsArr: unknown[] = rawItems;
  const items: Product[] = itemsArr.map((item, i) => parseProductInternal(item, `${path}.items[${i}]`));

  const rawRecipes = value["possibleRecipes"];
  if (!Array.isArray(rawRecipes)) {
    throw new TransportValidationError(`${path}.possibleRecipes`, "expected array");
  }
  const recipesArr: unknown[] = rawRecipes;
  const possibleRecipes = recipesArr.map((item, i) => {
    if (!isRecipeSuggestion(item)) {
      throw new TransportValidationError(`${path}.possibleRecipes[${i}]`, "invalid recipe suggestion");
    }
    return item;
  });

  // additionalMetadata — absent or null → {}; present but non-object → throw; wrong value types → throw
  const rawAdditionalMetadata = value["additionalMetadata"];
  const additionalMetadata: Record<string, string> = {};
  if (rawAdditionalMetadata !== null && rawAdditionalMetadata !== undefined) {
    if (!isRecord(rawAdditionalMetadata)) {
      throw new TransportValidationError(`${path}.additionalMetadata`, "expected object");
    }
    for (const key of Object.keys(rawAdditionalMetadata)) {
      const val: unknown = rawAdditionalMetadata[key];
      if (typeof val !== "string") {
        throw new TransportValidationError(`${path}.additionalMetadata.${key}`, "expected string");
      }
      additionalMetadata[key] = val;
    }
  }

  const rawReceiptType = value["receiptType"];
  const receiptType = typeof rawReceiptType === "string" ? rawReceiptType : "";

  const rawCountryRegion = value["countryRegion"];
  const countryRegion = typeof rawCountryRegion === "string" ? rawCountryRegion : "";

  // sharedWith — absent or null → []; present but non-array → throw
  const rawSharedWith = value["sharedWith"];
  const sharedWith: string[] = [];
  if (rawSharedWith !== undefined && rawSharedWith !== null) {
    if (!Array.isArray(rawSharedWith)) {
      throw new TransportValidationError(`${path}.sharedWith`, "expected array");
    }
    for (const item of rawSharedWith) {
      if (typeof item === "string") sharedWith.push(item);
    }
  }

  // taxDetails — lenient, absent → []
  const rawTaxDetails = value["taxDetails"];
  const taxDetails: TaxDetail[] = [];
  if (Array.isArray(rawTaxDetails)) {
    for (const item of rawTaxDetails) {
      if (isRecord(item)) {
        const amount = item["amount"];
        const rate = item["rate"];
        const netAmount = item["netAmount"];
        const taxDescription = item["description"];
        if (
          isFiniteNumber(amount) &&
          isFiniteNumber(rate) &&
          isFiniteNumber(netAmount) &&
          typeof taxDescription === "string"
        ) {
          taxDetails.push({amount, rate, netAmount, description: taxDescription});
        }
      }
    }
  }

  // payments — lenient, absent → []
  const rawPayments = value["payments"];
  const payments: PaymentDetail[] = [];
  if (Array.isArray(rawPayments)) {
    for (const item of rawPayments) {
      if (isRecord(item)) {
        const method = item["method"];
        const amount = item["amount"];
        if (typeof method === "string" && isFiniteNumber(amount)) {
          payments.push({method, amount});
        }
      }
    }
  }

  const createdAt = parseDate(value["createdAt"], `${path}.createdAt`);
  const lastUpdatedAt = parseDate(value["lastUpdatedAt"], `${path}.lastUpdatedAt`);

  const rawCreatedBy = value["createdBy"];
  const createdBy = typeof rawCreatedBy === "string" ? rawCreatedBy : "";

  const rawLastUpdatedBy = value["lastUpdatedBy"];
  const lastUpdatedBy = typeof rawLastUpdatedBy === "string" ? rawLastUpdatedBy : "";

  const rawNumberOfUpdates = value["numberOfUpdates"];
  const numberOfUpdates = isFiniteNumber(rawNumberOfUpdates) ? rawNumberOfUpdates : 0;

  const rawIsImportant = value["isImportant"];
  const isImportant = typeof rawIsImportant === "boolean" ? rawIsImportant : false;

  const rawIsSoftDeleted = value["isSoftDeleted"];
  const isSoftDeleted = typeof rawIsSoftDeleted === "boolean" ? rawIsSoftDeleted : false;

  return {
    id: rawId,
    userIdentifier: rawUserIdentifier,
    name: rawName,
    description,
    classification,
    scans,
    paymentInformation,
    merchantReference: rawMerchantRef,
    items,
    possibleRecipes,
    additionalMetadata,
    receiptType,
    countryRegion,
    sharedWith,
    taxDetails,
    payments,
    createdAt,
    createdBy,
    lastUpdatedAt,
    lastUpdatedBy,
    numberOfUpdates,
    isImportant,
    isSoftDeleted,
  };
}

/**
 * Parses an unknown value as a readonly array of {@link Invoice} objects.
 *
 * @param value - The raw response body, expected to be a JSON array.
 * @returns A `readonly Invoice[]`.
 *
 * @throws {TransportValidationError} When `value` is not an array, or when any
 *   element fails {@link parseInvoiceResponse} validation.
 */
export function parseInvoicesResponse(value: unknown): readonly Invoice[] {
  if (!Array.isArray(value)) {
    throw new TransportValidationError("invoices", "expected array");
  }
  const arr: unknown[] = value;
  return arr.map((item) => parseInvoiceResponse(item));
}

/**
 * Parses an unknown value as a single {@link Product}.
 *
 * @remarks
 * Additive backend properties on the product object are silently ignored.
 * The `allergenAssessment` and `classification` fields are nullable —
 * absent or `null` values resolve to `null`.
 *
 * @param value - The raw JSON product object.
 * @returns A validated {@link Product}.
 *
 * @throws {TransportValidationError} On any structural or type mismatch.
 */
export function parseProductResponse(value: unknown): Product {
  return parseProductInternal(value, "product");
}

/**
 * Parses an unknown value as a single {@link Merchant}.
 *
 * @remarks
 * Additive backend properties on the merchant object are silently ignored.
 * Audit fields not sent by the backend receive safe zero-value defaults.
 *
 * @param value - The raw JSON merchant object.
 * @returns A validated {@link Merchant} with `Date` timestamps.
 *
 * @throws {TransportValidationError} On any structural or type mismatch.
 */
export function parseMerchantResponse(value: unknown): Merchant {
  return parseMerchantInternal(value, "merchant");
}

/**
 * Parses an unknown value as a readonly array of {@link Merchant} objects.
 *
 * @param value - The raw response body, expected to be a JSON array.
 * @returns A `readonly Merchant[]`.
 *
 * @throws {TransportValidationError} When `value` is not an array, or when any
 *   element fails {@link parseMerchantResponse} validation.
 */
export function parseMerchantsResponse(value: unknown): readonly Merchant[] {
  if (!Array.isArray(value)) {
    throw new TransportValidationError("merchants", "expected array");
  }
  const arr: unknown[] = value;
  return arr.map((item, i) => parseMerchantInternal(item, `merchants[${i}]`));
}

/**
 * Parses the body of a `202 Accepted` analysis endpoint response.
 *
 * @remarks
 * The analysis endpoints (`POST /api/invoices/{id}/analysis` and
 * `POST /api/merchants/{id}/analysis`) return a **bare JSON string** — the Azure
 * queue message id — NOT a JSON object. Any non-string or empty-string value is
 * rejected as an incorrect wire format.
 *
 * @param value - The raw response body (must be a non-empty string).
 * @returns The queue message id string.
 *
 * @throws {TransportValidationError} When `value` is not a non-empty string.
 */
export function parseAnalysisAcceptedResponse(value: unknown): string {
  if (!isNonEmptyString(value)) {
    throw new TransportValidationError(
      "analysisAcceptedResponse",
      "expected a non-empty string (bare JSON queue message id)",
    );
  }
  return value;
}

/**
 * Runs `parser` against `value` and returns a discriminated-union result instead of
 * throwing. Only {@link TransportValidationError} is caught — unexpected programming
 * errors propagate normally.
 *
 * @typeParam T - The type returned by `parser` on success.
 * @param parser - Any parser exported by this module.
 * @param value - The raw JSON value to parse.
 * @returns `{ok: true, value: T}` on success or `{ok: false, error: TransportValidationError}` on failure.
 *
 * @example
 * ```typescript
 * const result = tryParse(parseInvoiceResponse, body);
 * if (!result.ok) {
 *   logger.warn("Malformed invoice response", {path: result.error.path});
 *   return null;
 * }
 * return result.value;
 * ```
 */
export function tryParse<T>(
  parser: (value: unknown) => T,
  value: unknown,
): {ok: true; value: T} | {ok: false; error: TransportValidationError} {
  try {
    return {ok: true, value: parser(value)};
  } catch (err) {
    if (err instanceof TransportValidationError) {
      return {ok: false, error: err};
    }
    throw err;
  }
}
