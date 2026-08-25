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

import {hasOnlyKeys, isArrayOf, isFiniteNumber, isNonEmptyString, isRecord} from "../guards";

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
const ALLERGEN_CODE = {
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

export {ALLERGEN_CODE as AllergenCode};

/** Union of all 14 canonical EU allergen code wire strings. */
export type AllergenCode = (typeof ALLERGEN_CODE)[keyof typeof ALLERGEN_CODE];

/**
 * Confidence levels for allergen evidence produced by the analysis pipeline.
 *
 * @remarks
 * - `explicit` — the allergen was directly named on the product label.
 * - `inferred` — the allergen was inferred from ingredient cross-referencing.
 * - `precautionary` — a "may contain" or cross-contamination warning was found.
 */
const ALLERGEN_EVIDENCE_LEVEL = {
  Explicit: "explicit",
  Inferred: "inferred",
  Precautionary: "precautionary",
} as const;

export {ALLERGEN_EVIDENCE_LEVEL as AllergenEvidenceLevel};

/** Union of allergen evidence level values. */
export type AllergenEvidenceLevel = (typeof ALLERGEN_EVIDENCE_LEVEL)[keyof typeof ALLERGEN_EVIDENCE_LEVEL];

/**
 * Maps each EU-14 allergen code to its fully-qualified next-intl message key.
 *
 * @remarks
 * The mapping lives with the canonical allergen contract so UI consumers do
 * not maintain duplicate code-to-label tables.
 */
export const ALLERGEN_LABEL_KEYS = {
  [ALLERGEN_CODE.CerealsContainingGluten]: "allergens.codes.cerealsContainingGluten",
  [ALLERGEN_CODE.Crustaceans]: "allergens.codes.crustaceans",
  [ALLERGEN_CODE.Eggs]: "allergens.codes.eggs",
  [ALLERGEN_CODE.Fish]: "allergens.codes.fish",
  [ALLERGEN_CODE.Peanuts]: "allergens.codes.peanuts",
  [ALLERGEN_CODE.Soybeans]: "allergens.codes.soybeans",
  [ALLERGEN_CODE.Milk]: "allergens.codes.milk",
  [ALLERGEN_CODE.Nuts]: "allergens.codes.nuts",
  [ALLERGEN_CODE.Celery]: "allergens.codes.celery",
  [ALLERGEN_CODE.Mustard]: "allergens.codes.mustard",
  [ALLERGEN_CODE.Sesame]: "allergens.codes.sesame",
  [ALLERGEN_CODE.SulphurDioxideAndSulphites]: "allergens.codes.sulphurDioxideAndSulphites",
  [ALLERGEN_CODE.Lupin]: "allergens.codes.lupin",
  [ALLERGEN_CODE.Molluscs]: "allergens.codes.molluscs",
} as const satisfies Record<AllergenCode, string>;

/**
 * Maps allergen evidence levels to fully-qualified next-intl message keys.
 */
export const ALLERGEN_EVIDENCE_LEVEL_LABEL_KEYS = {
  [ALLERGEN_EVIDENCE_LEVEL.Explicit]: "allergens.evidenceLevels.explicit",
  [ALLERGEN_EVIDENCE_LEVEL.Inferred]: "allergens.evidenceLevels.inferred",
  [ALLERGEN_EVIDENCE_LEVEL.Precautionary]: "allergens.evidenceLevels.precautionary",
} as const satisfies Record<AllergenEvidenceLevel, string>;

/**
 * Returns the localized-message key for an EU-14 allergen code.
 *
 * @param code - One of the 14 canonical allergen codes.
 * @returns The fully-qualified next-intl message key.
 */
export function getAllergenLabelKey(code: AllergenCode): string {
  return ALLERGEN_LABEL_KEYS[code];
}

/**
 * Returns the localized-message key for an allergen evidence level.
 *
 * @param evidenceLevel - The evidence level to describe.
 * @returns The fully-qualified next-intl message key.
 */
export function getAllergenEvidenceLevelLabelKey(evidenceLevel: AllergenEvidenceLevel): string {
  return ALLERGEN_EVIDENCE_LEVEL_LABEL_KEYS[evidenceLevel];
}

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
const ALLERGEN_ASSESSMENT_STATUS = {
  Detected: "detected",
  NoSignals: "noSignals",
  InsufficientData: "insufficientData",
} as const;

export {ALLERGEN_ASSESSMENT_STATUS as AllergenAssessmentStatus};

/** Union of allergen assessment status values. */
export type AllergenAssessmentStatus = (typeof ALLERGEN_ASSESSMENT_STATUS)[keyof typeof ALLERGEN_ASSESSMENT_STATUS];

/**
 * One piece of raw evidence that contributed to an allergen signal.
 *
 * @example
 * ```typescript
 * const ev: AllergenEvidence = { source: "productLabel", value: "contains wheat" };
 * ```
 */
export type AllergenEvidence = {
  /** The evidence source (e.g. `"productLabel"`, `"barcodeDatabase"`). */
  readonly source: string;
  /** The raw value extracted from the source. */
  readonly value: string;
};

/**
 * A single allergen signal for one EU-14 allergen code.
 *
 * @remarks
 * Multiple signals may exist for the same allergen code when the pipeline
 * collected evidence from more than one source.
 */
export type AllergenSignal = {
  /** The EU-14 allergen code this signal corresponds to. */
  readonly code: AllergenCode;
  /** The strength of the evidence that raised this signal. */
  readonly evidenceLevel: AllergenEvidenceLevel;
  /** Confidence score in the range [0, 1]. */
  readonly confidence: number;
  /** Raw evidence items that produced this signal. */
  readonly evidence: readonly AllergenEvidence[];
};

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
export type AllergenAssessment = {
  /** The assessment outcome. */
  readonly status: AllergenAssessmentStatus;
  /** Signals that produced this assessment. Empty unless `status === "detected"`. */
  readonly signals: readonly AllergenSignal[];
};

// --- Guard helpers (module-private) -----------------------------------------------

const allergenCodeValues: readonly string[] = Object.values(ALLERGEN_CODE);
const allergenEvidenceLevelValues: readonly string[] = Object.values(ALLERGEN_EVIDENCE_LEVEL);
const allergenAssessmentStatusValues: readonly string[] = Object.values(ALLERGEN_ASSESSMENT_STATUS);

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
    isRecord(value) && hasOnlyKeys(value, ["source", "value"]) && isNonEmptyString(value["source"]) && isNonEmptyString(value["value"])
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
  const {confidence, evidenceLevel} = value;
  return (
    isAllergenCode(value["code"])
    && typeof evidenceLevel === "string"
    && allergenEvidenceLevelValues.includes(evidenceLevel)
    && isFiniteNumber(confidence)
    && confidence >= 0
    && confidence <= 1
    && isArrayOf(value["evidence"], isAllergenEvidence)
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
  const {signals, status} = value;
  if (typeof status !== "string" || !allergenAssessmentStatusValues.includes(status) || !isArrayOf(signals, isAllergenSignal)) {
    return false;
  }
  const hasSignals = signals.length > 0;
  return status === ALLERGEN_ASSESSMENT_STATUS.Detected ? hasSignals : !hasSignals;
}
