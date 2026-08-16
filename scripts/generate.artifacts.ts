/**
 * @fileoverview Generates mirrored, minified taxonomy artifacts for the API and website.
 * @module scripts/generate.artifacts
 */

import {inflateRawSync} from "node:zlib";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

const GPC_SOURCE = "https://ref.gs1.org/standards/gpc/2026-05/";
const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";
const ECOICOP_SCHEME = "http://data.europa.eu/ed1/ecoicop2/ecoicop2";
const NACE_SCHEME = "http://data.europa.eu/ux2/nace2.1/nace2.1";
const SPARQL_PAGE_SIZE = 5_000;

const OUTPUT_ROOTS = [
  resolve("sites/api.arolariu.ro/src/Invoices/Resources/Taxonomies"),
  resolve("sites/arolariu.ro/src/data/taxonomies"),
] as const;

const FILE_NAMES = {
  GS1_GPC: "gpc-2026-05.min.json",
  ECOICOP_V2: "ecoicop-v2.min.json",
  NACE_2_1: "nace-2.1.min.json",
} as const;

const GPC_LEVELS: Readonly<Record<number, string>> = {
  1: "segment",
  2: "family",
  3: "class",
  4: "brick",
};

/** Classification systems supported by generated artifacts. */
export type ArtifactClassificationSystem = "GS1_GPC" | "ECOICOP_V2" | "NACE_2_1";

/** Single normalized taxonomy node. */
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

/** Versioned taxonomy artifact consumed by the API and website. */
export interface TaxonomyArtifact {
  readonly system: ArtifactClassificationSystem;
  readonly version: string;
  readonly sourceUrl: string;
  readonly generatedAt: string;
  readonly attribution: string;
  readonly nodes: readonly TaxonomyArtifactNode[];
}

/** Shape used by the official GS1 GPC JSON document. */
export interface GpcSourceNode {
  readonly Level: number;
  readonly Code: number;
  readonly Title: string;
  readonly Definition: string | null;
  readonly DefinitionExcludes: string | null;
  readonly Active: boolean;
  readonly Childs: readonly GpcSourceNode[];
}

/** Simplified SPARQL row used by normalization. */
export interface SparqlBindingInput {
  readonly concept: string;
  readonly notation: string;
  readonly label: string;
  readonly broader: string | null;
}

interface GpcSourceDocument {
  readonly LanguageCode: string;
  readonly DateUtc: string;
  readonly Schema: readonly GpcSourceNode[];
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, context: string): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) {
    throw new TypeError(`${context} must be an object.`);
  }
  return value;
}

function requireString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${context} must be a non-empty string.`);
  }
  return value;
}

function optionalString(value: unknown, context: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${context} must be a string or null.`);
  return value;
}

function requireNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${context} must be a finite number.`);
  }
  return value;
}

function requireBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${context} must be a boolean.`);
  return value;
}

function parseGpcNode(value: unknown, context: string): GpcSourceNode {
  const record = requireRecord(value, context);
  const childrenValue = record["Childs"];
  if (!Array.isArray(childrenValue)) throw new TypeError(`${context}.Childs must be an array.`);

  return {
    Level: requireNumber(record["Level"], `${context}.Level`),
    Code: requireNumber(record["Code"], `${context}.Code`),
    Title: requireString(record["Title"], `${context}.Title`),
    Definition: optionalString(record["Definition"], `${context}.Definition`),
    DefinitionExcludes: optionalString(record["DefinitionExcludes"], `${context}.DefinitionExcludes`),
    Active: requireBoolean(record["Active"], `${context}.Active`),
    Childs: childrenValue.map((child, index) => parseGpcNode(child, `${context}.Childs[${index}]`)),
  };
}

function parseGpcDocument(value: unknown): GpcSourceDocument {
  const record = requireRecord(value, "GPC document");
  const schemaValue = record["Schema"];
  if (!Array.isArray(schemaValue)) throw new TypeError("GPC document.Schema must be an array.");

  return {
    LanguageCode: requireString(record["LanguageCode"], "GPC document.LanguageCode"),
    DateUtc: requireString(record["DateUtc"], "GPC document.DateUtc"),
    Schema: schemaValue.map((node, index) => parseGpcNode(node, `GPC document.Schema[${index}]`)),
  };
}

function normalizeText(...parts: readonly (string | null | undefined)[]): string {
  return parts
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .normalize("NFKD")
    .replace(/\p{Mark}+/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}.]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function stripCodePrefix(label: string, notation: string): string {
  const trimmed = label.trim();
  if (!trimmed.startsWith(notation)) return trimmed;
  const withoutNotation = trimmed
    .slice(notation.length)
    .replace(/^[\s:–—-]+/u, "")
    .trim();
  return withoutNotation.length > 0 ? withoutNotation : trimmed;
}

function getEuLevel(system: ArtifactClassificationSystem, code: string): string {
  if (system === "ECOICOP_V2") {
    const segmentCount = code.split(".").length;
    return ["division", "group", "class", "subclass"][segmentCount - 1] ?? `level-${segmentCount}`;
  }

  if (/^[A-Z]$/u.test(code)) return "section";
  if (/^\d{2}$/u.test(code)) return "division";
  if (/^\d{2}\.\d$/u.test(code)) return "group";
  if (/^\d{2}\.\d{2}$/u.test(code)) return "class";
  return "code";
}

/**
 * Extracts a single file from a standard ZIP archive.
 *
 * @param zip - ZIP bytes.
 * @param suffix - File-name suffix used to select the archive entry.
 * @returns Uncompressed entry bytes.
 */
export function extractZipEntry(zip: Uint8Array, suffix: string): Uint8Array {
  const buffer = Buffer.from(zip);
  const eocdSignature = 0x06054b50;
  const centralSignature = 0x02014b50;
  const localSignature = 0x04034b50;

  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset--) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ZIP end-of-central-directory record was not found.");

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index++) {
    if (buffer.readUInt32LE(centralOffset) !== centralSignature) {
      throw new Error(`Invalid ZIP central directory entry at offset ${centralOffset}.`);
    }

    const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const fileName = buffer.subarray(centralOffset + 46, centralOffset + 46 + fileNameLength).toString("utf8");

    if (fileName.endsWith(suffix)) {
      if (buffer.readUInt32LE(localOffset) !== localSignature) {
        throw new Error(`Invalid ZIP local header for ${fileName}.`);
      }

      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);

      if (compressionMethod === 0) return compressed;
      if (compressionMethod === 8) return inflateRawSync(compressed);
      throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${fileName}.`);
    }

    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`ZIP entry ending with '${suffix}' was not found.`);
}

/**
 * Flattens the official hierarchical GPC schema into Segment through Brick nodes.
 *
 * @param schema - Official GPC schema nodes.
 * @returns Normalized active nodes for levels 1-4.
 */
export function flattenGpcSchema(schema: readonly GpcSourceNode[]): readonly TaxonomyArtifactNode[] {
  const nodes: TaxonomyArtifactNode[] = [];

  const visit = (node: GpcSourceNode, ancestors: readonly TaxonomyArtifactNode[]): void => {
    if (!node.Active) return;

    const code = String(node.Code);
    const level = GPC_LEVELS[node.Level];
    const definition = node.Definition?.trim() || null;
    const current: TaxonomyArtifactNode | null =
      level === undefined
        ? null
        : {
            code,
            officialLabel: node.Title.trim(),
            level,
            parentCode: ancestors.at(-1)?.code ?? null,
            hierarchyCodes: [...ancestors.map((ancestor) => ancestor.code), code],
            hierarchyLabels: [...ancestors.map((ancestor) => ancestor.officialLabel), node.Title.trim()],
            definition,
            searchText: normalizeText(
              code,
              node.Title,
              definition,
              node.DefinitionExcludes,
              ...ancestors.map((ancestor) => ancestor.officialLabel),
            ),
          };

    if (current !== null) nodes.push(current);
    const nextAncestors = current === null ? ancestors : [...ancestors, current];
    for (const child of node.Childs) visit(child, nextAncestors);
  };

  for (const root of schema) visit(root, []);
  return nodes;
}

/**
 * Resolves a node and its full hierarchy from normalized nodes.
 *
 * @param nodes - Normalized nodes.
 * @param code - Node code to resolve.
 * @returns Node with rebuilt hierarchy and search text.
 */
export function buildHierarchy(nodes: readonly TaxonomyArtifactNode[], code: string): TaxonomyArtifactNode {
  const nodesByCode = new Map(nodes.map((node) => [node.code, node] as const));
  const selected = nodesByCode.get(code);
  if (selected === undefined) throw new Error(`Taxonomy code '${code}' was not found.`);

  const hierarchy: TaxonomyArtifactNode[] = [];
  const visited = new Set<string>();
  let current: TaxonomyArtifactNode | undefined = selected;

  while (current !== undefined) {
    if (visited.has(current.code)) throw new Error(`Taxonomy hierarchy cycle detected at '${current.code}'.`);
    visited.add(current.code);
    hierarchy.unshift(current);

    if (current.parentCode === null) break;
    const parent = nodesByCode.get(current.parentCode);
    if (parent === undefined) {
      throw new Error(`Taxonomy parent '${current.parentCode}' for '${current.code}' was not found.`);
    }
    current = parent;
  }

  return {
    ...selected,
    hierarchyCodes: hierarchy.map((node) => node.code),
    hierarchyLabels: hierarchy.map((node) => node.officialLabel),
    searchText: normalizeText(selected.code, selected.officialLabel, selected.definition, ...hierarchy.map((node) => node.officialLabel)),
  };
}

/**
 * Normalizes SPARQL concept rows into taxonomy nodes.
 *
 * @param system - Target taxonomy system.
 * @param version - Artifact version.
 * @param bindings - Simplified SPARQL rows.
 * @returns Normalized nodes with complete hierarchies.
 */
export function normalizeSparqlBindings(
  system: Exclude<ArtifactClassificationSystem, "GS1_GPC">,
  version: string,
  bindings: readonly SparqlBindingInput[],
): readonly TaxonomyArtifactNode[] {
  if (version.trim().length === 0) throw new Error("Taxonomy version must not be empty.");

  const codeByConcept = new Map(bindings.map((binding) => [binding.concept, binding.notation] as const));
  const provisional = bindings.map<TaxonomyArtifactNode>((binding) => {
    const label = stripCodePrefix(binding.label, binding.notation);
    const parentCode = binding.broader === null ? null : codeByConcept.get(binding.broader);
    if (binding.broader !== null && parentCode === undefined) {
      throw new Error(`Unresolved parent '${binding.broader}' for taxonomy code '${binding.notation}'.`);
    }

    return {
      code: binding.notation,
      officialLabel: label,
      level: getEuLevel(system, binding.notation),
      parentCode,
      hierarchyCodes: [],
      hierarchyLabels: [],
      definition: null,
      searchText: normalizeText(binding.notation, label),
    };
  });

  return provisional
    .map((node) => buildHierarchy(provisional, node.code))
    .toSorted((left, right) => left.code.localeCompare(right.code, "en", {numeric: true}));
}

function createSparqlQuery(scheme: string, offset: number): string {
  return `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?concept ?notation ?label ?broader WHERE {
  ?concept skos:inScheme <${scheme}> ;
           skos:notation ?notation ;
           skos:prefLabel ?label .
  OPTIONAL { ?concept skos:broader ?broader . }
  FILTER(lang(?label) = "en")
}
ORDER BY ?notation
LIMIT ${SPARQL_PAGE_SIZE}
OFFSET ${offset}`;
}

function readBindingValue(binding: Readonly<Record<string, unknown>>, key: string, required: boolean): string | null {
  const valueRecord = binding[key];
  if (valueRecord === undefined) {
    if (!required) return null;
    throw new TypeError(`SPARQL binding '${key}' is required.`);
  }

  const record = requireRecord(valueRecord, `SPARQL binding '${key}'`);
  return requireString(record["value"], `SPARQL binding '${key}'.value`);
}

function parseSparqlResponse(value: unknown): readonly SparqlBindingInput[] {
  const response = requireRecord(value, "SPARQL response");
  const results = requireRecord(response["results"], "SPARQL response.results");
  const bindingsValue = results["bindings"];
  if (!Array.isArray(bindingsValue)) throw new TypeError("SPARQL response.results.bindings must be an array.");

  return bindingsValue.map((bindingValue, index) => {
    const binding = requireRecord(bindingValue, `SPARQL binding[${index}]`);
    return {
      concept: readBindingValue(binding, "concept", true) ?? "",
      notation: readBindingValue(binding, "notation", true) ?? "",
      label: readBindingValue(binding, "label", true) ?? "",
      broader: readBindingValue(binding, "broader", false),
    };
  });
}

async function fetchSparqlBindings(fetchImpl: typeof fetch, scheme: string): Promise<readonly SparqlBindingInput[]> {
  const bindings: SparqlBindingInput[] = [];

  for (let offset = 0; ; offset += SPARQL_PAGE_SIZE) {
    const url = new URL(SPARQL_ENDPOINT);
    url.searchParams.set("query", createSparqlQuery(scheme, offset));
    url.searchParams.set("format", "application/sparql-results+json");

    const response = await fetchImpl(url, {
      headers: {Accept: "application/sparql-results+json"},
    });
    if (!response.ok) throw new Error(`SPARQL request failed with HTTP ${response.status} ${response.statusText}.`);

    const payload: unknown = await response.json();
    const page = parseSparqlResponse(payload);
    bindings.push(...page);
    if (page.length < SPARQL_PAGE_SIZE) break;
  }

  return bindings;
}

function validateArtifact(artifact: TaxonomyArtifact): void {
  if (artifact.nodes.length === 0) throw new Error(`${artifact.system} artifact contains no taxonomy nodes.`);

  const nodesByCode = new Map<string, TaxonomyArtifactNode>();
  for (const node of artifact.nodes) {
    if (nodesByCode.has(node.code)) throw new Error(`${artifact.system} contains duplicate code '${node.code}'.`);
    nodesByCode.set(node.code, node);
  }

  for (const node of artifact.nodes) {
    if (node.parentCode !== null && !nodesByCode.has(node.parentCode)) {
      throw new Error(`${artifact.system} parent '${node.parentCode}' for '${node.code}' was not found.`);
    }
    if (node.hierarchyCodes.at(-1) !== node.code) {
      throw new Error(`${artifact.system} hierarchy for '${node.code}' does not end with the selected code.`);
    }
    if (node.hierarchyCodes.length !== node.hierarchyLabels.length) {
      throw new Error(`${artifact.system} hierarchy for '${node.code}' has mismatched code and label lengths.`);
    }
  }
}

/**
 * Writes the same minified artifact into each runtime output directory.
 *
 * @param fileName - Generated artifact file name.
 * @param artifact - Validated taxonomy artifact.
 * @param outputRoots - Output roots; defaults to the API and website runtime directories.
 * @returns Paths written.
 */
export async function writeMirroredArtifacts(
  fileName: string,
  artifact: TaxonomyArtifact,
  outputRoots: readonly string[] = OUTPUT_ROOTS,
): Promise<readonly string[]> {
  validateArtifact(artifact);
  const contents = JSON.stringify(artifact);
  const paths = outputRoots.map((root) => resolve(root, fileName));

  await Promise.all(
    paths.map(async (path, index) => {
      const root = outputRoots[index];
      if (root === undefined) throw new Error(`Output root for '${path}' was not found.`);
      await mkdir(root, {recursive: true});
      await writeFile(path, contents, "utf8");
    }),
  );

  const writtenContents = await Promise.all(paths.map((path) => readFile(path, "utf8")));
  if (writtenContents.some((value) => value !== contents)) {
    throw new Error(`Mirrored artifact '${fileName}' was not written identically.`);
  }

  return paths;
}

async function createGpcArtifact(fetchImpl: typeof fetch, generatedAt: string): Promise<TaxonomyArtifact> {
  const response = await fetchImpl(GPC_SOURCE, {headers: {Accept: "application/zip"}});
  if (!response.ok) throw new Error(`GPC download failed with HTTP ${response.status} ${response.statusText}.`);

  const archive = new Uint8Array(await response.arrayBuffer());
  const jsonBytes = extractZipEntry(archive, " EN.json");
  const parsed: unknown = JSON.parse(Buffer.from(jsonBytes).toString("utf8"));
  const source = parseGpcDocument(parsed);
  if (source.LanguageCode !== "EN") throw new Error(`Expected English GPC data but received '${source.LanguageCode}'.`);

  return {
    system: "GS1_GPC",
    version: "2026-05",
    sourceUrl: GPC_SOURCE,
    generatedAt,
    attribution: "GS1 Global Product Classification (GPC), May 2026 release.",
    nodes: flattenGpcSchema(source.Schema),
  };
}

async function createEuArtifact(
  fetchImpl: typeof fetch,
  system: "ECOICOP_V2" | "NACE_2_1",
  version: string,
  scheme: string,
  generatedAt: string,
): Promise<TaxonomyArtifact> {
  const bindings = await fetchSparqlBindings(fetchImpl, scheme);
  return {
    system,
    version,
    sourceUrl: `${SPARQL_ENDPOINT}#${scheme}`,
    generatedAt,
    attribution: "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.",
    nodes: normalizeSparqlBindings(system, version, bindings),
  };
}

/**
 * Downloads and generates all mirrored taxonomy artifacts.
 *
 * @param fetchImpl - Fetch implementation, injectable for tests.
 * @param outputRoots - Runtime directories that receive byte-identical artifacts.
 * @returns Generated output paths.
 */
export async function generateTaxonomyArtifacts(
  fetchImpl: typeof fetch = fetch,
  outputRoots: readonly string[] = OUTPUT_ROOTS,
): Promise<readonly string[]> {
  const generatedAt = new Date().toISOString();
  const [gpc, ecoicop, nace] = await Promise.all([
    createGpcArtifact(fetchImpl, generatedAt),
    createEuArtifact(fetchImpl, "ECOICOP_V2", "2", ECOICOP_SCHEME, generatedAt),
    createEuArtifact(fetchImpl, "NACE_2_1", "2.1", NACE_SCHEME, generatedAt),
  ]);

  const outputGroups = await Promise.all([
    writeMirroredArtifacts(FILE_NAMES.GS1_GPC, gpc, outputRoots),
    writeMirroredArtifacts(FILE_NAMES.ECOICOP_V2, ecoicop, outputRoots),
    writeMirroredArtifacts(FILE_NAMES.NACE_2_1, nace, outputRoots),
  ]);
  return outputGroups.flat();
}

/**
 * Runs taxonomy artifact generation.
 *
 * @returns Process exit code.
 */
export async function main(): Promise<number> {
  const outputs = await generateTaxonomyArtifacts();
  console.info(`Generated ${outputs.length} taxonomy artifacts.`);
  for (const output of outputs) console.info(`  - ${output}`);
  return 0;
}

/**
 * Builds a platform-safe command for invoking this generator through the current Node.js executable.
 *
 * @returns Shell-independent command and arguments.
 */
export function buildTaxonomyArtifactGenerationCommand(): Readonly<{command: string; args: readonly string[]}> {
  return {
    command: process.execPath,
    args: [fileURLToPath(import.meta.url)],
  };
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectExecution) {
  try {
    process.exitCode = await main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
