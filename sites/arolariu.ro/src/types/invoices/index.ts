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
 * // Import runtime values (enums/const objects)
 * import { InvoiceScanType, PaymentType } from "@/types/invoices";
 *
 * // Import DTO payloads for API calls
 * import type { CreateInvoiceDtoPayload } from "@/types/invoices";
 * ```
 *
 * @see {@link Invoice} for the primary aggregate root
 * @see {@link ../DDD} for base entity types
 */

/**
 * EU-14 canonical allergen model, runtime guards, and food-safety assessment types.
 * @see {@link AllergenAssessment} for the structured assessment contract
 */
export {
  AllergenAssessmentStatus,
  AllergenCode,
  AllergenEvidenceLevel,
  ALLERGEN_EVIDENCE_LEVEL_LABEL_KEYS,
  ALLERGEN_LABEL_KEYS,
  getAllergenEvidenceLevelLabelKey,
  getAllergenLabelKey,
  isAllergenAssessment,
  isAllergenCode,
  isAllergenEvidence,
  isAllergenSignal,
  type AllergenAssessment,
  type AllergenEvidence,
  type AllergenSignal,
} from "./Allergen";

/** Canonical taxonomy classification contracts and runtime guards. */
export {
  ClassificationOrigin,
  ClassificationSystem,
  isClassificationOrigin,
  isClassificationSystem,
  isSearchClassificationsInput,
  isTaxonomyArtifact,
  normalizeClassificationSearchQuery,
  resolveClassificationCodeForWrite,
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
 * Analysis profile and capability resolution for the invoice and merchant analysis endpoints.
 * Provides pure functions for resolving profiles into capability sets and building wire-ready request DTOs.
 * @see {@link AnalysisProfile} for the three requestable profiles
 * @see {@link buildAnalysisRequest} for target-correlated request building
 */
export {
  AnalysisProfile,
  INVOICE_CAPABILITY_KEYS,
  MERCHANT_CAPABILITY_KEYS,
  applyInvoiceDependencyClosure,
  buildAnalysisRequest,
  isInvoiceAnalysisCapabilitiesValid,
  isMerchantAnalysisCapabilitiesValid,
  resolveAnalysisCapabilities,
  type AnalysisTarget,
  type InvoiceAnalysisCapabilities,
  type InvoiceAnalysisRequest,
  type MerchantAnalysisCapabilities,
  type MerchantAnalysisRequest,
} from "./Analysis";

/**
 * Merchant (vendor/retailer) types.
 * Shared entities referenced by invoices.
 * @see {@link Merchant} for the merchant entity
 */
export {
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
  type CreateProductDtoPayload,
  type DeleteProductDtoPayload,
  type Product,
  type ProductMetadata,
  type UpdateProductDtoPayload,
} from "./Product";

/**
 * Recipe types for AI-generated cooking suggestions.
 * Generated from invoice product analysis.
 * @see {@link RecipeSuggestion} for the current structured recipe contract
 * @see {@link Recipe} for the legacy recipe structure
 */
export {
  RecipeDifficulty,
  isRecipeDifficulty,
  isRecipeIngredient,
  isRecipeStep,
  isRecipeSuggestion,
  isRecipeText,
  type RecipeIngredient,
  type RecipeStep,
  type RecipeSuggestion,
} from "./Recipe";

/**
 * Runtime transport validation boundary for the invoices bounded context.
 *
 * @remarks
 * Every server action that consumes an invoices API response must route that
 * response through one of these parsers. `as Invoice` casts do NOT validate
 * at runtime — these parsers are the permanent runtime safety net.
 *
 * @see {@link parseInvoiceResponse} for the primary invoice parser
 * @see {@link tryParse} for non-throwing result wrapper
 * @see {@link TransportValidationError} for the error type
 */
export {
  TransportValidationError,
  parseAnalysisAcceptedResponse,
  parseInvoiceResponse,
  parseInvoicesResponse,
  parseMerchantResponse,
  parseMerchantsResponse,
  parseProductResponse,
  parseStandardClassification,
  tryParse,
} from "./transport";
