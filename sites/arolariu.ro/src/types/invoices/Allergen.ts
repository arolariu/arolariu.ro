/**
 * @fileoverview Strict structured allergen-assessment contracts.
 * @module types/invoices/Allergen
 *
 * @remarks
 * These values mirror the API's EU-14 assessment response. An assessment is
 * evidence, not a food-safety certification: neither an empty signal list nor
 * a `noSignals` status means a product is allergen-free.
 */

/**
 * Published outcomes for a completed allergen assessment.
 */
export const AllergenAssessmentStatus = {
  Detected: "detected",
  NoSignals: "noSignals",
  InsufficientData: "insufficientData",
} as const;

/** Union of exact backend allergen-assessment status strings. */
export type AllergenAssessmentStatusValue = (typeof AllergenAssessmentStatus)[keyof typeof AllergenAssessmentStatus];

/**
 * EU Regulation 1169/2011 Annex II (EU-14) allergen codes.
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

/** Union of exact backend EU-14 allergen code strings. */
export type AllergenCodeValue = (typeof AllergenCode)[keyof typeof AllergenCode];

/**
 * Evidence strengths returned for an allergen signal.
 */
export const AllergenEvidenceLevel = {
  Explicit: "explicit",
  Inferred: "inferred",
  Precautionary: "precautionary",
} as const;

/** Union of exact backend allergen-evidence strings. */
export type AllergenEvidenceLevelValue = (typeof AllergenEvidenceLevel)[keyof typeof AllergenEvidenceLevel];

/** One user-readable source fragment supporting a detected signal. */
export interface AllergenEvidence {
  /** Stable source key supplied by the analysis pipeline. */
  readonly source: string;
  /** Source content retained for evidence review. */
  readonly value: string;
}

/** One EU-14 signal with advisory confidence and evidence. */
export interface AllergenSignal {
  /** The EU-14 allergen code. */
  readonly code: AllergenCodeValue;
  /** The strength of available evidence. */
  readonly evidenceLevel: AllergenEvidenceLevelValue;
  /** Bounded advisory confidence from zero through one. */
  readonly confidence: number;
  /** Evidence fragments supporting this signal. */
  readonly evidence: readonly AllergenEvidence[];
}

/**
 * The complete outcome of a product allergen assessment.
 *
 * @remarks
 * `signals` is empty for `noSignals` and `insufficientData`; callers must
 * render `status` rather than deriving a safety claim from the array.
 */
export interface AllergenAssessment {
  /** The explicit assessment outcome. */
  readonly status: AllergenAssessmentStatusValue;
  /** Signals returned when the status is `detected`. */
  readonly signals: readonly AllergenSignal[];
}

const assessmentStatusValues: readonly string[] = Object.values(AllergenAssessmentStatus);
const allergenCodeValues: readonly string[] = Object.values(AllergenCode);
const evidenceLevelValues: readonly string[] = Object.values(AllergenEvidenceLevel);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Determines whether a transport value is an exact allergen-assessment status. */
export function isAllergenAssessmentStatus(value: unknown): value is AllergenAssessmentStatusValue {
  return typeof value === "string" && assessmentStatusValues.includes(value);
}

/** Determines whether a transport value is an exact EU-14 allergen code. */
export function isAllergenCode(value: unknown): value is AllergenCodeValue {
  return typeof value === "string" && allergenCodeValues.includes(value);
}

/** Determines whether a transport value is an exact allergen evidence level. */
export function isAllergenEvidenceLevel(value: unknown): value is AllergenEvidenceLevelValue {
  return typeof value === "string" && evidenceLevelValues.includes(value);
}

/** Determines whether a value is one exact allergen evidence object. */
export function isAllergenEvidence(value: unknown): value is AllergenEvidence {
  return (
    isRecord(value) && hasExactKeys(value, ["source", "value"]) && isNonBlankString(value["source"]) && isNonBlankString(value["value"])
  );
}

/** Determines whether a value is one complete structured allergen signal. */
export function isAllergenSignal(value: unknown): value is AllergenSignal {
  return (
    isRecord(value)
    && hasExactKeys(value, ["code", "evidenceLevel", "confidence", "evidence"])
    && isAllergenCode(value["code"])
    && isAllergenEvidenceLevel(value["evidenceLevel"])
    && typeof value["confidence"] === "number"
    && Number.isFinite(value["confidence"])
    && value["confidence"] >= 0
    && value["confidence"] <= 1
    && Array.isArray(value["evidence"])
    && value["evidence"].every(isAllergenEvidence)
  );
}

/**
 * Determines whether a value is a complete structured allergen assessment.
 *
 * @remarks
 * The API always emits both keys. A detected outcome must contain at least one
 * signal; non-detected outcomes must not contain signals that imply detection.
 */
export function isAllergenAssessment(value: unknown): value is AllergenAssessment {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ["status", "signals"])
    || !isAllergenAssessmentStatus(value["status"])
    || !Array.isArray(value["signals"])
    || !value["signals"].every(isAllergenSignal)
  ) {
    return false;
  }

  return value["status"] === AllergenAssessmentStatus.Detected ? value["signals"].length > 0 : value["signals"].length === 0;
}
