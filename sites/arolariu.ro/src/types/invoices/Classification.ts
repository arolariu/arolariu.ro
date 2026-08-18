/**
 * @fileoverview Runtime-safe taxonomy classification contracts for invoices.
 * @module types/invoices/Classification
 *
 * @remarks
 * These contracts mirror the canonical classification values exchanged with the
 * invoice analysis API and the generated taxonomy artifacts. Runtime guards keep
 * untrusted JSON from being treated as a domain classification.
 */

import {isStrictRfc3339Timestamp} from "./transportValidation";

/**
 * Supported canonical taxonomy systems.
 */
export const ClassificationSystem = {
  Gs1Gpc: "GS1_GPC",
  EcoicopV2: "ECOICOP_V2",
  Nace21: "NACE_2_1",
} as const;

const classificationSystemValues: readonly string[] = Object.values(ClassificationSystem);

/**
 * Union of canonical taxonomy-system values.
 */
export type ClassificationSystem = (typeof ClassificationSystem)[keyof typeof ClassificationSystem];

/**
 * Represents the source that assigned a canonical classification.
 */
export const ClassificationOrigin = {
  Analysis: "Analysis",
  Manual: "Manual",
} as const;

const classificationOriginValues: readonly string[] = Object.values(ClassificationOrigin);

/**
 * Union of classification-origin values.
 */
export type ClassificationOrigin = (typeof ClassificationOrigin)[keyof typeof ClassificationOrigin];

/**
 * Represents a caller-selected taxonomy system and code.
 */
export interface ClassificationSelection {
  /** The taxonomy system containing the selected code. */
  readonly system: ClassificationSystem;
  /** The canonical taxonomy code. */
  readonly code: string;
}

/**
 * Reduces a persisted canonical classification to its mutation-safe selection.
 *
 * @remarks
 * Canonical classifications include server-owned labels, evidence, provenance,
 * and taxonomy-version data. Update DTOs deliberately accept only the
 * user-selected system and code, so edit state must not retain or resend the
 * richer canonical object.
 *
 * @param classification - Persisted canonical classification, when available.
 * @returns An exact system/code selection, or null when no classification exists.
 */
export function toClassificationSelection(classification: StandardClassification | null | undefined): ClassificationSelection | null {
  return classification === null || classification === undefined ? null : {system: classification.system, code: classification.code};
}

/**
 * Represents one canonical node in a classification hierarchy.
 */
export interface ClassificationNode {
  /** The taxonomy-specific hierarchy level. */
  readonly level: string;
  /** The canonical code at this hierarchy level. */
  readonly code: string;
  /** The official taxonomy label at this hierarchy level. */
  readonly officialLabel: string;
}

/**
 * Represents source material that supports a classification decision.
 */
export interface ClassificationEvidence {
  /** The logical source of the evidence. */
  readonly source: string;
  /** The evidence value captured from that source. */
  readonly value: string;
}

/**
 * Represents a complete canonical taxonomy classification.
 */
export interface StandardClassification extends ClassificationSelection {
  /** The version of the taxonomy artifact that resolved this classification. */
  readonly version: string;
  /** The official label for the selected canonical code. */
  readonly officialLabel: string;
  /** The canonical hierarchy ending at the selected code. */
  readonly hierarchy: readonly ClassificationNode[];
  /** Whether analysis or a human selected the classification. */
  readonly origin: ClassificationOrigin;
  /** The model confidence for analysis classifications, otherwise null. */
  readonly confidence: number | null;
  /** Evidence retained for auditability and user explanations. */
  readonly evidence: readonly ClassificationEvidence[];
}

/**
 * Represents a node from a generated taxonomy artifact.
 *
 * @remarks
 * This complete shape is server-only implementation data. Search consumers receive
 * {@link ClassificationSearchResult} instead of these raw nodes.
 */
export interface TaxonomyArtifactNode {
  /** The canonical code for the artifact node. */
  readonly code: string;
  /** The official label associated with the canonical code. */
  readonly officialLabel: string;
  /** The taxonomy-specific hierarchy level. */
  readonly level: string;
  /** The direct parent code, or null for a root node. */
  readonly parentCode: string | null;
  /** The canonical codes from the taxonomy root through this node. */
  readonly hierarchyCodes: readonly string[];
  /** The official labels from the taxonomy root through this node. */
  readonly hierarchyLabels: readonly string[];
  /** An optional official definition for the node. */
  readonly definition: string | null;
  /** Precomputed searchable text that must remain server-only. */
  readonly searchText: string;
}

/**
 * Represents the envelope emitted by the taxonomy artifact generator.
 */
export interface TaxonomyArtifact {
  /** The taxonomy system represented by the artifact. */
  readonly system: ClassificationSystem;
  /** The artifact version. */
  readonly version: string;
  /** The public source URL used to generate the artifact. */
  readonly sourceUrl: string;
  /** The ISO-8601 instant at which the artifact was generated. */
  readonly generatedAt: string;
  /** The attribution required by the taxonomy source. */
  readonly attribution: string;
  /** All canonical nodes in the artifact. */
  readonly nodes: readonly TaxonomyArtifactNode[];
}

/**
 * Represents the bounded result projected from a taxonomy search.
 *
 * @remarks
 * It intentionally excludes raw definitions and precomputed search text so
 * generated artifacts cannot be returned to a caller.
 */
export interface ClassificationSearchResult extends ClassificationSelection {
  /** The matching taxonomy artifact version. */
  readonly version: string;
  /** The matching node's official label. */
  readonly officialLabel: string;
  /** The matching node's taxonomy-specific hierarchy level. */
  readonly level: string;
  /** The matching node's parent code, when it has one. */
  readonly parentCode: string | null;
  /** The canonical hierarchy codes ending at this result. */
  readonly hierarchyCodes: readonly string[];
  /** The canonical hierarchy labels ending at this result. */
  readonly hierarchyLabels: readonly string[];
}

/**
 * Represents validated input for a bounded taxonomy search.
 */
export interface SearchClassificationsInput {
  /** The taxonomy artifact to search. */
  readonly system: ClassificationSystem;
  /** A query with at least two normalized searchable characters. */
  readonly query: string;
  /** Optional result cap in the inclusive range 1 through 50. */
  readonly limit?: number;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonBlankString);
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, allowedKeys: readonly string[]): boolean {
  return Object.keys(record).every((key) => allowedKeys.includes(key));
}

/**
 * Normalizes a user taxonomy query for Unicode-safe bounded searches.
 *
 * @param query - Raw user-entered taxonomy query.
 * @returns Lowercase, diacritic-free searchable text with normalized spacing.
 */
export function normalizeClassificationSearchQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

/**
 * Determines whether a value is a supported taxonomy-system value.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link ClassificationSystem}.
 */
export function isClassificationSystem(value: unknown): value is ClassificationSystem {
  return typeof value === "string" && classificationSystemValues.includes(value);
}

/**
 * Determines whether a value is a valid classification-origin value.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link ClassificationOrigin}.
 */
export function isClassificationOrigin(value: unknown): value is ClassificationOrigin {
  return typeof value === "string" && classificationOriginValues.includes(value);
}

/**
 * Determines whether a value is a taxonomy system and canonical-code selection.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link ClassificationSelection}.
 */
export function isClassificationSelection(value: unknown): value is ClassificationSelection {
  return (
    isRecord(value) && hasOnlyKeys(value, ["system", "code"]) && isClassificationSystem(value["system"]) && isNonBlankString(value["code"])
  );
}

/**
 * Determines whether a value is a canonical classification hierarchy node.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link ClassificationNode}.
 */
export function isClassificationNode(value: unknown): value is ClassificationNode {
  return (
    isRecord(value)
    && hasOnlyKeys(value, ["level", "code", "officialLabel"])
    && isNonBlankString(value["level"])
    && isNonBlankString(value["code"])
    && isNonBlankString(value["officialLabel"])
  );
}

/**
 * Determines whether a value is a classification-evidence item.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link ClassificationEvidence}.
 */
export function isClassificationEvidence(value: unknown): value is ClassificationEvidence {
  return (
    isRecord(value) && hasOnlyKeys(value, ["source", "value"]) && isNonBlankString(value["source"]) && isNonBlankString(value["value"])
  );
}

/**
 * Determines whether a value is a complete canonical standard classification.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link StandardClassification}.
 */
export function isStandardClassification(value: unknown): value is StandardClassification {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, ["system", "code", "version", "officialLabel", "hierarchy", "origin", "confidence", "evidence"])
    || !isClassificationSystem(value["system"])
    || !isNonBlankString(value["code"])
    || !isNonBlankString(value["version"])
    || !isNonBlankString(value["officialLabel"])
    || !Array.isArray(value["hierarchy"])
    || value["hierarchy"].length === 0
    || !value["hierarchy"].every(isClassificationNode)
    || !isClassificationOrigin(value["origin"])
    || !Array.isArray(value["evidence"])
    || !value["evidence"].every(isClassificationEvidence)
  ) {
    return false;
  }

  const finalHierarchyNode = value["hierarchy"].at(-1);
  if (finalHierarchyNode?.code !== value["code"]) {
    return false;
  }

  const confidence = value["confidence"];
  if (value["origin"] === ClassificationOrigin.Manual) {
    return confidence === null;
  }

  return typeof confidence === "number" && Number.isFinite(confidence) && confidence >= 0 && confidence <= 1;
}

/**
 * Determines whether a value has the full generated-taxonomy node shape.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link TaxonomyArtifactNode}.
 */
export function isTaxonomyArtifactNode(value: unknown): value is TaxonomyArtifactNode {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, [
      "code",
      "officialLabel",
      "level",
      "parentCode",
      "hierarchyCodes",
      "hierarchyLabels",
      "definition",
      "searchText",
    ])
    || !isNonBlankString(value["code"])
    || !isNonBlankString(value["officialLabel"])
    || !isNonBlankString(value["level"])
    || !(isNonBlankString(value["parentCode"]) || value["parentCode"] === null)
    || !isStringArray(value["hierarchyCodes"])
    || value["hierarchyCodes"].length === 0
    || !isStringArray(value["hierarchyLabels"])
    || value["hierarchyLabels"].length !== value["hierarchyCodes"].length
    || !(typeof value["definition"] === "string" || value["definition"] === null)
    || !isNonBlankString(value["searchText"])
  ) {
    return false;
  }

  return value["hierarchyCodes"].at(-1) === value["code"] && value["hierarchyLabels"].at(-1) === value["officialLabel"];
}

function hasValidTaxonomyHierarchy(nodes: readonly TaxonomyArtifactNode[]): boolean {
  const nodesByCode = new Map<string, TaxonomyArtifactNode>();

  for (const node of nodes) {
    if (nodesByCode.has(node.code)) {
      return false;
    }

    nodesByCode.set(node.code, node);
  }

  for (const node of nodes) {
    const hierarchyCodes = node.hierarchyCodes;
    const hierarchyLabels = node.hierarchyLabels;
    const terminalCode = hierarchyCodes.at(-1);
    const terminalLabel = hierarchyLabels.at(-1);

    if (terminalCode !== node.code || terminalLabel !== node.officialLabel) {
      return false;
    }

    if (node.parentCode === null && hierarchyCodes.length !== 1) {
      return false;
    }

    if (node.parentCode !== null && (hierarchyCodes.length < 2 || hierarchyCodes.at(-2) !== node.parentCode)) {
      return false;
    }

    for (const [index, code] of hierarchyCodes.entries()) {
      const hierarchyNode = nodesByCode.get(code);
      if (hierarchyNode === undefined || hierarchyNode.officialLabel !== hierarchyLabels[index]) {
        return false;
      }

      if (index === 0) {
        if (hierarchyNode.parentCode !== null) {
          return false;
        }
      } else {
        const parentCode = hierarchyCodes[index - 1];
        if (hierarchyNode.parentCode !== parentCode) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Determines whether a value has the full generated-taxonomy artifact shape and hierarchy integrity.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link TaxonomyArtifact}.
 */
export function isTaxonomyArtifact(value: unknown): value is TaxonomyArtifact {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, ["system", "version", "sourceUrl", "generatedAt", "attribution", "nodes"])
    || !isClassificationSystem(value["system"])
    || !isNonBlankString(value["version"])
    || !isNonBlankString(value["sourceUrl"])
    || !isStrictRfc3339Timestamp(value["generatedAt"])
    || !isNonBlankString(value["attribution"])
    || !Array.isArray(value["nodes"])
    || value["nodes"].length === 0
    || !value["nodes"].every(isTaxonomyArtifactNode)
  ) {
    return false;
  }

  return hasValidTaxonomyHierarchy(value["nodes"]);
}

/**
 * Determines whether a value is valid taxonomy-search input.
 *
 * @param value - Untrusted runtime value to validate.
 * @returns Whether the value is a {@link SearchClassificationsInput}.
 */
export function isSearchClassificationsInput(value: unknown): value is SearchClassificationsInput {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, ["system", "query", "limit"])
    || !isClassificationSystem(value["system"])
    || !isNonBlankString(value["query"])
  ) {
    return false;
  }

  if (normalizeClassificationSearchQuery(value["query"]).length < 2) {
    return false;
  }

  const limit = value["limit"];
  return limit === undefined || (typeof limit === "number" && Number.isInteger(limit) && limit >= 1 && limit <= 50);
}
