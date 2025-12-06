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

import type {Allergen} from "./index.ts";

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
 *
 * **Processing Behavior:**
 * - Edited products skip re-analysis to preserve user corrections
 * - Incomplete products are flagged for user attention in the UI
 * - Soft-deleted products are excluded from totals and reports
 *
 * @example
 * ```typescript
 * const metadata: ProductMetadata = {
 *   isEdited: false,
 *   isComplete: true,
 *   isSoftDeleted: false
 * };
 *
 * if (!metadata.isComplete) {
 *   showIncompleteWarning();
 * }
 * ```
 */
export type ProductMetadata = {isEdited: boolean; isComplete: boolean; isSoftDeleted: boolean};

/**
 * Categorizes products by their type for analytics and filtering.
 *
 * @remarks
 * Product categories enable spending breakdowns and dietary tracking.
 * Categories are assigned by AI during invoice analysis or manually by users.
 *
 * **Numeric Values:**
 * Values are spaced by 100 to allow subcategory insertion.
 * `NOT_DEFINED` (0) is the default for unclassified products.
 *
 * **Category Hierarchy:**
 * Future enhancement: Subcategories (e.g., FRUITS_CITRUS = 601)
 *
 * **Health Tracking:**
 * Categories like ALCOHOLIC_BEVERAGES and TOBACCO are flagged
 * separately for health-conscious spending reports.
 *
 * @example
 * ```typescript
 * const product: Product = {
 *   category: ProductCategory.DAIRY,
 *   // ... other properties
 * };
 *
 * // Spending by category
 * const dairySpending = products
 *   .filter(p => p.category === ProductCategory.DAIRY)
 *   .reduce((sum, p) => sum + p.totalPrice, 0);
 * ```
 *
 * @see {@link InvoiceCategory} for invoice-level categorization
 * @see {@link MerchantCategory} for merchant-level categorization
 */
export enum ProductCategory {
  NOT_DEFINED = 0,
  BAKED_GOODS = 100,
  GROCERIES = 200,
  DAIRY = 300,
  MEAT = 400,
  FISH = 500,
  FRUITS = 600,
  VEGETABLES = 700,
  BEVERAGES = 800,
  ALCOHOLIC_BEVERAGES = 900,
  TOBACCO = 1000,
  CLEANING_SUPPLIES = 1100,
  PERSONAL_CARE = 1200,
  MEDICINE = 1300,
  OTHER = 9999,
}

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
 * - `rawName`: Exact text from OCR (e.g., "MLK ZUZU 2% 1L")
 * - `genericName`: Normalized human-readable name (e.g., "Zuzu Milk 2% 1 Liter")
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
 * common allergens. The `detectedAllergens` array is populated
 * automatically and can be manually edited.
 *
 * @example
 * ```typescript
 * const product: Product = {
 *   rawName: "LAPTE ZUZU 2% 1L",
 *   genericName: "Zuzu Milk 2% 1 Liter",
 *   category: ProductCategory.DAIRY,
 *   quantity: 2,
 *   quantityUnit: "pcs",
 *   productCode: "5941234567890",
 *   price: 8.99,
 *   totalPrice: 17.98,
 *   detectedAllergens: [{ name: "Lactose", description: "...", learnMoreAddress: "..." }],
 *   metadata: { isEdited: false, isComplete: true, isSoftDeleted: false }
 * };
 * ```
 *
 * @see {@link ProductCategory} for category options
 * @see {@link Allergen} for allergen structure
 * @see {@link ProductMetadata} for lifecycle state
 */
export interface Product {
  /** The raw name of the product. */
  rawName: string;

  /** The generic name of the product. */
  genericName: string;

  /** The category of the product. */
  category: ProductCategory;

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

  /** The list of detected allergens in the product. */
  detectedAllergens: Allergen[];

  /** The metadata associated with the product. */
  metadata: ProductMetadata;
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
 * For display purposes, at least `rawName` or `genericName`
 * should be provided.
 *
 * **Auto-calculation:**
 * If `price` and `quantity` are provided but `totalPrice` is not,
 * it will be calculated automatically.
 *
 * @example
 * ```typescript
 * const payload: CreateProductDtoPayload = {
 *   rawName: "Apple Fuji 1kg",
 *   category: ProductCategory.FRUITS,
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
 * @remarks
 * **Partial Updates:**
 * Only provided fields are updated. Products are embedded in
 * invoices, so updates go through the invoice update endpoint.
 *
 * **Edit Tracking:**
 * When a product is updated, `metadata.isEdited` is automatically
 * set to `true` to prevent AI re-analysis overwriting user corrections.
 *
 * @example
 * ```typescript
 * const updatePayload: UpdateProductDtoPayload = {
 *   genericName: "Corrected Product Name",
 *   category: ProductCategory.VEGETABLES
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
 * - `rawName`: Exact match on OCR-extracted name
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
 *   rawName: "Product to remove"
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
      /** The raw name of the product. */
      readonly rawName: string;
    }
  | {
      /** The product code of the product. */
      readonly productCode: string;
    };
