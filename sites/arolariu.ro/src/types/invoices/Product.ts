/**
 * @fileoverview Product type definitions for invoice line items.
 * @module types/invoices/Product
 *
 * @remarks
 * This module defines product (line item) types representing individual
 * items purchased on an invoice. Products are the most granular level
 * of transaction data, enabling detailed spending analytics.
 *
 * **Data Extraction:**
 * Product data is extracted from invoice scans via:
 * 1. OCR text recognition
 * 2. AI entity extraction (names, prices, quantities)
 * 3. Barcode/product code lookups
 * 4. Manual user corrections
 *
 * **Product Enrichment:**
 * Raw OCR names are enriched with:
 * - Generic names (e.g., "MLK 2% 1L" → "Milk 2% 1 Liter")
 * - Category classification
 * - Allergen detection
 * - Nutritional information (future)
 *
 * @see {@link Invoice.items} for product attachment to invoices
 * @see {@link Allergen} for allergen information
 */

import type {AllergenAssessment, StandardClassification} from "./index.ts";

/**
 * Tracks the editing and lifecycle state of a product.
 *
 * @remarks
 * Metadata flags control product visibility and processing behavior.
 *
 * **Flag Meanings:**
 * - `isEdited`: User has manually modified AI-extracted data
 * - `isComplete`: All required fields have been populated
 * - `isSoftDeleted`: Product is hidden but retained for analytics
 * - `confidence`: OCR confidence score (0.0 to 1.0), zero when unavailable
 *
 * **Processing Behavior:**
 * - Edited products skip re-analysis to preserve user corrections
 * - Incomplete products are flagged for user attention in the UI
 * - Soft-deleted products are excluded from totals and reports
 * - Low confidence products may require manual review
 *
 * @example
 * ```typescript
 * const metadata: ProductMetadata = {
 *   isEdited: false,
 *   isComplete: true,
 *   isSoftDeleted: false,
 *   confidence: 0.95
 * };
 *
 * if (!metadata.isComplete) {
 *   showIncompleteWarning();
 * }
 *
 * if (metadata.confidence < 0.7) {
 *   flagForManualReview();
 * }
 * ```
 */
export type ProductMetadata = {
  /** Whether the product has been user-modified post-ingestion. */
  isEdited: boolean;
  /** Whether required enrichment steps have completed. */
  isComplete: boolean;
  /** Logical deletion marker (soft delete). */
  isSoftDeleted: boolean;
  /** OCR confidence score (0.0 to 1.0). Zero when not available. */
  confidence: number;
};

/**
 * Represents a line item product on an invoice.
 *
 * @remarks
 * **Domain Concept:**
 * Products are value objects embedded within the Invoice aggregate.
 * They capture individual purchase items with pricing, quantity, and
 * enrichment data.
 *
 * **Naming:**
 * - `name`: Human-readable product name (e.g., "Zuzu Milk 2% 1 Liter")
 *
 * **Pricing Invariant:**
 * `totalPrice` should equal `price * quantity` within rounding tolerance.
 * Discrepancies may indicate coupon usage or pricing errors.
 *
 * **Product Identification:**
 * - `productCode`: Barcode (EAN-13, UPC-A) when available
 * - Used for product database lookups and enrichment
 * - Empty string if not detected
 *
 * **Allergen Detection:**
 * AI analysis scans product names and database matches to identify
 * common allergens. The `allergenAssessment` field captures structured EU-14
 * allergen results.
 *
 * @example
 * ```typescript
 * const product: Product = {
 *   name: "Zuzu Milk 2% 1 Liter",
 *   quantity: 2,
 *   quantityUnit: "pcs",
 *   productCode: "5941234567890",
 *   price: 8.99,
 *   totalPrice: 17.98,
 *   classification: null,
 *   allergenAssessment: null,
 *   metadata: { isEdited: false, isComplete: true, isSoftDeleted: false, confidence: 0.95 }
 * };
 * ```
 *
 * @see {@link ProductMetadata} for lifecycle state
 */
export interface Product {
  /** The name of the product. */
  name: string;

  /** The quantity of the product. */
  quantity: number;

  /** The unit of measurement for the product quantity. */
  quantityUnit: string;

  /** The product code (e.g., barcode) of the product. */
  productCode: string;

  /** The unit price of the product. */
  price: number;

  /** The total price of the product (price * quantity). */
  totalPrice: number;

  /** The metadata associated with the product. */
  metadata: ProductMetadata;

  /**
   * The standard taxonomy classification for this product.
   * @remarks Expected system is GS1 GPC or ECOICOP v2. Null when the product has not been classified.
   */
  classification: StandardClassification | null;

  /**
   * Structured EU-14 allergen assessment for this product.
   * @remarks Null when the allergen assessment pipeline has not run for this product.
   */
  allergenAssessment: AllergenAssessment | null;
}

/**
 * DTO payload for creating a new product entry.
 *
 * @remarks
 * **Partial Fields:**
 * All fields are optional as products may be incrementally
 * populated during AI extraction or manual entry.
 *
 * **Minimum Viable Product:**
 * For display purposes, at least `name` should be provided.
 *
 * **Auto-calculation:**
 * If `price` and `quantity` are provided but `totalPrice` is not,
 * it will be calculated automatically.
 *
 * @example
 * ```typescript
 * const payload: CreateProductDtoPayload = {
 *   name: "Apple Fuji 1kg",
 *   quantity: 1,
 *   price: 12.50
 * };
 * ```
 *
 * @see {@link Product} for the entity structure
 */
export type CreateProductDtoPayload = Partial<Product>;

/**
 * DTO payload for updating an existing product.
 *
 * @example
 * ```typescript
 * const updatePayload: UpdateProductDtoPayload = {
 *   name: "Corrected Product Name"
 * };
 * ```
 *
 * @see {@link Product} for the entity structure
 */
export type UpdateProductDtoPayload = Partial<Product>;

/**
 * DTO payload for removing a product from an invoice.
 *
 * @remarks
 * **Identification:**
 * Products can be identified by either:
 * - `name`: Case-insensitive substring match on product name
 * - `productCode`: Barcode identifier
 *
 * **Soft Delete:**
 * Products are soft-deleted by setting `metadata.isSoftDeleted = true`.
 * They remain in the data for audit purposes but are excluded from
 * totals and reports.
 *
 * **Recalculation:**
 * After deletion, invoice totals are automatically recalculated.
 *
 * @example
 * ```typescript
 * // Delete by name
 * const deleteByName: DeleteProductDtoPayload = {
 *   name: "Product to remove"
 * };
 *
 * // Delete by barcode
 * const deleteByCode: DeleteProductDtoPayload = {
 *   productCode: "5941234567890"
 * };
 * ```
 *
 * @see {@link Product} for the entity being deleted
 */
export type DeleteProductDtoPayload =
  | {
      /** The name of the product. */
      readonly name: string;
    }
  | {
      /** The product code of the product. */
      readonly productCode: string;
    };
