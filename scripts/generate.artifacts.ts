/**
 * @fileoverview Generates taxonomy and license artifacts for the monorepo.
 * @module scripts.generate.artifacts
 */

import {execFile} from "node:child_process";
import {glob, mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {EOL, tmpdir} from "node:os";
import {basename, dirname, join, resolve} from "node:path";
import {promisify} from "node:util";
import {MonorepositoryConsoleLogger, MonorepositoryLogger} from "./common/logger.ts";
import type {
  ArtifactClassificationSystem,
  NodePackageDependencyType,
  NodePackageInformation,
  TaxonomyArtifact,
  TaxonomyArtifactNode,
} from "./types";

/** Base contract and shared invariants for taxonomy artifact generators. */
export abstract class TaxonomyClassificationGenerator {
  protected static readonly defaultOutputRoots = [
    resolve("sites/api.arolariu.ro/src/Invoices/Resources/Taxonomies"),
    resolve("sites/arolariu.ro/src/data/taxonomies"),
  ] as const;

  /** Runtime directories that receive mirrored taxonomy artifacts. */
  protected readonly outputRoots: readonly string[];

  /** Logger used for lifecycle, diagnostic, failure, and completion output. */
  protected readonly logger: MonorepositoryLogger;

  protected constructor(
    outputRoots: readonly string[] = TaxonomyClassificationGenerator.defaultOutputRoots,
    logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("generate::artifacts"),
  ) {
    this.outputRoots = outputRoots;
    this.logger = logger;
  }

  /** Generates one taxonomy and returns every written path. */
  public abstract generate(): Promise<readonly string[]>;

  protected isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  protected requireRecord(value: unknown, context: string): Readonly<Record<string, unknown>> {
    if (!this.isRecord(value)) throw new TypeError(`${context} must be an object.`);
    return value;
  }

  protected requireString(
    record: Readonly<Record<string, unknown>>,
    key: string,
    context: string,
  ): string {
    const value = record[key];
    if (typeof value !== "string") throw new TypeError(`${context} ${key} must be a string.`);
    if (value.trim().length === 0) {
      throw new TypeError(`${context} ${key} must be a non-empty string.`);
    }
    return value;
  }

  protected optionalString(
    record: Readonly<Record<string, unknown>>,
    key: string,
    context: string,
  ): string | null {
    const value = record[key];
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") {
      throw new TypeError(`${context} ${key} must be a string or null.`);
    }
    return value;
  }

  protected requireNumber(
    record: Readonly<Record<string, unknown>>,
    key: string,
    context: string,
  ): number {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${context} ${key} must be a number.`);
    }
    return value;
  }

  protected requireBoolean(
    record: Readonly<Record<string, unknown>>,
    key: string,
    context: string,
  ): boolean {
    const value = record[key];
    if (typeof value !== "boolean") {
      throw new TypeError(`${context} ${key} must be a boolean.`);
    }
    return value;
  }

  protected normalizeText(...parts: readonly (string | null | undefined)[]): string {
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

  protected buildHierarchy(
    nodes: readonly TaxonomyArtifactNode[],
    code: string,
  ): TaxonomyArtifactNode {
    const nodesByCode = new Map(nodes.map((node) => [node.code, node] as const));
    const selected = nodesByCode.get(code);
    if (selected === undefined) throw new Error(`Taxonomy code '${code}' was not found.`);

    const hierarchy: TaxonomyArtifactNode[] = [];
    const visited = new Set<string>();
    let current: TaxonomyArtifactNode | undefined = selected;

    while (current !== undefined) {
      if (visited.has(current.code)) {
        throw new Error(`Taxonomy hierarchy cycle detected at '${current.code}'.`);
      }
      visited.add(current.code);
      hierarchy.unshift(current);

      if (current.parentCode === null) break;
      const parent = nodesByCode.get(current.parentCode);
      if (parent === undefined) {
        throw new Error(
          `Taxonomy parent '${current.parentCode}' for '${current.code}' was not found.`,
        );
      }
      current = parent;
    }

    return {
      ...selected,
      hierarchyCodes: hierarchy.map((node) => node.code),
      hierarchyLabels: hierarchy.map((node) => node.officialLabel),
      searchText: this.normalizeText(
        selected.code,
        selected.officialLabel,
        selected.definition,
        ...hierarchy.map((node) => node.officialLabel),
      ),
    };
  }

  protected async writeArtifact(
    fileName: string,
    artifact: Readonly<TaxonomyArtifact>,
  ): Promise<readonly string[]> {
    this.validateArtifact(artifact);
    const contents = JSON.stringify(artifact);
    const paths = this.outputRoots.map((root) => resolve(root, fileName));

    await Promise.all(
      paths.map(async (path, index) => {
        const root = this.outputRoots[index];
        if (root === undefined) throw new Error(`Output root for '${path}' was not found.`);
        await mkdir(root, {recursive: true});
        await writeFile(path, contents, "utf8");
      }),
    );

    const writtenContents = await Promise.all(paths.map((path) => readFile(path, "utf8")));
    if (writtenContents.some((writtenContent) => writtenContent !== contents)) {
      throw new Error(`Mirrored artifact '${fileName}' was not written identically.`);
    }

    return paths;
  }

  private validateArtifact(artifact: Readonly<TaxonomyArtifact>): void {
    if (artifact.nodes.length === 0) {
      throw new Error(`${artifact.system} artifact contains no taxonomy nodes.`);
    }

    const nodesByCode = new Map<string, TaxonomyArtifactNode>();
    for (const node of artifact.nodes) {
      if (nodesByCode.has(node.code)) {
        throw new Error(`${artifact.system} contains duplicate code '${node.code}'.`);
      }
      nodesByCode.set(node.code, node);
    }

    for (const node of artifact.nodes) {
      if (node.parentCode !== null && !nodesByCode.has(node.parentCode)) {
        throw new Error(
          `${artifact.system} parent '${node.parentCode}' for '${node.code}' was not found.`,
        );
      }
      if (node.hierarchyCodes.at(-1) !== node.code) {
        throw new Error(
          `${artifact.system} hierarchy for '${node.code}' does not end with the selected code.`,
        );
      }
      if (node.hierarchyCodes.length !== node.hierarchyLabels.length) {
        throw new Error(
          `${artifact.system} hierarchy for '${node.code}' has mismatched code and label lengths.`,
        );
      }
    }
  }
}

/** Generates the official GS1 GPC taxonomy artifact. */
export class Gs1GpcTaxonomyClassificationGenerator extends TaxonomyClassificationGenerator {
  static readonly #sourceUrl = "https://ref.gs1.org/standards/gpc/2026-05/";
  static readonly #version = "2026-05";
  static readonly #fileName = "gpc-2026-05.min.json";
  static readonly #attribution =
    "GS1 Global Product Classification (GPC), May 2026 release.";
  static readonly #levels: Readonly<Record<number, string>> = {
    1: "segment",
    2: "family",
    3: "class",
    4: "brick",
  };

  /** Creates the generator. */
  public constructor(
    outputRoots?: readonly string[],
    logger?: MonorepositoryLogger,
  ) {
    super(outputRoots, logger);
  }

  /** Downloads, validates, normalizes, and writes the GPC artifact. */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[GPC] Starting generation.");
    try {
      this.logger.info("[GPC] Fetching the GS1 GPC source.");
      const response = await fetch(Gs1GpcTaxonomyClassificationGenerator.#sourceUrl, {
        headers: {Accept: "application/zip"},
      });
      if (!response.ok) {
        throw new Error(
          `GPC download failed with HTTP ${response.status} ${response.statusText}.`,
        );
      }

      const archive = new Uint8Array(await response.arrayBuffer());
      const jsonBytes = await new SystemArchiveExtractor().extractEntry(archive, " EN.json");
      const parsed: unknown = JSON.parse(Buffer.from(jsonBytes).toString("utf8"));
      const nodes = this.parseDocument(parsed);
      this.logger.debug(`[GPC] Normalized ${nodes.length} taxonomy node(s).`);
      this.logger.info("[GPC] Writing mirrored taxonomy artifacts.");

      const outputs = await this.writeArtifact(
        Gs1GpcTaxonomyClassificationGenerator.#fileName,
        {
          system: "GS1_GPC",
          version: Gs1GpcTaxonomyClassificationGenerator.#version,
          sourceUrl: Gs1GpcTaxonomyClassificationGenerator.#sourceUrl,
          generatedAt: new Date().toISOString(),
          attribution: Gs1GpcTaxonomyClassificationGenerator.#attribution,
          nodes,
        },
      );
      this.logger.success(`[GPC] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    } catch (error: unknown) {
      this.logger.error(`[GPC] ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private parseDocument(value: unknown): readonly TaxonomyArtifactNode[] {
    const document = this.requireRecord(value, "GPC document");
    const languageCode = this.requireString(document, "LanguageCode", "GPC document");
    if (languageCode !== "EN") {
      throw new Error(`Expected English GPC data but received '${languageCode}'.`);
    }
    this.requireString(document, "DateUtc", "GPC document");

    const schema = document["Schema"];
    if (!Array.isArray(schema)) throw new TypeError("GPC document Schema must be an array.");

    const nodes: TaxonomyArtifactNode[] = [];
    const visit = (
      rawNode: unknown,
      ancestors: readonly TaxonomyArtifactNode[],
    ): void => {
      const node = this.requireRecord(rawNode, "GPC node");
      const children = node["Childs"];
      if (!Array.isArray(children)) throw new TypeError("GPC node Childs must be an array.");
      const active = this.requireBoolean(node, "Active", "GPC node");
      if (!active) return;

      const levelNumber = this.requireNumber(node, "Level", "GPC node");
      const code = String(this.requireNumber(node, "Code", "GPC node"));
      const title = this.requireString(node, "Title", "GPC node").trim();
      const definition = this.optionalString(node, "Definition", "GPC node")?.trim() || null;
      this.optionalString(node, "DefinitionExcludes", "GPC node");
      const level = Gs1GpcTaxonomyClassificationGenerator.#levels[levelNumber];
      const current: TaxonomyArtifactNode | null =
        level === undefined
          ? null
          : {
              code,
              officialLabel: title,
              level,
              parentCode: ancestors.at(-1)?.code ?? null,
              hierarchyCodes: [...ancestors.map((ancestor) => ancestor.code), code],
              hierarchyLabels: [
                ...ancestors.map((ancestor) => ancestor.officialLabel),
                title,
              ],
              definition,
              searchText: this.normalizeText(
                code,
                title,
                definition,
                ...ancestors.map((ancestor) => ancestor.officialLabel),
              ),
            };

      if (current !== null) nodes.push(current);
      const nextAncestors = current === null ? ancestors : [...ancestors, current];
      for (const child of children) visit(child, nextAncestors);
    };

    for (const root of schema) visit(root, []);
    return nodes;
  }
}

/** Generates the official ECOICOP v2 taxonomy artifact. */
export class EcoicopTaxonomyClassificationGenerator extends TaxonomyClassificationGenerator {
  static readonly #endpoint = "https://publications.europa.eu/webapi/rdf/sparql";
  static readonly #scheme = "http://data.europa.eu/ed1/ecoicop2/ecoicop2";
  static readonly #pageSize = 5_000;
  static readonly #fileName = "ecoicop-v2.min.json";
  static readonly #attribution =
    "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.";

  /** Creates the generator. */
  public constructor(
    outputRoots?: readonly string[],
    logger?: MonorepositoryLogger,
  ) {
    super(outputRoots, logger);
  }

  /** Downloads, validates, normalizes, and writes the ECOICOP artifact. */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[ECOICOP] Starting generation.");
    try {
      this.logger.info("[ECOICOP] Fetching Publications Office taxonomy data.");
      const bindings = await this.fetchBindings();
      const nodes = this.normalizeBindings(bindings);
      this.logger.debug(`[ECOICOP] Normalized ${nodes.length} taxonomy node(s).`);
      this.logger.info("[ECOICOP] Writing mirrored taxonomy artifacts.");

      const outputs = await this.writeArtifact(
        EcoicopTaxonomyClassificationGenerator.#fileName,
        {
          system: "ECOICOP_V2",
          version: "2",
          sourceUrl: `${EcoicopTaxonomyClassificationGenerator.#endpoint}#${EcoicopTaxonomyClassificationGenerator.#scheme}`,
          generatedAt: new Date().toISOString(),
          attribution: EcoicopTaxonomyClassificationGenerator.#attribution,
          nodes,
        },
      );
      this.logger.success(`[ECOICOP] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    } catch (error: unknown) {
      this.logger.error(
        `[ECOICOP] ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async fetchBindings(): Promise<
    readonly Readonly<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }>[]
  > {
    const bindings: Array<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }> = [];

    for (
      let offset = 0;
      ;
      offset += EcoicopTaxonomyClassificationGenerator.#pageSize
    ) {
      const url = new URL(EcoicopTaxonomyClassificationGenerator.#endpoint);
      url.searchParams.set("query", this.createQuery(offset));
      url.searchParams.set("format", "application/sparql-results+json");
      const response = await fetch(url, {
        headers: {Accept: "application/sparql-results+json"},
      });
      if (!response.ok) {
        throw new Error(
          `SPARQL request failed with HTTP ${response.status} ${response.statusText}.`,
        );
      }

      const page = this.parseResponse(await response.json());
      bindings.push(...page);
      if (page.length < EcoicopTaxonomyClassificationGenerator.#pageSize) break;
    }

    return bindings;
  }

  private createQuery(offset: number): string {
    return `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?concept ?notation ?label ?broader WHERE {
  ?concept skos:inScheme <${EcoicopTaxonomyClassificationGenerator.#scheme}> ;
           skos:notation ?notation ;
           skos:prefLabel ?label .
  OPTIONAL { ?concept skos:broader ?broader . }
  FILTER(lang(?label) = "en")
}
ORDER BY ?notation
LIMIT ${EcoicopTaxonomyClassificationGenerator.#pageSize}
OFFSET ${offset}`;
  }

  private parseResponse(
    value: unknown,
  ): readonly Readonly<{
    concept: string;
    notation: string;
    label: string;
    broader: string | null;
  }>[] {
    const response = this.requireRecord(value, "SPARQL response");
    const results = this.requireRecord(response["results"], "SPARQL response.results");
    const bindings = results["bindings"];
    if (!Array.isArray(bindings)) {
      throw new TypeError("SPARQL response.results.bindings must be an array.");
    }

    return bindings.map((rawBinding, index) => {
      const binding = this.requireRecord(rawBinding, `SPARQL binding[${index}]`);
      return {
        concept: this.readBindingValue(binding, "concept", true) ?? "",
        notation: this.readBindingValue(binding, "notation", true) ?? "",
        label: this.readBindingValue(binding, "label", true) ?? "",
        broader: this.readBindingValue(binding, "broader", false),
      };
    });
  }

  private readBindingValue(
    binding: Readonly<Record<string, unknown>>,
    key: string,
    required: boolean,
  ): string | null {
    const rawValue = binding[key];
    if (rawValue === undefined) {
      if (!required) return null;
      throw new TypeError(`SPARQL binding '${key}' is required.`);
    }
    const value = this.requireRecord(rawValue, `SPARQL binding '${key}'`)["value"];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`SPARQL binding '${key}'.value must be a non-empty string.`);
    }
    return value;
  }

  private normalizeBindings(
    bindings: readonly Readonly<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }>[],
  ): readonly TaxonomyArtifactNode[] {
    const codeByConcept = new Map(
      bindings.map((binding) => [binding.concept, binding.notation] as const),
    );
    const provisional = bindings.map<TaxonomyArtifactNode>((binding) => {
      const parentCode =
        binding.broader === null ? null : codeByConcept.get(binding.broader);
      if (binding.broader !== null && parentCode === undefined) {
        throw new Error(
          `Unresolved parent '${binding.broader}' for taxonomy code '${binding.notation}'.`,
        );
      }
      const label = this.stripCodePrefix(binding.label, binding.notation);
      const segmentCount = binding.notation.split(".").length;

      return {
        code: binding.notation,
        officialLabel: label,
        level:
          ["division", "group", "class", "subclass"][segmentCount - 1] ??
          `level-${segmentCount}`,
        parentCode,
        hierarchyCodes: [],
        hierarchyLabels: [],
        definition: null,
        searchText: this.normalizeText(binding.notation, label),
      };
    });

    return provisional
      .map((node) => this.buildHierarchy(provisional, node.code))
      .toSorted((left, right) =>
        left.code.localeCompare(right.code, "en", {numeric: true}),
      );
  }

  private stripCodePrefix(label: string, notation: string): string {
    const trimmed = label.trim();
    if (!trimmed.startsWith(notation)) return trimmed;
    const withoutNotation = trimmed
      .slice(notation.length)
      .replace(/^[\s:–—-]+/u, "")
      .trim();
    return withoutNotation.length > 0 ? withoutNotation : trimmed;
  }
}

/** Generates the official NACE 2.1 taxonomy artifact. */
export class NaceTaxonomyClassificationGenerator extends TaxonomyClassificationGenerator {
  static readonly #endpoint = "https://publications.europa.eu/webapi/rdf/sparql";
  static readonly #scheme = "http://data.europa.eu/ux2/nace2.1/nace2.1";
  static readonly #pageSize = 5_000;
  static readonly #fileName = "nace-2.1.min.json";
  static readonly #attribution =
    "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.";

  /** Creates the generator. */
  public constructor(
    outputRoots?: readonly string[],
    logger?: MonorepositoryLogger,
  ) {
    super(outputRoots, logger);
  }

  /** Downloads, validates, normalizes, and writes the NACE artifact. */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[NACE] Starting generation.");
    try {
      this.logger.info("[NACE] Fetching Publications Office taxonomy data.");
      const bindings = await this.fetchBindings();
      const nodes = this.normalizeBindings(bindings);
      this.logger.debug(`[NACE] Normalized ${nodes.length} taxonomy node(s).`);
      this.logger.info("[NACE] Writing mirrored taxonomy artifacts.");

      const outputs = await this.writeArtifact(
        NaceTaxonomyClassificationGenerator.#fileName,
        {
          system: "NACE_2_1",
          version: "2.1",
          sourceUrl: `${NaceTaxonomyClassificationGenerator.#endpoint}#${NaceTaxonomyClassificationGenerator.#scheme}`,
          generatedAt: new Date().toISOString(),
          attribution: NaceTaxonomyClassificationGenerator.#attribution,
          nodes,
        },
      );
      this.logger.success(`[NACE] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    } catch (error: unknown) {
      this.logger.error(`[NACE] ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async fetchBindings(): Promise<
    readonly Readonly<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }>[]
  > {
    const bindings: Array<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }> = [];

    for (let offset = 0; ; offset += NaceTaxonomyClassificationGenerator.#pageSize) {
      const url = new URL(NaceTaxonomyClassificationGenerator.#endpoint);
      url.searchParams.set("query", this.createQuery(offset));
      url.searchParams.set("format", "application/sparql-results+json");
      const response = await fetch(url, {
        headers: {Accept: "application/sparql-results+json"},
      });
      if (!response.ok) {
        throw new Error(
          `SPARQL request failed with HTTP ${response.status} ${response.statusText}.`,
        );
      }

      const page = this.parseResponse(await response.json());
      bindings.push(...page);
      if (page.length < NaceTaxonomyClassificationGenerator.#pageSize) break;
    }

    return bindings;
  }

  private createQuery(offset: number): string {
    return `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?concept ?notation ?label ?broader WHERE {
  ?concept skos:inScheme <${NaceTaxonomyClassificationGenerator.#scheme}> ;
           skos:notation ?notation ;
           skos:prefLabel ?label .
  OPTIONAL { ?concept skos:broader ?broader . }
  FILTER(lang(?label) = "en")
}
ORDER BY ?notation
LIMIT ${NaceTaxonomyClassificationGenerator.#pageSize}
OFFSET ${offset}`;
  }

  private parseResponse(
    value: unknown,
  ): readonly Readonly<{
    concept: string;
    notation: string;
    label: string;
    broader: string | null;
  }>[] {
    const response = this.requireRecord(value, "SPARQL response");
    const results = this.requireRecord(response["results"], "SPARQL response.results");
    const bindings = results["bindings"];
    if (!Array.isArray(bindings)) {
      throw new TypeError("SPARQL response.results.bindings must be an array.");
    }

    return bindings.map((rawBinding, index) => {
      const binding = this.requireRecord(rawBinding, `SPARQL binding[${index}]`);
      return {
        concept: this.readBindingValue(binding, "concept", true) ?? "",
        notation: this.readBindingValue(binding, "notation", true) ?? "",
        label: this.readBindingValue(binding, "label", true) ?? "",
        broader: this.readBindingValue(binding, "broader", false),
      };
    });
  }

  private readBindingValue(
    binding: Readonly<Record<string, unknown>>,
    key: string,
    required: boolean,
  ): string | null {
    const rawValue = binding[key];
    if (rawValue === undefined) {
      if (!required) return null;
      throw new TypeError(`SPARQL binding '${key}' is required.`);
    }
    const value = this.requireRecord(rawValue, `SPARQL binding '${key}'`)["value"];
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new TypeError(`SPARQL binding '${key}'.value must be a non-empty string.`);
    }
    return value;
  }

  private normalizeBindings(
    bindings: readonly Readonly<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }>[],
  ): readonly TaxonomyArtifactNode[] {
    const codeByConcept = new Map(
      bindings.map((binding) => [binding.concept, binding.notation] as const),
    );
    const provisional = bindings.map<TaxonomyArtifactNode>((binding) => {
      const parentCode =
        binding.broader === null ? null : codeByConcept.get(binding.broader);
      if (binding.broader !== null && parentCode === undefined) {
        throw new Error(
          `Unresolved parent '${binding.broader}' for taxonomy code '${binding.notation}'.`,
        );
      }
      const label = this.stripCodePrefix(binding.label, binding.notation);

      return {
        code: binding.notation,
        officialLabel: label,
        level: this.getLevel(binding.notation),
        parentCode,
        hierarchyCodes: [],
        hierarchyLabels: [],
        definition: null,
        searchText: this.normalizeText(binding.notation, label),
      };
    });

    return provisional
      .map((node) => this.buildHierarchy(provisional, node.code))
      .toSorted((left, right) =>
        left.code.localeCompare(right.code, "en", {numeric: true}),
      );
  }

  private stripCodePrefix(label: string, notation: string): string {
    const trimmed = label.trim();
    if (!trimmed.startsWith(notation)) return trimmed;
    const withoutNotation = trimmed
      .slice(notation.length)
      .replace(/^[\s:–—-]+/u, "")
      .trim();
    return withoutNotation.length > 0 ? withoutNotation : trimmed;
  }

  private getLevel(code: string): string {
    if (/^[A-Z]$/u.test(code)) return "section";
    if (/^\d{2}$/u.test(code)) return "division";
    if (/^\d{2}\.\d$/u.test(code)) return "group";
    if (/^\d{2}\.\d{2}$/u.test(code)) return "class";
    return "code";
  }
}

/** Base contract and shared helpers for license generators. */
export abstract class LicenseGenerator {
  /** Logger used for lifecycle, warning, failure, and completion output. */
  protected readonly logger: MonorepositoryLogger;

  protected constructor(
    logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("generate::artifacts"),
  ) {
    this.logger = logger;
  }

  /** Generates one license document family and returns every written path. */
  public abstract generate(): Promise<readonly string[]>;

  protected isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  protected readJsonRecord(
    contents: string,
    manifestPath: string,
  ): Readonly<Record<string, unknown>> {
    const parsed: unknown = JSON.parse(contents);
    if (!this.isRecord(parsed)) {
      throw new TypeError(`Package manifest '${manifestPath}' must be an object.`);
    }
    return parsed;
  }

  protected readOptionalString(
    manifest: Readonly<Record<string, unknown>>,
    key: string,
    manifestPath: string,
  ): string | undefined {
    const value = manifest[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") {
      throw new TypeError(
        `Package manifest '${manifestPath}' field '${key}' must be a string.`,
      );
    }
    return value;
  }

  protected readDependencyMap(
    manifest: Readonly<Record<string, unknown>>,
    key: string,
    manifestPath: string,
  ): Readonly<Record<string, string>> {
    const value = manifest[key];
    if (value === undefined) return {};
    if (!this.isRecord(value)) {
      throw new TypeError(
        `Package manifest '${manifestPath}' field '${key}' must be an object.`,
      );
    }

    const dependencies: Record<string, string> = {};
    for (const [name, version] of Object.entries(value)) {
      if (typeof version !== "string") {
        throw new TypeError(
          `Package manifest '${manifestPath}' dependency '${name}' must have a string version.`,
        );
      }
      dependencies[name] = version;
    }
    return dependencies;
  }
}

/** Generates the frontend third-party license document. */
export class FrontendLicenseGenerator extends LicenseGenerator {
  /** Repository root containing the frontend manifest and installed packages. */
  private readonly workspaceRoot: string;

  /** Creates the generator. */
  public constructor(
    workspaceRoot: string = process.cwd(),
    logger?: MonorepositoryLogger,
  ) {
    super(logger);
    this.workspaceRoot = workspaceRoot;
  }

  /** Reads direct frontend dependencies and writes licenses.json. */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[Frontend licenses] Starting generation.");
    try {
      this.logger.info("[Frontend licenses] Reading the frontend dependency manifest.");
      const declaredDependencies = await this.readDeclaredDependencies();
      const manifestPaths = await this.findInstalledManifestPaths();
      this.logger.debug(
        `[Frontend licenses] Discovered ${manifestPaths.length} direct installed package manifest(s).`,
      );
      const resolvedPackages = await Promise.all(
        manifestPaths.map((manifestPath) =>
          this.readInstalledPackage(manifestPath, declaredDependencies),
        ),
      );
      const groupedPackages = new Map<NodePackageDependencyType, NodePackageInformation[]>();

      for (const resolvedPackage of resolvedPackages) {
        if (resolvedPackage === null) continue;
        const packages = groupedPackages.get(resolvedPackage.dependencyType) ?? [];
        packages.push(resolvedPackage.packageInformation);
        groupedPackages.set(resolvedPackage.dependencyType, packages);
      }

      const packageCount = [...groupedPackages.values()].reduce(
        (total, packages) => total + packages.length,
        0,
      );
      this.logger.debug(`[Frontend licenses] Grouped ${packageCount} declared package(s).`);
      const outputPath = join(
        this.workspaceRoot,
        "sites",
        "arolariu.ro",
        "licenses.json",
      );
      const sortedPackages = new Map<
        NodePackageDependencyType,
        readonly NodePackageInformation[]
      >();
      for (const [dependencyType, packageInformation] of groupedPackages) {
        sortedPackages.set(
          dependencyType,
          packageInformation.toSorted((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
      }

      this.logger.info("[Frontend licenses] Writing licenses.json.");
      await mkdir(dirname(outputPath), {recursive: true});
      await writeFile(
        outputPath,
        `${JSON.stringify(Object.fromEntries(sortedPackages))}${EOL}`,
        "utf8",
      );
      this.logger.success("[Frontend licenses] Generated 1 artifact file(s).");
      return [outputPath];
    } catch (error: unknown) {
      this.logger.error(
        `[Frontend licenses] ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private async readDeclaredDependencies(): Promise<
    ReadonlyMap<NodePackageDependencyType, readonly string[]>
  > {
    const manifestPath = join(
      this.workspaceRoot,
      "sites",
      "arolariu.ro",
      "package.json",
    );
    const manifest = this.readJsonRecord(
      await readFile(manifestPath, "utf8"),
      manifestPath,
    );
    return new Map<NodePackageDependencyType, readonly string[]>([
      ["production", Object.keys(this.readDependencyMap(manifest, "dependencies", manifestPath))],
      [
        "development",
        Object.keys(this.readDependencyMap(manifest, "devDependencies", manifestPath)),
      ],
      ["peer", Object.keys(this.readDependencyMap(manifest, "peerDependencies", manifestPath))],
    ]);
  }

  private async findInstalledManifestPaths(): Promise<readonly string[]> {
    const nodeModulesRoot = join(this.workspaceRoot, "node_modules");
    const paths: string[] = [];
    for await (const manifestPath of glob(
      ["*/package.json", "@*/*/package.json"],
      {cwd: nodeModulesRoot},
    )) {
      paths.push(join(nodeModulesRoot, manifestPath));
    }
    return paths;
  }

  private async readInstalledPackage(
    manifestPath: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): Promise<
    Readonly<{
      dependencyType: NodePackageDependencyType;
      packageInformation: NodePackageInformation;
    }> | null
  > {
    const manifest = this.readJsonRecord(
      await readFile(manifestPath, "utf8"),
      manifestPath,
    );
    const packageName =
      this.readOptionalString(manifest, "name", manifestPath) ??
      basename(dirname(manifestPath));
    const dependencyType = this.resolveDependencyType(
      packageName,
      declaredDependencies,
    );
    if (dependencyType === null) return null;

    const authorValue = manifest["author"];
    let author = "unknown";
    if (typeof authorValue === "string") {
      author = authorValue;
    } else if (
      this.isRecord(authorValue) &&
      typeof authorValue["name"] === "string"
    ) {
      author = authorValue["name"];
    } else if (authorValue !== undefined) {
      throw new TypeError(
        `Package manifest '${manifestPath}' field 'author' must be a string or named object.`,
      );
    }

    const repositoryValue = manifest["repository"];
    let repositoryUrl: string | undefined;
    if (typeof repositoryValue === "string") {
      repositoryUrl = repositoryValue;
    } else if (
      this.isRecord(repositoryValue) &&
      typeof repositoryValue["url"] === "string"
    ) {
      repositoryUrl = repositoryValue["url"];
    } else if (repositoryValue !== undefined) {
      throw new TypeError(
        `Package manifest '${manifestPath}' field 'repository' must be a string or URL object.`,
      );
    }

    const dependencyMaps = [
      this.readDependencyMap(manifest, "dependencies", manifestPath),
      this.readDependencyMap(manifest, "devDependencies", manifestPath),
      this.readDependencyMap(manifest, "peerDependencies", manifestPath),
    ];
    const dependents = dependencyMaps.flatMap((dependencies) =>
      Object.entries(dependencies).map(([name, version]) => ({name, version})),
    );

    return {
      dependencyType,
      packageInformation: {
        name: packageName,
        author,
        description:
          this.readOptionalString(manifest, "description", manifestPath) ??
          "This package has not provided a valid description.",
        homepage:
          this.readOptionalString(manifest, "homepage", manifestPath) ??
          repositoryUrl ??
          "unknown",
        license:
          this.readOptionalString(manifest, "license", manifestPath) ?? "unknown",
        version:
          this.readOptionalString(manifest, "version", manifestPath) ?? "unknown",
        dependents,
      },
    };
  }

  private resolveDependencyType(
    packageName: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): NodePackageDependencyType | null {
    for (const dependencyType of ["production", "development", "peer"] as const) {
      if (declaredDependencies.get(dependencyType)?.includes(packageName) === true) {
        return dependencyType;
      }
    }
    return null;
  }
}

/** Reserved backend license generator; backend discovery is intentionally deferred. */
export class BackendLicenseGenerator extends LicenseGenerator {
  /** Creates the deferred backend license generator. */
  public constructor(logger?: MonorepositoryLogger) {
    super(logger);
  }

  /** Returns no outputs until backend license discovery is defined. */
  public override async generate(): Promise<readonly string[]> {
    this.logger.warn(
      "[Backend licenses] Generation is intentionally deferred; no artifact was written.",
    );
    return [];
  }
}

/** Extracts ZIP entries by delegating to the host operating system. */
class SystemArchiveExtractor {
  static readonly #executeFile = promisify(execFile);

  /** Extracts one archive entry selected by suffix. */
  public async extractEntry(
    archive: Uint8Array,
    suffix: string,
  ): Promise<Uint8Array> {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "arolariu-taxonomy-"));
    const archivePath = join(temporaryRoot, "source.zip");
    const outputDirectory = join(temporaryRoot, "extracted");
    const extractionCommand = this.createCommand(archivePath, outputDirectory);

    try {
      await mkdir(outputDirectory, {recursive: true});
      await writeFile(archivePath, archive);

      try {
        await SystemArchiveExtractor.#executeFile(
          extractionCommand.command,
          [...extractionCommand.args],
        );
      } catch (error: unknown) {
        if (this.hasErrorCode(error) && error.code === "ENOENT") {
          throw new Error(
            `Required archive extractor '${extractionCommand.command}' was not found on '${process.platform}'.`,
            {cause: error},
          );
        }
        throw error;
      }

      const matchingPaths: string[] = [];
      for await (const extractedPath of glob("**/*", {cwd: outputDirectory})) {
        if (extractedPath.endsWith(suffix)) matchingPaths.push(extractedPath);
      }

      if (matchingPaths.length === 0) {
        throw new Error(`Extracted archive entry ending with '${suffix}' was not found.`);
      }
      if (matchingPaths.length > 1) {
        throw new Error(
          `Extracted archive contains multiple entries ending with '${suffix}'.`,
        );
      }

      const matchingPath = matchingPaths[0];
      if (matchingPath === undefined) {
        throw new Error(`Extracted archive entry ending with '${suffix}' was not found.`);
      }

      return new Uint8Array(await readFile(join(outputDirectory, matchingPath)));
    } finally {
      await rm(temporaryRoot, {recursive: true, force: true});
    }
  }

  private createCommand(
    archivePath: string,
    outputDirectory: string,
  ): Readonly<{command: string; args: readonly string[]}> {
    return process.platform === "win32"
      ? {command: "tar.exe", args: ["-xf", archivePath, "-C", outputDirectory]}
      : {command: "unzip", args: ["-qq", archivePath, "-d", outputDirectory]};
  }

  private hasErrorCode(error: unknown): error is Error & Readonly<{code: string}> {
    return (
      error instanceof Error &&
      "code" in error &&
      typeof Reflect.get(error, "code") === "string"
    );
  }
}

/**
 * Runs every taxonomy and license generator.
 *
 * @param options - Optional roots used by targeted tests and alternate workspaces.
 * @returns Process exit code.
 */
export async function main(
  options: Readonly<{
    outputRoots?: readonly string[];
    workspaceRoot?: string;
  }> = {},
): Promise<number> {
  const logger = new MonorepositoryConsoleLogger("generate::artifacts");
  logger.info("Starting 5 artifact generator(s).");
  const generators = [
    new Gs1GpcTaxonomyClassificationGenerator(options.outputRoots, logger),
    new EcoicopTaxonomyClassificationGenerator(options.outputRoots, logger),
    new NaceTaxonomyClassificationGenerator(options.outputRoots, logger),
    new FrontendLicenseGenerator(options.workspaceRoot, logger),
    new BackendLicenseGenerator(logger),
  ] as const;
  const outputs = (
    await Promise.all(generators.map((generator) => generator.generate()))
  ).flat();

  logger.success(`Generated ${outputs.length} artifact file(s).`);
  logger.debug(`Output paths: ${outputs.join(", ")}`);
  return 0;
}
