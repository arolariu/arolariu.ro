/**
 * @fileoverview Server-only, bounded search over generated taxonomy artifacts.
 * @module lib/taxonomies/taxonomyCatalog.server
 *
 * @remarks
 * Static imports make all generated taxonomy artifacts visible to Next.js
 * standalone tracing. The module validates and normalizes them once during
 * server initialization, then exposes only bounded search projections.
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker.
import "server-only";

import ecoicopArtifactJson from "@/data/taxonomies/ecoicop-v2.min.json";
import gpcArtifactJson from "@/data/taxonomies/gpc-2026-05.min.json";
import naceArtifactJson from "@/data/taxonomies/nace-2.1.min.json";
import {
  ClassificationSystem,
  isClassificationSystem,
  isTaxonomyArtifact,
  type ClassificationSearchResult,
  type ClassificationSystem as ClassificationSystemType,
  type SearchClassificationsInput,
  type TaxonomyArtifact,
  type TaxonomyArtifactNode,
} from "@/types/invoices";

/**
 * Maximum number of taxonomy results that may be returned by one search.
 */
export const MAXIMUM_TAXONOMY_SEARCH_RESULTS = 50;

/**
 * Default number of taxonomy results returned when no explicit cap is supplied.
 */
export const DEFAULT_TAXONOMY_SEARCH_RESULTS = MAXIMUM_TAXONOMY_SEARCH_RESULTS;

/**
 * Identifies invalid untrusted taxonomy search input.
 */
export class TaxonomySearchValidationError extends Error {
  /**
   * Creates an input-validation error with an actionable, non-sensitive message.
   *
   * @param message - Description of the invalid search input.
   */
  public constructor(message: string) {
    super(message);
    this.name = "TaxonomySearchValidationError";
  }
}

interface NormalizedTaxonomyNode {
  readonly result: ClassificationSearchResult;
  readonly normalizedCode: string;
  readonly normalizedOfficialLabel: string;
  readonly searchTokens: ReadonlySet<string>;
  readonly ordinal: number;
}

interface ResolvedTaxonomySearchInput {
  readonly system: ClassificationSystemType;
  readonly normalizedQuery: string;
  readonly queryTokens: ReadonlySet<string>;
  readonly limit: number;
}

interface RankedTaxonomyNode {
  readonly node: NormalizedTaxonomyNode;
  readonly rank: number;
  readonly overlap: number;
}

const taxonomyArtifacts: readonly unknown[] = [gpcArtifactJson, ecoicopArtifactJson, naceArtifactJson];
const expectedSystems: readonly ClassificationSystemType[] = [
  ClassificationSystem.Gs1Gpc,
  ClassificationSystem.EcoicopV2,
  ClassificationSystem.Nace21,
];

/**
 * Normalizes user text for Unicode-safe, diacritic-insensitive matching.
 *
 * @param value - Text to normalize for a code, label, or token comparison.
 * @returns Lowercase, diacritic-free, whitespace-normalized text.
 */
export function normalizeTaxonomySearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tokenize(value: string): ReadonlySet<string> {
  const normalizedValue = normalizeTaxonomySearchText(value);
  return new Set(normalizedValue.length === 0 ? [] : normalizedValue.split(" "));
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function assertTaxonomyArtifact(value: unknown, expectedSystem?: ClassificationSystemType): TaxonomyArtifact {
  if (!isTaxonomyArtifact(value)) {
    throw new Error("Invalid taxonomy artifact envelope or node shape.");
  }

  if (expectedSystem !== undefined && value.system !== expectedSystem) {
    throw new Error(`Invalid taxonomy artifact system. Expected ${expectedSystem}.`);
  }

  return value;
}

function projectNode(system: ClassificationSystemType, version: string, node: TaxonomyArtifactNode): ClassificationSearchResult {
  return {
    system,
    version,
    code: node.code,
    officialLabel: node.officialLabel,
    level: node.level,
    parentCode: node.parentCode,
    hierarchyCodes: [...node.hierarchyCodes],
    hierarchyLabels: [...node.hierarchyLabels],
  };
}

function normalizeArtifact(artifact: TaxonomyArtifact): readonly NormalizedTaxonomyNode[] {
  return artifact.nodes.map((node, ordinal) => ({
    result: projectNode(artifact.system, artifact.version, node),
    normalizedCode: normalizeTaxonomySearchText(node.code),
    normalizedOfficialLabel: normalizeTaxonomySearchText(node.officialLabel),
    searchTokens: tokenize(node.searchText),
    ordinal,
  }));
}

function createCatalog(): ReadonlyMap<ClassificationSystemType, readonly NormalizedTaxonomyNode[]> {
  const catalog = new Map<ClassificationSystemType, readonly NormalizedTaxonomyNode[]>();

  for (const [index, rawArtifact] of taxonomyArtifacts.entries()) {
    const expectedSystem = expectedSystems[index];
    if (expectedSystem === undefined) {
      throw new Error("Invalid taxonomy catalog configuration.");
    }

    const artifact = assertTaxonomyArtifact(rawArtifact, expectedSystem);
    if (catalog.has(artifact.system)) {
      throw new Error(`Duplicate taxonomy artifact for ${artifact.system}.`);
    }

    catalog.set(artifact.system, normalizeArtifact(artifact));
  }

  if (catalog.size !== expectedSystems.length) {
    throw new Error("Taxonomy catalog is incomplete.");
  }

  return catalog;
}

function resolveSearchInput(input: unknown): ResolvedTaxonomySearchInput {
  if (!isRecord(input)) {
    throw new TaxonomySearchValidationError("Taxonomy search input must be an object.");
  }

  if (!Object.keys(input).every((key) => ["system", "query", "limit"].includes(key))) {
    throw new TaxonomySearchValidationError("Taxonomy search input contains unsupported fields.");
  }

  const system = input["system"];
  if (!isClassificationSystem(system)) {
    throw new TaxonomySearchValidationError("Taxonomy search system is invalid.");
  }

  const query = input["query"];
  if (typeof query !== "string" || query.trim().length === 0) {
    throw new TaxonomySearchValidationError("Taxonomy search query must be a non-empty string.");
  }

  const normalizedQuery = normalizeTaxonomySearchText(query);
  if (normalizedQuery.length === 0) {
    throw new TaxonomySearchValidationError("Taxonomy search query must contain searchable characters.");
  }

  const rawLimit = input["limit"];
  const limit = rawLimit === undefined ? DEFAULT_TAXONOMY_SEARCH_RESULTS : rawLimit;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > MAXIMUM_TAXONOMY_SEARCH_RESULTS) {
    throw new TaxonomySearchValidationError(`Taxonomy search limit must be an integer between 1 and ${MAXIMUM_TAXONOMY_SEARCH_RESULTS}.`);
  }

  return {
    system,
    normalizedQuery,
    queryTokens: tokenize(normalizedQuery),
    limit,
  };
}

function calculateTokenOverlap(queryTokens: ReadonlySet<string>, nodeTokens: ReadonlySet<string>): number {
  let overlap = 0;

  for (const token of queryTokens) {
    if (nodeTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap;
}

function rankNode(node: NormalizedTaxonomyNode, input: ResolvedTaxonomySearchInput): RankedTaxonomyNode | null {
  if (node.normalizedCode === input.normalizedQuery) {
    return {node, rank: 0, overlap: input.queryTokens.size};
  }

  if (node.normalizedOfficialLabel === input.normalizedQuery) {
    return {node, rank: 1, overlap: input.queryTokens.size};
  }

  if (node.normalizedCode.startsWith(input.normalizedQuery) || node.normalizedOfficialLabel.startsWith(input.normalizedQuery)) {
    return {node, rank: 2, overlap: calculateTokenOverlap(input.queryTokens, node.searchTokens)};
  }

  const overlap = calculateTokenOverlap(input.queryTokens, node.searchTokens);
  return overlap > 0 ? {node, rank: 3, overlap} : null;
}

function compareRankedNodes(left: RankedTaxonomyNode, right: RankedTaxonomyNode): number {
  if (left.rank !== right.rank) {
    return left.rank - right.rank;
  }

  if (left.overlap !== right.overlap) {
    return right.overlap - left.overlap;
  }

  const codeComparison = compareText(left.node.result.code, right.node.result.code);
  if (codeComparison !== 0) {
    return codeComparison;
  }

  const labelComparison = compareText(left.node.result.officialLabel, right.node.result.officialLabel);
  return labelComparison !== 0 ? labelComparison : left.node.ordinal - right.node.ordinal;
}

function searchNodes(nodes: readonly NormalizedTaxonomyNode[], input: ResolvedTaxonomySearchInput): readonly ClassificationSearchResult[] {
  return nodes
    .map((node) => rankNode(node, input))
    .filter((candidate): candidate is RankedTaxonomyNode => candidate !== null)
    .sort(compareRankedNodes)
    .slice(0, input.limit)
    .map((candidate) => candidate.node.result);
}

const normalizedCatalog = createCatalog();

/**
 * Searches a generated artifact after validating its full runtime shape.
 *
 * @remarks
 * This function exists for server-side validation and focused tests. Application
 * callers should use {@link searchTaxonomyCatalog} so static artifacts are
 * normalized only once in module scope.
 *
 * @param artifact - Untrusted taxonomy artifact to validate and search.
 * @param query - Untrusted text to match against canonical codes and labels.
 * @param limit - Optional result cap in the inclusive range 1 through 50.
 * @returns Bounded search projections without raw definitions or search text.
 * @throws {Error} When the artifact envelope or a node is malformed.
 * @throws {TaxonomySearchValidationError} When query or limit input is invalid.
 */
export function searchTaxonomyArtifact(artifact: unknown, query: unknown, limit?: unknown): readonly ClassificationSearchResult[] {
  const validatedArtifact = assertTaxonomyArtifact(artifact);
  const input = resolveSearchInput({system: validatedArtifact.system, query, ...(limit === undefined ? {} : {limit})});
  return searchNodes(normalizeArtifact(validatedArtifact), input);
}

/**
 * Searches one validated, statically imported taxonomy catalog.
 *
 * @param input - Runtime search input containing a system, non-empty query, and optional cap.
 * @returns Deterministically ranked, bounded taxonomy-result projections.
 * @throws {TaxonomySearchValidationError} When system, query, or limit input is invalid.
 */
export function searchTaxonomyCatalog(input: Readonly<SearchClassificationsInput>): readonly ClassificationSearchResult[] {
  const resolvedInput = resolveSearchInput(input);
  const nodes = normalizedCatalog.get(resolvedInput.system);

  if (nodes === undefined) {
    throw new Error(`Taxonomy catalog is unavailable for ${resolvedInput.system}.`);
  }

  return searchNodes(nodes, resolvedInput);
}
