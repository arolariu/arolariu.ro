/**
 * @fileoverview Generates taxonomy and license artifacts for the monorepo.
 * @module scripts.generate.artifacts
 */

import {execFile} from "node:child_process";
import {access, glob, mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
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

/** Delays between the three bounded taxonomy source attempts. */
const TAXONOMY_SOURCE_RETRY_DELAYS_MS = [1_000, 4_000] as const;

/** Per-attempt timeout that replaces Node's five-minute fetch default. */
const TAXONOMY_SOURCE_TIMEOUT_MS = 30_000;

/** Stable fields that identify the exact taxonomy expected by one generator. */
type TaxonomyArtifactIdentity = Readonly<Pick<TaxonomyArtifact, "system" | "version" | "sourceUrl" | "attribution">>;

/** Marks exhausted transient source failures that may use a validated cache. */
class TaxonomySourceUnavailableError extends Error {
  public constructor(message: string, cause: Error) {
    super(message, {cause});
    this.name = "TaxonomySourceUnavailableError";
  }
}

/**
 * Base contract and shared invariants for taxonomy artifact generators.
 *
 * @remarks
 * Concrete generators own source-specific fetching and parsing. This base owns
 * runtime guards, normalization, hierarchy reconstruction, artifact validation,
 * mirrored serialization, and lifecycle logging dependencies.
 */
export abstract class TaxonomyClassificationGenerator {
  /** Default API and website directories that receive byte-identical artifacts. */
  protected static readonly defaultOutputRoots = [
    resolve("sites/api.arolariu.ro/src/Invoices/Resources/Taxonomies"),
    resolve("sites/arolariu.ro/src/data/taxonomies"),
  ] as const;

  /** Runtime directories that receive mirrored taxonomy artifacts. */
  protected readonly outputRoots: readonly string[];

  /** Logger used for lifecycle, diagnostic, failure, and completion output. */
  protected readonly logger: MonorepositoryLogger;

  /**
   * Creates a taxonomy generator.
   *
   * @param outputRoots - Runtime directories that receive mirrored artifacts.
   * @param logger - Logger used for lifecycle and failure output.
   */
  protected constructor(
    outputRoots: readonly string[] = TaxonomyClassificationGenerator.defaultOutputRoots,
    logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("generate::artifacts"),
  ) {
    this.outputRoots = outputRoots;
    this.logger = logger;
  }

  /**
   * Generates one taxonomy.
   *
   * @returns Every artifact path written by the generator.
   * @throws {Error} When fetching, parsing, validation, or writing fails.
   */
  public abstract generate(): Promise<readonly string[]>;

  /**
   * Determines whether an unknown value is a plain record.
   *
   * @param value - Value to inspect.
   * @returns `true` when the value is a non-array object.
   */
  protected isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Requires an unknown value to be a plain record.
   *
   * @param value - Value to validate.
   * @param context - Human-readable source location used in errors.
   * @returns Validated record.
   * @throws {TypeError} When the value is not a record.
   */
  protected requireRecord(value: unknown, context: string): Readonly<Record<string, unknown>> {
    if (!this.isRecord(value)) throw new TypeError(`${context} must be an object.`);
    return value;
  }

  /**
   * Reads a required non-empty string field.
   *
   * @param record - Source record.
   * @param key - Field name.
   * @param context - Human-readable source location used in errors.
   * @returns Validated string.
   * @throws {TypeError} When the field is missing, empty, or not a string.
   */
  protected requireString(record: Readonly<Record<string, unknown>>, key: string, context: string): string {
    const value = record[key];
    if (typeof value !== "string") throw new TypeError(`${context} ${key} must be a string.`);
    if (value.trim().length === 0) {
      throw new TypeError(`${context} ${key} must be a non-empty string.`);
    }
    return value;
  }

  /**
   * Reads an optional nullable string field.
   *
   * @param record - Source record.
   * @param key - Field name.
   * @param context - Human-readable source location used in errors.
   * @returns String value or `null` when absent.
   * @throws {TypeError} When a present value is not a string.
   */
  protected optionalString(record: Readonly<Record<string, unknown>>, key: string, context: string): string | null {
    const value = record[key];
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") {
      throw new TypeError(`${context} ${key} must be a string or null.`);
    }
    return value;
  }

  /**
   * Reads a required finite numeric field.
   *
   * @param record - Source record.
   * @param key - Field name.
   * @param context - Human-readable source location used in errors.
   * @returns Validated number.
   * @throws {TypeError} When the field is not a finite number.
   */
  protected requireNumber(record: Readonly<Record<string, unknown>>, key: string, context: string): number {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError(`${context} ${key} must be a number.`);
    }
    return value;
  }

  /**
   * Reads a required boolean field.
   *
   * @param record - Source record.
   * @param key - Field name.
   * @param context - Human-readable source location used in errors.
   * @returns Validated boolean.
   * @throws {TypeError} When the field is not boolean.
   */
  protected requireBoolean(record: Readonly<Record<string, unknown>>, key: string, context: string): boolean {
    const value = record[key];
    if (typeof value !== "boolean") {
      throw new TypeError(`${context} ${key} must be a boolean.`);
    }
    return value;
  }

  /**
   * Normalizes source text for accent-insensitive taxonomy search.
   *
   * @param parts - Source fragments to combine.
   * @returns Lowercase normalized text with stable whitespace.
   */
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

  /**
   * Rebuilds the root-to-node hierarchy for one provisional node.
   *
   * @param nodesByCode - Complete provisional taxonomy nodes keyed by code.
   * @param code - Selected node code.
   * @returns Selected node with complete hierarchy and normalized search text.
   * @throws {Error} When the code is absent, a parent is missing, or a cycle exists.
   */
  protected buildHierarchy(nodesByCode: ReadonlyMap<string, TaxonomyArtifactNode>, code: string): TaxonomyArtifactNode {
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
        throw new Error(`Taxonomy parent '${current.parentCode}' for '${current.code}' was not found.`);
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

  /**
   * Fetches and consumes one taxonomy response with bounded transient retries.
   *
   * @param sourceName - Generator label used in retry diagnostics.
   * @param requestName - Request label used in HTTP failure messages.
   * @param input - Source URL.
   * @param init - Fetch options.
   * @param consume - Response body consumer executed inside the timeout boundary.
   * @returns Consumed response value.
   * @throws {TaxonomySourceUnavailableError} After transient attempts are exhausted.
   * @throws {Error} Immediately for non-transient HTTP or response-consumption failures.
   */
  protected async fetchSource<T>(
    sourceName: string,
    requestName: string,
    input: string | URL,
    init: RequestInit,
    consume: (response: Response) => Promise<T>,
  ): Promise<T> {
    const totalAttempts = TAXONOMY_SOURCE_RETRY_DELAYS_MS.length + 1;
    let lastFailure: Error | undefined;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      const timeoutSignal = AbortSignal.timeout(TAXONOMY_SOURCE_TIMEOUT_MS);
      const signal = init.signal === undefined || init.signal === null ? timeoutSignal : AbortSignal.any([init.signal, timeoutSignal]);
      let response: Response;

      try {
        response = await fetch(input, {...init, signal});
      } catch (error: unknown) {
        if (init.signal?.aborted === true) throw error;
        lastFailure = this.toError(error);
        const retryDelay = TAXONOMY_SOURCE_RETRY_DELAYS_MS[attempt - 1];
        if (retryDelay === undefined) break;
        this.logSourceRetry(sourceName, lastFailure, attempt, totalAttempts, retryDelay);
        await this.wait(retryDelay);
        continue;
      }

      if (!response.ok) {
        const failure = new Error(`${requestName} failed with HTTP ${response.status} ${response.statusText}.`);
        if (!this.isTransientHttpStatus(response.status)) throw failure;

        lastFailure = failure;
        const retryDelay = TAXONOMY_SOURCE_RETRY_DELAYS_MS[attempt - 1];
        if (retryDelay === undefined) break;
        this.logSourceRetry(sourceName, failure, attempt, totalAttempts, retryDelay);
        await this.wait(retryDelay);
        continue;
      }

      try {
        return await consume(response);
      } catch (error: unknown) {
        if (!this.isTransientTransportError(error)) throw error;
        lastFailure = this.toError(error);
        const retryDelay = TAXONOMY_SOURCE_RETRY_DELAYS_MS[attempt - 1];
        if (retryDelay === undefined) break;
        this.logSourceRetry(sourceName, lastFailure, attempt, totalAttempts, retryDelay);
        await this.wait(retryDelay);
      }
    }

    const failure = lastFailure ?? new Error(`${requestName} failed without an error.`);
    throw new TaxonomySourceUnavailableError(failure.message, failure);
  }

  /**
   * Uses a checked-in mirrored artifact after transient source retries fail.
   *
   * @param sourceName - Generator label used in fallback diagnostics.
   * @param fileName - Expected cached artifact file name.
   * @param identity - Exact taxonomy identity required from the cache.
   * @param sourceError - Error raised by source generation.
   * @returns Validated cached paths in output-root order.
   * @throws {Error} When the source error is non-transient or the cache is unusable.
   */
  protected async resolveGenerationFailure(
    sourceName: string,
    fileName: string,
    identity: TaxonomyArtifactIdentity,
    sourceError: unknown,
  ): Promise<readonly string[]> {
    try {
      return await this.useCachedArtifact(sourceName, fileName, identity, sourceError);
    } catch (error: unknown) {
      this.logger.error(`[${sourceName}] ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Validates and returns the tracked taxonomy cache for an unavailable source.
   *
   * @param sourceName - Generator label used in fallback diagnostics.
   * @param fileName - Expected cached artifact file name.
   * @param identity - Exact taxonomy identity required from the cache.
   * @param sourceError - Error raised by source generation.
   * @returns Validated cached paths in output-root order.
   */
  private async useCachedArtifact(
    sourceName: string,
    fileName: string,
    identity: TaxonomyArtifactIdentity,
    sourceError: unknown,
  ): Promise<readonly string[]> {
    if (!(sourceError instanceof TaxonomySourceUnavailableError)) throw sourceError;

    const paths = this.outputRoots.map((root) => resolve(root, fileName));
    if (paths.length === 0) {
      throw new Error(`${sourceError.message} Cached taxonomy artifact '${fileName}' has no configured output roots.`, {
        cause: sourceError,
      });
    }

    let cachedContents: readonly string[];
    try {
      cachedContents = await Promise.all(paths.map((path) => readFile(path, "utf8")));
    } catch (error: unknown) {
      const cacheError = this.toError(error);
      throw new Error(`${sourceError.message} Cached taxonomy artifact '${fileName}' could not be read: ${cacheError.message}`, {
        cause: new AggregateError([sourceError, cacheError]),
      });
    }

    const firstContents = cachedContents[0];
    if (firstContents === undefined || cachedContents.some((contents) => contents !== firstContents)) {
      throw new Error(`Cached taxonomy artifact '${fileName}' is not byte-identical across output roots.`, {cause: sourceError});
    }

    let artifact: TaxonomyArtifact;
    try {
      artifact = this.parseArtifact(firstContents);
      this.validateArtifactIdentity(fileName, artifact, identity);
    } catch (error: unknown) {
      const cacheError = this.toError(error);
      throw new Error(`${sourceError.message} Cached taxonomy artifact '${fileName}' is invalid: ${cacheError.message}`, {
        cause: new AggregateError([sourceError, cacheError]),
      });
    }

    this.logger.warn(`[${sourceName}] Source unavailable after retries; using validated cached artifact '${fileName}'.`);
    return paths;
  }

  /**
   * Validates, serializes, and writes an artifact to every runtime root.
   *
   * @param fileName - Generated artifact file name.
   * @param artifact - Artifact contract to validate and serialize.
   * @returns Absolute paths written in output-root order.
   * @throws {Error} When validation, writing, or read-back comparison fails.
   */
  protected async writeArtifact(fileName: string, artifact: Readonly<TaxonomyArtifact>): Promise<readonly string[]> {
    this.validateArtifact(artifact);
    const paths = this.outputRoots.map((root) => resolve(root, fileName));
    const existingContents = await this.readExistingArtifactContents(paths);
    const contents = this.selectStableArtifactContents(fileName, artifact, existingContents);

    await Promise.all(
      paths.map(async (path, index) => {
        if (existingContents[index] === contents) return;
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

  /**
   * Reads optional existing mirrors without hiding non-missing filesystem errors.
   *
   * @param paths - Absolute mirror paths.
   * @returns Existing contents, using `null` only for missing paths.
   */
  private async readExistingArtifactContents(paths: readonly string[]): Promise<readonly (string | null)[]> {
    return await Promise.all(
      paths.map(async (path) => {
        try {
          return await readFile(path, "utf8");
        } catch (error: unknown) {
          if (this.isMissingPathError(error)) return null;
          throw error;
        }
      }),
    );
  }

  /**
   * Preserves a tracked artifact timestamp when all semantic data is unchanged.
   *
   * @param fileName - Artifact name used in diagnostics.
   * @param artifact - Newly generated artifact.
   * @param existingContents - Optional current mirror contents.
   * @returns Canonical contents to retain or write.
   */
  private selectStableArtifactContents(
    fileName: string,
    artifact: Readonly<TaxonomyArtifact>,
    existingContents: readonly (string | null)[],
  ): string {
    const generatedContents = JSON.stringify(artifact);
    if (existingContents.length === 0 || existingContents.some((contents) => contents === null)) {
      return generatedContents;
    }

    const firstContents = existingContents[0];
    if (firstContents === undefined || firstContents === null || existingContents.some((contents) => contents !== firstContents)) {
      this.logger.warn(`Existing mirrored artifact '${fileName}' diverged and will be replaced.`);
      return generatedContents;
    }

    try {
      const existingArtifact = this.parseArtifact(firstContents);
      const stableCandidate = JSON.stringify({
        ...artifact,
        generatedAt: existingArtifact.generatedAt,
      });
      if (stableCandidate === firstContents) {
        this.logger.debug(`Artifact '${fileName}' is unchanged; preserving its tracked bytes.`);
        return firstContents;
      }
    } catch (error: unknown) {
      this.logger.warn(`Existing artifact '${fileName}' is invalid and will be replaced: ${this.toError(error).message}`);
    }

    return generatedContents;
  }

  /**
   * Parses and validates an untrusted cached taxonomy artifact.
   *
   * @param contents - Cached JSON contents.
   * @returns Fully validated artifact.
   * @throws {Error} When JSON or any artifact field is invalid.
   */
  private parseArtifact(contents: string): TaxonomyArtifact {
    const parsed: unknown = JSON.parse(contents);
    const record = this.requireRecord(parsed, "Taxonomy artifact");
    const system = this.requireString(record, "system", "Taxonomy artifact");
    if (system !== "GS1_GPC" && system !== "ECOICOP_V2" && system !== "NACE_2_1") {
      throw new TypeError(`Taxonomy artifact system '${system}' is unsupported.`);
    }

    const sourceUrl = this.requireString(record, "sourceUrl", "Taxonomy artifact");
    new URL(sourceUrl);
    const generatedAt = this.requireString(record, "generatedAt", "Taxonomy artifact");
    if (Number.isNaN(Date.parse(generatedAt))) {
      throw new TypeError("Taxonomy artifact generatedAt must be an ISO date.");
    }

    const rawNodes = record["nodes"];
    if (!Array.isArray(rawNodes)) {
      throw new TypeError("Taxonomy artifact nodes must be an array.");
    }

    const nodes = rawNodes.map((rawNode, index): TaxonomyArtifactNode => {
      const context = `Taxonomy artifact node[${index}]`;
      const node = this.requireRecord(rawNode, context);
      const parentCode = node["parentCode"];
      if (parentCode !== null && (typeof parentCode !== "string" || parentCode.trim().length === 0)) {
        throw new TypeError(`${context} parentCode must be a non-empty string or null.`);
      }
      const definition = node["definition"];
      if (definition !== null && typeof definition !== "string") {
        throw new TypeError(`${context} definition must be a string or null.`);
      }

      return {
        code: this.requireString(node, "code", context),
        officialLabel: this.requireString(node, "officialLabel", context),
        level: this.requireString(node, "level", context),
        parentCode,
        hierarchyCodes: this.requireStringArray(node, "hierarchyCodes", context),
        hierarchyLabels: this.requireStringArray(node, "hierarchyLabels", context),
        definition,
        searchText: this.requireString(node, "searchText", context),
      };
    });

    const artifact: TaxonomyArtifact = {
      system,
      version: this.requireString(record, "version", "Taxonomy artifact"),
      sourceUrl,
      generatedAt,
      attribution: this.requireString(record, "attribution", "Taxonomy artifact"),
      nodes,
    };
    this.validateArtifact(artifact);
    return artifact;
  }

  /**
   * Validates cached taxonomy identity fields against the owning generator.
   *
   * @param fileName - Cached artifact name used in failures.
   * @param artifact - Parsed cached artifact.
   * @param identity - Required generator identity.
   */
  private validateArtifactIdentity(fileName: string, artifact: Readonly<TaxonomyArtifact>, identity: TaxonomyArtifactIdentity): void {
    if (
      artifact.system !== identity.system
      || artifact.version !== identity.version
      || artifact.sourceUrl !== identity.sourceUrl
      || artifact.attribution !== identity.attribution
    ) {
      throw new Error(`Cached taxonomy artifact '${fileName}' does not match ${identity.system} ${identity.version}.`);
    }
  }

  /**
   * Reads a non-empty string array from an untrusted record.
   *
   * @param record - Source record.
   * @param key - Array field name.
   * @param context - Human-readable source location.
   * @returns Validated strings.
   */
  private requireStringArray(record: Readonly<Record<string, unknown>>, key: string, context: string): readonly string[] {
    const value = record[key];
    if (!Array.isArray(value)) {
      throw new TypeError(`${context} ${key} must be an array.`);
    }
    return value.map((item, index) => {
      if (typeof item !== "string" || item.trim().length === 0) {
        throw new TypeError(`${context} ${key}[${index}] must be a non-empty string.`);
      }
      return item;
    });
  }

  /**
   * Logs one bounded retry without obscuring the triggering failure.
   *
   * @param sourceName - Generator label.
   * @param failure - Transient failure.
   * @param attempt - Completed attempt number.
   * @param totalAttempts - Maximum attempt count.
   * @param retryDelay - Delay before the next attempt.
   */
  private logSourceRetry(sourceName: string, failure: Error, attempt: number, totalAttempts: number, retryDelay: number): void {
    this.logger.warn(`[${sourceName}] ${failure.message} Retrying in ${retryDelay}ms (attempt ${attempt + 1}/${totalAttempts}).`);
  }

  /**
   * Determines whether an HTTP status represents transient source availability.
   *
   * @param status - HTTP response status.
   * @returns `true` for timeout, rate-limit, early-data, and server failures.
   */
  private isTransientHttpStatus(status: number): boolean {
    return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
  }

  /**
   * Determines whether response consumption failed at the transport boundary.
   *
   * @remarks
   * Fetch reports network failures during body consumption as `TypeError`.
   * Consumers passed to `fetchSource` must therefore only read the body and
   * must keep shape validation outside that callback.
   *
   * @param error - Unknown response-consumption failure.
   * @returns `true` for network and abort/timeout errors.
   */
  private isTransientTransportError(error: unknown): boolean {
    return error instanceof TypeError || (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"));
  }

  /**
   * Determines whether a filesystem failure means an artifact path is absent.
   *
   * @param error - Unknown filesystem failure.
   * @returns `true` only for missing-path error codes.
   */
  private isMissingPathError(error: unknown): boolean {
    if (!(error instanceof Error) || !("code" in error)) return false;
    const code = Reflect.get(error, "code");
    return code === "ENOENT" || code === "ENOTDIR";
  }

  /**
   * Converts an unknown thrown value into an Error without losing Error identity.
   *
   * @param error - Unknown thrown value.
   * @returns Original Error or an Error wrapping its string representation.
   */
  private toError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Waits between bounded source attempts.
   *
   * @param delayMs - Delay in milliseconds.
   */
  private async wait(delayMs: number): Promise<void> {
    await new Promise<void>((resolveDelay) => {
      setTimeout(resolveDelay, delayMs);
    });
  }

  /**
   * Enforces structural invariants before artifact serialization.
   *
   * @param artifact - Artifact to validate.
   * @throws {Error} When nodes are empty, duplicated, orphaned, or malformed.
   */
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
        throw new Error(`${artifact.system} parent '${node.parentCode}' for '${node.code}' was not found.`);
      }
      if (node.hierarchyCodes.at(-1) !== node.code) {
        throw new Error(`${artifact.system} hierarchy for '${node.code}' does not end with the selected code.`);
      }
      if (node.hierarchyCodes.length !== node.hierarchyLabels.length) {
        throw new Error(`${artifact.system} hierarchy for '${node.code}' has mismatched code and label lengths.`);
      }

      const rebuilt = this.buildHierarchy(nodesByCode, node.code);
      if (
        !this.arraysEqual(node.hierarchyCodes, rebuilt.hierarchyCodes)
        || !this.arraysEqual(node.hierarchyLabels, rebuilt.hierarchyLabels)
      ) {
        throw new Error(`${artifact.system} hierarchy for '${node.code}' does not match its parent chain.`);
      }
    }
  }

  /**
   * Compares two readonly string arrays by value and order.
   *
   * @param left - First array.
   * @param right - Second array.
   * @returns `true` when both arrays contain the same ordered values.
   */
  private arraysEqual(left: readonly string[], right: readonly string[]): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
}

/**
 * Generates the official GS1 Global Product Classification taxonomy artifact.
 *
 * @remarks
 * Downloads the pinned archive, delegates extraction to the host operating
 * system, validates the English source document, flattens active levels 1-4,
 * and writes mirrored API and website artifacts.
 *
 * @example
 * ```typescript
 * const generator = new Gs1GpcTaxonomyClassificationGenerator();
 * const outputs = await generator.generate();
 * ```
 */
export class Gs1GpcTaxonomyClassificationGenerator extends TaxonomyClassificationGenerator {
  /** Pinned GS1 release endpoint. */
  static readonly #sourceUrl = "https://ref.gs1.org/standards/gpc/2026-05/";

  /** Version encoded in the generated artifact. */
  static readonly #version = "2026-05";

  /** File name written to every runtime output root. */
  static readonly #fileName = "gpc-2026-05.min.json";

  /** Exact full-taxonomy JSON entry in the pinned GS1 archive. */
  static readonly #archiveEntryName = "GPC as of May 2026 (2026-05-20) EN.json";

  /** Required GS1 attribution stored with the generated artifact. */
  static readonly #attribution = "GS1 Global Product Classification (GPC), May 2026 release.";

  /** Supported GPC source levels and their normalized names. */
  static readonly #levels: Readonly<Record<number, string>> = {
    1: "segment",
    2: "family",
    3: "class",
    4: "brick",
  };

  /**
   * Creates the GPC generator.
   *
   * @param outputRoots - Optional mirrored artifact output directories.
   * @param logger - Optional lifecycle logger.
   */
  public constructor(outputRoots?: readonly string[], logger?: MonorepositoryLogger) {
    super(outputRoots, logger);
  }

  /**
   * Downloads, validates, normalizes, and writes the GPC artifact.
   *
   * @returns Every mirrored GPC artifact path.
   * @throws {Error} When download, extraction, parsing, validation, or writing fails.
   */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[GPC] Starting generation.");
    try {
      this.logger.info("[GPC] Fetching the GS1 GPC source.");
      const archive = await this.fetchSource(
        "GPC",
        "GPC download",
        Gs1GpcTaxonomyClassificationGenerator.#sourceUrl,
        {headers: {Accept: "application/zip"}},
        async (response) => new Uint8Array(await response.arrayBuffer()),
      );

      const jsonBytes = await new SystemArchiveExtractor().extractEntry(archive, Gs1GpcTaxonomyClassificationGenerator.#archiveEntryName);
      const parsed: unknown = JSON.parse(Buffer.from(jsonBytes).toString("utf8"));
      const nodes = this.parseDocument(parsed);
      this.logger.debug(`[GPC] Normalized ${nodes.length} taxonomy node(s).`);
      this.logger.info("[GPC] Writing mirrored taxonomy artifacts.");

      const outputs = await this.writeArtifact(Gs1GpcTaxonomyClassificationGenerator.#fileName, {
        system: "GS1_GPC",
        version: Gs1GpcTaxonomyClassificationGenerator.#version,
        sourceUrl: Gs1GpcTaxonomyClassificationGenerator.#sourceUrl,
        generatedAt: new Date().toISOString(),
        attribution: Gs1GpcTaxonomyClassificationGenerator.#attribution,
        nodes,
      });
      this.logger.success(`[GPC] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    } catch (error: unknown) {
      return await this.resolveGenerationFailure(
        "GPC",
        Gs1GpcTaxonomyClassificationGenerator.#fileName,
        {
          system: "GS1_GPC",
          version: Gs1GpcTaxonomyClassificationGenerator.#version,
          sourceUrl: Gs1GpcTaxonomyClassificationGenerator.#sourceUrl,
          attribution: Gs1GpcTaxonomyClassificationGenerator.#attribution,
        },
        error,
      );
    }
  }

  /**
   * Parses and flattens the untrusted GPC source document.
   *
   * @remarks
   * Inactive nodes and their descendants are skipped. Unsupported levels are
   * omitted while their active descendants continue through the traversal.
   *
   * @param value - Parsed untrusted source JSON.
   * @returns Active normalized GPC nodes in source order.
   * @throws {TypeError} When required source fields have invalid shapes.
   */
  private parseDocument(value: unknown): readonly TaxonomyArtifactNode[] {
    const document = this.requireRecord(value, "GPC document");
    const languageCode = this.requireString(document, "LanguageCode", "GPC document");
    if (languageCode !== "EN") {
      throw new Error(`Expected English GPC data but received '${languageCode}'.`);
    }
    const releaseDate = this.requireString(document, "DateUtc", "GPC document");
    if (!this.belongsToPinnedRelease(releaseDate)) {
      throw new Error("GPC source DateUtc must belong to the pinned 2026-05 release.");
    }

    const schema = document["Schema"];
    if (!Array.isArray(schema)) throw new TypeError("GPC document Schema must be an array.");

    const nodes: TaxonomyArtifactNode[] = [];
    const visit = (rawNode: unknown, ancestors: readonly TaxonomyArtifactNode[]): void => {
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
              hierarchyLabels: [...ancestors.map((ancestor) => ancestor.officialLabel), title],
              definition,
              searchText: this.normalizeText(code, title, definition, ...ancestors.map((ancestor) => ancestor.officialLabel)),
            };

      if (current !== null) nodes.push(current);
      const nextAncestors = current === null ? ancestors : [...ancestors, current];
      for (const child of children) visit(child, nextAncestors);
    };

    for (const root of schema) visit(root, []);
    return nodes;
  }

  /**
   * Determines whether a source date belongs to the pinned May 2026 release.
   *
   * @param value - Source `DateUtc` value in ISO or day/month/year format.
   * @returns `true` when the date identifies May 2026.
   */
  private belongsToPinnedRelease(value: string): boolean {
    const isoDate = /^(?<year>\d{4})-(?<month>\d{2})-\d{2}/u.exec(value);
    if (isoDate?.groups !== undefined) {
      return isoDate.groups["year"] === "2026" && isoDate.groups["month"] === "05";
    }

    const dayMonthYear = /^\d{1,2}\/(?<month>\d{1,2})\/(?<year>\d{4})$/u.exec(value);
    return dayMonthYear?.groups?.["year"] === "2026" && Number(dayMonthYear.groups["month"]) === 5;
  }
}

/**
 * Generates the official European Classification of Individual Consumption artifact.
 *
 * @remarks
 * Reads paginated English SKOS concepts from the Publications Office SPARQL
 * endpoint, validates bindings, rebuilds parent hierarchies, and writes mirrored
 * ECOICOP v2 artifacts.
 *
 * @example
 * ```typescript
 * const generator = new EcoicopTaxonomyClassificationGenerator();
 * await generator.generate();
 * ```
 */
export class EcoicopTaxonomyClassificationGenerator extends TaxonomyClassificationGenerator {
  /** Publications Office SPARQL endpoint. */
  static readonly #endpoint = "https://publications.europa.eu/webapi/rdf/sparql";

  /** ECOICOP v2 SKOS scheme identifier. */
  static readonly #scheme = "http://data.europa.eu/ed1/ecoicop2/ecoicop2";

  /** Official taxonomy version encoded by the artifact. */
  static readonly #version = "2";

  /** Maximum SPARQL bindings requested per page. */
  static readonly #pageSize = 5_000;

  /** File name written to every runtime output root. */
  static readonly #fileName = "ecoicop-v2.min.json";

  /** Required European Union source attribution. */
  static readonly #attribution =
    "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.";

  /**
   * Creates the ECOICOP generator.
   *
   * @param outputRoots - Optional mirrored artifact output directories.
   * @param logger - Optional lifecycle logger.
   */
  public constructor(outputRoots?: readonly string[], logger?: MonorepositoryLogger) {
    super(outputRoots, logger);
  }

  /**
   * Downloads, validates, normalizes, and writes the ECOICOP artifact.
   *
   * @returns Every mirrored ECOICOP artifact path.
   * @throws {Error} When fetching, parsing, hierarchy building, or writing fails.
   */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[ECOICOP] Starting generation.");
    try {
      this.logger.info("[ECOICOP] Fetching Publications Office taxonomy data.");
      const bindings = await this.fetchBindings();
      const nodes = this.normalizeBindings(bindings);
      this.logger.debug(`[ECOICOP] Normalized ${nodes.length} taxonomy node(s).`);
      this.logger.info("[ECOICOP] Writing mirrored taxonomy artifacts.");

      const outputs = await this.writeArtifact(EcoicopTaxonomyClassificationGenerator.#fileName, {
        system: "ECOICOP_V2",
        version: EcoicopTaxonomyClassificationGenerator.#version,
        sourceUrl: `${EcoicopTaxonomyClassificationGenerator.#endpoint}#${EcoicopTaxonomyClassificationGenerator.#scheme}`,
        generatedAt: new Date().toISOString(),
        attribution: EcoicopTaxonomyClassificationGenerator.#attribution,
        nodes,
      });
      this.logger.success(`[ECOICOP] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    } catch (error: unknown) {
      return await this.resolveGenerationFailure(
        "ECOICOP",
        EcoicopTaxonomyClassificationGenerator.#fileName,
        {
          system: "ECOICOP_V2",
          version: EcoicopTaxonomyClassificationGenerator.#version,
          sourceUrl: `${EcoicopTaxonomyClassificationGenerator.#endpoint}#${EcoicopTaxonomyClassificationGenerator.#scheme}`,
          attribution: EcoicopTaxonomyClassificationGenerator.#attribution,
        },
        error,
      );
    }
  }

  /**
   * Fetches every paginated ECOICOP binding.
   *
   * @returns Validated source bindings in endpoint order.
   * @throws {Error} When an HTTP request or response validation fails.
   */
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

    for (let offset = 0; ; offset += EcoicopTaxonomyClassificationGenerator.#pageSize) {
      const url = new URL(EcoicopTaxonomyClassificationGenerator.#endpoint);
      url.searchParams.set("query", this.createQuery(offset));
      url.searchParams.set("format", "application/sparql-results+json");
      const response = await this.fetchSource<unknown>(
        "ECOICOP",
        "SPARQL request",
        url,
        {headers: {Accept: "application/sparql-results+json"}},
        async (sourceResponse) => await sourceResponse.json(),
      );
      const page = this.parseResponse(response);
      bindings.push(...page);
      if (page.length < EcoicopTaxonomyClassificationGenerator.#pageSize) break;
    }

    return bindings;
  }

  /**
   * Builds one paginated ECOICOP SPARQL query.
   *
   * @param offset - Zero-based result offset.
   * @returns SPARQL query text.
   */
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

  /**
   * Parses one untrusted SPARQL response.
   *
   * @param value - Parsed response JSON.
   * @returns Validated simplified bindings.
   * @throws {TypeError} When response or binding shapes are invalid.
   */
  private parseResponse(value: unknown): readonly Readonly<{
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

  /**
   * Reads one required or optional SPARQL binding value.
   *
   * @param binding - Raw binding record.
   * @param key - Binding key.
   * @param required - Whether a missing binding is invalid.
   * @returns Binding string or `null` for an absent optional binding.
   * @throws {TypeError} When a present binding has no non-empty string value.
   */
  private readBindingValue(binding: Readonly<Record<string, unknown>>, key: string, required: boolean): string | null {
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

  /**
   * Converts ECOICOP source bindings into normalized taxonomy nodes.
   *
   * @param bindings - Validated source bindings.
   * @returns Deterministically sorted nodes with complete hierarchies.
   * @throws {Error} When a broader concept cannot be resolved.
   */
  private normalizeBindings(
    bindings: readonly Readonly<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }>[],
  ): readonly TaxonomyArtifactNode[] {
    const codeByConcept = new Map(bindings.map((binding) => [binding.concept, binding.notation] as const));
    const provisional = bindings.map<TaxonomyArtifactNode>((binding) => {
      let parentCode: string | null = null;
      if (binding.broader !== null) {
        const resolvedParentCode = codeByConcept.get(binding.broader);
        if (resolvedParentCode === undefined) {
          throw new Error(`Unresolved parent '${binding.broader}' for taxonomy code '${binding.notation}'.`);
        }
        parentCode = resolvedParentCode;
      }
      const label = this.stripCodePrefix(binding.label, binding.notation);
      const segmentCount = binding.notation.split(".").length;

      return {
        code: binding.notation,
        officialLabel: label,
        level: ["division", "group", "class", "subclass"][segmentCount - 1] ?? `level-${segmentCount}`,
        parentCode,
        hierarchyCodes: [],
        hierarchyLabels: [],
        definition: null,
        searchText: this.normalizeText(binding.notation, label),
      };
    });

    const nodesByCode = new Map(provisional.map((node) => [node.code, node] as const));
    return provisional
      .map((node) => this.buildHierarchy(nodesByCode, node.code))
      .toSorted((left, right) => left.code.localeCompare(right.code, "en", {numeric: true}));
  }

  /**
   * Removes a notation prefix from an official source label.
   *
   * @param label - Published label.
   * @param notation - Published taxonomy notation.
   * @returns Clean official label.
   */
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

/**
 * Generates the official NACE 2.1 economic-activity taxonomy artifact.
 *
 * @remarks
 * Reads paginated English SKOS concepts from the Publications Office SPARQL
 * endpoint, validates bindings, maps NACE levels, rebuilds hierarchies, and
 * writes mirrored runtime artifacts.
 *
 * @example
 * ```typescript
 * const generator = new NaceTaxonomyClassificationGenerator();
 * await generator.generate();
 * ```
 */
export class NaceTaxonomyClassificationGenerator extends TaxonomyClassificationGenerator {
  /** Publications Office SPARQL endpoint. */
  static readonly #endpoint = "https://publications.europa.eu/webapi/rdf/sparql";

  /** NACE 2.1 SKOS scheme identifier. */
  static readonly #scheme = "http://data.europa.eu/ux2/nace2.1/nace2.1";

  /** Official taxonomy version encoded by the artifact. */
  static readonly #version = "2.1";

  /** Maximum SPARQL bindings requested per page. */
  static readonly #pageSize = 5_000;

  /** File name written to every runtime output root. */
  static readonly #fileName = "nace-2.1.min.json";

  /** Required European Union source attribution. */
  static readonly #attribution =
    "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.";

  /**
   * Creates the NACE generator.
   *
   * @param outputRoots - Optional mirrored artifact output directories.
   * @param logger - Optional lifecycle logger.
   */
  public constructor(outputRoots?: readonly string[], logger?: MonorepositoryLogger) {
    super(outputRoots, logger);
  }

  /**
   * Downloads, validates, normalizes, and writes the NACE artifact.
   *
   * @returns Every mirrored NACE artifact path.
   * @throws {Error} When fetching, parsing, hierarchy building, or writing fails.
   */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[NACE] Starting generation.");
    try {
      this.logger.info("[NACE] Fetching Publications Office taxonomy data.");
      const bindings = await this.fetchBindings();
      const nodes = this.normalizeBindings(bindings);
      this.logger.debug(`[NACE] Normalized ${nodes.length} taxonomy node(s).`);
      this.logger.info("[NACE] Writing mirrored taxonomy artifacts.");

      const outputs = await this.writeArtifact(NaceTaxonomyClassificationGenerator.#fileName, {
        system: "NACE_2_1",
        version: NaceTaxonomyClassificationGenerator.#version,
        sourceUrl: `${NaceTaxonomyClassificationGenerator.#endpoint}#${NaceTaxonomyClassificationGenerator.#scheme}`,
        generatedAt: new Date().toISOString(),
        attribution: NaceTaxonomyClassificationGenerator.#attribution,
        nodes,
      });
      this.logger.success(`[NACE] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    } catch (error: unknown) {
      return await this.resolveGenerationFailure(
        "NACE",
        NaceTaxonomyClassificationGenerator.#fileName,
        {
          system: "NACE_2_1",
          version: NaceTaxonomyClassificationGenerator.#version,
          sourceUrl: `${NaceTaxonomyClassificationGenerator.#endpoint}#${NaceTaxonomyClassificationGenerator.#scheme}`,
          attribution: NaceTaxonomyClassificationGenerator.#attribution,
        },
        error,
      );
    }
  }

  /**
   * Fetches every paginated NACE binding.
   *
   * @returns Validated source bindings in endpoint order.
   * @throws {Error} When an HTTP request or response validation fails.
   */
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
      const response = await this.fetchSource<unknown>(
        "NACE",
        "SPARQL request",
        url,
        {headers: {Accept: "application/sparql-results+json"}},
        async (sourceResponse) => await sourceResponse.json(),
      );
      const page = this.parseResponse(response);
      bindings.push(...page);
      if (page.length < NaceTaxonomyClassificationGenerator.#pageSize) break;
    }

    return bindings;
  }

  /**
   * Builds one paginated NACE SPARQL query.
   *
   * @param offset - Zero-based result offset.
   * @returns SPARQL query text.
   */
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

  /**
   * Parses one untrusted SPARQL response.
   *
   * @param value - Parsed response JSON.
   * @returns Validated simplified bindings.
   * @throws {TypeError} When response or binding shapes are invalid.
   */
  private parseResponse(value: unknown): readonly Readonly<{
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

  /**
   * Reads one required or optional SPARQL binding value.
   *
   * @param binding - Raw binding record.
   * @param key - Binding key.
   * @param required - Whether a missing binding is invalid.
   * @returns Binding string or `null` for an absent optional binding.
   * @throws {TypeError} When a present binding has no non-empty string value.
   */
  private readBindingValue(binding: Readonly<Record<string, unknown>>, key: string, required: boolean): string | null {
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

  /**
   * Converts NACE source bindings into normalized taxonomy nodes.
   *
   * @param bindings - Validated source bindings.
   * @returns Deterministically sorted nodes with complete hierarchies.
   * @throws {Error} When a broader concept cannot be resolved.
   */
  private normalizeBindings(
    bindings: readonly Readonly<{
      concept: string;
      notation: string;
      label: string;
      broader: string | null;
    }>[],
  ): readonly TaxonomyArtifactNode[] {
    const codeByConcept = new Map(bindings.map((binding) => [binding.concept, binding.notation] as const));
    const provisional = bindings.map<TaxonomyArtifactNode>((binding) => {
      let parentCode: string | null = null;
      if (binding.broader !== null) {
        const resolvedParentCode = codeByConcept.get(binding.broader);
        if (resolvedParentCode === undefined) {
          throw new Error(`Unresolved parent '${binding.broader}' for taxonomy code '${binding.notation}'.`);
        }
        parentCode = resolvedParentCode;
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

    const nodesByCode = new Map(provisional.map((node) => [node.code, node] as const));
    return provisional
      .map((node) => this.buildHierarchy(nodesByCode, node.code))
      .toSorted((left, right) => left.code.localeCompare(right.code, "en", {numeric: true}));
  }

  /**
   * Removes a notation prefix from an official source label.
   *
   * @param label - Published label.
   * @param notation - Published taxonomy notation.
   * @returns Clean official label.
   */
  private stripCodePrefix(label: string, notation: string): string {
    const trimmed = label.trim();
    if (!trimmed.startsWith(notation)) return trimmed;
    const withoutNotation = trimmed
      .slice(notation.length)
      .replace(/^[\s:–—-]+/u, "")
      .trim();
    return withoutNotation.length > 0 ? withoutNotation : trimmed;
  }

  /**
   * Maps a NACE code pattern to its hierarchy level.
   *
   * @param code - NACE code.
   * @returns Section, division, group, class, or fallback code level.
   */
  private getLevel(code: string): string {
    if (/^[A-Z]$/u.test(code)) return "section";
    if (/^\d{2}$/u.test(code)) return "division";
    if (/^\d{2}\.\d$/u.test(code)) return "group";
    if (/^\d{2}\.\d{2}$/u.test(code)) return "class";
    return "code";
  }
}

/**
 * Base contract and runtime guards for license generators.
 *
 * @remarks
 * Concrete generators own discovery and output behavior. This base centralizes
 * manifest parsing, primitive field validation, dependency-map validation, and
 * lifecycle logging dependencies.
 */
export abstract class LicenseGenerator {
  /** Logger used for lifecycle, warning, failure, and completion output. */
  protected readonly logger: MonorepositoryLogger;

  /**
   * Creates a license generator.
   *
   * @param logger - Logger used for lifecycle, warning, and failure output.
   */
  protected constructor(logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("generate::artifacts")) {
    this.logger = logger;
  }

  /**
   * Generates one license document family.
   *
   * @returns Every license artifact path written by the generator.
   * @throws {Error} When discovery, parsing, normalization, or writing fails.
   */
  public abstract generate(): Promise<readonly string[]>;

  /**
   * Determines whether an unknown value is a plain record.
   *
   * @param value - Value to inspect.
   * @returns `true` when the value is a non-array object.
   */
  protected isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Parses manifest JSON and requires a record root.
   *
   * @param contents - Manifest JSON text.
   * @param manifestPath - File path used in validation errors.
   * @returns Parsed manifest record.
   * @throws {SyntaxError} When JSON parsing fails.
   * @throws {TypeError} When the parsed root is not a record.
   */
  protected readJsonRecord(contents: string, manifestPath: string): Readonly<Record<string, unknown>> {
    const parsed: unknown = JSON.parse(contents);
    if (!this.isRecord(parsed)) {
      throw new TypeError(`Package manifest '${manifestPath}' must be an object.`);
    }
    return parsed;
  }

  /**
   * Reads an optional string manifest field.
   *
   * @param manifest - Parsed manifest record.
   * @param key - Field name.
   * @param manifestPath - File path used in validation errors.
   * @returns Field value or `undefined` when absent.
   * @throws {TypeError} When a present value is not a string.
   */
  protected readOptionalString(manifest: Readonly<Record<string, unknown>>, key: string, manifestPath: string): string | undefined {
    const value = manifest[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") {
      throw new TypeError(`Package manifest '${manifestPath}' field '${key}' must be a string.`);
    }
    return value;
  }

  /**
   * Reads and validates a dependency-map field.
   *
   * @param manifest - Parsed manifest record.
   * @param key - Dependency field name.
   * @param manifestPath - File path used in validation errors.
   * @returns Validated package-to-version map.
   * @throws {TypeError} When the field or a version has an invalid type.
   */
  protected readDependencyMap(
    manifest: Readonly<Record<string, unknown>>,
    key: string,
    manifestPath: string,
  ): Readonly<Record<string, string>> {
    const value = manifest[key];
    if (value === undefined) return {};
    if (!this.isRecord(value)) {
      throw new TypeError(`Package manifest '${manifestPath}' field '${key}' must be an object.`);
    }

    const dependencies: Record<string, string> = {};
    for (const [name, version] of Object.entries(value)) {
      if (typeof version !== "string") {
        throw new TypeError(`Package manifest '${manifestPath}' dependency '${name}' must have a string version.`);
      }
      dependencies[name] = version;
    }
    return dependencies;
  }
}

/**
 * Generates the frontend third-party license document.
 *
 * @remarks
 * Discovers direct installed packages declared by the frontend manifest,
 * normalizes their metadata, groups them by dependency type, sorts them
 * deterministically, and writes `licenses.json`.
 *
 * @example
 * ```typescript
 * const generator = new FrontendLicenseGenerator();
 * await generator.generate();
 * ```
 */
export class FrontendLicenseGenerator extends LicenseGenerator {
  /** Repository root containing the frontend manifest and installed packages. */
  private readonly workspaceRoot: string;

  /**
   * Creates the frontend license generator.
   *
   * @param workspaceRoot - Repository root containing the frontend and node_modules.
   * @param logger - Optional lifecycle logger.
   */
  public constructor(workspaceRoot: string = process.cwd(), logger?: MonorepositoryLogger) {
    super(logger);
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Reads direct frontend dependencies and writes `licenses.json`.
   *
   * @returns The generated frontend license-document path.
   * @throws {Error} When discovery, manifest validation, or writing fails.
   */
  public override async generate(): Promise<readonly string[]> {
    this.logger.info("[Frontend licenses] Starting generation.");
    try {
      this.logger.info("[Frontend licenses] Reading the frontend dependency manifest.");
      const declaredDependencies = await this.readDeclaredDependencies();
      const manifestPaths = await this.findInstalledManifestPaths(declaredDependencies);
      this.logger.debug(`[Frontend licenses] Discovered ${manifestPaths.length} direct installed package manifest(s).`);
      const resolvedPackages = await Promise.all(
        manifestPaths.map((manifestPath) => this.readInstalledPackage(manifestPath, declaredDependencies)),
      );
      const groupedPackages = new Map<NodePackageDependencyType, NodePackageInformation[]>();

      for (const resolvedPackage of resolvedPackages) {
        if (resolvedPackage === null) continue;
        const packages = groupedPackages.get(resolvedPackage.dependencyType) ?? [];
        packages.push(resolvedPackage.packageInformation);
        groupedPackages.set(resolvedPackage.dependencyType, packages);
      }

      const packageCount = [...groupedPackages.values()].reduce((total, packages) => total + packages.length, 0);
      this.logger.debug(`[Frontend licenses] Grouped ${packageCount} declared package(s).`);
      const outputPath = join(this.workspaceRoot, "sites", "arolariu.ro", "licenses.json");
      const sortedPackages = new Map<NodePackageDependencyType, readonly NodePackageInformation[]>();
      for (const dependencyType of ["production", "development", "peer"] as const) {
        const packageInformation = groupedPackages.get(dependencyType) ?? [];
        sortedPackages.set(
          dependencyType,
          packageInformation.toSorted((left, right) => left.name.localeCompare(right.name)),
        );
      }

      this.logger.info("[Frontend licenses] Writing licenses.json.");
      await mkdir(dirname(outputPath), {recursive: true});
      await writeFile(outputPath, `${JSON.stringify(Object.fromEntries(sortedPackages))}\n`, "utf8");
      this.logger.success("[Frontend licenses] Generated 1 artifact file(s).");
      return [outputPath];
    } catch (error: unknown) {
      this.logger.error(`[Frontend licenses] ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Reads declared frontend dependency names by dependency type.
   *
   * @returns Map of production, development, and peer dependency names.
   * @throws {Error} When the frontend manifest cannot be read or validated.
   */
  private async readDeclaredDependencies(): Promise<ReadonlyMap<NodePackageDependencyType, readonly string[]>> {
    const manifestPath = join(this.workspaceRoot, "sites", "arolariu.ro", "package.json");
    const manifest = this.readJsonRecord(await readFile(manifestPath, "utf8"), manifestPath);
    return new Map<NodePackageDependencyType, readonly string[]>([
      ["production", Object.keys(this.readDependencyMap(manifest, "dependencies", manifestPath))],
      ["development", Object.keys(this.readDependencyMap(manifest, "devDependencies", manifestPath))],
      ["peer", Object.keys(this.readDependencyMap(manifest, "peerDependencies", manifestPath))],
    ]);
  }

  /**
   * Finds direct installed package manifests, including scoped packages.
   *
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Absolute direct package-manifest paths in declared dependency order.
   * @throws {Error} When a declared package cannot be resolved.
   */
  private async findInstalledManifestPaths(
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): Promise<readonly string[]> {
    const packageNames = [
      ...new Set(
        ["production", "development", "peer"].flatMap(
          (dependencyType) => declaredDependencies.get(dependencyType as NodePackageDependencyType) ?? [],
        ),
      ),
    ];
    const paths: string[] = [];
    const unresolvedPackageNames: string[] = [];

    for (const packageName of packageNames) {
      const relativeManifestPath = join(...packageName.split("/"), "package.json");
      const candidates = [
        join(this.workspaceRoot, "node_modules", relativeManifestPath),
        join(this.workspaceRoot, "sites", "arolariu.ro", "node_modules", relativeManifestPath),
      ];
      let resolvedPath: string | undefined;

      for (const candidate of candidates) {
        try {
          await access(candidate);
          resolvedPath = candidate;
          break;
        } catch (error: unknown) {
          if (!(this.isRecord(error) && error["code"] === "ENOENT")) throw error;
        }
      }

      if (resolvedPath === undefined) unresolvedPackageNames.push(packageName);
      else paths.push(resolvedPath);
    }

    if (unresolvedPackageNames.length > 0) {
      throw new Error(`Unable to resolve declared frontend package manifest(s): ${unresolvedPackageNames.toSorted().join(", ")}.`);
    }

    return paths;
  }

  /**
   * Reads and normalizes one installed package manifest.
   *
   * @param manifestPath - Absolute installed package-manifest path.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Classified package information, or `null` for undeclared packages.
   * @throws {Error} When package metadata has an invalid shape.
   */
  private async readInstalledPackage(
    manifestPath: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): Promise<Readonly<{
    dependencyType: NodePackageDependencyType;
    packageInformation: NodePackageInformation;
  }> | null> {
    const manifest = this.readJsonRecord(await readFile(manifestPath, "utf8"), manifestPath);
    const packageName = this.readOptionalString(manifest, "name", manifestPath) ?? basename(dirname(manifestPath));
    const dependencyType = this.resolveDependencyType(packageName, declaredDependencies);
    if (dependencyType === null) return null;

    const authorValue = manifest["author"];
    let author = "unknown";
    if (typeof authorValue === "string") {
      author = authorValue;
    } else if (this.isRecord(authorValue) && typeof authorValue["name"] === "string") {
      author = authorValue["name"];
    } else if (authorValue !== undefined) {
      throw new TypeError(`Package manifest '${manifestPath}' field 'author' must be a string or named object.`);
    }

    const repositoryValue = manifest["repository"];
    let repositoryUrl: string | undefined;
    if (typeof repositoryValue === "string") {
      repositoryUrl = repositoryValue;
    } else if (this.isRecord(repositoryValue) && typeof repositoryValue["url"] === "string") {
      repositoryUrl = repositoryValue["url"];
    } else if (repositoryValue !== undefined) {
      throw new TypeError(`Package manifest '${manifestPath}' field 'repository' must be a string or URL object.`);
    }

    const dependencyMaps = [
      this.readDependencyMap(manifest, "dependencies", manifestPath),
      this.readDependencyMap(manifest, "devDependencies", manifestPath),
      this.readDependencyMap(manifest, "peerDependencies", manifestPath),
    ];
    const dependentsByName = new Map<string, string>();
    for (const dependencies of dependencyMaps) {
      for (const [name, version] of Object.entries(dependencies)) {
        dependentsByName.set(name, version);
      }
    }
    const dependents = [...dependentsByName].map(([name, version]) => ({name, version}));

    return {
      dependencyType,
      packageInformation: {
        name: packageName,
        author,
        description: this.readOptionalString(manifest, "description", manifestPath) ?? "This package has not provided a valid description.",
        homepage: this.readOptionalString(manifest, "homepage", manifestPath) ?? repositoryUrl ?? "unknown",
        license: this.readOptionalString(manifest, "license", manifestPath) ?? "unknown",
        version: this.readOptionalString(manifest, "version", manifestPath) ?? "unknown",
        dependents,
      },
    };
  }

  /**
   * Resolves the declared dependency group for one package.
   *
   * @param packageName - Installed package name.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Dependency type, or `null` when the package is not directly declared.
   */
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

/**
 * Represents the reserved backend license-generation surface.
 *
 * @remarks
 * Backend dependency discovery is intentionally deferred. The class emits a
 * warning and returns no outputs so the unified generator contract remains
 * stable.
 *
 * @example
 * ```typescript
 * const generator = new BackendLicenseGenerator();
 * await generator.generate(); // []
 * ```
 */
export class BackendLicenseGenerator extends LicenseGenerator {
  /**
   * Creates the deferred backend license generator.
   *
   * @param logger - Optional lifecycle logger.
   */
  public constructor(logger?: MonorepositoryLogger) {
    super(logger);
  }

  /**
   * Reports deferred behavior and returns no outputs.
   *
   * @returns An empty output-path collection.
   */
  public override async generate(): Promise<readonly string[]> {
    this.logger.warn("[Backend licenses] Generation is intentionally deferred; no artifact was written.");
    return [];
  }
}

/**
 * Extracts ZIP entries by delegating to the host operating system.
 *
 * @remarks
 * Windows uses `tar.exe`; Linux and macOS use `unzip`. Every extraction runs
 * inside a unique temporary directory that is removed in a `finally` block.
 */
class SystemArchiveExtractor {
  /** Promisified Node.js child-process boundary used for archive extraction. */
  static readonly #executeFile = promisify(execFile);

  /**
   * Extracts one archive entry selected by suffix.
   *
   * @param archive - Complete ZIP archive bytes.
   * @param entryName - Exact extracted file name identifying the desired entry.
   * @returns Extracted entry bytes.
   * @throws {Error} When the platform tool is missing, extraction fails, or the
   * matching entry is missing or ambiguous.
   */
  public async extractEntry(archive: Uint8Array, entryName: string): Promise<Uint8Array> {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "arolariu-taxonomy-"));
    const archivePath = join(temporaryRoot, "source.zip");
    const outputDirectory = join(temporaryRoot, "extracted");
    const extractionCommand = this.createCommand(archivePath, outputDirectory);

    try {
      await mkdir(outputDirectory, {recursive: true});
      await writeFile(archivePath, archive);

      try {
        await SystemArchiveExtractor.#executeFile(extractionCommand.command, [...extractionCommand.args]);
      } catch (error: unknown) {
        if (this.hasErrorCode(error) && error.code === "ENOENT") {
          throw new Error(`Required archive extractor '${extractionCommand.command}' was not found on '${process.platform}'.`, {
            cause: error,
          });
        }
        throw error;
      }

      const matchingPaths: string[] = [];
      for await (const extractedPath of glob("**/*", {cwd: outputDirectory})) {
        if (basename(extractedPath) === entryName) matchingPaths.push(extractedPath);
      }

      if (matchingPaths.length === 0) {
        throw new Error(`Extracted archive entry '${entryName}' was not found.`);
      }
      if (matchingPaths.length > 1) {
        throw new Error(`Extracted archive contains multiple entries named '${entryName}'.`);
      }

      const matchingPath = matchingPaths[0];
      if (matchingPath === undefined) {
        throw new Error(`Extracted archive entry '${entryName}' was not found.`);
      }

      return new Uint8Array(await readFile(join(outputDirectory, matchingPath)));
    } finally {
      await rm(temporaryRoot, {recursive: true, force: true});
    }
  }

  /**
   * Builds the platform-specific extraction command.
   *
   * @param archivePath - Temporary ZIP path.
   * @param outputDirectory - Temporary extraction directory.
   * @returns Executable and argument list.
   */
  private createCommand(archivePath: string, outputDirectory: string): Readonly<{command: string; args: readonly string[]}> {
    return process.platform === "win32"
      ? {command: "tar.exe", args: ["-xf", archivePath, "-C", outputDirectory]}
      : {command: "unzip", args: ["-qq", archivePath, "-d", outputDirectory]};
  }

  /**
   * Determines whether an unknown error exposes a string error code.
   *
   * @param error - Unknown caught value.
   * @returns `true` when a string `code` property is available.
   */
  private hasErrorCode(error: unknown): error is Error & Readonly<{code: string}> {
    return error instanceof Error && "code" in error && typeof Reflect.get(error, "code") === "string";
  }
}

/**
 * Runs every taxonomy and license generator.
 *
 * @remarks
 * The five concrete generators run concurrently and share one logger so
 * interleaved messages retain a stable prefix and generator label.
 *
 * @param options - Optional roots used by targeted tests and alternate workspaces.
 * @returns Process exit code.
 * @throws {Error} When any generator fails.
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
  const outputs = (await Promise.all(generators.map((generator) => generator.generate()))).flat();

  logger.success(`Generated ${outputs.length} artifact file(s).`);
  logger.debug(`Output paths: ${outputs.join(", ")}`);
  return 0;
}
