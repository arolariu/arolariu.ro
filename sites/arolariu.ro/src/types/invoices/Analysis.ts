/**
 * @fileoverview Invoice and merchant analysis capability resolution and request building.
 * @module types/invoices/Analysis
 *
 * @remarks
 * This module provides pure, side-effect-free functions for resolving analysis profiles
 * into flat capability sets and for building wire-ready request DTOs for the backend's
 * invoice and merchant analysis endpoints.
 *
 * All functions in this module are:
 * - **Pure** — no React, no fetch, no side effects.
 * - **Zero-`any`** — TypeScript strict mode throughout.
 * - **TSDoc-documented** — every export carries full TSDoc markup.
 */

// ---------------------------------------------------------------------------
// AnalysisProfile
// ---------------------------------------------------------------------------

/**
 * The three requestable analysis profiles that clients may send to the backend.
 *
 * @remarks
 * The backend also has an internal `"custom"` profile that is derived server-side
 * whenever capability overrides are present in the request. Clients must **never**
 * request `"custom"` directly — use {@link buildInvoiceAnalysisRequest} or
 * {@link buildMerchantAnalysisRequest} which enforce this constraint.
 */
const ANALYSIS_PROFILE = {
  Fast: "fast",
  Balanced: "balanced",
  Comprehensive: "comprehensive",
} as const;

export {ANALYSIS_PROFILE as AnalysisProfile};

/** Union of the three requestable analysis profile string values. */
export type AnalysisProfile = (typeof ANALYSIS_PROFILE)[keyof typeof ANALYSIS_PROFILE];

// ---------------------------------------------------------------------------
// Capability interfaces
// ---------------------------------------------------------------------------

/**
 * Complete flat capability set for an invoice analysis request.
 *
 * @remarks
 * All boolean fields default to `false` for any disabled capability.
 * `maximumRecipes` must be `0` when `recipeGeneration` is `false` and `1–3`
 * when `recipeGeneration` is `true`. Use {@link applyInvoiceDependencyClosure}
 * to enforce dependency invariants before building the request.
 */
export interface InvoiceAnalysisCapabilities {
  /** Extract raw text and structure from the invoice document. */
  readonly documentExtraction: boolean;
  /** Generate a human-readable summary of the invoice. */
  readonly invoiceSummary: boolean;
  /** Classify each product line item into a canonical taxonomy. */
  readonly productClassification: boolean;
  /** Identify allergens present in classified products. Requires `productClassification`. */
  readonly allergenAssessment: boolean;
  /** Assign the invoice to a business category. Requires `documentExtraction` and `productClassification`. */
  readonly invoiceClassification: boolean;
  /** Generate recipe suggestions from classified products. Requires `productClassification` and `allergenAssessment`. */
  readonly recipeGeneration: boolean;
  /** Maximum number of recipes to generate (1–3). Must be `0` when `recipeGeneration` is `false`. */
  readonly maximumRecipes: number;
}

/**
 * Complete flat capability set for a merchant analysis request.
 *
 * @remarks
 * All fields default to `false` for disabled capabilities.
 */
export interface MerchantAnalysisCapabilities {
  /** Assign the merchant to a canonical category. */
  readonly merchantClassification: boolean;
  /** Generate a descriptive text passage about the merchant. */
  readonly descriptionGeneration: boolean;
}

// ---------------------------------------------------------------------------
// Request interfaces
// ---------------------------------------------------------------------------

/**
 * Wire-ready invoice analysis request DTO sent to the backend.
 *
 * @remarks
 * All capability fields are optional overrides relative to the preset defined
 * by `profile`. Fields absent from the body use the backend's preset defaults.
 * `maximumRecipes` is omitted entirely when `recipeGeneration` is not requested.
 */
export interface InvoiceAnalysisRequest {
  /** The base analysis profile to use. Never `"custom"`. */
  readonly profile: AnalysisProfile;
  /** Override: extract document structure. */
  readonly documentExtraction?: boolean;
  /** Override: generate invoice summary. */
  readonly invoiceSummary?: boolean;
  /** Override: classify product line items. */
  readonly productClassification?: boolean;
  /** Override: assess allergens in products. */
  readonly allergenAssessment?: boolean;
  /** Override: classify the invoice itself. */
  readonly invoiceClassification?: boolean;
  /** Override: generate recipe suggestions. */
  readonly recipeGeneration?: boolean;
  /** Override: maximum number of recipes (1–3). Omitted when `recipeGeneration` is not requested. */
  readonly maximumRecipes?: number;
}

/**
 * Wire-ready merchant analysis request DTO sent to the backend.
 *
 * @remarks
 * All capability fields are optional overrides relative to the preset defined
 * by `profile`. Fields absent from the body use the backend's preset defaults.
 */
export interface MerchantAnalysisRequest {
  /** The base analysis profile to use. Never `"custom"`. */
  readonly profile: AnalysisProfile;
  /** Override: classify the merchant. */
  readonly merchantClassification?: boolean;
  /** Override: generate merchant description. */
  readonly descriptionGeneration?: boolean;
}

// ---------------------------------------------------------------------------
// Capability key tuples (enables UI to iterate without a second hard-coded list)
// ---------------------------------------------------------------------------

/**
 * Ordered tuple of every boolean capability key in {@link InvoiceAnalysisCapabilities}.
 *
 * @remarks
 * Use this tuple to build capability UIs, diff objects, or serialise requests
 * without duplicating the key names in calling code.
 */
export const INVOICE_CAPABILITY_KEYS = [
  "documentExtraction",
  "invoiceSummary",
  "productClassification",
  "allergenAssessment",
  "invoiceClassification",
  "recipeGeneration",
] as const satisfies readonly (keyof Omit<InvoiceAnalysisCapabilities, "maximumRecipes">)[];

/** Element type of {@link INVOICE_CAPABILITY_KEYS}. */
type InvoiceCapabilityKey = (typeof INVOICE_CAPABILITY_KEYS)[number];

/**
 * Ordered tuple of every boolean capability key in {@link MerchantAnalysisCapabilities}.
 *
 * @remarks
 * Use this tuple to build capability UIs or diff objects without duplicating
 * the key names in calling code.
 */
export const MERCHANT_CAPABILITY_KEYS = [
  "merchantClassification",
  "descriptionGeneration",
] as const satisfies readonly (keyof MerchantAnalysisCapabilities)[];

/** Element type of {@link MERCHANT_CAPABILITY_KEYS}. */
type MerchantCapabilityKey = (typeof MERCHANT_CAPABILITY_KEYS)[number];

// ---------------------------------------------------------------------------
// Internal preset maps
// ---------------------------------------------------------------------------

/** Full resolved capability shapes keyed by profile. Defined once to avoid duplication. */
const INVOICE_PRESETS: Readonly<Record<AnalysisProfile, InvoiceAnalysisCapabilities>> = {
  fast: {
    documentExtraction: true,
    invoiceSummary: false,
    productClassification: true,
    allergenAssessment: false,
    invoiceClassification: true,
    recipeGeneration: false,
    maximumRecipes: 0,
  },
  balanced: {
    documentExtraction: true,
    invoiceSummary: true,
    productClassification: true,
    allergenAssessment: true,
    invoiceClassification: true,
    recipeGeneration: false,
    maximumRecipes: 0,
  },
  comprehensive: {
    documentExtraction: true,
    invoiceSummary: true,
    productClassification: true,
    allergenAssessment: true,
    invoiceClassification: true,
    recipeGeneration: true,
    maximumRecipes: 3,
  },
};

/** Full resolved capability shapes keyed by profile for merchants. */
const MERCHANT_PRESETS: Readonly<Record<AnalysisProfile, MerchantAnalysisCapabilities>> = {
  fast: {merchantClassification: true, descriptionGeneration: false},
  balanced: {merchantClassification: true, descriptionGeneration: true},
  comprehensive: {merchantClassification: true, descriptionGeneration: true},
};

// ---------------------------------------------------------------------------
// Profile resolution
// ---------------------------------------------------------------------------

/**
 * Resolves an {@link AnalysisProfile} into its full {@link InvoiceAnalysisCapabilities} preset.
 *
 * @param profile - The requestable analysis profile to resolve.
 * @returns The complete capability set for the given profile, with all boolean
 *   fields and `maximumRecipes` explicitly set.
 *
 * @example
 * ```typescript
 * const caps = resolveInvoiceCapabilities("fast");
 * // { documentExtraction: true, invoiceSummary: false, ... }
 * ```
 */
export function resolveInvoiceCapabilities(profile: AnalysisProfile): InvoiceAnalysisCapabilities {
  return INVOICE_PRESETS[profile];
}

/**
 * Resolves an {@link AnalysisProfile} into its full {@link MerchantAnalysisCapabilities} preset.
 *
 * @param profile - The requestable analysis profile to resolve.
 * @returns The complete capability set for the given profile.
 *
 * @example
 * ```typescript
 * const caps = resolveMerchantCapabilities("comprehensive");
 * // { merchantClassification: true, descriptionGeneration: true }
 * ```
 */
export function resolveMerchantCapabilities(profile: AnalysisProfile): MerchantAnalysisCapabilities {
  return MERCHANT_PRESETS[profile];
}

// ---------------------------------------------------------------------------
// Dependency closure
// ---------------------------------------------------------------------------

/**
 * Enforces the backend's capability dependency rules and returns a new, valid
 * {@link InvoiceAnalysisCapabilities} object.
 *
 * @param capabilities - The input capabilities (may violate dependency rules).
 * @returns A new capabilities object with all required dependencies satisfied:
 *   - `allergenAssessment` pulls in `productClassification`.
 *   - `invoiceClassification` pulls in `documentExtraction` and `productClassification`.
 *   - `recipeGeneration` pulls in `productClassification` and `allergenAssessment`.
 *   - `maximumRecipes` is clamped to `[1, 3]` when `recipeGeneration` is on,
 *     or zeroed when it is off.
 *
 * @remarks
 * This function is **pure** and **idempotent**: applying it twice to the same
 * input always produces the same output.
 *
 * @example
 * ```typescript
 * const closed = applyInvoiceDependencyClosure({
 *   ...resolveInvoiceCapabilities("fast"),
 *   allergenAssessment: true,
 * });
 * // closed.productClassification === true (pulled in by allergenAssessment)
 * ```
 */
export function applyInvoiceDependencyClosure(capabilities: InvoiceAnalysisCapabilities): InvoiceAnalysisCapabilities {
  const {invoiceSummary, invoiceClassification, recipeGeneration} = capabilities;
  let {documentExtraction, productClassification, allergenAssessment, maximumRecipes} = capabilities;

  // recipeGeneration requires productClassification AND allergenAssessment
  if (recipeGeneration) {
    productClassification = true;
    allergenAssessment = true;
  }

  // allergenAssessment requires productClassification
  if (allergenAssessment) {
    productClassification = true;
  }

  // invoiceClassification requires documentExtraction AND productClassification
  if (invoiceClassification) {
    documentExtraction = true;
    productClassification = true;
  }

  // Enforce maximumRecipes bounds
  if (recipeGeneration) {
    maximumRecipes = Math.min(3, Math.max(1, maximumRecipes));
  } else {
    maximumRecipes = 0;
  }

  return {
    documentExtraction,
    invoiceSummary,
    productClassification,
    allergenAssessment,
    invoiceClassification,
    recipeGeneration,
    maximumRecipes,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Determines whether an {@link InvoiceAnalysisCapabilities} set is valid, i.e.,
 * at least one capability is enabled.
 *
 * @param capabilities - The capability set to validate.
 * @returns `true` when at least one boolean capability is `true`; `false` when
 *   all capabilities are disabled (the backend would reject such a request).
 */
export function isInvoiceAnalysisCapabilitiesValid(capabilities: InvoiceAnalysisCapabilities): boolean {
  return INVOICE_CAPABILITY_KEYS.some((key) => capabilities[key]);
}

/**
 * Determines whether a {@link MerchantAnalysisCapabilities} set is valid, i.e.,
 * at least one capability is enabled.
 *
 * @param capabilities - The capability set to validate.
 * @returns `true` when at least one boolean capability is `true`; `false` when
 *   all capabilities are disabled.
 */
export function isMerchantAnalysisCapabilitiesValid(capabilities: MerchantAnalysisCapabilities): boolean {
  return MERCHANT_CAPABILITY_KEYS.some((key) => capabilities[key]);
}

// ---------------------------------------------------------------------------
// Request builders
// ---------------------------------------------------------------------------

/**
 * Builds a wire-ready {@link InvoiceAnalysisRequest} from a base profile and optional
 * capability overrides.
 *
 * @param profile - The requestable base profile to use. This value is always
 *   emitted as-is; it is never changed to `"custom"`.
 * @param overrides - Optional partial capability overrides relative to the
 *   profile preset. When omitted or empty, returns the minimal legal body
 *   `{ profile }` with no extra fields.
 * @returns The smallest legal request body: `{ profile }` when there are no
 *   effective differences from the preset, or `{ profile, ...diffFields }` when
 *   overrides shift one or more capabilities away from their preset values.
 *
 * @remarks
 * When `overrides` are present the effective capability set is computed as:
 * ```
 * applyInvoiceDependencyClosure({ ...resolveInvoiceCapabilities(profile), ...overrides })
 * ```
 * Only fields that **differ from the preset** are included in the emitted body.
 * `maximumRecipes` is emitted only when the effective `recipeGeneration` is `true`
 * and its effective value differs from the preset value.
 *
 * The returned object never contains legacy fields that are no longer part of
 * the analysis contract.
 *
 * The `profile` field is always the requestable base profile passed in as an
 * argument. The backend derives an internal `"custom"` profile server-side
 * when capability overrides are detected; clients must **never** request
 * `"custom"` directly.
 *
 * @example
 * ```typescript
 * buildInvoiceAnalysisRequest("balanced");
 * // { profile: "balanced" }
 *
 * buildInvoiceAnalysisRequest("fast", { invoiceSummary: true });
 * // { profile: "fast", invoiceSummary: true }
 * ```
 */
export function buildInvoiceAnalysisRequest(
  profile: AnalysisProfile,
  overrides?: Partial<InvoiceAnalysisCapabilities>,
): InvoiceAnalysisRequest {
  // No overrides (or empty overrides) → smallest legal body
  if (overrides === undefined || Object.keys(overrides).length === 0) {
    return {profile};
  }

  const preset = resolveInvoiceCapabilities(profile);
  const effective = applyInvoiceDependencyClosure({...preset, ...overrides});

  // Collect only boolean capability fields that differ from the preset
  const diffBooleans: Partial<Record<InvoiceCapabilityKey, boolean>> = {};
  for (const key of INVOICE_CAPABILITY_KEYS) {
    if (effective[key] !== preset[key]) {
      diffBooleans[key] = effective[key];
    }
  }

  // Include maximumRecipes only when recipeGeneration is on and differs from preset
  const maxRecipesField: {readonly maximumRecipes?: number} =
    effective.recipeGeneration && effective.maximumRecipes !== preset.maximumRecipes ? {maximumRecipes: effective.maximumRecipes} : {};

  return {profile, ...diffBooleans, ...maxRecipesField};
}

/**
 * Builds a wire-ready {@link MerchantAnalysisRequest} from a base profile and optional
 * capability overrides.
 *
 * @param profile - The requestable base profile to use. This value is always
 *   emitted as-is; it is never changed to `"custom"`.
 * @param overrides - Optional partial capability overrides relative to the
 *   profile preset. When omitted or empty, returns the minimal legal body
 *   `{ profile }` with no extra fields.
 * @returns The smallest legal request body: `{ profile }` when there are no
 *   effective differences from the preset, or `{ profile, ...diffFields }` when
 *   overrides shift one or more capabilities away from their preset values.
 *
 * @remarks
 * The returned object never contains legacy fields that are no longer part of
 * the analysis contract.
 *
 * The `profile` field is always the requestable base profile passed in.
 * The backend derives an internal `"custom"` profile server-side when
 * capability overrides are detected; clients must **never** request
 * `"custom"` directly.
 *
 * @example
 * ```typescript
 * buildMerchantAnalysisRequest("fast");
 * // { profile: "fast" }
 *
 * buildMerchantAnalysisRequest("fast", { descriptionGeneration: true });
 * // { profile: "fast", descriptionGeneration: true }
 * ```
 */
export function buildMerchantAnalysisRequest(
  profile: AnalysisProfile,
  overrides?: Partial<MerchantAnalysisCapabilities>,
): MerchantAnalysisRequest {
  // No overrides (or empty overrides) → smallest legal body
  if (overrides === undefined || Object.keys(overrides).length === 0) {
    return {profile};
  }

  const preset = resolveMerchantCapabilities(profile);

  // Collect only capability fields that differ from the preset
  const diffFields: Partial<Record<MerchantCapabilityKey, boolean>> = {};
  for (const key of MERCHANT_CAPABILITY_KEYS) {
    const overrideValue: boolean | undefined = overrides[key];
    if (overrideValue !== undefined && overrideValue !== preset[key]) {
      diffFields[key] = overrideValue;
    }
  }

  return {profile, ...diffFields};
}
