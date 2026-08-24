/**
 * @fileoverview Server-only bounded search over generated taxonomy artifacts.
 * @module lib/taxonomies/taxonomyCatalog.server
 */

// eslint-disable-next-line n/no-extraneous-import -- Next.js server-only build marker.
import "server-only";

import ecoicopArtifactJson from "@/data/taxonomies/ecoicop-v2.min.json";
import gpcArtifactJson from "@/data/taxonomies/gpc-2026-05.min.json";
import naceArtifactJson from "@/data/taxonomies/nace-2.1.min.json";
import {
  ClassificationSystem,
  isClassificationSystem,
  isTaxonomyArtifact,
  normalizeClassificationSearchQuery,
  type ClassificationSearchResult,
  type ClassificationSystem as ClassificationSystemType,
  type SearchClassificationsInput,
  type TaxonomyArtifact,
  type TaxonomyArtifactNode,
} from "@/types/invoices";
import {isRecord} from "@/types";

/** Maximum taxonomy results returned by one search. */
export const MAXIMUM_TAXONOMY_SEARCH_RESULTS = 50;

/** Invalid taxonomy-search input error. */
export class TaxonomySearchValidationError extends Error {
  /** Initializes a safe validation error. */
  public constructor(message: string) {
    super(message);
    this.name = "TaxonomySearchValidationError";
  }
}

interface CatalogNode {
  readonly result: ClassificationSearchResult;
  readonly code: string;
  readonly label: string;
  readonly tokens: ReadonlySet<string>;
  readonly ordinal: number;
}

const rawArtifacts: readonly unknown[] = [gpcArtifactJson, ecoicopArtifactJson, naceArtifactJson];
const expectedSystems = [ClassificationSystem.Gs1Gpc, ClassificationSystem.EcoicopV2, ClassificationSystem.Nace21] as const;

function tokenize(value: string): ReadonlySet<string> {
  const normalized = normalizeClassificationSearchQuery(value);
  return new Set(normalized.length === 0 ? [] : normalized.split(" "));
}

function project(system: ClassificationSystemType, version: string, node: TaxonomyArtifactNode): ClassificationSearchResult {
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

function normalizeArtifact(artifact: TaxonomyArtifact): readonly CatalogNode[] {
  return artifact.nodes.map((node, ordinal) => ({
    result: project(artifact.system, artifact.version, node),
    code: normalizeClassificationSearchQuery(node.code),
    label: normalizeClassificationSearchQuery(node.officialLabel),
    tokens: tokenize(node.searchText),
    ordinal,
  }));
}

function createCatalog(): ReadonlyMap<ClassificationSystemType, readonly CatalogNode[]> {
  const catalog = new Map<ClassificationSystemType, readonly CatalogNode[]>();
  for (const [index, rawArtifact] of rawArtifacts.entries()) {
    const expectedSystem = expectedSystems[index];
    if (expectedSystem === undefined || !isTaxonomyArtifact(rawArtifact) || rawArtifact.system !== expectedSystem)
      throw new Error("Invalid taxonomy artifact envelope, hierarchy, or system.");
    catalog.set(rawArtifact.system, normalizeArtifact(rawArtifact));
  }
  if (catalog.size !== expectedSystems.length) throw new Error("Taxonomy catalog is incomplete.");
  return catalog;
}

function resolveInput(input: unknown): Readonly<{
  system: ClassificationSystemType;
  query: string;
  tokens: ReadonlySet<string>;
  limit: number;
}> {
  if (!isRecord(input) || !Object.keys(input).every((key) => ["system", "query", "limit"].includes(key))) {
    throw new TaxonomySearchValidationError("Taxonomy search input is invalid.");
  }
  const record = input;
  if (!isClassificationSystem(record["system"]) || typeof record["query"] !== "string")
    throw new TaxonomySearchValidationError("Taxonomy search system or query is invalid.");
  const query = normalizeClassificationSearchQuery(record["query"]);
  if (query.length < 2) throw new TaxonomySearchValidationError("Taxonomy search query must contain at least two characters.");
  const rawLimit = record["limit"];
  const limit = rawLimit === undefined ? MAXIMUM_TAXONOMY_SEARCH_RESULTS : rawLimit;
  if (typeof limit !== "number" || !Number.isSafeInteger(limit) || limit < 1 || limit > MAXIMUM_TAXONOMY_SEARCH_RESULTS)
    throw new TaxonomySearchValidationError("Taxonomy search limit must be an integer between 1 and 50.");
  return {system: record["system"], query, tokens: tokenize(query), limit};
}

function overlap(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let count = 0;
  for (const token of left) if (right.has(token)) count++;
  return count;
}

const catalog = createCatalog();

function rankCatalogNode(node: CatalogNode, query: string, queryTokens: ReadonlySet<string>): number | null {
  if (node.code === query) return 0;
  if (node.label === query) return 1;
  if (node.code.startsWith(query) || node.label.startsWith(query)) return 2;
  return overlap(queryTokens, node.tokens) > 0 ? 3 : null;
}

/** Searches one statically registered taxonomy catalog. */
export function searchTaxonomyCatalog(input: Readonly<SearchClassificationsInput>): readonly ClassificationSearchResult[] {
  const resolved = resolveInput(input);
  const nodes = catalog.get(resolved.system);
  if (nodes === undefined) throw new Error(`Taxonomy catalog is unavailable for ${resolved.system}.`);

  return nodes
    .map((node) => {
      const tokenOverlap = overlap(resolved.tokens, node.tokens);
      const rank = rankCatalogNode(node, resolved.query, resolved.tokens);
      return rank === null ? null : {node, rank, tokenOverlap};
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .toSorted(
      (left, right) =>
        left.rank - right.rank
        || right.tokenOverlap - left.tokenOverlap
        || left.node.result.code.localeCompare(right.node.result.code)
        || left.node.result.officialLabel.localeCompare(right.node.result.officialLabel)
        || left.node.ordinal - right.node.ordinal,
    )
    .slice(0, resolved.limit)
    .map((candidate) => candidate.node.result);
}
