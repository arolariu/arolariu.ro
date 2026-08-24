/**
 * @fileoverview Allergen type definitions for food safety and dietary tracking.
 * @module types/invoices/Allergen
 *
 * @remarks
 * This module defines allergen types used for tracking food allergens in
 * products. Allergens are detected during AI analysis of invoice items and
 * help users identify potentially harmful ingredients.
 *
 * **Regulatory Context:**
 * Allergen tracking aligns with EU Regulation 1169/2011 which mandates
 * declaration of 14 major allergens in food products.
 *
 * **Data Source:**
 * Allergen data is populated through:
 * 1. AI-powered product label analysis
 * 2. Product database lookups (barcode matching)
 * 3. Manual user annotations
 *
 * @see {@link AllergenAssessment} for the current structured EU-14 model
 */

import {hasOnlyKeys, isArrayOf, isFiniteNumber, isNonEmptyString, isRecord} from "./guards";

// ============================================================
// EU-14 Canonical Allergen Model
// ============================================================

/**
 * Canonical EU-14 allergen codes as defined by EU Regulation 1169/2011.
 *
 * @remarks
 * These are the exact wire strings returned by the backend API.
 * Do not substitute informal names (e.g. `"gluten"`) for these values —
 * they will not be accepted by `isAllergenCode`.
 *
 * @example
 * ```typescript
 * const code: AllergenCode = AllergenCode.CerealsContainingGluten;
 * // wire value: "cerealsContainingGluten"
 * ```
 */
export const AllergenCode = {
  CerealsContainingGluten: "cerealsContainingGluten",
  Crustaceans: "crustaceans",
  Eggs: "eggs",
  Fish: "fish",
  Peanuts: "peanuts",
  Soybeans: "soybeans",
  Milk: "milk",
  Nuts: "nuts",
  Celery: "celery",
  Mustard: "mustard",
  Sesame: "sesame",
  SulphurDioxideAndSulphites: "sulphurDioxideAndSulphites",
  Lupin: "lupin",
  Molluscs: "molluscs",
} as const;

/** Union of all 14 canonical EU allergen code wire strings. */
export type AllergenCode = (typeof AllergenCode)[keyof typeof AllergenCode];

/**
 * Confidence levels for allergen evidence produced by the analysis pipeline.
 *
 * @remarks
 * - `explicit` — the allergen was directly named on the product label.
 * - `inferred` — the allergen was inferred from ingredient cross-referencing.
 * - `precautionary` — a "may contain" or cross-contamination warning was found.
 */
export const AllergenEvidenceLevel = {
  Explicit: "explicit",
  Inferred: "inferred",
  Precautionary: "precautionary",
} as const;

/** Union of allergen evidence level values. */
export type AllergenEvidenceLevel = (typeof AllergenEvidenceLevel)[keyof typeof AllergenEvidenceLevel];

/**
 * Possible outcomes of an EU-14 allergen assessment.
 *
 * @remarks
 * `noSignals` means the assessment pipeline ran successfully and found no
 * evidence for the allergen in the available data. It does **NOT** mean the
 * product is safe or allergen-free. Absence of signals is not a safety
 * guarantee — labelling gaps, novel ingredients, and cross-contamination risks
 * may not be captured by the analysis pipeline. The UI must **never** present
 * `noSignals` as a safety certification or an allergen-free claim.
 *
 * `insufficientData` means the pipeline could not determine allergen presence
 * due to a lack of usable evidence (e.g. illegible label, no barcode match).
 *
 * This is a food-safety contract, not decoration.
 */
export const AllergenAssessmentStatus = {
  Detected: "detected",
  NoSignals: "noSignals",
  InsufficientData: "insufficientData",
} as const;

/** Union of allergen assessment status values. */
export type AllergenAssessmentStatus = (typeof AllergenAssessmentStatus)[keyof typeof AllergenAssessmentStatus];

/**
 * One piece of raw evidence that contributed to an allergen signal.
 *
 * @example
 * ```typescript
 * const ev: AllergenEvidence = { source: "productLabel", value: "contains wheat" };
 * ```
 */
export interface AllergenEvidence {
  /** The evidence source (e.g. `"productLabel"`, `"barcodeDatabase"`). */
  readonly source: string;
  /** The raw value extracted from the source. */
  readonly value: string;
}

/**
 * A single allergen signal for one EU-14 allergen code.
 *
 * @remarks
 * Multiple signals may exist for the same allergen code when the pipeline
 * collected evidence from more than one source.
 */
export interface AllergenSignal {
  /** The EU-14 allergen code this signal corresponds to. */
  readonly code: AllergenCode;
  /** The strength of the evidence that raised this signal. */
  readonly evidenceLevel: AllergenEvidenceLevel;
  /** Confidence score in the range [0, 1]. */
  readonly confidence: number;
  /** Raw evidence items that produced this signal. */
  readonly evidence: readonly AllergenEvidence[];
}

/**
 * Complete allergen assessment for one EU-14 allergen code.
 *
 * @remarks
 * Backend invariant (enforced in `AllergenAssessment.cs`):
 * - `status === "detected"` requires at least one signal.
 * - Any other status requires exactly zero signals.
 *
 * `isAllergenAssessment` enforces this invariant at the transport boundary.
 */
export interface AllergenAssessment {
  /** The assessment outcome. */
  readonly status: AllergenAssessmentStatus;
  /** Signals that produced this assessment. Empty unless `status === "detected"`. */
  readonly signals: readonly AllergenSignal[];
}

// --- Guard helpers (module-private) -----------------------------------------------

const allergenCodeValues: readonly string[] = Object.values(AllergenCode);
const allergenEvidenceLevelValues: readonly string[] = Object.values(AllergenEvidenceLevel);
const allergenAssessmentStatusValues: readonly string[] = Object.values(AllergenAssessmentStatus);

// ----------------------------------------------------------------------------------

/**
 * Determines whether a value is one of the 14 canonical EU allergen code strings.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a member of {@link AllergenCode}.
 *
 * @example
 * isAllergenCode("cerealsContainingGluten") // true
 * isAllergenCode("gluten")                  // false — not a canonical wire string
 * isAllergenCode("")                         // false
 */
export function isAllergenCode(value: unknown): value is AllergenCode {
  return typeof value === "string" && allergenCodeValues.includes(value);
}

/**
 * Determines whether a value conforms to {@link AllergenEvidence}.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a plain object with non-empty `source` and `value` strings.
 */
export function isAllergenEvidence(value: unknown): value is AllergenEvidence {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["source", "value"]) &&
    isNonEmptyString(value["source"]) &&
    isNonEmptyString(value["value"])
  );
}

/**
 * Determines whether a value conforms to {@link AllergenSignal}.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` has a valid allergen code, known evidence level,
 *          confidence in [0, 1], and an array of valid evidence items.
 */
export function isAllergenSignal(value: unknown): value is AllergenSignal {
  if (!isRecord(value) || !hasOnlyKeys(value, ["code", "evidenceLevel", "confidence", "evidence"])) {
    return false;
  }
  const evidenceLevel = value["evidenceLevel"];
  const confidence = value["confidence"];
  return (
    isAllergenCode(value["code"]) &&
    typeof evidenceLevel === "string" &&
    allergenEvidenceLevelValues.includes(evidenceLevel) &&
    isFiniteNumber(confidence) &&
    confidence >= 0 &&
    confidence <= 1 &&
    isArrayOf(value["evidence"], isAllergenEvidence)
  );
}

/**
 * Determines whether a value conforms to {@link AllergenAssessment}.
 *
 * @remarks
 * Enforces the backend invariant: `status === "detected"` requires ≥1 signal;
 * any other status requires exactly 0 signals. Values that violate this
 * invariant are rejected even if structurally well-formed.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a structurally valid assessment including
 *          the status/signals count invariant.
 */
export function isAllergenAssessment(value: unknown): value is AllergenAssessment {
  if (!isRecord(value) || !hasOnlyKeys(value, ["status", "signals"])) {
    return false;
  }
  const status = value["status"];
  const signals = value["signals"];
  if (
    typeof status !== "string" ||
    !allergenAssessmentStatusValues.includes(status) ||
    !isArrayOf(signals, isAllergenSignal)
  ) {
    return false;
  }
  const hasSignals = signals.length > 0;
  return status === AllergenAssessmentStatus.Detected ? hasSignals : !hasSignals;
}

// ============================================================
// Legacy types — kept for backward-compat during cutover sweep
// ============================================================

/**
 * Represents a food allergen detected in a product.
 *
 * @deprecated Use {@link AllergenAssessment}. Removed in the final cutover sweep.
 *
 * @remarks
 * Allergens are identified during invoice processing and attached to
 * individual products. Each allergen provides educational information
 * to help users understand potential health impacts.
 *
 * **Common Allergens:**
 * - Gluten (wheat, rye, barley)
 * - Dairy (milk, lactose)
 * - Nuts (peanuts, tree nuts)
 * - Shellfish, eggs, soy, etc.
 *
 * **UI Display:**
 * Allergens are displayed with warning icons in the product detail view.
 * The `learnMoreAddress` links to authoritative health resources.
 *
 * @example
 * ```typescript
 * const glutenAllergen: Allergen = {
 *   name: "Gluten",
 *   description: "Found in wheat, rye, barley, and related grains",
 *   learnMoreAddress: "https://www.who.int/allergens/gluten"
 * };
 *
 * // Check if product contains allergens
 * const hasAllergens = product.detectedAllergens.length > 0;
 * ```
 *
 * @see {@link Product.detectedAllergens} for allergen attachment
 *
 * @remarks
 * Allergens are identified during invoice processing and attached to
 * individual products. Each allergen provides educational information
 * to help users understand potential health impacts.
 *
 * **Common Allergens:**
 * - Gluten (wheat, rye, barley)
 * - Dairy (milk, lactose)
 * - Nuts (peanuts, tree nuts)
 * - Shellfish, eggs, soy, etc.
 *
 * **UI Display:**
 * Allergens are displayed with warning icons in the product detail view.
 * The `learnMoreAddress` links to authoritative health resources.
 *
 * @example
 * ```typescript
 * const glutenAllergen: Allergen = {
 *   name: "Gluten",
 *   description: "Found in wheat, rye, barley, and related grains",
 *   learnMoreAddress: "https://www.who.int/allergens/gluten"
 * };
 *
 * // Check if product contains allergens
 * const hasAllergens = product.detectedAllergens.length > 0;
 * ```
 *
 * @see {@link Product.detectedAllergens} for allergen attachment
 */
export type Allergen = {
  /** The name of the allergen. */
  name: string;

  /** A description of the allergen. */
  description: string;

  /** A URL to learn more about the allergen. */
  learnMoreAddress: string;
};

/**
 * DTO payload for creating a new allergen entry.
 *
 * @deprecated Use {@link AllergenAssessment}. Removed in the final cutover sweep.
 *
 * @remarks
 * **Partial Fields:**
 * All fields are optional during creation as allergens may be
 * partially identified by AI and enriched later.
 *
 * **Validation:**
 * If `learnMoreAddress` is provided, it must be a valid HTTPS URL
 * pointing to a trusted health information source.
 *
 * @example
 * ```typescript
 * const payload: CreateAllergenDtoPayload = {
 *   name: "Peanuts",
 *   description: "Tree nut allergen"
 * };
 * ```
 *
 * @see {@link Allergen} for the created entity structure
 */
export type CreateAllergenDtoPayload = Partial<Allergen>;

/**
 * DTO payload for updating an existing allergen entry.
 *
 * @deprecated Use {@link AllergenAssessment}. Removed in the final cutover sweep.
 *
 * @remarks
 * **Partial Updates:**
 * Only provided fields are updated. Omitted fields retain current values.
 *
 * **Use Cases:**
 * - Correcting AI-detected allergen information
 * - Adding missing descriptions or references
 * - Updating educational resource links
 *
 * @example
 * ```typescript
 * const updatePayload: UpdateAllergenDtoPayload = {
 *   description: "Updated description with more details",
 *   learnMoreAddress: "https://new-resource.example.com"
 * };
 * ```
 *
 * @see {@link Allergen} for the entity structure
 */
export type UpdateAllergenDtoPayload = Partial<Allergen>;

/**
 * DTO payload for deleting an allergen entry.
 *
 * @deprecated Use {@link AllergenAssessment}. Removed in the final cutover sweep.
 *
 * @remarks
 * Allergens are identified by name for deletion since they don't have
 * a separate GUID identifier. The name must exactly match the existing
 * allergen entry (case-sensitive).
 *
 * **Cascade Behavior:**
 * Deleting an allergen removes it from the master list but does NOT
 * remove references from products. Products retain historical allergen
 * data for audit purposes.
 *
 * @example
 * ```typescript
 * const deletePayload: DeleteAllergenDtoPayload = {
 *   name: "Gluten"
 * };
 * ```
 *
 * @see {@link Allergen} for the entity being deleted
 */
export type DeleteAllergenDtoPayload = {
  /** The name of the allergen. */
  readonly name: string;
};
