// @vitest-environment node
/**
 * @fileoverview Tests for unified taxonomy and license artifact generation.
 * @module scripts/generate.artifacts.test
 */

import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {
  BackendLicenseGenerator,
  createGenerateArtifactsCommand,
  EcoicopTaxonomyClassificationGenerator,
  FrontendLicenseGenerator,
  getExpectedTaxonomyArtifactPaths,
  Gs1GpcTaxonomyClassificationGenerator,
  NaceTaxonomyClassificationGenerator,
  taxonomyArtifactFileNames,
  TaxonomyClassificationGenerator,
  type ArtifactGeneratorRuntime,
} from "./generate.artifacts.ts";
import type {CommandExecution, CommandInvoker} from "./core/command/command-execution.ts";
import {buildCommandHost} from "./testing/builders/command-host.builder.ts";
import {ComposedTerminalPresenter} from "./core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "./testing/fixtures/terminal.fixture.ts";
import type {TerminalPresenter} from "./core/presentation/terminal-presenter.ts";
import type {PromptProvider} from "./common/prompts.ts";
import type {ProcessExecutionOptions, ProcessExecutionRequest} from "./core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "./core/process/process-execution-result.ts";
import {AbstractProcessRunner, type ProcessRunner} from "./core/process/process-runner.ts";
import {
  DefaultTaskScheduler,
  type Clock,
  type FileSystem,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  type RuntimeEnvironment,
} from "./common/runtime.ts";
import {nodeFileSystem} from "./common/runtime.node.ts";
import {createHttpResponse, createMemoryFileSystem, repositoryFixtureRoot} from "./common/runtime.testing.ts";
import type {ArtifactGenerationResult, GenerateArtifactsInput} from "./generate.artifacts.ts";
import type {GenerateLeafInput, GenerateLeafResult} from "./generate.env.ts";
import {createGenerateCommand, type GenerateCommandDependencies} from "./generate.ts";
import type {TaxonomyArtifact} from "./types/generators.ts";

/** Decides what one scripted HTTP send returns, by request and global send ordinal. */
type ArtifactHttpRoute = (request: Readonly<HttpRequest>, send: number) => HttpResponse | Error;

/**
 * HTTP capability fake that honors {@link HttpRequest.retry} exactly like the production client:
 * bounded status-based replays only, and no retry for a transport failure.
 */
class ScriptedHttpClient implements HttpClient {
  /** Every send performed, including retried sends, in call order. */
  public readonly sends: Readonly<HttpRequest>[] = [];

  #route: ArtifactHttpRoute;

  public constructor(route: ArtifactHttpRoute) {
    this.#route = route;
  }

  /**
   * Replaces the active route without dropping the recorded send history.
   *
   * @param route - New routing function.
   */
  public useRoute(route: ArtifactHttpRoute): void {
    this.#route = route;
  }

  /** {@inheritDoc HttpClient.request} */
  public async request(request: Readonly<HttpRequest>): Promise<HttpResponse> {
    const attemptsAllowed = request.retry === undefined ? 1 : Math.max(1, request.retry.attempts);

    for (let attempt = 1; attempt <= attemptsAllowed; attempt += 1) {
      this.sends.push(request);
      const outcome = this.#route(request, this.sends.length);
      if (outcome instanceof Error) {
        throw outcome;
      }

      const retryPolicy = request.retry;
      const shouldRetry = retryPolicy !== undefined && attempt < attemptsAllowed && retryPolicy.statuses.includes(outcome.status);
      if (!shouldRetry) {
        return outcome;
      }
    }

    throw new Error("The scripted HTTP client exhausted its attempts without a response.");
  }
}

/** Process runner fake that materializes the GPC archive entries the extractor expects to find. */
class ArchiveExtractionRunner extends AbstractProcessRunner {
  /** Every recorded invocation, in call order. */
  public readonly calls: Readonly<{request: ProcessExecutionRequest; options: ProcessExecutionOptions}>[] = [];

  readonly #files: FileSystem;
  #document: unknown;

  public constructor(files: FileSystem, document: unknown) {
    super();
    this.#files = files;
    this.#document = document;
  }

  /**
   * Replaces the document written into the extraction directory.
   *
   * @param document - GPC source document written by the next extraction.
   */
  public useDocument(document: unknown): void {
    this.#document = document;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions>,
  ): Promise<ProcessExecutionResult> {
    this.calls.push({request, options});
    const outputIndex = request.args.findIndex((value) => value === "-C" || value === "-d");
    const outputDirectory = request.args[outputIndex + 1];
    if (outputDirectory === undefined) {
      throw new Error("Output directory argument is missing.");
    }

    const contents = JSON.stringify(this.#document);
    await this.#files.writeText(join(outputDirectory, "GPC as of May 2026 (2026-05-20) EN.json"), contents);
    await this.#files.writeText(join(outputDirectory, "Delta - GPC as of May 2026 (20260520 v 20251127) EN.json"), contents);

    return {kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0};
  }
}

/**
 * Owns capability fakes, fixtures, temporary paths, and output readers used by artifact
 * generator tests. No test here reads the live taxonomy cache or the network.
 */
class ArtifactGeneratorTestHarness {
  /** Temporary directories registered for cleanup after the current test. */
  readonly #temporaryDirectories: string[] = [];

  /** Ordered logger output captured for semantic assertions. */
  public readonly sink: RecordingTerminalPresenterSink = new RecordingTerminalPresenterSink();

  /** Logger injected into every generator built by this harness. */
  public readonly logger: TerminalPresenter = new ComposedTerminalPresenter("generate::artifacts", {
    color: false,
    sink: this.sink,
  });

  /** Backoff delays every generator requested from the injected clock. */
  public readonly delays: number[] = [];

  /** Scripted HTTP capability shared by every generator built by this harness. */
  public readonly http: ScriptedHttpClient = new ScriptedHttpClient(() => new Error("No taxonomy source was stubbed."));

  /** Archive-extraction process runner used by GPC tests. */
  public readonly runner: ArchiveExtractionRunner;

  /** Deterministic clock recording every requested backoff delay. */
  public readonly clock: Clock;

  /** Valid English GPC source document used by successful generation tests. */
  public readonly gpcDocument = {
    LanguageCode: "EN",
    DateUtc: "2026-05-01",
    Schema: [
      {
        Level: 1,
        Code: 50000000,
        Title: "Food",
        Definition: null,
        DefinitionExcludes: null,
        Active: true,
        Childs: [
          {
            Level: 4,
            Code: 10000266,
            Title: "Bread",
            Definition: "Ready-to-eat; chilled!",
            DefinitionExcludes: null,
            Active: true,
            Childs: [],
          },
        ],
      },
    ],
  } as const;

  public constructor() {
    this.runner = new ArchiveExtractionRunner(nodeFileSystem, this.gpcDocument);
    this.clock = {
      monotonicNow: (): number => 0,
      isoTimestamp: (): string => "2026-08-19T00:00:00.000Z",
      delay: async (milliseconds: number): Promise<void> => {
        this.delays.push(milliseconds);
      },
    };
  }

  /**
   * Builds the capability bundle injected into every generator class under test.
   *
   * @param overrides - Capabilities replacing the harness defaults.
   * @returns A complete artifact generator runtime.
   */
  public createRuntime(overrides: Readonly<Partial<ArtifactGeneratorRuntime>> = {}): ArtifactGeneratorRuntime {
    return {
      files: nodeFileSystem,
      http: this.http,
      runner: this.runner,
      clock: this.clock,
      tasks: new DefaultTaskScheduler(),
      environment: this.createEnvironment(),
      logger: this.logger,
      signal: new AbortController().signal,
      ...overrides,
    };
  }

  /**
   * Builds the immutable environment snapshot generators observe.
   *
   * @param cwd - Working directory reported to the generators.
   * @returns A deterministic environment snapshot.
   */
  public createEnvironment(cwd: string = repositoryFixtureRoot): RuntimeEnvironment {
    return {
      variables: {},
      cwd,
      executablePath: "/usr/bin/node",
      platform: process.platform,
      architecture: "x64",
      stdinIsTTY: false,
      stdoutIsTTY: false,
      isCI: true,
    };
  }

  /**
   * Creates and registers one temporary directory.
   *
   * @param prefix - Temporary-directory prefix.
   * @returns Absolute temporary-directory path.
   */
  public async createTemporaryDirectory(prefix: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), prefix));
    this.#temporaryDirectories.push(directory);
    return directory;
  }

  /**
   * Creates mirrored API and website output roots.
   *
   * @param prefix - Temporary root prefix.
   * @returns API and website output directories.
   */
  public async createOutputRoots(prefix: string): Promise<readonly string[]> {
    const root = await this.createTemporaryDirectory(prefix);
    return [join(root, "api"), join(root, "web")];
  }

  /**
   * Writes one JSON fixture, creating parent directories first.
   *
   * @param path - Fixture file path.
   * @param value - JSON-serializable fixture value.
   */
  public async writeJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, JSON.stringify(value), "utf8");
  }

  /**
   * Reads an array property from a generated JSON document.
   *
   * @param contents - Generated JSON text.
   * @param key - Array property name.
   * @returns Validated array value.
   */
  public readObjectArray(contents: string, key: string): readonly unknown[] {
    const parsed: unknown = JSON.parse(contents);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new TypeError("Generated document must be an object.");
    }

    const value = Reflect.get(parsed, key);
    if (!Array.isArray(value)) {
      throw new TypeError(`Generated document '${key}' field must be an array.`);
    }
    return value;
  }

  /**
   * Creates a SPARQL JSON response.
   *
   * @param bindings - Raw SPARQL bindings.
   * @returns JSON response containing the bindings.
   */
  public createSparqlResponse(bindings: readonly unknown[]): HttpResponse {
    return createHttpResponse(200, JSON.stringify({results: {bindings}}));
  }

  /**
   * Routes every source request through one scripted function.
   *
   * @param route - Routing function applied to every send.
   */
  public stubSources(route: ArtifactHttpRoute): void {
    this.http.useRoute(route);
  }

  /** Stubs successful GPC, ECOICOP, and NACE responses. */
  public stubUnifiedSources(): void {
    this.stubSources((request) => {
      if (request.url.href === "https://ref.gs1.org/standards/gpc/2026-05/") {
        return createHttpResponse(200, "zip-archive");
      }

      const query = request.url.searchParams.get("query") ?? "";
      const isEcoicop = query.includes("ecoicop2");
      return this.createSparqlResponse([
        {
          concept: {value: isEcoicop ? "eco:01" : "nace:A"},
          notation: {value: isEcoicop ? "01" : "A"},
          label: {value: isEcoicop ? "01 Food" : "A Agriculture"},
        },
      ]);
    });
  }

  /**
   * Stubs every request with one unavailable response status.
   *
   * @param status - Response status returned by every send.
   */
  public stubUnavailableSources(status = 503): void {
    this.stubSources(() => createHttpResponse(status, "Unavailable"));
  }

  /**
   * Stubs the GPC request with one specific transport failure.
   *
   * @param error - Error thrown by the HTTP capability for the GPC source.
   */
  public stubGpcFailure(error: Error): void {
    this.stubSources((request) => {
      if (request.url.href === "https://ref.gs1.org/standards/gpc/2026-05/") return error;
      return this.createSparqlResponse([]);
    });
  }

  /**
   * Creates a memory-backed workspace usable by the artifact command object.
   *
   * @returns The seeded filesystem and the working directory generators observe.
   */
  public createCommandWorkspace(): Readonly<{files: FileSystem; cwd: string}> {
    const cwd = repositoryFixtureRoot;
    const files = createMemoryFileSystem({
      [`${cwd}/package.json`]: JSON.stringify({name: "@arolariu/monorepo"}),
      [`${cwd}/sites/arolariu.ro/package.json`]: JSON.stringify({}),
    });
    this.runner.useDocument(this.gpcDocument);
    return {files, cwd};
  }

  /**
   * Asserts that one captured logger stream contains a semantic message.
   *
   * @param level - Semantic output level.
   * @param expected - Stable message fragment.
   */
  public expectMessage(level: "debug" | "info" | "warn" | "error", expected: string): void {
    const stream = level === "warn" || level === "error" ? "stderr" : "stdout";
    expect(this.sink.records.filter((record) => record.stream === stream).map((record) => record.text)).toEqual(
      expect.arrayContaining([expect.stringContaining(expected)]),
    );
  }

  /** Restores mocks and removes every registered temporary directory. */
  public async cleanup(): Promise<void> {
    vi.restoreAllMocks();
    await Promise.all(this.#temporaryDirectories.splice(0).map((directory) => rm(directory, {recursive: true, force: true})));
  }
}

describe("Taxonomy classification generators", () => {
  let harness: ArtifactGeneratorTestHarness;

  beforeEach(() => {
    harness = new ArtifactGeneratorTestHarness();
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  describe("Gs1GpcTaxonomyClassificationGenerator", () => {
    describe("generate", () => {
      it("generates the mirrored GPC artifact", async () => {
        harness.stubUnifiedSources();
        const roots = await harness.createOutputRoots("arolariu-gpc-class-");

        const outputs = await new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate();

        expect(outputs.map((output) => basename(output))).toEqual(["gpc-2026-05.min.json", "gpc-2026-05.min.json"]);
      });

      it("retries a transient HTTP failure before generating", async () => {
        harness.stubSources((_request, send) =>
          send === 1 ? createHttpResponse(503, "Unavailable") : createHttpResponse(200, "zip-archive"),
        );
        const roots = await harness.createOutputRoots("arolariu-gpc-retry-");

        await expect(new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate()).resolves.toHaveLength(2);
        expect(harness.http.sends).toHaveLength(2);
        expect(harness.delays).toEqual([1_000]);
        harness.expectMessage("warn", "[GPC] GPC download failed with HTTP 503. Retrying in 1000ms (attempt 2/3).");
      });

      it("bounds every taxonomy request per attempt and keeps the retry schedule in one layer", async () => {
        harness.stubUnifiedSources();
        const roots = await harness.createOutputRoots("arolariu-gpc-policy-");

        await new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate();

        const [request] = harness.http.sends;
        expect(request?.timeoutMs).toBe(30_000);
        expect(request?.maximumResponseBytes).toBe(64 * 1_024 * 1_024);
        // A nested capability retry policy would multiply the bounded three-attempt budget.
        expect(request?.retry).toBeUndefined();
      });

      it("surfaces HTTP failures", async () => {
        harness.stubUnavailableSources();

        await expect(new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), []).generate()).rejects.toThrow(
          "GPC download failed with HTTP 503.",
        );
        expect(harness.http.sends).toHaveLength(3);
        expect(harness.delays).toEqual([1_000, 4_000]);
      });

      it("shares one bounded attempt budget between transport and transient status failures", async () => {
        harness.stubSources((_request, send) => (send === 1 ? new Error("connection reset") : createHttpResponse(503, "Unavailable")));

        await expect(new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), []).generate()).rejects.toThrow(
          "GPC download failed with HTTP 503.",
        );

        expect(harness.http.sends).toHaveLength(3);
        expect(harness.delays).toEqual([1_000, 4_000]);
        harness.expectMessage("warn", "[GPC] connection reset Retrying in 1000ms (attempt 2/3).");
        harness.expectMessage("warn", "[GPC] GPC download failed with HTTP 503. Retrying in 4000ms (attempt 3/3).");
      });

      it("logs a generator error and rethrows the original failure", async () => {
        harness.stubGpcFailure(new Error("GPC unavailable"));
        const roots = await harness.createOutputRoots("arolariu-gpc-error-");

        await expect(new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate()).rejects.toThrow(
          "GPC unavailable",
        );

        expect(harness.http.sends).toHaveLength(3);
        expect(harness.delays).toEqual([1_000, 4_000]);
        harness.expectMessage("error", "[GPC] GPC unavailable");
      });

      it("rejects a source document outside the pinned release month", async () => {
        harness.stubUnifiedSources();
        harness.runner.useDocument({...harness.gpcDocument, DateUtc: "2025-04-01"});
        const roots = await harness.createOutputRoots("arolariu-gpc-date-");

        await expect(new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate()).rejects.toThrow(
          "GPC source DateUtc must belong to the pinned 2026-05 release.",
        );
      });

      it("uses the injected process runner for archive extraction", async () => {
        harness.stubUnifiedSources();
        const roots = await harness.createOutputRoots("arolariu-gpc-runner-");

        const outputs = await new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate();

        expect(outputs.map((output) => basename(output))).toEqual(["gpc-2026-05.min.json", "gpc-2026-05.min.json"]);
        expect(harness.runner.calls).toHaveLength(1);
        expect(harness.runner.calls[0]?.request).toEqual({
          command: process.platform === "win32" ? "tar.exe" : "unzip",
          args: process.platform === "win32"
            ? expect.arrayContaining(["-xf", expect.any(String), "-C", expect.any(String)])
            : expect.arrayContaining(["-qq", expect.any(String), "-d", expect.any(String)]),
        });
        expect(harness.runner.calls[0]?.options).toMatchObject({output: "capture"});
      });

      it("removes its temporary extraction workspace even when extraction fails", async () => {
        harness.stubUnifiedSources();
        const temporaryDirectories: string[] = [];
        const files: FileSystem = {
          ...nodeFileSystem,
          createTemporaryDirectory: async (prefix: string) => {
            const handle = await nodeFileSystem.createTemporaryDirectory(prefix);
            temporaryDirectories.push(handle.path);
            return handle;
          },
        };
        const runner: ProcessRunner = {
          run: async () => ({kind: "exited", exitCode: 9, stdout: "", stderr: "extraction failed", durationMs: 0}),
          expectSuccess: () => {
            throw new Error("expectSuccess is not used by archive extraction.");
          },
          scope: () => runner,
        };
        const roots = await harness.createOutputRoots("arolariu-gpc-cleanup-");

        await expect(
          new Gs1GpcTaxonomyClassificationGenerator(harness.createRuntime({files, runner}), roots).generate(),
        ).rejects.toThrow();

        expect(temporaryDirectories).toHaveLength(1);
        await expect(nodeFileSystem.exists(temporaryDirectories[0] ?? "")).resolves.toBe(false);
      });
    });
  });

  describe("TaxonomyClassificationGenerator", () => {
    describe("artifact validation", () => {
      it("rejects hierarchy arrays that disagree with the parent chain", async () => {
        class TaxonomyGeneratorProbe extends TaxonomyClassificationGenerator {
          public constructor(runtime: ArtifactGeneratorRuntime, outputRoots: readonly string[]) {
            super(runtime, outputRoots);
          }

          public override async generate(): Promise<readonly string[]> {
            return [];
          }

          public async write(artifact: Readonly<TaxonomyArtifact>): Promise<readonly string[]> {
            return this.writeArtifact("probe.json", artifact);
          }
        }

        const roots = await harness.createOutputRoots("arolariu-hierarchy-validation-");
        const generator = new TaxonomyGeneratorProbe(harness.createRuntime(), roots);

        await expect(
          generator.write({
            system: "NACE_2_1",
            version: "2.1",
            sourceUrl: "https://example.test",
            generatedAt: "2026-08-19T00:00:00.000Z",
            attribution: "Test",
            nodes: [
              {
                code: "A",
                officialLabel: "Root",
                level: "section",
                parentCode: null,
                hierarchyCodes: ["A"],
                hierarchyLabels: ["Root"],
                definition: null,
                searchText: "a root",
              },
              {
                code: "01",
                officialLabel: "Child",
                level: "division",
                parentCode: "A",
                hierarchyCodes: ["01"],
                hierarchyLabels: ["Child"],
                definition: null,
                searchText: "01 child",
              },
            ],
          }),
        ).rejects.toThrow("NACE_2_1 hierarchy for '01' does not match its parent chain.");
      });

      it("preserves existing bytes when only the generation timestamp changes", async () => {
        class TaxonomyGeneratorProbe extends TaxonomyClassificationGenerator {
          public constructor(runtime: ArtifactGeneratorRuntime, outputRoots: readonly string[]) {
            super(runtime, outputRoots);
          }

          public override async generate(): Promise<readonly string[]> {
            return [];
          }

          public async write(artifact: Readonly<TaxonomyArtifact>): Promise<readonly string[]> {
            return this.writeArtifact("probe.json", artifact);
          }
        }

        const roots = await harness.createOutputRoots("arolariu-stable-artifact-");
        const generator = new TaxonomyGeneratorProbe(harness.createRuntime(), roots);
        const artifact: TaxonomyArtifact = {
          system: "NACE_2_1",
          version: "2.1",
          sourceUrl: "https://example.test",
          generatedAt: "2026-08-19T00:00:00.000Z",
          attribution: "Test",
          nodes: [
            {
              code: "A",
              officialLabel: "Root",
              level: "section",
              parentCode: null,
              hierarchyCodes: ["A"],
              hierarchyLabels: ["Root"],
              definition: null,
              searchText: "a root",
            },
          ],
        };

        const outputs = await generator.write(artifact);
        const originalContents = await readFile(outputs[0] ?? "", "utf8");
        await generator.write({
          ...artifact,
          generatedAt: "2026-08-26T00:00:00.000Z",
        });

        await expect(readFile(outputs[0] ?? "", "utf8")).resolves.toBe(originalContents);
        await expect(readFile(outputs[1] ?? "", "utf8")).resolves.toBe(originalContents);
      });
    });
  });

  describe("EcoicopTaxonomyClassificationGenerator", () => {
    describe("generate", () => {
      it("generates a mirrored ECOICOP v2 hierarchy", async () => {
        harness.stubSources(() =>
          harness.createSparqlResponse([
            {concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "01 Food"}},
            {
              concept: {value: "eco:011"},
              notation: {value: "01.1"},
              label: {value: "01.1 Food products"},
              broader: {value: "eco:01"},
            },
          ]),
        );
        const roots = await harness.createOutputRoots("arolariu-ecoicop-class-");

        const outputs = await new EcoicopTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate();
        const nodes = harness.readObjectArray(await readFile(outputs[0] ?? "", "utf8"), "nodes");

        expect(outputs.map((output) => basename(output))).toEqual(["ecoicop-v2.min.json", "ecoicop-v2.min.json"]);
        expect(nodes[1]).toMatchObject({code: "01.1", hierarchyCodes: ["01", "01.1"]});
      });

      it("continues pagination until a short page", async () => {
        const firstPage = Array.from({length: 5_000}, (_, index) => ({
          concept: {value: `eco:${index}`},
          notation: {value: String(index).padStart(4, "0")},
          label: {value: `Label ${index}`},
        }));
        harness.stubSources((_request, send) =>
          send === 1
            ? harness.createSparqlResponse(firstPage)
            : harness.createSparqlResponse([{concept: {value: "eco:final"}, notation: {value: "9999.1"}, label: {value: "Final"}}]),
        );
        const roots = await harness.createOutputRoots("arolariu-ecoicop-pages-");

        await new EcoicopTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate();

        expect(harness.http.sends).toHaveLength(2);
      });

      it("rejects malformed optional bindings", async () => {
        harness.stubSources(() =>
          harness.createSparqlResponse([
            {
              concept: {value: "eco:01"},
              notation: {value: "01"},
              label: {value: "Food"},
              broader: {type: "uri"},
            },
          ]),
        );

        await expect(new EcoicopTaxonomyClassificationGenerator(harness.createRuntime(), []).generate()).rejects.toThrow(
          "SPARQL binding 'broader'.value must be a non-empty string.",
        );
      });

      it("rejects a divergent cached mirror when the source is unavailable", async () => {
        const roots = await harness.createOutputRoots("arolariu-divergent-cache-");
        harness.stubSources(() =>
          harness.createSparqlResponse([{concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "Food"}}]),
        );
        const generator = new EcoicopTaxonomyClassificationGenerator(harness.createRuntime(), roots);
        const outputs = await generator.generate();
        await writeFile(outputs[1] ?? "", "{}", "utf8");
        harness.stubUnavailableSources();

        await expect(generator.generate()).rejects.toThrow("Cached taxonomy artifact 'ecoicop-v2.min.json' is not byte-identical");
      });

      it("does not use cached artifacts for non-transient HTTP failures", async () => {
        const roots = await harness.createOutputRoots("arolariu-non-transient-");
        harness.stubSources(() =>
          harness.createSparqlResponse([{concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "Food"}}]),
        );
        const generator = new EcoicopTaxonomyClassificationGenerator(harness.createRuntime(), roots);
        await generator.generate();
        const sendsBeforeFailure = harness.http.sends.length;
        harness.stubSources(() => createHttpResponse(404, "Missing"));

        await expect(generator.generate()).rejects.toThrow("SPARQL request failed with HTTP 404.");
        expect(harness.http.sends).toHaveLength(sendsBeforeFailure + 1);
      });
    });
  });

  describe("NaceTaxonomyClassificationGenerator", () => {
    describe("generate", () => {
      it("generates NACE 2.1 levels and hierarchy", async () => {
        harness.stubSources(() =>
          harness.createSparqlResponse([
            {concept: {value: "nace:A"}, notation: {value: "A"}, label: {value: "A Agriculture"}},
            {
              concept: {value: "nace:01"},
              notation: {value: "01"},
              label: {value: "01 Crop production"},
              broader: {value: "nace:A"},
            },
          ]),
        );
        const roots = await harness.createOutputRoots("arolariu-nace-class-");

        const outputs = await new NaceTaxonomyClassificationGenerator(harness.createRuntime(), roots).generate();
        const nodes = harness.readObjectArray(await readFile(outputs[0] ?? "", "utf8"), "nodes");

        expect(outputs.map((output) => basename(output))).toEqual(["nace-2.1.min.json", "nace-2.1.min.json"]);
        expect(nodes).toMatchObject([
          {code: "01", level: "division", hierarchyCodes: ["A", "01"]},
          {code: "A", level: "section", hierarchyCodes: ["A"]},
        ]);
      });
    });
  });
});

describe("License generators", () => {
  let harness: ArtifactGeneratorTestHarness;

  beforeEach(() => {
    harness = new ArtifactGeneratorTestHarness();
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  describe("FrontendLicenseGenerator", () => {
    describe("generate", () => {
      it("groups direct frontend dependencies", async () => {
        const workspace = await harness.createTemporaryDirectory("arolariu-license-class-");
        await harness.writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"production-package": "1.0.0"},
          devDependencies: {"development-package": "2.0.0"},
          peerDependencies: {"peer-package": "3.0.0"},
        });
        await harness.writeJson(join(workspace, "node_modules", "production-package", "package.json"), {
          name: "production-package",
          version: "1.0.0",
          license: "MIT",
        });
        await harness.writeJson(join(workspace, "node_modules", "development-package", "package.json"), {
          name: "development-package",
          version: "2.0.0",
          license: "Apache-2.0",
        });
        await harness.writeJson(join(workspace, "node_modules", "peer-package", "package.json"), {
          name: "peer-package",
          version: "3.0.0",
          license: "BSD-3-Clause",
        });

        const [output] = await new FrontendLicenseGenerator(harness.createRuntime(), workspace).generate();

        expect(harness.readObjectArray(await readFile(output ?? "", "utf8"), "production")).toMatchObject([{name: "production-package"}]);
        expect(harness.readObjectArray(await readFile(output ?? "", "utf8"), "development")).toMatchObject([{name: "development-package"}]);
        expect(harness.readObjectArray(await readFile(output ?? "", "utf8"), "peer")).toMatchObject([{name: "peer-package"}]);
      });

      it("sorts scoped packages and applies defaults", async () => {
        const workspace = await harness.createTemporaryDirectory("arolariu-license-order-");
        await harness.writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"zeta-package": "1.0.0", "@scope/alpha-package": "2.0.0"},
        });
        await harness.writeJson(join(workspace, "node_modules", "zeta-package", "package.json"), {
          name: "zeta-package",
          repository: {url: "https://example.test/zeta"},
        });
        await harness.writeJson(join(workspace, "node_modules", "@scope", "alpha-package", "package.json"), {
          name: "@scope/alpha-package",
          author: {name: "Alpha Author"},
        });

        const [output] = await new FrontendLicenseGenerator(harness.createRuntime(), workspace).generate();
        const packages = harness.readObjectArray(await readFile(output ?? "", "utf8"), "production");

        expect(packages).toEqual([
          expect.objectContaining({
            name: "@scope/alpha-package",
            author: "Alpha Author",
            description: "This package has not provided a valid description.",
            homepage: "unknown",
            license: "unknown",
            version: "unknown",
          }),
          expect.objectContaining({name: "zeta-package", homepage: "https://example.test/zeta"}),
        ]);
      });

      it("names malformed installed manifests", async () => {
        const workspace = await harness.createTemporaryDirectory("arolariu-license-invalid-");
        const manifestPath = join(workspace, "node_modules", "broken-package", "package.json");
        await harness.writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"broken-package": "1.0.0"},
        });
        await harness.writeJson(manifestPath, {name: "broken-package", description: 42});

        await expect(new FrontendLicenseGenerator(harness.createRuntime(), workspace).generate()).rejects.toThrow(
          `Package manifest '${manifestPath}' field 'description' must be a string.`,
        );
      });

      it("fails when a declared frontend dependency cannot be resolved", async () => {
        const workspace = await harness.createTemporaryDirectory("arolariu-license-missing-");
        await harness.writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"missing-package": "1.0.0"},
        });

        await expect(new FrontendLicenseGenerator(harness.createRuntime(), workspace).generate()).rejects.toThrow(
          "Unable to resolve declared frontend package manifest(s): missing-package.",
        );
      });

      it("writes fixed dependency-group order and a platform-independent newline", async () => {
        const workspace = await harness.createTemporaryDirectory("arolariu-license-deterministic-");
        await harness.writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"z-production": "1.0.0"},
          devDependencies: {"m-development": "1.0.0"},
          peerDependencies: {"a-peer": "1.0.0"},
        });
        for (const packageName of ["z-production", "m-development", "a-peer"]) {
          await harness.writeJson(join(workspace, "node_modules", packageName, "package.json"), {
            name: packageName,
            version: "1.0.0",
          });
        }

        const [output] = await new FrontendLicenseGenerator(harness.createRuntime(), workspace).generate();
        const contents = await readFile(output ?? "", "utf8");

        expect(contents.startsWith('{"production":')).toBe(true);
        expect(contents.indexOf('"development"')).toBeGreaterThan(contents.indexOf('"production"'));
        expect(contents.indexOf('"peer"')).toBeGreaterThan(contents.indexOf('"development"'));
        expect(contents.endsWith("\n")).toBe(true);
        expect(contents.endsWith("\r\n")).toBe(false);
      });

      it("deduplicates dependent package names using the last declared version", async () => {
        const workspace = await harness.createTemporaryDirectory("arolariu-license-dependents-");
        await harness.writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"package-with-overlap": "1.0.0"},
        });
        await harness.writeJson(join(workspace, "node_modules", "package-with-overlap", "package.json"), {
          name: "package-with-overlap",
          version: "1.0.0",
          dependencies: {shared: "^1.0.0"},
          devDependencies: {shared: "^2.0.0"},
          peerDependencies: {shared: "^3.0.0"},
        });

        const [output] = await new FrontendLicenseGenerator(harness.createRuntime(), workspace).generate();
        const [packageInformation] = harness.readObjectArray(await readFile(output ?? "", "utf8"), "production");

        expect(packageInformation).toMatchObject({
          dependents: [{name: "shared", version: "^3.0.0"}],
        });
      });
    });
  });

  describe("BackendLicenseGenerator", () => {
    describe("generate", () => {
      it("returns no outputs", async () => {
        await expect(new BackendLicenseGenerator(harness.createRuntime()).generate()).resolves.toEqual([]);
      });
    });
  });
});

describe("Artifact orchestration and CLI contracts", () => {
  let harness: ArtifactGeneratorTestHarness;

  beforeEach(() => {
    harness = new ArtifactGeneratorTestHarness();
  });

  afterEach(async () => {
    await harness.cleanup();
  });

  describe("module surface", () => {
    it("exports the generators, the command object, and the canonical taxonomy artifact manifest", async () => {
      const artifactModule = await import("./generate.artifacts.ts");

      expect(Object.keys(artifactModule).toSorted()).toEqual([
        "BackendLicenseGenerator",
        "EcoicopTaxonomyClassificationGenerator",
        "FrontendLicenseGenerator",
        "Gs1GpcTaxonomyClassificationGenerator",
        "LicenseGenerator",
        "NaceTaxonomyClassificationGenerator",
        "TaxonomyClassificationGenerator",
        "createGenerateArtifactsCommand",
        "generateArtifactsCommand",
        "getExpectedTaxonomyArtifactPaths",
        "taxonomyArtifactFileNames",
      ]);
    });
  });

  describe("generateArtifactsCommand", () => {
    it("completes with exit code zero after unified generation succeeds", async () => {
      const {files, cwd} = harness.createCommandWorkspace();
      harness.stubUnifiedSources();
      const command = createGenerateArtifactsCommand({
        host: buildCommandHost({
          runtime: {
            files,
            http: harness.http,
            runner: new ArchiveExtractionRunner(files, harness.gpcDocument),
            clock: harness.clock,
            environment: harness.createEnvironment(cwd),
            presenter: harness.logger,
          },
        }),
      });

      const execution = await command.invoke({verbose: false});

      expect(execution).toMatchObject({status: "completed", exitCode: 0});
      expect(execution.status === "completed" && execution.value.generatedFiles).toHaveLength(7);
    });

    it("routes every message through the injected logger without writing to the console", async () => {
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new RecordingTerminalPresenterSink();
      const logger = new ComposedTerminalPresenter("test::artifacts", {color: false, sink});
      const {files, cwd} = harness.createCommandWorkspace();
      harness.stubUnifiedSources();
      const command = createGenerateArtifactsCommand({
        host: buildCommandHost({
          runtime: {
            files,
            http: harness.http,
            runner: new ArchiveExtractionRunner(files, harness.gpcDocument),
            clock: harness.clock,
            environment: harness.createEnvironment(cwd),
            presenter: logger,
          },
        }),
      });

      await expect(command.invoke({verbose: false}, {presentation: "human"})).resolves.toMatchObject({
        status: "completed",
        exitCode: 0,
      });

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("[arolariu::test::artifacts]"))).toBe(true);
      expect(sink.records.some((record) => record.text.includes("Generated 7 artifact file(s)."))).toBe(true);
    });

    it("logs unified lifecycle progress with the artifact prefix", async () => {
      const {files, cwd} = harness.createCommandWorkspace();
      harness.stubUnifiedSources();
      const command = createGenerateArtifactsCommand({
        host: buildCommandHost({
          runtime: {
            files,
            http: harness.http,
            runner: new ArchiveExtractionRunner(files, harness.gpcDocument),
            clock: harness.clock,
            environment: harness.createEnvironment(cwd),
            presenter: harness.logger,
          },
        }),
      });

      await expect(command.invoke({verbose: false}, {presentation: "human"})).resolves.toMatchObject({status: "completed"});

      harness.expectMessage("info", "[arolariu::generate::artifacts]");
      harness.expectMessage("info", "[GPC] Fetching");
      harness.expectMessage("info", "[ECOICOP] Fetching");
      harness.expectMessage("info", "[NACE] Fetching");
      harness.expectMessage("info", "[Frontend licenses] Reading");
      harness.expectMessage("warn", "[Backend licenses] Generation is intentionally deferred");
      harness.expectMessage("info", "✅ Generated 7 artifact file(s).");
    });

    it("uses validated mirrored taxonomy artifacts when sources remain unavailable", async () => {
      const {files, cwd} = harness.createCommandWorkspace();
      const runner = new ArchiveExtractionRunner(files, harness.gpcDocument);
      const host = buildCommandHost({
        runtime: {
          files,
          http: harness.http,
          runner,
          clock: harness.clock,
          environment: harness.createEnvironment(cwd),
          presenter: harness.logger,
        },
      });
      harness.stubUnifiedSources();
      await expect(createGenerateArtifactsCommand({host}).invoke({verbose: false})).resolves.toMatchObject({
        status: "completed",
        exitCode: 0,
      });

      const sendsBeforeOutage = harness.http.sends.length;
      harness.stubUnavailableSources();

      await expect(createGenerateArtifactsCommand({host}).invoke({verbose: false})).resolves.toMatchObject({
        status: "completed",
        exitCode: 0,
      });

      expect(harness.http.sends.length - sendsBeforeOutage).toBe(9);
      harness.expectMessage("warn", "[GPC] Source unavailable after retries; using validated cached artifact");
      harness.expectMessage("warn", "[ECOICOP] Source unavailable after retries; using validated cached artifact");
      harness.expectMessage("warn", "[NACE] Source unavailable after retries; using validated cached artifact");
    });

    it("fails the invocation when a taxonomy source is unavailable and no cache exists", async () => {
      const files = createMemoryFileSystem({
        [`${repositoryFixtureRoot}/package.json`]: JSON.stringify({name: "@arolariu/monorepo"}),
        [`${repositoryFixtureRoot}/sites/arolariu.ro/package.json`]: JSON.stringify({}),
      });
      harness.stubUnavailableSources();
      const command = createGenerateArtifactsCommand({
        host: buildCommandHost({
          runtime: {
            files,
            http: harness.http,
            runner: new ArchiveExtractionRunner(files, harness.gpcDocument),
            clock: harness.clock,
            environment: harness.createEnvironment(repositoryFixtureRoot),
            presenter: harness.logger,
          },
        }),
      });

      const execution = await command.invoke({verbose: false});

      expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    });
  });

  describe("taxonomy artifact manifest", () => {
    it("matches the canonical paths written by every taxonomy generator", async () => {
      const workspaceRoot = await harness.createTemporaryDirectory("arolariu-taxonomy-manifest-");
      const outputRoots = [
        join(workspaceRoot, "sites", "api.arolariu.ro", "src", "Invoices", "Resources", "Taxonomies"),
        join(workspaceRoot, "sites", "arolariu.ro", "src", "data", "taxonomies"),
      ];
      harness.stubUnifiedSources();
      const runtime = harness.createRuntime();

      const actualPaths = (
        await Promise.all([
          new Gs1GpcTaxonomyClassificationGenerator(runtime, outputRoots).generate(),
          new EcoicopTaxonomyClassificationGenerator(runtime, outputRoots).generate(),
          new NaceTaxonomyClassificationGenerator(runtime, outputRoots).generate(),
        ])
      ).flat();
      const expectedPaths = [
        join(outputRoots[0] ?? "", "gpc-2026-05.min.json"),
        join(outputRoots[1] ?? "", "gpc-2026-05.min.json"),
        join(outputRoots[0] ?? "", "ecoicop-v2.min.json"),
        join(outputRoots[1] ?? "", "ecoicop-v2.min.json"),
        join(outputRoots[0] ?? "", "nace-2.1.min.json"),
        join(outputRoots[1] ?? "", "nace-2.1.min.json"),
      ];

      expect(taxonomyArtifactFileNames).toEqual({
        gpc: "gpc-2026-05.min.json",
        ecoicop: "ecoicop-v2.min.json",
        nace: "nace-2.1.min.json",
      });
      expect(getExpectedTaxonomyArtifactPaths(workspaceRoot)).toEqual(expectedPaths);
      expect(actualPaths).toEqual(expectedPaths);
    });
  });

  describe("generation logger injection", () => {
    it("enables key-only environment diagnostics when VERBOSE=true", async () => {
      const sink = new RecordingTerminalPresenterSink();
      const logger = new ComposedTerminalPresenter("generate::env", {color: false, sink});
      const files = createMemoryFileSystem({
        ".env": [
          "SITE_ENV=DEVELOPMENT",
          "SITE_NAME=Test",
          "SITE_URL=https://example.test",
          "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test",
          "CLERK_SECRET_KEY=sk_test",
          "USE_CDN=false",
        ].join("\n"),
      });
      const environment: RuntimeEnvironment = {
        variables: {INFRA: "local", VERBOSE: "true", SITE_ENV: "VALUE_THAT_MUST_NOT_BE_LOGGED"},
        cwd: repositoryFixtureRoot,
        executablePath: "/usr/bin/node",
        platform: "linux",
        architecture: "x64",
        stdinIsTTY: false,
        stdoutIsTTY: false,
        isCI: true,
      };

      const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");
      const command = createGenerateEnvironmentCommand({host: buildCommandHost({runtime: {files, presenter: logger, environment}})});

      // "human" presentation matches this test's own logger fixture (constructed in human mode)
      // so the effective-verbosity scope generateEnvironment forks (which shares this
      // invocation's presentation) actually renders through the shared sink.
      await expect(command.invoke({verbose: false}, {presentation: "human"})).resolves.toMatchObject({
        status: "completed",
        exitCode: 0,
      });

      const debugOutput = sink.records.map((record) => record.text).join("\n");
      expect(debugOutput).toContain("SITE_ENV");
      expect(debugOutput).not.toContain("VALUE_THAT_MUST_NOT_BE_LOGGED");
    });

    it("uses the injected environment PromptProvider without reading real input", async () => {
      const files = createMemoryFileSystem({".env": ""});
      const confirm = vi.fn().mockResolvedValue(true);
      const text = vi.fn().mockResolvedValue("value");
      const secret = vi.fn().mockResolvedValue("value");
      const prompts: PromptProvider = {
        confirm,
        select: async <TValue extends string>(
          _message: string,
          choices: readonly Readonly<{value: TValue; label: string}>[],
        ): Promise<TValue> => {
          const selected = choices[0]?.value;
          if (selected === undefined) {
            throw new Error("A test choice is required.");
          }
          return selected;
        },
        text,
        secret,
      };

      const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");
      const command = createGenerateEnvironmentCommand({host: buildCommandHost({runtime: {files, prompts}})});

      await expect(command.invoke({verbose: false}, {presentation: "silent"})).resolves.toMatchObject({
        status: "completed",
        exitCode: 0,
      });

      expect(confirm).toHaveBeenCalledOnce();
      expect(text).toHaveBeenCalled();
      expect(secret).toHaveBeenCalled();
    });

    it("routes no-task orchestration output through the supplied logger", async () => {
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new RecordingTerminalPresenterSink();
      const logger = new ComposedTerminalPresenter("generate", {color: false, sink});
      const unusedLeaf: CommandInvoker<GenerateLeafInput, GenerateLeafResult> = {
        invoke: (): Promise<CommandExecution<GenerateLeafResult>> => {
          throw new Error("No generator may run when no task is selected.");
        },
      };
      const dependencies: GenerateCommandDependencies = {
        env: unusedLeaf,
        i18n: unusedLeaf,
        gql: unusedLeaf,
        artifacts: {
          invoke: (): Promise<CommandExecution<ArtifactGenerationResult>> => {
            throw new Error("No generator may run when no task is selected.");
          },
        } satisfies CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>,
      };
      const command = createGenerateCommand(dependencies, {host: buildCommandHost({runtime: {presenter: logger}})});

      await expect(
        command.invoke(
          {verbose: false, env: false, gql: false, i18n: false, artifacts: false},
          {presentation: "human"},
        ),
      ).resolves.toMatchObject({status: "completed", exitCode: 0});

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("No generation tasks selected"))).toBe(true);
    });

    it("routes GraphQL generator output through the supplied logger", async () => {
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new RecordingTerminalPresenterSink();
      const logger = new ComposedTerminalPresenter("generate::gql", {color: false, sink});
      const files = createMemoryFileSystem();

      const {createGenerateGraphqlCommand} = await import("./generate.gql.ts");
      const command = createGenerateGraphqlCommand({host: buildCommandHost({runtime: {files, presenter: logger}})});

      await expect(command.invoke({verbose: false}, {presentation: "silent"})).resolves.toMatchObject({
        status: "completed",
        exitCode: 0,
      });

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("GraphQL generation completed"))).toBe(true);
    });

    it("routes i18n generator output through the supplied logger", async () => {
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new RecordingTerminalPresenterSink();
      const logger = new ComposedTerminalPresenter("generate::i18n", {color: false, sink});
      const files = createMemoryFileSystem({
        [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/en.json`]: '{"greeting":"Hello"}',
        [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/ro.json`]: '{"greeting":"Hello"}',
        [`${repositoryFixtureRoot}/sites/arolariu.ro/messages/fr.json`]: '{"greeting":"Hello"}',
      });

      const {createGenerateI18nCommand} = await import("./generate.i18n.ts");
      const command = createGenerateI18nCommand({host: buildCommandHost({runtime: {files, presenter: logger}})});

      await expect(command.invoke({verbose: false}, {presentation: "silent"})).resolves.toMatchObject({
        status: "completed",
        exitCode: 0,
      });

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("i18n synchronization completed"))).toBe(true);
    });

    it("loads Azure identity lazily and never logs environment secret values", async () => {
      const secretValue = "test-secret-value-that-must-not-be-logged";
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new RecordingTerminalPresenterSink();
      const logger = new ComposedTerminalPresenter("generate::env", {color: false, sink});
      vi.doMock("@azure/identity", () => {
        throw new Error("Azure identity loaded eagerly");
      });
      const files = createMemoryFileSystem({
        ".env": [
          "SITE_ENV=DEVELOPMENT",
          "SITE_NAME=Test",
          "SITE_URL=https://example.test",
          "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test",
          `CLERK_SECRET_KEY=${secretValue}`,
          "USE_CDN=false",
        ].join("\n"),
      });

      try {
        const {createGenerateEnvironmentCommand} = await import("./generate.env.ts");
        const command = createGenerateEnvironmentCommand({host: buildCommandHost({runtime: {files, presenter: logger}})});
        // "human" presentation matches this test's own logger fixture so the effective-verbosity
        // scope generateEnvironment forks still renders its completion output through the sink.
        await expect(command.invoke({verbose: false}, {presentation: "human"})).resolves.toMatchObject({
          status: "completed",
          exitCode: 0,
        });
      } finally {
        vi.doUnmock("@azure/identity");
      }

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("File content generated successfully"))).toBe(true);
      expect(sink.records.every((record) => !record.text.includes(secretValue))).toBe(true);
    });
  });
});
