/**
 * @fileoverview Taxonomy and license artifact generation as an Effect program.
 * @module scripts/commands/generate/artifacts
 *
 * @remarks
 * The taxonomy and license algorithms stay in the generator classes below. Every ambient effect
 * goes through a platform service: `FileSystem` and `writeTextAtomic` for mirrors and manifests,
 * `HttpClient` for the pinned taxonomy sources, `Process` for host archive extraction, `Glob` for
 * locating extracted entries, `Environment` for the working directory and host platform, and the
 * Effect clock for timestamps and bounded retry backoff. Pure parsers and validators stay
 * synchronous and throw; every generator wraps them at the Effect boundary into an
 * {@link ArtifactGenerationFailed}. Exhausted transient source failures become a
 * {@link TaxonomySourceUnavailable}, which only a validated, byte-identical cached mirror may satisfy.
 */

import {basename, dirname, join, resolve} from "node:path";

import {DateTime, Duration, Effect, FileSystem, Option, type PlatformError} from "effect";
import {HttpClient, HttpClientRequest, type HttpClientError} from "effect/http";

import type {CommandInvoker} from "../../common/commander.ts";
import {taxonomyArtifactFileNames, taxonomyArtifactOutputRoots} from "../../common/taxonomy-artifacts.ts";
import {legacyInvoker} from "../../platform/bridge.ts";
import {Environment} from "../../platform/Environment.ts";
import {Glob, writeTextAtomic} from "../../platform/Files.ts";
import {readBoundedBytes, type ResponseTooLarge} from "../../platform/Http.ts";
import {Presenter} from "../../platform/Output.ts";
import {Process, type ProcessError, type ProcessRequest} from "../../platform/Process.ts";
import type {NodePackageDependencyType, NodePackageInformation, TaxonomyArtifact, TaxonomyArtifactNode} from "../../types";
import type {GenerateRequirements} from "./env.ts";
import {ArtifactGenerationFailed, TaxonomySourceUnavailable} from "./errors.ts";

export {getExpectedTaxonomyArtifactPaths, taxonomyArtifactFileNames} from "../../common/taxonomy-artifacts.ts";

/** Backoff delays between the three bounded taxonomy source attempts. */
const TAXONOMY_SOURCE_RETRY_DELAYS_MS = [1_000, 4_000] as const;

/** Total bounded attempts one taxonomy source request is allowed. */
const TAXONOMY_SOURCE_ATTEMPTS = TAXONOMY_SOURCE_RETRY_DELAYS_MS.length + 1;

/** Per-attempt budget covering the request and the bounded body read. */
const TAXONOMY_SOURCE_TIMEOUT_MS = 30_000;

/**
 * Upper bound on one buffered taxonomy response.
 *
 * @remarks
 * The pinned GS1 archive is the largest response any generator reads and is well below this
 * bound; the explicit limit keeps an unexpected redirect or error page from being buffered
 * without a ceiling.
 */
const TAXONOMY_SOURCE_MAX_RESPONSE_BYTES = 64 * 1024 * 1024;

/** Decoder shared by every archive and taxonomy source payload. */
const utf8Decoder = new TextDecoder("utf-8");

/** Typed input accepted by the artifact generator. */
export interface GenerateArtifactsInput {
  /** Enables diagnostic output. */
  readonly verbose: boolean;
}

/** Typed business result produced by the artifact generator. */
export interface ArtifactGenerationResult {
  /** Human-readable completion summary. */
  readonly summary: string;
  /** Every artifact path written or preserved by this invocation, in generator declaration order. */
  readonly generatedFiles: readonly string[];
}

/** Every failure an artifact generator may report. */
export type ArtifactGenerationError = TaxonomySourceUnavailable | ArtifactGenerationFailed;

/** Stable fields that identify the exact taxonomy expected by one generator. */
type TaxonomyArtifactIdentity = Readonly<Pick<TaxonomyArtifact, "system" | "version" | "sourceUrl" | "attribution">>;

/** One successful taxonomy source response. */
interface SourceResponse {
  /** Complete response body. */
  readonly bytes: Uint8Array;
  /** Response body decoded as UTF-8. */
  readonly text: string;
}

/** Outcome of one bounded source attempt that did not fail permanently. */
type SourceAttempt =
  {readonly kind: "response"; readonly response: SourceResponse} | {readonly kind: "transient"; readonly message: string};

/** One validated SPARQL binding. */
interface SparqlBinding {
  /** Concept URI. */
  readonly concept: string;
  /** Published notation (code). */
  readonly notation: string;
  /** English preferred label. */
  readonly label: string;
  /** Broader concept URI, or `null` for a root concept. */
  readonly broader: string | null;
}

/**
 * Reads the human-readable message of a thrown value.
 *
 * @param cause - The thrown value.
 * @returns `cause.message` for an `Error`, otherwise `String(cause)`.
 */
function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Builds the failure of one artifact generator.
 *
 * @param artifact - Generator label.
 * @param message - Human-readable failure.
 * @returns The typed failure.
 */
function artifactFailure(artifact: string, message: string): ArtifactGenerationFailed {
  return new ArtifactGenerationFailed({message, artifact});
}

/**
 * Runs a synchronous validator at the Effect boundary.
 *
 * @param artifact - Generator label attached to a failure.
 * @param evaluate - Pure computation that may throw.
 * @returns Its value, or an {@link ArtifactGenerationFailed} carrying the thrown message.
 */
function validateSync<A>(artifact: string, evaluate: () => A): Effect.Effect<A, ArtifactGenerationFailed> {
  return Effect.try({try: evaluate, catch: (cause) => artifactFailure(artifact, errorMessage(cause))});
}

/**
 * Normalizes a filesystem or generator failure into an {@link ArtifactGenerationFailed}.
 *
 * @param artifact - Generator label attached to a converted failure.
 * @returns A mapper keeping generator failures and converting every other failure by message.
 */
function toArtifactFailure(artifact: string): (error: ArtifactGenerationFailed | PlatformError.PlatformError) => ArtifactGenerationFailed {
  return (error) => (error._tag === "ArtifactGenerationFailed" ? error : artifactFailure(artifact, error.message));
}

/**
 * Determines whether a filesystem failure means a path is absent.
 *
 * @param error - The filesystem failure.
 * @returns `true` only for a missing path.
 */
function isMissingPath(error: PlatformError.PlatformError): boolean {
  return error.reason._tag === "NotFound";
}

/**
 * Describes an HTTP client failure the way the legacy client did: the underlying cause.
 *
 * @param error - The HTTP client failure.
 * @returns The failure description, its cause message, or the formatted client message.
 */
function transportMessage(error: HttpClientError.HttpClientError): string {
  const {reason} = error;
  if (typeof reason.description === "string" && reason.description.length > 0) {
    return reason.description;
  }
  return "cause" in reason && reason.cause instanceof Error ? reason.cause.message : error.message;
}

/**
 * Describes a bounded body read failure as a transient source failure message.
 *
 * @param error - The oversized-body or client failure.
 * @returns The limit message or the transport description.
 */
function bodyReadMessage(error: ResponseTooLarge | HttpClientError.HttpClientError): string {
  return error._tag === "ResponseTooLarge" ? error.message : transportMessage(error);
}

/**
 * Determines whether an HTTP status represents transient source availability.
 *
 * @param status - HTTP response status.
 * @returns `true` for timeout, rate-limit, early-data, and server failures.
 */
function isTransientHttpStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

/**
 * Base contract and shared invariants for taxonomy artifact generators.
 *
 * @remarks
 * Concrete generators own source-specific fetching and parsing. This base owns runtime guards,
 * normalization, hierarchy reconstruction, artifact validation, the bounded source retry
 * schedule, the validated-cache fallback, and mirrored serialization.
 */
export abstract class TaxonomyClassificationGenerator {
  /** Generator label used in log lines and as the failed `artifact`. */
  protected abstract readonly sourceName: string;

  /** Explicit mirrored output directories; the canonical repository roots when absent. */
  readonly #outputRoots: readonly string[] | undefined;

  /**
   * Creates a taxonomy generator.
   *
   * @param outputRoots - Directories that receive mirrored artifacts; defaults to the canonical
   * repository roots resolved against the environment working directory.
   */
  protected constructor(outputRoots?: readonly string[]) {
    this.#outputRoots = outputRoots;
  }

  /**
   * Generates one taxonomy.
   *
   * @returns Every artifact path written or preserved by the generator, in output-root order.
   */
  public abstract generate(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements>;

  /**
   * Resolves the mirrored output directories.
   *
   * @returns The explicit roots, or the canonical roots under the environment working directory.
   */
  protected resolveOutputRoots(): Effect.Effect<readonly string[], never, Environment> {
    const configured = this.#outputRoots;
    if (configured !== undefined) {
      return Effect.succeed(configured);
    }
    return Effect.map(Effect.service(Environment), (environment) =>
      taxonomyArtifactOutputRoots.map((root) => resolve(environment.cwd, root)),
    );
  }

  /**
   * Runs a synchronous validator and attributes its failure to this generator.
   *
   * @param evaluate - Pure computation that may throw.
   * @returns Its value, or an {@link ArtifactGenerationFailed}.
   */
  protected validate<A>(evaluate: () => A): Effect.Effect<A, ArtifactGenerationFailed> {
    return validateSync(this.sourceName, evaluate);
  }

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
   * Requests one taxonomy source with bounded transient retries.
   *
   * @remarks
   * One explicitly bounded schedule owns every retry: a transport failure, a timeout, and a
   * transient response status share the same {@link TAXONOMY_SOURCE_ATTEMPTS} budget and the same
   * {@link TAXONOMY_SOURCE_RETRY_DELAYS_MS} backoff. Every attempt is bounded by
   * {@link TAXONOMY_SOURCE_TIMEOUT_MS} and {@link TAXONOMY_SOURCE_MAX_RESPONSE_BYTES}. Exhausting
   * the schedule fails with a {@link TaxonomySourceUnavailable}, the single failure a validated
   * cached mirror may satisfy; a non-transient status fails immediately.
   *
   * @param requestName - Request label used in HTTP failure messages.
   * @param url - Source URL.
   * @param headers - Request headers.
   * @returns The successful response.
   */
  protected fetchSource(
    requestName: string,
    url: URL,
    headers: Readonly<Record<string, string>>,
  ): Effect.Effect<SourceResponse, ArtifactGenerationError, HttpClient.HttpClient> {
    return Effect.gen({self: this}, function* () {
      let lastFailure = `${requestName} failed without an error.`;
      for (let attempt = 1; attempt <= TAXONOMY_SOURCE_ATTEMPTS; attempt += 1) {
        // Sequential by design: one attempt settles before the next one is considered.
        const outcome = yield* this.requestSourceOnce(requestName, url, headers);
        if (outcome.kind === "response") {
          return outcome.response;
        }

        lastFailure = outcome.message;
        const retryDelay = TAXONOMY_SOURCE_RETRY_DELAYS_MS[attempt - 1];
        if (retryDelay === undefined) break;
        yield* Effect.logWarning(
          `[${this.sourceName}] ${outcome.message} Retrying in ${String(retryDelay)}ms (attempt ${String(attempt + 1)}/${String(TAXONOMY_SOURCE_ATTEMPTS)}).`,
        );
        yield* Effect.sleep(Duration.millis(retryDelay));
      }

      return yield* new TaxonomySourceUnavailable({message: lastFailure, taxonomy: this.sourceName});
    });
  }

  /**
   * Performs one bounded source attempt.
   *
   * @param requestName - Request label used in HTTP failure messages.
   * @param url - Source URL.
   * @param headers - Request headers.
   * @returns The response or a transient failure; fails for a non-transient HTTP status.
   */
  private requestSourceOnce(
    requestName: string,
    url: URL,
    headers: Readonly<Record<string, string>>,
  ): Effect.Effect<SourceAttempt, ArtifactGenerationFailed, HttpClient.HttpClient> {
    return Effect.gen({self: this}, function* () {
      const client = yield* HttpClient.HttpClient;
      const exchange = Effect.gen(function* () {
        const response = yield* Effect.mapError(client.execute(HttpClientRequest.get(url.href, {headers})), transportMessage);
        const bytes = yield* Effect.mapError(readBoundedBytes(response, TAXONOMY_SOURCE_MAX_RESPONSE_BYTES), bodyReadMessage);
        return {status: response.status, bytes};
      }).pipe(
        // Keep the legacy request headers exactly: no trace propagation headers to external sources.
        Effect.provideService(HttpClient.TracerPropagationEnabled, false),
        Effect.timeoutOption(Duration.millis(TAXONOMY_SOURCE_TIMEOUT_MS)),
      );
      const settled = yield* exchange.pipe(
        Effect.map((result) =>
          Option.match(result, {
            onNone: (): SourceAttempt => ({
              kind: "transient",
              message: `${requestName} timed out after ${String(TAXONOMY_SOURCE_TIMEOUT_MS)}ms.`,
            }),
            onSome: ({status, bytes}): SourceAttempt | number =>
              status >= 200 && status <= 299 ? {kind: "response", response: {bytes, text: utf8Decoder.decode(bytes)}} : status,
          }),
        ),
        Effect.catch((message: string) => Effect.succeed<SourceAttempt>({kind: "transient", message})),
      );
      if (typeof settled !== "number") {
        return settled;
      }

      const failure = `${requestName} failed with HTTP ${String(settled)}.`;
      if (!isTransientHttpStatus(settled)) {
        return yield* artifactFailure(this.sourceName, failure);
      }
      return {kind: "transient", message: failure} satisfies SourceAttempt;
    });
  }

  /**
   * Generates through `produce` and falls back to a validated cache when the source is unavailable.
   *
   * @param fileName - Expected cached artifact file name.
   * @param identity - Exact taxonomy identity required from the cache.
   * @param produce - Source generation.
   * @returns The produced or cached paths in output-root order; every final failure is logged.
   */
  protected withCachedFallback<R>(
    fileName: string,
    identity: TaxonomyArtifactIdentity,
    produce: Effect.Effect<readonly string[], ArtifactGenerationError, R>,
  ): Effect.Effect<readonly string[], ArtifactGenerationError, R | FileSystem.FileSystem | Environment> {
    return produce.pipe(
      Effect.catchTag("TaxonomySourceUnavailable", (sourceError) => this.useCachedArtifact(fileName, identity, sourceError)),
      Effect.tapError((error) => Effect.logError(`[${this.sourceName}] ${error.message}`)),
    );
  }

  /**
   * Validates and returns the tracked taxonomy cache for an unavailable source.
   *
   * @param fileName - Expected cached artifact file name.
   * @param identity - Exact taxonomy identity required from the cache.
   * @param sourceError - The exhausted source failure.
   * @returns Validated cached paths in output-root order.
   */
  private useCachedArtifact(
    fileName: string,
    identity: TaxonomyArtifactIdentity,
    sourceError: TaxonomySourceUnavailable,
  ): Effect.Effect<readonly string[], ArtifactGenerationError, FileSystem.FileSystem | Environment> {
    return Effect.gen({self: this}, function* () {
      const fs = yield* FileSystem.FileSystem;
      const paths = (yield* this.resolveOutputRoots()).map((root) => resolve(root, fileName));
      const unavailable = (detail: string): TaxonomySourceUnavailable =>
        new TaxonomySourceUnavailable({message: `${sourceError.message} ${detail}`, taxonomy: this.sourceName});
      if (paths.length === 0) {
        return yield* unavailable(`Cached taxonomy artifact '${fileName}' has no configured output roots.`);
      }

      const cachedContents = yield* Effect.forEach(paths, (path) => fs.readFileString(path), {concurrency: "unbounded"}).pipe(
        Effect.mapError((cacheError) => unavailable(`Cached taxonomy artifact '${fileName}' could not be read: ${cacheError.message}`)),
      );

      const firstContents = cachedContents[0];
      if (firstContents === undefined || cachedContents.some((contents) => contents !== firstContents)) {
        return yield* artifactFailure(this.sourceName, `Cached taxonomy artifact '${fileName}' is not byte-identical across output roots.`);
      }

      yield* Effect.try({
        try: () => this.validateArtifactIdentity(fileName, this.parseArtifact(firstContents), identity),
        catch: (cacheError) =>
          artifactFailure(
            this.sourceName,
            `${sourceError.message} Cached taxonomy artifact '${fileName}' is invalid: ${errorMessage(cacheError)}`,
          ),
      });

      yield* Effect.logWarning(`[${this.sourceName}] Source unavailable after retries; using validated cached artifact '${fileName}'.`);
      return paths;
    });
  }

  /**
   * Validates, serializes, and writes an artifact to every output root.
   *
   * @param fileName - Generated artifact file name.
   * @param artifact - Artifact contract to validate and serialize.
   * @returns Absolute paths written or preserved, in output-root order.
   */
  protected writeArtifact(
    fileName: string,
    artifact: Readonly<TaxonomyArtifact>,
  ): Effect.Effect<readonly string[], ArtifactGenerationFailed, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      yield* this.validate(() => this.validateArtifact(artifact));
      const fs = yield* FileSystem.FileSystem;
      const paths = (yield* this.resolveOutputRoots()).map((root) => resolve(root, fileName));
      const existingContents = yield* this.readExistingArtifactContents(paths);
      const contents = yield* this.selectStableArtifactContents(fileName, artifact, existingContents);

      yield* Effect.forEach(
        paths,
        (path, index) => (existingContents[index] === contents ? Effect.void : writeTextAtomic(path, contents)),
        {concurrency: "unbounded", discard: true},
      );

      const writtenContents = yield* Effect.forEach(paths, (path) => fs.readFileString(path), {concurrency: "unbounded"});
      if (writtenContents.some((writtenContent) => writtenContent !== contents)) {
        return yield* artifactFailure(this.sourceName, `Mirrored artifact '${fileName}' was not written identically.`);
      }

      return paths;
    }).pipe(Effect.mapError(toArtifactFailure(this.sourceName)));
  }

  /**
   * Reads optional existing mirrors without hiding non-missing filesystem errors.
   *
   * @param paths - Absolute mirror paths.
   * @returns Existing contents, using `null` only for missing paths.
   */
  private readExistingArtifactContents(
    paths: readonly string[],
  ): Effect.Effect<readonly (string | null)[], PlatformError.PlatformError, FileSystem.FileSystem> {
    return Effect.flatMap(Effect.service(FileSystem.FileSystem), (fs) =>
      Effect.forEach(
        paths,
        (path) =>
          fs
            .readFileString(path)
            .pipe(Effect.catch((error) => (isMissingPath(error) ? Effect.succeed<string | null>(null) : Effect.fail(error)))),
        {concurrency: "unbounded"},
      ),
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
  ): Effect.Effect<string> {
    const generatedContents = JSON.stringify(artifact);
    if (existingContents.length === 0 || existingContents.some((contents) => contents === null)) {
      return Effect.succeed(generatedContents);
    }

    const firstContents = existingContents[0];
    if (firstContents === undefined || firstContents === null || existingContents.some((contents) => contents !== firstContents)) {
      return Effect.as(Effect.logWarning(`Existing mirrored artifact '${fileName}' diverged and will be replaced.`), generatedContents);
    }

    try {
      const existingArtifact = this.parseArtifact(firstContents);
      const stableCandidate = JSON.stringify({...artifact, generatedAt: existingArtifact.generatedAt});
      if (stableCandidate === firstContents) {
        return Effect.as(Effect.logDebug(`Artifact '${fileName}' is unchanged; preserving its tracked bytes.`), firstContents);
      }
    } catch (error: unknown) {
      return Effect.as(
        Effect.logWarning(`Existing artifact '${fileName}' is invalid and will be replaced: ${errorMessage(error)}`),
        generatedContents,
      );
    }

    return Effect.succeed(generatedContents);
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
   * @throws {Error} When any identity field differs.
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
   * @throws {TypeError} When the field is not an array of non-empty strings.
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
 * const outputs = yield* new Gs1GpcTaxonomyClassificationGenerator().generate();
 * ```
 */
export class Gs1GpcTaxonomyClassificationGenerator extends TaxonomyClassificationGenerator {
  /** Pinned GS1 release endpoint. */
  static readonly #sourceUrl = "https://ref.gs1.org/standards/gpc/2026-05/";

  /** Version encoded in the generated artifact. */
  static readonly #version = "2026-05";

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

  /** Generator label used in log lines and failures. */
  protected override readonly sourceName = "GPC";

  /** Archive extractor used by this generator. */
  readonly #archiveExtractor: SystemArchiveExtractor;

  /**
   * Creates the GPC generator.
   *
   * @param outputRoots - Optional mirrored artifact output directories.
   */
  public constructor(outputRoots?: readonly string[]) {
    super(outputRoots);
    this.#archiveExtractor = new SystemArchiveExtractor("GPC");
  }

  /**
   * Downloads, validates, normalizes, and writes the GPC artifact.
   *
   * @returns Every mirrored GPC artifact path.
   */
  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      yield* Effect.logInfo("[GPC] Starting generation.");
      return yield* this.withCachedFallback(
        taxonomyArtifactFileNames.gpc,
        {
          system: "GS1_GPC",
          version: Gs1GpcTaxonomyClassificationGenerator.#version,
          sourceUrl: Gs1GpcTaxonomyClassificationGenerator.#sourceUrl,
          attribution: Gs1GpcTaxonomyClassificationGenerator.#attribution,
        },
        this.generateFromSource(),
      );
    });
  }

  /**
   * Generates the GPC artifact from the pinned source archive.
   *
   * @returns Every mirrored GPC artifact path.
   */
  private generateFromSource(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      const presenter = yield* Presenter;
      yield* Effect.logInfo("[GPC] Fetching the GS1 GPC source.");
      const response = yield* this.fetchSource("GPC download", new URL(Gs1GpcTaxonomyClassificationGenerator.#sourceUrl), {
        Accept: "application/zip",
      });

      const jsonBytes = yield* this.#archiveExtractor.extractEntry(response.bytes, Gs1GpcTaxonomyClassificationGenerator.#archiveEntryName);
      const nodes = yield* this.validate(() => this.parseDocument(JSON.parse(utf8Decoder.decode(jsonBytes))));
      yield* Effect.logDebug(`[GPC] Normalized ${nodes.length} taxonomy node(s).`);
      yield* Effect.logInfo("[GPC] Writing mirrored taxonomy artifacts.");

      const outputs = yield* this.writeArtifact(taxonomyArtifactFileNames.gpc, {
        system: "GS1_GPC",
        version: Gs1GpcTaxonomyClassificationGenerator.#version,
        sourceUrl: Gs1GpcTaxonomyClassificationGenerator.#sourceUrl,
        generatedAt: DateTime.formatIso(yield* DateTime.now),
        attribution: Gs1GpcTaxonomyClassificationGenerator.#attribution,
        nodes,
      });
      yield* presenter.success(`[GPC] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    });
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
 * yield* new EcoicopTaxonomyClassificationGenerator().generate();
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

  /** Required European Union source attribution. */
  static readonly #attribution =
    "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.";

  /** Generator label used in log lines and failures. */
  protected override readonly sourceName = "ECOICOP";

  /**
   * Creates the ECOICOP generator.
   *
   * @param outputRoots - Optional mirrored artifact output directories.
   */
  public constructor(outputRoots?: readonly string[]) {
    super(outputRoots);
  }

  /**
   * Downloads, validates, normalizes, and writes the ECOICOP artifact.
   *
   * @returns Every mirrored ECOICOP artifact path.
   */
  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      yield* Effect.logInfo("[ECOICOP] Starting generation.");
      return yield* this.withCachedFallback(
        taxonomyArtifactFileNames.ecoicop,
        {
          system: "ECOICOP_V2",
          version: EcoicopTaxonomyClassificationGenerator.#version,
          sourceUrl: `${EcoicopTaxonomyClassificationGenerator.#endpoint}#${EcoicopTaxonomyClassificationGenerator.#scheme}`,
          attribution: EcoicopTaxonomyClassificationGenerator.#attribution,
        },
        this.generateFromSource(),
      );
    });
  }

  /**
   * Generates the ECOICOP artifact from the SPARQL endpoint.
   *
   * @returns Every mirrored ECOICOP artifact path.
   */
  private generateFromSource(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      const presenter = yield* Presenter;
      yield* Effect.logInfo("[ECOICOP] Fetching Publications Office taxonomy data.");
      const bindings = yield* this.fetchBindings();
      const nodes = yield* this.validate(() => this.normalizeBindings(bindings));
      yield* Effect.logDebug(`[ECOICOP] Normalized ${nodes.length} taxonomy node(s).`);
      yield* Effect.logInfo("[ECOICOP] Writing mirrored taxonomy artifacts.");

      const outputs = yield* this.writeArtifact(taxonomyArtifactFileNames.ecoicop, {
        system: "ECOICOP_V2",
        version: EcoicopTaxonomyClassificationGenerator.#version,
        sourceUrl: `${EcoicopTaxonomyClassificationGenerator.#endpoint}#${EcoicopTaxonomyClassificationGenerator.#scheme}`,
        generatedAt: DateTime.formatIso(yield* DateTime.now),
        attribution: EcoicopTaxonomyClassificationGenerator.#attribution,
        nodes,
      });
      yield* presenter.success(`[ECOICOP] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    });
  }

  /**
   * Fetches every paginated ECOICOP binding.
   *
   * @returns Validated source bindings in endpoint order.
   */
  private fetchBindings(): Effect.Effect<readonly SparqlBinding[], ArtifactGenerationError, HttpClient.HttpClient> {
    return Effect.gen({self: this}, function* () {
      const bindings: SparqlBinding[] = [];
      for (let offset = 0; ; offset += EcoicopTaxonomyClassificationGenerator.#pageSize) {
        const url = new URL(EcoicopTaxonomyClassificationGenerator.#endpoint);
        url.searchParams.set("query", this.createQuery(offset));
        url.searchParams.set("format", "application/sparql-results+json");
        // Sequential by design: the next page offset depends on the current page's size.
        const response = yield* this.fetchSource("SPARQL request", url, {Accept: "application/sparql-results+json"});
        const page = yield* this.validate(() => this.parseResponse(JSON.parse(response.text)));
        bindings.push(...page);
        if (page.length < EcoicopTaxonomyClassificationGenerator.#pageSize) break;
      }
      return bindings;
    });
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
  private parseResponse(value: unknown): readonly SparqlBinding[] {
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
  private normalizeBindings(bindings: readonly SparqlBinding[]): readonly TaxonomyArtifactNode[] {
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
 * yield* new NaceTaxonomyClassificationGenerator().generate();
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

  /** Required European Union source attribution. */
  static readonly #attribution =
    "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.";

  /** Generator label used in log lines and failures. */
  protected override readonly sourceName = "NACE";

  /**
   * Creates the NACE generator.
   *
   * @param outputRoots - Optional mirrored artifact output directories.
   */
  public constructor(outputRoots?: readonly string[]) {
    super(outputRoots);
  }

  /**
   * Downloads, validates, normalizes, and writes the NACE artifact.
   *
   * @returns Every mirrored NACE artifact path.
   */
  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      yield* Effect.logInfo("[NACE] Starting generation.");
      return yield* this.withCachedFallback(
        taxonomyArtifactFileNames.nace,
        {
          system: "NACE_2_1",
          version: NaceTaxonomyClassificationGenerator.#version,
          sourceUrl: `${NaceTaxonomyClassificationGenerator.#endpoint}#${NaceTaxonomyClassificationGenerator.#scheme}`,
          attribution: NaceTaxonomyClassificationGenerator.#attribution,
        },
        this.generateFromSource(),
      );
    });
  }

  /**
   * Generates the NACE artifact from the SPARQL endpoint.
   *
   * @returns Every mirrored NACE artifact path.
   */
  private generateFromSource(): Effect.Effect<readonly string[], ArtifactGenerationError, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      const presenter = yield* Presenter;
      yield* Effect.logInfo("[NACE] Fetching Publications Office taxonomy data.");
      const bindings = yield* this.fetchBindings();
      const nodes = yield* this.validate(() => this.normalizeBindings(bindings));
      yield* Effect.logDebug(`[NACE] Normalized ${nodes.length} taxonomy node(s).`);
      yield* Effect.logInfo("[NACE] Writing mirrored taxonomy artifacts.");

      const outputs = yield* this.writeArtifact(taxonomyArtifactFileNames.nace, {
        system: "NACE_2_1",
        version: NaceTaxonomyClassificationGenerator.#version,
        sourceUrl: `${NaceTaxonomyClassificationGenerator.#endpoint}#${NaceTaxonomyClassificationGenerator.#scheme}`,
        generatedAt: DateTime.formatIso(yield* DateTime.now),
        attribution: NaceTaxonomyClassificationGenerator.#attribution,
        nodes,
      });
      yield* presenter.success(`[NACE] Generated ${outputs.length} artifact file(s).`);
      return outputs;
    });
  }

  /**
   * Fetches every paginated NACE binding.
   *
   * @returns Validated source bindings in endpoint order.
   */
  private fetchBindings(): Effect.Effect<readonly SparqlBinding[], ArtifactGenerationError, HttpClient.HttpClient> {
    return Effect.gen({self: this}, function* () {
      const bindings: SparqlBinding[] = [];
      for (let offset = 0; ; offset += NaceTaxonomyClassificationGenerator.#pageSize) {
        const url = new URL(NaceTaxonomyClassificationGenerator.#endpoint);
        url.searchParams.set("query", this.createQuery(offset));
        url.searchParams.set("format", "application/sparql-results+json");
        // Sequential by design: the next page offset depends on the current page's size.
        const response = yield* this.fetchSource("SPARQL request", url, {Accept: "application/sparql-results+json"});
        const page = yield* this.validate(() => this.parseResponse(JSON.parse(response.text)));
        bindings.push(...page);
        if (page.length < NaceTaxonomyClassificationGenerator.#pageSize) break;
      }
      return bindings;
    });
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
  private parseResponse(value: unknown): readonly SparqlBinding[] {
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
  private normalizeBindings(bindings: readonly SparqlBinding[]): readonly TaxonomyArtifactNode[] {
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
 * manifest parsing, primitive field validation, and dependency-map validation.
 */
export abstract class LicenseGenerator {
  /** Generator label used in log lines and as the failed `artifact`. */
  protected abstract readonly sourceName: string;

  /** Creates a license generator. */
  protected constructor() {}

  /**
   * Generates one license document family.
   *
   * @returns Every license artifact path written by the generator.
   */
  public abstract generate(): Effect.Effect<readonly string[], ArtifactGenerationFailed, GenerateRequirements>;

  /**
   * Runs a synchronous validator and attributes its failure to this generator.
   *
   * @param evaluate - Pure computation that may throw.
   * @returns Its value, or an {@link ArtifactGenerationFailed}.
   */
  protected validate<A>(evaluate: () => A): Effect.Effect<A, ArtifactGenerationFailed> {
    return validateSync(this.sourceName, evaluate);
  }

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

/** One installed package classified by its declared dependency group. */
interface ResolvedPackage {
  /** Declared dependency group. */
  readonly dependencyType: NodePackageDependencyType;
  /** Normalized package metadata. */
  readonly packageInformation: NodePackageInformation;
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
 * yield* new FrontendLicenseGenerator().generate();
 * ```
 */
export class FrontendLicenseGenerator extends LicenseGenerator {
  /** Generator label used in log lines and failures. */
  protected override readonly sourceName = "Frontend licenses";

  /** Repository root containing the frontend manifest and installed packages, when explicit. */
  readonly #workspaceRoot: string | undefined;

  /**
   * Creates the frontend license generator.
   *
   * @param workspaceRoot - Repository root containing the frontend and node_modules; defaults to
   * the environment working directory.
   */
  public constructor(workspaceRoot?: string) {
    super();
    this.#workspaceRoot = workspaceRoot;
  }

  /**
   * Reads direct frontend dependencies and writes `licenses.json`.
   *
   * @returns The generated frontend license-document path.
   */
  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationFailed, GenerateRequirements> {
    return Effect.gen({self: this}, function* () {
      yield* Effect.logInfo("[Frontend licenses] Starting generation.");
      return yield* this.generateDocument().pipe(
        Effect.mapError(toArtifactFailure(this.sourceName)),
        Effect.tapError((error) => Effect.logError(`[Frontend licenses] ${error.message}`)),
      );
    });
  }

  /**
   * Discovers, groups, and writes the frontend license document.
   *
   * @returns The generated frontend license-document path.
   */
  private generateDocument(): Effect.Effect<
    readonly string[],
    ArtifactGenerationFailed | PlatformError.PlatformError,
    GenerateRequirements
  > {
    return Effect.gen({self: this}, function* () {
      const presenter = yield* Presenter;
      const workspaceRoot = this.#workspaceRoot ?? (yield* Environment).cwd;
      yield* Effect.logInfo("[Frontend licenses] Reading the frontend dependency manifest.");
      const declaredDependencies = yield* this.readDeclaredDependencies(workspaceRoot);
      const manifestPaths = yield* this.findInstalledManifestPaths(workspaceRoot, declaredDependencies);
      yield* Effect.logDebug(`[Frontend licenses] Discovered ${manifestPaths.length} direct installed package manifest(s).`);
      const resolvedPackages = yield* Effect.forEach(
        manifestPaths,
        (manifestPath) => this.readInstalledPackage(manifestPath, declaredDependencies),
        {concurrency: "unbounded"},
      );
      const groupedPackages = new Map<NodePackageDependencyType, NodePackageInformation[]>();

      for (const resolvedPackage of resolvedPackages) {
        if (resolvedPackage === null) continue;
        const packages = groupedPackages.get(resolvedPackage.dependencyType) ?? [];
        packages.push(resolvedPackage.packageInformation);
        groupedPackages.set(resolvedPackage.dependencyType, packages);
      }

      const packageCount = [...groupedPackages.values()].reduce((total, packages) => total + packages.length, 0);
      yield* Effect.logDebug(`[Frontend licenses] Grouped ${packageCount} declared package(s).`);
      const outputPath = join(workspaceRoot, "sites", "arolariu.ro", "licenses.json");
      const sortedPackages = new Map<NodePackageDependencyType, readonly NodePackageInformation[]>();
      for (const dependencyType of ["production", "development", "peer"] as const) {
        const packageInformation = groupedPackages.get(dependencyType) ?? [];
        sortedPackages.set(
          dependencyType,
          packageInformation.toSorted((left, right) => left.name.localeCompare(right.name)),
        );
      }

      yield* Effect.logInfo("[Frontend licenses] Writing licenses.json.");
      yield* writeTextAtomic(outputPath, `${JSON.stringify(Object.fromEntries(sortedPackages))}\n`);
      yield* presenter.success("[Frontend licenses] Generated 1 artifact file(s).");
      return [outputPath];
    });
  }

  /**
   * Reads declared frontend dependency names by dependency type.
   *
   * @param workspaceRoot - Repository root containing the frontend manifest.
   * @returns Map of production, development, and peer dependency names.
   */
  private readDeclaredDependencies(
    workspaceRoot: string,
  ): Effect.Effect<
    ReadonlyMap<NodePackageDependencyType, readonly string[]>,
    ArtifactGenerationFailed | PlatformError.PlatformError,
    FileSystem.FileSystem
  > {
    return Effect.gen({self: this}, function* () {
      const fs = yield* FileSystem.FileSystem;
      const manifestPath = join(workspaceRoot, "sites", "arolariu.ro", "package.json");
      const contents = yield* fs.readFileString(manifestPath);
      return yield* this.validate(() => {
        const manifest = this.readJsonRecord(contents, manifestPath);
        return new Map<NodePackageDependencyType, readonly string[]>([
          ["production", Object.keys(this.readDependencyMap(manifest, "dependencies", manifestPath))],
          ["development", Object.keys(this.readDependencyMap(manifest, "devDependencies", manifestPath))],
          ["peer", Object.keys(this.readDependencyMap(manifest, "peerDependencies", manifestPath))],
        ]);
      });
    });
  }

  /**
   * Finds direct installed package manifests, including scoped packages.
   *
   * @param workspaceRoot - Repository root containing the installed packages.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Absolute direct package-manifest paths in declared dependency order.
   */
  private findInstalledManifestPaths(
    workspaceRoot: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): Effect.Effect<readonly string[], ArtifactGenerationFailed | PlatformError.PlatformError, FileSystem.FileSystem> {
    return Effect.gen({self: this}, function* () {
      const fs = yield* FileSystem.FileSystem;
      const packageNames = [
        ...new Set(
          (["production", "development", "peer"] as const).flatMap((dependencyType) => declaredDependencies.get(dependencyType) ?? []),
        ),
      ];
      const paths: string[] = [];
      const unresolvedPackageNames: string[] = [];

      for (const packageName of packageNames) {
        const relativeManifestPath = join(...packageName.split("/"), "package.json");
        const candidates = [
          join(workspaceRoot, "node_modules", relativeManifestPath),
          join(workspaceRoot, "sites", "arolariu.ro", "node_modules", relativeManifestPath),
        ];
        let resolvedPath: string | undefined;

        for (const candidate of candidates) {
          // Sequential by design: the first existing candidate wins, so later candidates are not probed.
          if (yield* fs.exists(candidate)) {
            resolvedPath = candidate;
            break;
          }
        }

        if (resolvedPath === undefined) unresolvedPackageNames.push(packageName);
        else paths.push(resolvedPath);
      }

      if (unresolvedPackageNames.length > 0) {
        return yield* artifactFailure(
          this.sourceName,
          `Unable to resolve declared frontend package manifest(s): ${unresolvedPackageNames.toSorted().join(", ")}.`,
        );
      }

      return paths;
    });
  }

  /**
   * Reads and normalizes one installed package manifest.
   *
   * @param manifestPath - Absolute installed package-manifest path.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Classified package information, or `null` for undeclared packages.
   */
  private readInstalledPackage(
    manifestPath: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): Effect.Effect<ResolvedPackage | null, ArtifactGenerationFailed | PlatformError.PlatformError, FileSystem.FileSystem> {
    return Effect.gen({self: this}, function* () {
      const fs = yield* FileSystem.FileSystem;
      const contents = yield* fs.readFileString(manifestPath);
      return yield* this.validate(() => this.normalizeInstalledPackage(contents, manifestPath, declaredDependencies));
    });
  }

  /**
   * Normalizes one installed package manifest.
   *
   * @param contents - Manifest JSON text.
   * @param manifestPath - Absolute installed package-manifest path.
   * @param declaredDependencies - Frontend dependency names grouped by type.
   * @returns Classified package information, or `null` for undeclared packages.
   * @throws {Error} When package metadata has an invalid shape.
   */
  private normalizeInstalledPackage(
    contents: string,
    manifestPath: string,
    declaredDependencies: ReadonlyMap<NodePackageDependencyType, readonly string[]>,
  ): ResolvedPackage | null {
    const manifest = this.readJsonRecord(contents, manifestPath);
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
 * yield* new BackendLicenseGenerator().generate(); // []
 * ```
 */
export class BackendLicenseGenerator extends LicenseGenerator {
  /** Generator label used in log lines and failures. */
  protected override readonly sourceName = "Backend licenses";

  /** Creates the deferred backend license generator. */
  public constructor() {
    super();
  }

  /**
   * Reports deferred behavior and returns no outputs.
   *
   * @returns An empty output-path collection.
   */
  public override generate(): Effect.Effect<readonly string[], ArtifactGenerationFailed, GenerateRequirements> {
    return Effect.as(Effect.logWarning("[Backend licenses] Generation is intentionally deferred; no artifact was written."), []);
  }
}

/**
 * Extracts ZIP entries by delegating to the host operating system.
 *
 * @remarks
 * Windows uses `tar.exe`; Linux and macOS use `unzip`, both through `Process.run` with captured
 * output. Every extraction runs inside one scoped temporary workspace, so the workspace is removed
 * when extraction succeeds, fails, or is interrupted, and nothing other than that directory is
 * ever removed.
 */
class SystemArchiveExtractor {
  /** Generator label attached to extraction failures. */
  readonly #artifact: string;

  /**
   * Creates the archive extractor.
   *
   * @param artifact - Generator label attached to extraction failures.
   */
  public constructor(artifact: string) {
    this.#artifact = artifact;
  }

  /**
   * Extracts one archive entry selected by exact name.
   *
   * @param archive - Complete ZIP archive bytes.
   * @param entryName - Exact extracted file name identifying the desired entry.
   * @returns Extracted entry bytes; fails when the platform tool is missing, extraction fails, or
   * the matching entry is missing or ambiguous.
   */
  public extractEntry(
    archive: Uint8Array,
    entryName: string,
  ): Effect.Effect<Uint8Array, ArtifactGenerationFailed, FileSystem.FileSystem | Process | Environment | Glob> {
    const artifact = this.#artifact;
    return Effect.scoped(
      Effect.gen({self: this}, function* () {
        const fs = yield* FileSystem.FileSystem;
        const processes = yield* Process;
        const environment = yield* Environment;
        const glob = yield* Glob;
        const temporaryDirectory = yield* fs.makeTempDirectoryScoped({prefix: "arolariu-taxonomy-"});
        const archivePath = join(temporaryDirectory, "source.zip");
        const outputDirectory = join(temporaryDirectory, "extracted");
        const request = this.createRequest(environment.platform, archivePath, outputDirectory);

        yield* fs.makeDirectory(outputDirectory, {recursive: true});
        yield* fs.writeFile(archivePath, archive);
        yield* processes
          .run(request, {output: "capture"})
          .pipe(Effect.mapError((error) => this.toExtractionFailure(request, error, environment.platform)));

        const matchingPaths = (yield* glob.match("**/*", {cwd: outputDirectory, onlyFiles: true})).filter(
          (extractedPath) => basename(extractedPath) === entryName,
        );
        if (matchingPaths.length > 1) {
          return yield* artifactFailure(artifact, `Extracted archive contains multiple entries named '${entryName}'.`);
        }
        const matchingPath = matchingPaths[0];
        if (matchingPath === undefined) {
          return yield* artifactFailure(artifact, `Extracted archive entry '${entryName}' was not found.`);
        }

        return yield* fs.readFile(matchingPath);
      }),
    ).pipe(Effect.mapError(toArtifactFailure(artifact)));
  }

  /**
   * Builds the platform-specific extraction request.
   *
   * @param platform - Host platform reported by the environment.
   * @param archivePath - Temporary ZIP path.
   * @param outputDirectory - Temporary extraction directory.
   * @returns Executable and argument list.
   */
  private createRequest(platform: NodeJS.Platform, archivePath: string, outputDirectory: string): ProcessRequest {
    return platform === "win32"
      ? {command: "tar.exe", args: ["-xf", archivePath, "-C", outputDirectory]}
      : {command: "unzip", args: ["-qq", archivePath, "-d", outputDirectory]};
  }

  /**
   * Classifies a failed extraction command.
   *
   * @param request - Extraction request that was executed.
   * @param error - The process failure.
   * @param platform - Host platform reported by the environment.
   * @returns The legacy missing-extractor failure for a missing executable, otherwise the process failure message.
   */
  private toExtractionFailure(request: ProcessRequest, error: ProcessError, platform: NodeJS.Platform): ArtifactGenerationFailed {
    const missing =
      error._tag === "ProcessSpawnFailed" && (error.reason === "ENOENT" || error.reason === "NotFound" || error.message.includes("ENOENT"));
    return artifactFailure(
      this.#artifact,
      missing ? `Required archive extractor '${request.command}' was not found on '${platform}'.` : error.message,
    );
  }
}

/**
 * Runs every taxonomy and license generator.
 *
 * @remarks
 * The five generators run concurrently and share the invocation logger, so interleaved messages
 * keep their generator label, while their outputs are flattened back into generator declaration
 * order. The first failure interrupts the remaining generators.
 *
 * @param input - Typed generator input.
 * @returns The completion summary and every artifact path this invocation produced.
 */
export const generateArtifacts: (
  input: Readonly<GenerateArtifactsInput>,
) => Effect.Effect<ArtifactGenerationResult, ArtifactGenerationError, GenerateRequirements> = Effect.fn("generate.artifacts")(function* (
  input: Readonly<GenerateArtifactsInput>,
) {
  const environment = yield* Environment;
  const presenter = yield* Presenter;

  if (input.verbose) {
    yield* Effect.logDebug(`Generating artifacts from working directory: ${environment.cwd}`);
  }

  yield* Effect.logInfo("Starting 5 artifact generator(s).");
  const generators = [
    new Gs1GpcTaxonomyClassificationGenerator(),
    new EcoicopTaxonomyClassificationGenerator(),
    new NaceTaxonomyClassificationGenerator(),
    new FrontendLicenseGenerator(),
    new BackendLicenseGenerator(),
  ] as const;

  const outputs = yield* Effect.all(
    generators.map((generator) => generator.generate()),
    {concurrency: "unbounded"},
  );
  const generatedFiles = outputs.flat();

  const summary = `Generated ${generatedFiles.length} artifact file(s).`;
  yield* presenter.success(summary);
  yield* Effect.logDebug(`Output paths: ${generatedFiles.join(", ")}`);
  return {summary, generatedFiles};
});

/**
 * Legacy invoker over {@link generateArtifacts} for the unmigrated selfhost command.
 *
 * @remarks Deleted in cohort 6 (Task 6.4), when selfhost calls the Effect directly; the image
 * command already does (Task 6.3).
 */
export const generateArtifactsCommand: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult> = legacyInvoker(
  "generate",
  generateArtifacts,
  () => 0,
);
