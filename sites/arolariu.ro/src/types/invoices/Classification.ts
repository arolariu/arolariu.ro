/**
 * @fileoverview Runtime-safe canonical taxonomy classification contracts.
 * @module types/invoices/Classification
 */

import {hasOnlyKeys, isRecord} from "../guards";

/** Supported canonical taxonomy systems. */
const CLASSIFICATION_SYSTEM = {
  Gs1Gpc: "GS1_GPC",
  EcoicopV2: "ECOICOP_V2",
  Nace21: "NACE_2_1",
} as const;

export {CLASSIFICATION_SYSTEM as ClassificationSystem};

/** Union of supported canonical taxonomy-system values. */
export type ClassificationSystem = (typeof CLASSIFICATION_SYSTEM)[keyof typeof CLASSIFICATION_SYSTEM];

/** Supported classification origins. */
const CLASSIFICATION_ORIGIN = {Analysis: "Analysis", Manual: "Manual"} as const;

export {CLASSIFICATION_ORIGIN as ClassificationOrigin};

/** Union of supported classification-origin values. */
export type ClassificationOrigin = (typeof CLASSIFICATION_ORIGIN)[keyof typeof CLASSIFICATION_ORIGIN];

/**
 * Decides which `classificationCode` value a write action should send for an entity.
 *
 * @remarks
 * The backend resolves any supplied code through `ResolveManualClassificationAsync`, which
 * unconditionally stamps the result as {@link ClassificationOrigin.Manual} with a null
 * confidence and empty evidence. Echoing an analysis-derived code back on an unrelated edit
 * would therefore silently downgrade it from `Analysis` to `Manual` and discard its evidence.
 *
 * Sending `null` instead makes the backend preserve the persisted classification untouched.
 * Only a genuinely user-chosen classification should travel as a code.
 *
 * @param classification - The entity's current classification, or null when unclassified.
 * @returns The manual code to send, or null to preserve whatever the server already holds.
 */
export function resolveClassificationCodeForWrite(classification: StandardClassification | null): string | null {
  return classification?.origin === CLASSIFICATION_ORIGIN.Manual ? classification.code : null;
}

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

const systemValues: readonly string[] = Object.values(CLASSIFICATION_SYSTEM);
const originValues: readonly string[] = Object.values(CLASSIFICATION_ORIGIN);
const rfc3339DateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/u;

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => isText(item));
}

function isDigit(value: string): boolean {
  return value >= "0" && value <= "9";
}

function isRfc3339Offset(value: string): boolean {
  if (value === "Z") return true;
  if (value.length !== 6 || (value[0] !== "+" && value[0] !== "-") || value[3] !== ":") return false;
  return [...value.slice(1, 3), ...value.slice(4, 6)].every((character) => isDigit(character));
}

function isRfc3339Suffix(value: string): boolean {
  if (!value.startsWith(".")) return isRfc3339Offset(value);
  const offset = value.endsWith("Z") ? "Z" : value.slice(-6);
  const fraction = value.slice(1, offset === "Z" ? -1 : -6);
  return fraction.length > 0 && [...fraction].every((character) => isDigit(character)) && isRfc3339Offset(offset);
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const maximumDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= maximumDay;
}

function isStrictRfc3339Timestamp(value: unknown): value is string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return false;
  const dateTime = value.slice(0, 19);
  if (!rfc3339DateTimePattern.test(dateTime) || !isRfc3339Suffix(value.slice(19))) return false;

  const year = Number(dateTime.slice(0, 4));
  const month = Number(dateTime.slice(5, 7));
  const day = Number(dateTime.slice(8, 10));
  const hour = Number(dateTime.slice(11, 13));
  const minute = Number(dateTime.slice(14, 16));
  const second = Number(dateTime.slice(17, 19));
  return isValidCalendarDate(year, month, day) && hour <= 23 && minute <= 59 && second <= 59;
}

/** Normalizes Unicode taxonomy-search text. */
export function normalizeClassificationSearchQuery(query: string): string {
  return query
    .normalize("NFD")
    .replaceAll(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replaceAll(/\s+/gu, " ");
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
    !isRecord(value)
    || !hasOnlyKeys(value, ["system", "query", "limit"])
    || !isClassificationSystem(value["system"])
    || !isText(value["query"])
    || normalizeClassificationSearchQuery(value["query"]).length < 2
  ) {
    return false;
  }
  const {limit} = value;
  return limit === undefined || (typeof limit === "number" && Number.isSafeInteger(limit) && limit >= 1 && limit <= 50);
}

const TAXONOMY_ARTIFACT_KEYS = ["system", "version", "sourceUrl", "generatedAt", "attribution", "nodes"] as const;
const TAXONOMY_NODE_KEYS = [
  "code",
  "officialLabel",
  "level",
  "parentCode",
  "hierarchyCodes",
  "hierarchyLabels",
  "definition",
  "searchText",
] as const;

type TaxonomyArtifactEnvelopeRecord = Readonly<Record<string, unknown>> & {
  readonly system: ClassificationSystem;
  readonly version: string;
  readonly sourceUrl: string;
  readonly generatedAt: string;
  readonly attribution: string;
  readonly nodes: readonly unknown[];
};

function hasValidTaxonomyArtifactEnvelope(value: Readonly<Record<string, unknown>>): value is TaxonomyArtifactEnvelopeRecord {
  return (
    hasOnlyKeys(value, TAXONOMY_ARTIFACT_KEYS)
    && isClassificationSystem(value["system"])
    && isText(value["version"])
    && isText(value["sourceUrl"])
    && isStrictRfc3339Timestamp(value["generatedAt"])
    && isText(value["attribution"])
    && Array.isArray(value["nodes"])
    && value["nodes"].length > 0
  );
}

function hasValidTaxonomyNodeFields(
  value: Readonly<Record<string, unknown>>,
): value is Readonly<Record<string, unknown>> & TaxonomyArtifactNode {
  return (
    hasOnlyKeys(value, TAXONOMY_NODE_KEYS)
    && isText(value["code"])
    && isText(value["officialLabel"])
    && isText(value["level"])
    && (value["parentCode"] === null || isText(value["parentCode"]))
    && isStringArray(value["hierarchyCodes"])
    && isStringArray(value["hierarchyLabels"])
    && (value["definition"] === null || typeof value["definition"] === "string")
    && isText(value["searchText"])
  );
}

function parseTaxonomyArtifactNode(value: unknown): TaxonomyArtifactNode | null {
  if (!isRecord(value) || !hasValidTaxonomyNodeFields(value)) return null;
  const {code, definition, hierarchyCodes, hierarchyLabels, level, officialLabel, parentCode, searchText} = value;
  if (hierarchyCodes.length !== hierarchyLabels.length || hierarchyCodes.at(-1) !== code || hierarchyLabels.at(-1) !== officialLabel) {
    return null;
  }
  return {code, definition, hierarchyCodes, hierarchyLabels, level, officialLabel, parentCode, searchText};
}

function hasValidNodeHierarchy(node: TaxonomyArtifactNode, nodesByCode: ReadonlyMap<string, TaxonomyArtifactNode>): boolean {
  return node.hierarchyCodes.every((code, index) => {
    const hierarchyNode = nodesByCode.get(code);
    if (hierarchyNode === undefined || hierarchyNode.officialLabel !== node.hierarchyLabels[index]) return false;
    const expectedParentCode = index === 0 ? null : (node.hierarchyCodes[index - 1] ?? null);
    return hierarchyNode.parentCode === expectedParentCode;
  });
}

/** Determines whether a value is a structurally valid generated taxonomy artifact. */
export function isTaxonomyArtifact(value: unknown): value is TaxonomyArtifact {
  if (!isRecord(value) || !hasValidTaxonomyArtifactEnvelope(value)) return false;

  const {nodes} = value;
  const nodesByCode = new Map<string, TaxonomyArtifactNode>();
  for (const rawNode of nodes) {
    const node = parseTaxonomyArtifactNode(rawNode);
    if (node === null || nodesByCode.has(node.code)) return false;
    nodesByCode.set(node.code, node);
  }

  for (const node of nodesByCode.values()) {
    if (!hasValidNodeHierarchy(node, nodesByCode)) return false;
  }
  return true;
}
