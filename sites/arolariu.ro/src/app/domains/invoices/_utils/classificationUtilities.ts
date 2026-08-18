/**
 * @fileoverview Safe presentation helpers for canonical classifications and allergens.
 * @module app/domains/invoices/_utils/classificationUtilities
 */

import {
  AllergenAssessmentStatus as AllergenStatus,
  AllergenCode as Allergen,
  AllergenEvidenceLevel as AllergenEvidence,
  ClassificationOrigin,
  type AllergenAssessmentStatusValue,
  type AllergenCodeValue,
  type AllergenEvidenceLevelValue,
  type ClassificationNode,
  type StandardClassification,
} from "@/types/invoices";

const allergenLabels: Readonly<Record<AllergenCodeValue, string>> = {
  [Allergen.CerealsContainingGluten]: "Cereals containing gluten",
  [Allergen.Crustaceans]: "Crustaceans",
  [Allergen.Eggs]: "Eggs",
  [Allergen.Fish]: "Fish",
  [Allergen.Peanuts]: "Peanuts",
  [Allergen.Soybeans]: "Soybeans",
  [Allergen.Milk]: "Milk",
  [Allergen.Nuts]: "Nuts",
  [Allergen.Celery]: "Celery",
  [Allergen.Mustard]: "Mustard",
  [Allergen.Sesame]: "Sesame",
  [Allergen.SulphurDioxideAndSulphites]: "Sulphur dioxide and sulphites",
  [Allergen.Lupin]: "Lupin",
  [Allergen.Molluscs]: "Molluscs",
};

const allergenStatusLabels: Readonly<Record<AllergenAssessmentStatusValue, string>> = {
  [AllergenStatus.Detected]: "Signals detected",
  [AllergenStatus.NoSignals]: "No signals in available evidence",
  [AllergenStatus.InsufficientData]: "Insufficient data",
};

const allergenEvidenceLevelLabels: Readonly<Record<AllergenEvidenceLevelValue, string>> = {
  [AllergenEvidence.Explicit]: "Explicit evidence",
  [AllergenEvidence.Inferred]: "Inferred evidence",
  [AllergenEvidence.Precautionary]: "Precautionary evidence",
};

/**
 * Returns the authoritative label for a classification, with an explicit
 * unclassified state rather than an inferred legacy category.
 *
 * @param classification - Canonical classification from the public DTO.
 * @param unclassifiedLabel - Localized fallback for null values.
 * @returns Official label or the localized unclassified label.
 */
export function getClassificationLabel(classification: StandardClassification | null, unclassifiedLabel = "Unclassified"): string {
  return classification?.officialLabel ?? unclassifiedLabel;
}

/**
 * Returns the root node of a canonical classification hierarchy.
 *
 * @param classification - Canonical classification from the public DTO.
 * @returns The root hierarchy node, or null when no classification exists.
 */
export function getClassificationRoot(classification: StandardClassification | null): ClassificationNode | null {
  return classification?.hierarchy[0] ?? null;
}

/**
 * Formats the official label and canonical code for display.
 *
 * @param classification - Canonical classification from the public DTO.
 * @param unclassifiedLabel - Localized fallback for null values.
 * @returns A concise, non-inferred display summary.
 */
export function getClassificationSummary(classification: StandardClassification | null, unclassifiedLabel = "Unclassified"): string {
  return classification === null ? unclassifiedLabel : `${classification.officialLabel} (${classification.code})`;
}

/**
 * Formats bounded analysis confidence without fabricating confidence for manual
 * choices or unavailable analysis data.
 *
 * @param classification - Canonical classification from the public DTO.
 * @returns Rounded percentage, or null when confidence is not valid to show.
 */
export function formatClassificationConfidence(classification: StandardClassification | null): string | null {
  if (
    classification?.origin !== ClassificationOrigin.Analysis
    || classification.confidence === null
    || !Number.isFinite(classification.confidence)
    || classification.confidence < 0
    || classification.confidence > 1
  ) {
    return null;
  }

  return `${Math.round(classification.confidence * 100)}%`;
}

/**
 * Returns a cautious human-readable status label for an allergen assessment.
 *
 * @param status - Exact backend assessment status.
 * @returns A label that never implies a safety guarantee.
 */
export function getAllergenStatusLabel(status: AllergenAssessmentStatusValue): string {
  return allergenStatusLabels[status];
}

/** Returns the human-readable EU-14 allergen label for an exact code. */
export function getAllergenCodeLabel(code: AllergenCodeValue): string {
  return allergenLabels[code];
}

/** Returns the human-readable evidence-strength label for an exact code. */
export function getAllergenEvidenceLevelLabel(evidenceLevel: AllergenEvidenceLevelValue): string {
  return allergenEvidenceLevelLabels[evidenceLevel];
}
