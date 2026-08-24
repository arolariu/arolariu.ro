/**
 * @fileoverview Public API exports for the invoices bounded context.
 * @module types/invoices
 *
 * @remarks
 * This barrel module exports all public types from the invoices domain,
 * providing a clean API surface for consumers throughout the application.
 *
 * **Domain Structure:**
 * ```
 * Invoice (Aggregate Root)
 * ├── InvoiceScan[] (Document artifacts)
 * ├── PaymentInformation (Value object)
 * ├── Product[] (Line items)
 * │   └── Allergen[] (Food safety)
 * ├── Recipe[] (AI suggestions)
 * └── Merchant (Reference to shared entity)
 * ```
 *
 * **Import Patterns:**
 * ```typescript
 * // Import specific types
 * import type { Invoice, Product } from "@/types/invoices";
 *
 * // Import enums (runtime values)
 * import { InvoiceCategory, ProductCategory } from "@/types/invoices";
 *
 * // Import DTO payloads for API calls
 * import type { CreateInvoiceDtoPayload } from "@/types/invoices";
 * ```
 *
 * @see {@link Invoice} for the primary aggregate root
 * @see {@link ../DDD} for base entity types
 */

/**
 * Allergen types for food safety tracking.
 * @see {@link Allergen} for allergen structure
 */
export type {Allergen, CreateAllergenDtoPayload, DeleteAllergenDtoPayload, UpdateAllergenDtoPayload} from "./Allergen";

/**
 * EU-14 canonical allergen model, runtime guards, and food-safety assessment types.
 * @see {@link AllergenAssessment} for the structured assessment contract
 */
export {
  AllergenAssessmentStatus,
  AllergenCode,
  AllergenEvidenceLevel,
  isAllergenAssessment,
  isAllergenCode,
  isAllergenEvidence,
  isAllergenSignal,
  type AllergenAssessment,
  type AllergenEvidence,
  type AllergenSignal,
} from "./Allergen";

/** Shared runtime type guards for the invoice transport boundary. */
export {hasOnlyKeys, isArrayOf, isBoolean, isFiniteNumber, isNonEmptyString, isRecord} from "./guards";

/** Canonical taxonomy classification contracts and runtime guards. */
export {
  ClassificationOrigin,
  ClassificationSystem,
  isClassificationOrigin,
  isClassificationSystem,
  isSearchClassificationsInput,
  isTaxonomyArtifact,
  normalizeClassificationSearchQuery,
  type ClassificationEvidence,
  type ClassificationNode,
  type ClassificationSearchResult,
  type ClassificationSelection,
  type SearchClassificationsInput,
  type StandardClassification,
  type TaxonomyArtifact,
  type TaxonomyArtifactNode,
} from "./Classification";

/**
 * Invoice aggregate root and related types.
 * The core entity of the invoices bounded context.
 * @see {@link Invoice} for the main entity
 */
export {
  InvoiceAnalysisOptions,
  InvoiceCategory,
  InvoiceScanType,
  type CreateInvoiceDtoPayload,
  type CreateInvoiceScanDtoPayload,
  type DeleteInvoiceDtoPayload,
  type DeleteInvoiceScanDtoPayload,
  type Invoice,
  type InvoiceScan,
  type UpdateInvoiceDtoPayload,
} from "./Invoice";

/**
 * Merchant (vendor/retailer) types.
 * Shared entities referenced by invoices.
 * @see {@link Merchant} for the merchant entity
 */
export {
  MerchantCategory,
  type ContactInformation,
  type CreateMerchantDtoPayload,
  type DeleteMerchantDtoPayload,
  type Merchant,
  type UpdateMerchantDtoPayload,
} from "./Merchant";

/**
 * Payment information value objects.
 * Captures financial transaction details.
 * @see {@link PaymentInformation} for payment structure
 */
export {
  PaymentType,
  type CreatePaymentInformationDtoPayload,
  type DeletePaymentInformationDtoPayload,
  type PaymentDetail,
  type PaymentInformation,
  type TaxDetail,
  type UpdatePaymentInformationDtoPayload,
} from "./Payment";

/**
 * Product (line item) types.
 * Individual purchased items on invoices.
 * @see {@link Product} for product structure
 */
export {
  ProductCategory,
  type CreateProductDtoPayload,
  type DeleteProductDtoPayload,
  type Product,
  type ProductMetadata,
  type UpdateProductDtoPayload,
} from "./Product";

/**
 * Recipe types for AI-generated cooking suggestions.
 * Generated from invoice product analysis.
 * @see {@link Recipe} for recipe structure
 */
export {
  RecipeComplexity,
  type CreateRecipeDtoPayload,
  type DeleteRecipeDtoPayload,
  type Recipe,
  type UpdateRecipeDtoPayload,
} from "./Recipe";
