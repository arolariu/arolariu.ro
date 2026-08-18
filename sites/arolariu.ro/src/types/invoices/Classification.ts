/**
 * @fileoverview Runtime-safe canonical taxonomy classification contracts.
 * @module types/invoices/Classification
 */

/** Supported canonical taxonomy systems. */
export const ClassificationSystem = {
  Gs1Gpc: "GS1_GPC",
  EcoicopV2: "ECOICOP_V2",
  Nace21: "NACE_2_1",
} as const;

/** Union of supported canonical taxonomy-system values. */
export type ClassificationSystem = (typeof ClassificationSystem)[keyof typeof ClassificationSystem];

/** Supported classification origins. */
export const ClassificationOrigin = {Analysis: "Analysis", Manual: "Manual"} as const;

/** Union of supported classification-origin values. */
export type ClassificationOrigin = (typeof ClassificationOrigin)[keyof typeof ClassificationOrigin];

/** Minimal mutation-safe taxonomy selection. */
export interface ClassificationSelection {
  readonly system: ClassificationSystem;
  readonly code: string;
}

/** One canonical hierarchy node. */
export interface ClassificationNode {
  readonly level: string;
  readonly code: string;
  readonly officialLabel: string;
}

/** One classification evidence item. */
export interface ClassificationEvidence {
  readonly source: string;
  readonly value: string;
}

/** Complete canonical classification. */
export interface StandardClassification extends ClassificationSelection {
  readonly version: string;
  readonly officialLabel: string;
  readonly hierarchy: readonly ClassificationNode[];
  readonly origin: ClassificationOrigin;
  readonly confidence: number | null;
  readonly evidence: readonly ClassificationEvidence[];
}

/** Complete server-only node from a generated taxonomy artifact. */
export interface TaxonomyArtifactNode {
  readonly code: string;
  readonly officialLabel: string;
  readonly level: string;
  readonly parentCode: string | null;
  readonly hierarchyCodes: readonly string[];
  readonly hierarchyLabels: readonly string[];
  readonly definition: string | null;
  readonly searchText: string;
}

/** Generated taxonomy artifact envelope. */
export interface TaxonomyArtifact {
  readonly system: ClassificationSystem;
  readonly version: string;
  readonly sourceUrl: string;
  readonly generatedAt: string;
  readonly attribution: string;
  readonly nodes: readonly TaxonomyArtifactNode[];
}

/** Bounded taxonomy search projection. */
export interface ClassificationSearchResult extends ClassificationSelection {
  readonly version: string;
  readonly officialLabel: string;
  readonly level: string;
  readonly parentCode: string | null;
  readonly hierarchyCodes: readonly string[];
  readonly hierarchyLabels: readonly string[];
}

/** Runtime input accepted by taxonomy search. */
export interface SearchClassificationsInput {
  readonly system: ClassificationSystem;
  readonly query: string;
  readonly limit?: number;
}

const systemValues: readonly string[] = Object.values(ClassificationSystem);
const originValues: readonly string[] = Object.values(ClassificationOrigin);
const rfc3339Pattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isText);
}

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key));
}

function isStrictRfc3339Timestamp(value: unknown): value is string {
  return typeof value === "string" && rfc3339Pattern.test(value) && Number.isFinite(Date.parse(value));
}

/** Normalizes Unicode taxonomy-search text. */
export function normalizeClassificationSearchQuery(query: string): string {
  return query
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

/** Determines whether a value is a supported taxonomy system. */
export function isClassificationSystem(value: unknown): value is ClassificationSystem {
  return typeof value === "string" && systemValues.includes(value);
}

/** Determines whether a value is a supported classification origin. */
export function isClassificationOrigin(value: unknown): value is ClassificationOrigin {
  return typeof value === "string" && originValues.includes(value);
}

/** Determines whether a value is valid taxonomy search input. */
export function isSearchClassificationsInput(value: unknown): value is SearchClassificationsInput {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["system", "query", "limit"]) ||
    !isClassificationSystem(value["system"]) ||
    !isText(value["query"]) ||
    normalizeClassificationSearchQuery(value["query"]).length < 2
  ) {
    return false;
  }
  const limit = value["limit"];
  return limit === undefined || (typeof limit === "number" && Number.isInteger(limit) && limit >= 1 && limit <= 50);
}

/** Determines whether a value is a structurally valid generated taxonomy artifact. */
export function isTaxonomyArtifact(value: unknown): value is TaxonomyArtifact {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["system", "version", "sourceUrl", "generatedAt", "attribution", "nodes"]) ||
    !isClassificationSystem(value["system"]) ||
    !isText(value["version"]) ||
    !isText(value["sourceUrl"]) ||
    !isStrictRfc3339Timestamp(value["generatedAt"]) ||
    !isText(value["attribution"]) ||
    !Array.isArray(value["nodes"]) ||
    value["nodes"].length === 0
  ) {
    return false;
  }

  const nodes = value["nodes"];
  const nodesByCode = new Map<string, TaxonomyArtifactNode>();
  for (const rawNode of nodes) {
    if (
      !isRecord(rawNode) ||
      !hasOnlyKeys(rawNode, [
        "code", "officialLabel", "level", "parentCode", "hierarchyCodes",
        "hierarchyLabels", "definition", "searchText",
      ]) ||
      !isText(rawNode["code"]) ||
      !isText(rawNode["officialLabel"]) ||
      !isText(rawNode["level"]) ||
      !(rawNode["parentCode"] === null || isText(rawNode["parentCode"])) ||
      !isStringArray(rawNode["hierarchyCodes"]) ||
      !isStringArray(rawNode["hierarchyLabels"]) ||
      rawNode["hierarchyCodes"].length !== rawNode["hierarchyLabels"].length ||
      !(rawNode["definition"] === null || typeof rawNode["definition"] === "string") ||
      !isText(rawNode["searchText"]) ||
      rawNode["hierarchyCodes"].at(-1) !== rawNode["code"] ||
      rawNode["hierarchyLabels"].at(-1) !== rawNode["officialLabel"] ||
      nodesByCode.has(rawNode["code"])
    ) {
      return false;
    }
    const node: TaxonomyArtifactNode = {
      code: rawNode["code"],
      officialLabel: rawNode["officialLabel"],
      level: rawNode["level"],
      parentCode: rawNode["parentCode"],
      hierarchyCodes: rawNode["hierarchyCodes"],
      hierarchyLabels: rawNode["hierarchyLabels"],
      definition: rawNode["definition"],
      searchText: rawNode["searchText"],
    };
    nodesByCode.set(node.code, node);
  }

  return [...nodesByCode.values()].every((node) =>
    node.hierarchyCodes.every((code, index) => {
      const hierarchyNode = nodesByCode.get(code);
      return (
        hierarchyNode !== undefined &&
        hierarchyNode.officialLabel === node.hierarchyLabels[index] &&
        (index === 0
          ? hierarchyNode.parentCode === null
          : hierarchyNode.parentCode === node.hierarchyCodes[index - 1])
      );
    }),
  );
}
