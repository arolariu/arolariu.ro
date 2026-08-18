/**
 * @fileoverview Canonical invoice response and request contracts.
 * @module types/invoices/Invoice
 */

import type {NamedEntity} from "../DDD";
import type {ClassificationSelection, StandardClassification} from "./Classification";
import type {PaymentInformation, PaymentType} from "./Payment";
import type {Product} from "./Product";
import type {RecipeSuggestion} from "./Recipe";

/** Numeric scan values emitted by the current backend transport. */
export const InvoiceScanType = {
  JPG: 0,
  JPEG: 1,
  PNG: 2,
  PDF: 3,
  OTHER: 4,
  UNKNOWN: 5,
  BMP: 6,
  TIFF: 7,
  HEIF: 8,
  HEIC: 9,
} as const;

/** Union of backend scan-type values. */
export type InvoiceScanType = (typeof InvoiceScanType)[keyof typeof InvoiceScanType];

/** An authorized scan reference returned from the public invoice DTO. */
export interface InvoiceScan {
  /** Backend scan type. */
  readonly type: InvoiceScanType;
  /** Authorized scan location. */
  readonly location: string;
}

/** The complete canonical invoice response DTO. */
export interface Invoice extends NamedEntity<string> {
  /** Canonical ECOICOP classification, or null until manually set or analyzed. */
  readonly classification: StandardClassification | null;
  /** Owner user identifier. */
  readonly userIdentifier: string;
  /** Users with explicit read access. */
  readonly sharedWith: readonly string[];
  /** Public scan references. */
  readonly scans: readonly InvoiceScan[];
  /** Complete payment details and currency. */
  readonly paymentInformation: PaymentInformation;
  /** Linked merchant identifier, or the empty GUID when no merchant is linked. */
  readonly merchantReference: string;
  /** Identity-free product lines. */
  readonly items: readonly Product[];
  /** Structured recipe suggestions generated for purchased items. */
  readonly possibleRecipes: readonly RecipeSuggestion[];
  /** Safe scalar metadata; a null value is an explicit empty metadata value. */
  readonly additionalMetadata: Readonly<Record<string, string | null>>;
  /** Receipt type returned by extraction, or an empty string when unknown. */
  readonly receiptType: string;
  /** Extracted country or region, or an empty string when unknown. */
  readonly countryRegion: string;
  /** Structured receipt tax lines. */
  readonly taxDetails: readonly import("./Payment").TaxDetail[];
  /** Structured receipt payment records. */
  readonly payments: readonly import("./Payment").PaymentDetail[];
}

/**
 * Exact PUT invoice payload supported by `UpdateInvoiceRequestDto`.
 *
 * @remarks
 * A null classification clears an unclassified replacement candidate. PATCH
 * has distinct null-as-no-change behavior and should be used for incremental
 * saves.
 */
export interface UpdateInvoiceDtoPayload {
  /** Invoice identifier from the URL path. */
  readonly id: string;
  /** Updated name. */
  readonly name: string;
  /** Updated description. */
  readonly description: string;
  /** Manual ECOICOP selection, or null. */
  readonly classification: ClassificationSelection | null;
  /** Complete replacement payment details. */
  readonly paymentInformation: PaymentInformation;
  /** Merchant ID, or null to clear it on replacement. */
  readonly merchantReference: string | null;
  /** Importance flag. */
  readonly isImportant: boolean;
  /** Optional public metadata replacement. */
  readonly additionalMetadata: Readonly<Record<string, string | number | boolean | null>> | null;
}

/** Minimal scan input retained for the create-invoice request contract. */
export interface CreateInvoiceScanDtoPayload {
  /** Scan type supplied during creation. */
  readonly scanType: InvoiceScanType;
  /** Uploaded scan location. */
  readonly location: string;
  /** Safe scan metadata accepted during creation. */
  readonly metadata: Readonly<Record<string, string>>;
}

/** Current create-invoice request data used by the create flow. */
export interface CreateInvoiceDtoPayload {
  /** User identifier from the authenticated create flow. */
  readonly userIdentifier: string;
  /** First receipt scan. */
  readonly initialScan: CreateInvoiceScanDtoPayload;
  /** Safe creation metadata. */
  readonly metadata: Readonly<Record<string, string>>;
}

/** Invoice deletion action input. */
export type DeleteInvoiceDtoPayload = Readonly<{
  /** Invoice identifier. */
  readonly id: string;
  /** Owner user identifier. */
  readonly userIdentifier: string;
}>;

/** Scan deletion input. */
export type DeleteInvoiceScanDtoPayload = Readonly<{
  /** Scan identifier. */
  readonly id: string;
}>;

/** Payment-type input retained by edit controls. */
export type InvoicePaymentType = PaymentType;
