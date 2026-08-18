/**
 * @fileoverview Product-line contracts returned by the invoice API.
 * @module types/invoices/Product
 */

import type {AllergenAssessment} from "./Allergen";
import type {ClassificationSelection, StandardClassification} from "./Classification";

/** Lifecycle, completeness, and OCR-confidence metadata for one product. */
export interface ProductMetadata {
  /** Whether a user has edited this product after extraction. */
  readonly isEdited: boolean;
  /** Whether required product fields were completed. */
  readonly isComplete: boolean;
  /** Whether the product is hidden through a soft delete. */
  readonly isSoftDeleted: boolean;
  /** Bounded extraction confidence from zero through one. */
  readonly confidence: number;
}

/**
 * An identity-free line item embedded in an invoice response.
 *
 * @remarks
 * Product identity is intentionally not persisted. Mutations use a transient
 * selector derived from the immutable original commercial snapshot.
 */
export interface Product {
  /** OCR or user-corrected display name. */
  readonly name: string;
  /** Canonical GS1 GPC classification, when one is available. */
  readonly classification: StandardClassification | null;
  /** Purchased quantity. */
  readonly quantity: number;
  /** Unit associated with the purchased quantity. */
  readonly quantityUnit: string;
  /** Barcode, SKU, or empty string when no code is available. */
  readonly productCode: string;
  /** Unit price. */
  readonly price: number;
  /** Receipt line total. */
  readonly totalPrice: number;
  /** Structured assessment outcome, or null before assessment runs. */
  readonly allergenAssessment: AllergenAssessment | null;
  /** Server-owned product lifecycle metadata. */
  readonly metadata: ProductMetadata;
}

/**
 * Identifies one identity-free persisted product for update or delete actions.
 *
 * @remarks
 * A non-empty original product code takes precedence. Without one, the
 * immutable commercial snapshot plus an optional occurrence ordinal selects a
 * duplicate deterministically.
 */
export interface ProductUpdateSelector {
  /** Original barcode or SKU, or null when no product code was available. */
  readonly originalProductCode: string | null;
  /** Original product name used by the composite snapshot. */
  readonly originalName: string | null;
  /** Original purchased quantity used by the composite snapshot. */
  readonly originalQuantity: number | null;
  /** Original unit price used by the composite snapshot. */
  readonly originalUnitPrice: number | null;
  /** Original line total used by the composite snapshot. */
  readonly originalTotalPrice: number | null;
  /** Zero-based duplicate occurrence in invoice collection order. */
  readonly occurrenceOrdinal: number | null;
}

/** Exact client-editable product values accepted by create and update APIs. */
export interface ProductMutation {
  /** Updated display name. */
  readonly name: string;
  /** A changed manual GS1 GPC selection, null to preserve current classification. */
  readonly classification: ClassificationSelection | null;
  /** Updated quantity. */
  readonly quantity: number;
  /** Updated unit. */
  readonly quantityUnit: string;
  /** Updated barcode or SKU. */
  readonly productCode: string;
  /** Updated unit price. */
  readonly price: number;
}

/** Product creation payload supported by the backend. */
export type CreateProductDtoPayload = ProductMutation;

/** Product update payload supported by the backend. */
export type UpdateProductDtoPayload = Readonly<{
  /** Deterministic pre-edit selector. */
  readonly selector: ProductUpdateSelector;
  /** Updated client-editable values. */
  readonly product: ProductMutation;
}>;

/** Product deletion selector supported by the backend. */
export type DeleteProductDtoPayload = ProductUpdateSelector;
