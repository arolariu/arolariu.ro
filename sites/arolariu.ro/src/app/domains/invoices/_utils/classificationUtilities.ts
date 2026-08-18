/**
 * @fileoverview Safe presentation helpers for canonical classifications and allergens.
 * @module app/domains/invoices/_utils/classificationUtilities
 */

import {ClassificationOrigin, type ClassificationNode, type StandardClassification} from "@/types/invoices";

/**
 * Returns the authoritative label for a classification, with an explicit
 * unclassified state rather than an inferred legacy category.
 *
 * @param classification - Canonical classification from the public DTO.
 * @param unclassifiedLabel - Localized fallback for null values.
 * @returns Official label or the localized unclassified label.
 */
export function getClassificationLabel(classification: StandardClassification | null, unclassifiedLabel: string): string {
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
export function getClassificationSummary(classification: StandardClassification | null, unclassifiedLabel: string): string {
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
