import type {TaxonomyArtifact, TaxonomyArtifactNode} from "../types/generators.ts";
import type {TaxonomyArtifactIdentity} from "./taxonomy-artifacts.ts";

const artifactFields: ReadonlySet<string> = new Set(["system", "version", "sourceUrl", "generatedAt", "attribution", "nodes"]);
const nodeFields: ReadonlySet<string> = new Set([
  "code",
  "officialLabel",
  "level",
  "parentCode",
  "hierarchyCodes",
  "hierarchyLabels",
  "definition",
  "searchText",
]);

function record(value: unknown, context: string, fields: ReadonlySet<string>): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${context} must be an object.`);
  if (Object.keys(value).some((key) => !fields.has(key))) throw new TypeError(`${context} contains unexpected fields.`);
  return value as Readonly<Record<string, unknown>>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string.`);
  return value;
}

function strings(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array.`);
  return value.map((item, index) => text(item, `${field}[${index}]`));
}

/** Reconstructs an ordered ancestor path; missing nodes and cycles are invalid. */
export function taxonomyHierarchy(nodes: ReadonlyMap<string, TaxonomyArtifactNode>, code: string): readonly TaxonomyArtifactNode[] {
  const hierarchy: TaxonomyArtifactNode[] = [];
  const visited = new Set<string>();
  let next: string | null = code;
  while (next !== null) {
    if (visited.has(next)) throw new Error(`Taxonomy hierarchy cycle detected at '${next}'.`);
    const node: TaxonomyArtifactNode | undefined = nodes.get(next);
    if (node === undefined) throw new Error(`Taxonomy code '${next}' was not found.`);
    visited.add(next);
    hierarchy.push(node);
    next = node.parentCode;
  }
  return hierarchy.reverse();
}

/** Rejects artifacts whose node graph cannot reproduce every supplied hierarchy. */
export function validateTaxonomyHierarchy(artifact: Readonly<TaxonomyArtifact>): void {
  if (artifact.nodes.length === 0) throw new Error(`${artifact.system} artifact contains no taxonomy nodes.`);
  const nodes = new Map<string, TaxonomyArtifactNode>();
  const normalizedCodes = new Set<string>();
  for (const node of artifact.nodes) {
    const normalized = node.code.trim().toUpperCase();
    if (normalizedCodes.has(normalized)) throw new Error(`${artifact.system} contains duplicate code '${node.code}'.`);
    normalizedCodes.add(normalized);
    nodes.set(node.code, node);
  }
  for (const node of artifact.nodes) {
    if (node.parentCode !== null && !nodes.has(node.parentCode)) {
      throw new Error(`${artifact.system} parent '${node.parentCode}' for '${node.code}' was not found.`);
    }
    if (node.hierarchyCodes.at(-1) !== node.code) {
      throw new Error(`${artifact.system} hierarchy for '${node.code}' does not end with the selected code.`);
    }
    if (node.hierarchyCodes.length !== node.hierarchyLabels.length) {
      throw new Error(`${artifact.system} hierarchy for '${node.code}' has mismatched code and label lengths.`);
    }
    const path = taxonomyHierarchy(nodes, node.code);
    if (
      path.length !== node.hierarchyCodes.length
      || path.some((part, index) => part.code !== node.hierarchyCodes[index] || part.officialLabel !== node.hierarchyLabels[index])
    ) {
      throw new Error(`${artifact.system} hierarchy for '${node.code}' does not match its parent chain.`);
    }
  }
}

/** Parses the same strict artifact payload for pinned, cached, and fresh snapshots. */
export function parseTaxonomyArtifact(contents: string): TaxonomyArtifact {
  const parsed: unknown = JSON.parse(contents);
  const value = record(parsed, "Taxonomy artifact", artifactFields);
  if (typeof value["system"] !== "string") throw new TypeError("Taxonomy artifact system must be a string.");
  const system = value["system"];
  if (system !== "GS1_GPC" && system !== "ECOICOP_V2" && system !== "NACE_2_1") {
    throw new TypeError(`Taxonomy artifact system '${system}' is unsupported.`);
  }
  const sourceUrl = text(value["sourceUrl"], "Taxonomy artifact sourceUrl");
  if (new URL(sourceUrl).protocol !== "https:") throw new TypeError("Taxonomy artifact sourceUrl must use HTTPS.");
  const generatedAt = text(value["generatedAt"], "Taxonomy artifact generatedAt");
  const timestamp = new Date(generatedAt);
  const canonicalTimestamp = generatedAt.replace(
    /(?:\.(\d{1,3}))?Z$/u,
    (_match, fraction: string | undefined) => `.${(fraction ?? "").padEnd(3, "0")}Z`,
  );
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== canonicalTimestamp) {
    throw new TypeError("Taxonomy artifact generatedAt must be an ISO UTC date.");
  }
  const rawNodes = value["nodes"];
  if (!Array.isArray(rawNodes)) throw new TypeError("Taxonomy artifact nodes must be an array.");
  const nodes = rawNodes.map((rawNode, index): TaxonomyArtifactNode => {
    const context = `Taxonomy artifact node[${index}]`;
    const node = record(rawNode, context, nodeFields);
    const parentCode = node["parentCode"];
    if (parentCode !== null && (typeof parentCode !== "string" || parentCode.trim() === "")) {
      throw new TypeError(`${context} parentCode must be a non-empty string or null.`);
    }
    const definition = node["definition"];
    if (definition !== null && typeof definition !== "string") throw new TypeError(`${context} definition must be a string or null.`);
    return {
      code: text(node["code"], `${context} code`),
      officialLabel: text(node["officialLabel"], `${context} officialLabel`),
      level: text(node["level"], `${context} level`),
      parentCode,
      hierarchyCodes: strings(node["hierarchyCodes"], `${context} hierarchyCodes`),
      hierarchyLabels: strings(node["hierarchyLabels"], `${context} hierarchyLabels`),
      definition,
      searchText: text(node["searchText"], `${context} searchText`),
    };
  });
  const artifact = {
    system,
    sourceUrl,
    generatedAt,
    nodes,
    version: text(value["version"], "Taxonomy artifact version"),
    attribution: text(value["attribution"], "Taxonomy artifact attribution"),
  } satisfies TaxonomyArtifact;
  validateTaxonomyHierarchy(artifact);
  return artifact;
}

/** Verifies that a structurally valid artifact matches the pinned publisher metadata. */
export function matchesTaxonomyIdentity(artifact: TaxonomyArtifact, identity: TaxonomyArtifactIdentity): boolean {
  return (
    artifact.system === identity.system
    && artifact.version === identity.version
    && artifact.sourceUrl === identity.sourceUrl
    && artifact.attribution === identity.attribution
  );
}
