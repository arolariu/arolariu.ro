// @vitest-environment node
/**
 * @fileoverview Tests for unified taxonomy and license artifact generation.
 * @module scripts/generate.artifacts.test
 */

import {ChildProcess, execFile} from "node:child_process";
import type {ExecFileException} from "node:child_process";
import fs from "node:fs";
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join} from "node:path";
import {stripVTControlCharacters} from "node:util";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {...actual, execFile: vi.fn(actual.execFile)};
});

import {
  BackendLicenseGenerator,
  EcoicopTaxonomyClassificationGenerator,
  FrontendLicenseGenerator,
  getExpectedTaxonomyArtifactPaths,
  Gs1GpcTaxonomyClassificationGenerator,
  main,
  NaceTaxonomyClassificationGenerator,
  taxonomyArtifactFileNames,
  TaxonomyClassificationGenerator,
} from "./generate.artifacts.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {main as generate, parseCommandLineOptions} from "./generate.ts";
import type {TaxonomyArtifact} from "./types";

/**
 * Owns external-boundary mocks, fixtures, temporary paths, and output readers
 * used by artifact-generator tests.
 */
class ArtifactGeneratorTestHarness {
  /** Temporary directories registered for cleanup after the current test. */
  readonly #temporaryDirectories: string[] = [];

  /** ANSI-normalized console messages captured by semantic console level. */
  readonly #consoleMessages: Record<"debug" | "info" | "warn" | "error", string[]> = {
    debug: [],
    info: [],
    warn: [],
    error: [],
  };

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
   * Mocks OS archive extraction by writing an extracted GPC fixture.
   *
   * @param document - GPC document written into the mocked extraction directory.
   */
  public mockArchiveExtraction(document: unknown = this.gpcDocument): void {
    vi.mocked(execFile).mockImplementation((...arguments_) => {
      const commandArguments = arguments_.find(
        (argument): argument is readonly string[] => Array.isArray(argument) && argument.every((value) => typeof value === "string"),
      );
      const callback = arguments_.find(
        (argument): argument is (error: ExecFileException | null, stdout: string | Buffer, stderr: string | Buffer) => void =>
          typeof argument === "function",
      );
      const outputIndex = commandArguments?.findIndex((value) => value === "-C" || value === "-d") ?? -1;
      const outputDirectory = commandArguments?.[outputIndex + 1];
      if (outputDirectory === undefined) throw new Error("Output directory argument is missing.");

      const childProcess = new ChildProcess();
      void Promise.all([
        writeFile(join(outputDirectory, "GPC as of May 2026 (2026-05-20) EN.json"), JSON.stringify(document), "utf8"),
        writeFile(join(outputDirectory, "Delta - GPC as of May 2026 (20260520 v 20251127) EN.json"), JSON.stringify(document), "utf8"),
      ])
        .then(() => {
          callback?.(null, "", "");
        })
        .catch((error: unknown) => {
          callback?.(error instanceof Error ? error : new Error(String(error)), "", "");
        });
      return childProcess;
    });
  }

  /**
   * Creates a SPARQL JSON response.
   *
   * @param bindings - Raw SPARQL bindings.
   * @returns JSON response containing the bindings.
   */
  public createSparqlResponse(bindings: readonly unknown[]): Response {
    return Response.json({results: {bindings}});
  }

  /** Stubs global fetch for successful unified GPC, ECOICOP, and NACE generation. */
  public stubUnifiedFetch(): void {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = new URL(String(input));
        if (url.href === "https://ref.gs1.org/standards/gpc/2026-05/") {
          return new Response(new Uint8Array([1, 2, 3]), {status: 200});
        }

        const query = url.searchParams.get("query") ?? "";
        const isEcoicop = query.includes("ecoicop2");
        return this.createSparqlResponse([
          {
            concept: {value: isEcoicop ? "eco:01" : "nace:A"},
            notation: {value: isEcoicop ? "01" : "A"},
            label: {value: isEcoicop ? "01 Food" : "A Agriculture"},
          },
        ]);
      }),
    );
  }

  /**
   * Stubs the GPC request with one specific failure.
   *
   * @param error - Error thrown by the GPC fetch boundary.
   */
  public stubGpcFailure(error: Error): void {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        if (String(input) === "https://ref.gs1.org/standards/gpc/2026-05/") throw error;
        return this.createSparqlResponse([]);
      }),
    );
  }

  /** Captures and suppresses debug, info, warning, and error console output. */
  public captureConsole(): void {
    for (const level of ["debug", "info", "warn", "error"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: readonly unknown[]) => {
        this.#consoleMessages[level].push(stripVTControlCharacters(args.map((argument) => String(argument)).join(" ")));
      });
    }
  }

  /**
   * Asserts that one captured console level contains a semantic message.
   *
   * @param level - Captured console level.
   * @param expected - Stable message fragment.
   */
  public expectMessage(level: "debug" | "info" | "warn" | "error", expected: string): void {
    expect(this.#consoleMessages[level]).toEqual(expect.arrayContaining([expect.stringContaining(expected)]));
  }

  /**
   * Creates a complete temporary environment for `main`.
   *
   * @returns Output-root and workspace options accepted by `main`.
   */
  public async createUnifiedMainOptions(): Promise<Readonly<{outputRoots: readonly string[]; workspaceRoot: string}>> {
    const workspaceRoot = await this.createTemporaryDirectory("arolariu-unified-main-");
    const outputRoots = [join(workspaceRoot, "api"), join(workspaceRoot, "web")];
    await this.writeJson(join(workspaceRoot, "sites", "arolariu.ro", "package.json"), {});
    this.mockArchiveExtraction();
    this.stubUnifiedFetch();
    return {outputRoots, workspaceRoot};
  }

  /** Restores mocks and removes every registered temporary directory. */
  public async cleanup(): Promise<void> {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => new Response(new Uint8Array([1]), {status: 200})),
        );
        harness.mockArchiveExtraction();
        const roots = await harness.createOutputRoots("arolariu-gpc-class-");

        const outputs = await new Gs1GpcTaxonomyClassificationGenerator(roots).generate();

        expect(outputs.map((output) => basename(output))).toEqual(["gpc-2026-05.min.json", "gpc-2026-05.min.json"]);
      });

      it("retries a transient HTTP failure before generating", async () => {
        vi.useFakeTimers();
        const fetchMock = vi
          .fn()
          .mockResolvedValueOnce(new Response("Unavailable", {status: 503, statusText: "Service Unavailable"}))
          .mockResolvedValueOnce(new Response(new Uint8Array([1]), {status: 200}));
        vi.stubGlobal("fetch", fetchMock);
        harness.mockArchiveExtraction();
        const roots = await harness.createOutputRoots("arolariu-gpc-retry-");

        const generation = new Gs1GpcTaxonomyClassificationGenerator(roots).generate();
        await vi.runAllTimersAsync();

        await expect(generation).resolves.toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it("surfaces HTTP failures", async () => {
        vi.useFakeTimers();
        const fetchMock = vi.fn(async () => new Response("Unavailable", {status: 503, statusText: "Service Unavailable"}));
        vi.stubGlobal("fetch", fetchMock);

        const expectation = expect(new Gs1GpcTaxonomyClassificationGenerator([]).generate()).rejects.toThrow(
          "GPC download failed with HTTP 503 Service Unavailable.",
        );
        await vi.runAllTimersAsync();

        await expectation;
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      it("logs a generator error and rethrows the original failure", async () => {
        vi.useFakeTimers();
        harness.captureConsole();
        const failure = new Error("GPC unavailable");
        harness.stubGpcFailure(failure);
        const roots = await harness.createOutputRoots("arolariu-gpc-error-");

        const expectation = expect(new Gs1GpcTaxonomyClassificationGenerator(roots).generate()).rejects.toThrow("GPC unavailable");
        await vi.runAllTimersAsync();

        await expectation;
        harness.expectMessage("error", "[GPC] GPC unavailable");
      });

      it("rejects a source document outside the pinned release month", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => new Response(new Uint8Array([1]), {status: 200})),
        );
        harness.mockArchiveExtraction({...harness.gpcDocument, DateUtc: "2025-04-01"});
        const roots = await harness.createOutputRoots("arolariu-gpc-date-");

        await expect(new Gs1GpcTaxonomyClassificationGenerator(roots).generate()).rejects.toThrow(
          "GPC source DateUtc must belong to the pinned 2026-05 release.",
        );
      });
    });
  });

  describe("TaxonomyClassificationGenerator", () => {
    describe("artifact validation", () => {
      it("rejects hierarchy arrays that disagree with the parent chain", async () => {
        class TaxonomyGeneratorProbe extends TaxonomyClassificationGenerator {
          public constructor(outputRoots: readonly string[]) {
            super(outputRoots);
          }

          public override async generate(): Promise<readonly string[]> {
            return [];
          }

          public async write(artifact: Readonly<TaxonomyArtifact>): Promise<readonly string[]> {
            return this.writeArtifact("probe.json", artifact);
          }
        }

        const roots = await harness.createOutputRoots("arolariu-hierarchy-validation-");
        const generator = new TaxonomyGeneratorProbe(roots);

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
          public constructor(outputRoots: readonly string[]) {
            super(outputRoots);
          }

          public override async generate(): Promise<readonly string[]> {
            return [];
          }

          public async write(artifact: Readonly<TaxonomyArtifact>): Promise<readonly string[]> {
            return this.writeArtifact("probe.json", artifact);
          }
        }

        const roots = await harness.createOutputRoots("arolariu-stable-artifact-");
        const generator = new TaxonomyGeneratorProbe(roots);
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
        vi.stubGlobal(
          "fetch",
          vi.fn(async () =>
            harness.createSparqlResponse([
              {concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "01 Food"}},
              {
                concept: {value: "eco:011"},
                notation: {value: "01.1"},
                label: {value: "01.1 Food products"},
                broader: {value: "eco:01"},
              },
            ]),
          ),
        );
        const roots = await harness.createOutputRoots("arolariu-ecoicop-class-");

        const outputs = await new EcoicopTaxonomyClassificationGenerator(roots).generate();
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
        const fetchMock = vi
          .fn()
          .mockResolvedValueOnce(harness.createSparqlResponse(firstPage))
          .mockResolvedValueOnce(
            harness.createSparqlResponse([{concept: {value: "eco:final"}, notation: {value: "9999.1"}, label: {value: "Final"}}]),
          );
        vi.stubGlobal("fetch", fetchMock);
        const roots = await harness.createOutputRoots("arolariu-ecoicop-pages-");

        await new EcoicopTaxonomyClassificationGenerator(roots).generate();

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it("rejects malformed optional bindings", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () =>
            harness.createSparqlResponse([
              {
                concept: {value: "eco:01"},
                notation: {value: "01"},
                label: {value: "Food"},
                broader: {type: "uri"},
              },
            ]),
          ),
        );

        await expect(new EcoicopTaxonomyClassificationGenerator([]).generate()).rejects.toThrow(
          "SPARQL binding 'broader'.value must be a non-empty string.",
        );
      });
    });
  });

  describe("NaceTaxonomyClassificationGenerator", () => {
    describe("generate", () => {
      it("generates NACE 2.1 levels and hierarchy", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () =>
            harness.createSparqlResponse([
              {concept: {value: "nace:A"}, notation: {value: "A"}, label: {value: "A Agriculture"}},
              {
                concept: {value: "nace:01"},
                notation: {value: "01"},
                label: {value: "01 Crop production"},
                broader: {value: "nace:A"},
              },
            ]),
          ),
        );
        const roots = await harness.createOutputRoots("arolariu-nace-class-");

        const outputs = await new NaceTaxonomyClassificationGenerator(roots).generate();
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

        const [output] = await new FrontendLicenseGenerator(workspace).generate();

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

        const [output] = await new FrontendLicenseGenerator(workspace).generate();
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

        await expect(new FrontendLicenseGenerator(workspace).generate()).rejects.toThrow(
          `Package manifest '${manifestPath}' field 'description' must be a string.`,
        );
      });

      it("fails when a declared frontend dependency cannot be resolved", async () => {
        const workspace = await harness.createTemporaryDirectory("arolariu-license-missing-");
        await harness.writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"missing-package": "1.0.0"},
        });

        await expect(new FrontendLicenseGenerator(workspace).generate()).rejects.toThrow(
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

        const [output] = await new FrontendLicenseGenerator(workspace).generate();
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

        const [output] = await new FrontendLicenseGenerator(workspace).generate();
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
        await expect(new BackendLicenseGenerator().generate()).resolves.toEqual([]);
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
    it("exports the generators and canonical taxonomy artifact manifest", async () => {
      const artifactModule = await import("./generate.artifacts.ts");

      expect(Object.keys(artifactModule).toSorted()).toEqual([
        "BackendLicenseGenerator",
        "EcoicopTaxonomyClassificationGenerator",
        "FrontendLicenseGenerator",
        "Gs1GpcTaxonomyClassificationGenerator",
        "LicenseGenerator",
        "NaceTaxonomyClassificationGenerator",
        "TaxonomyClassificationGenerator",
        "getExpectedTaxonomyArtifactPaths",
        "main",
        "taxonomyArtifactFileNames",
      ]);
    });
  });

  describe("main", () => {
    it("returns zero after unified generation succeeds", async () => {
      const options = await harness.createUnifiedMainOptions();

      await expect(main(options)).resolves.toBe(0);
    });

    it("uses the supplied logger without writing through direct console methods", async () => {
      const options = await harness.createUnifiedMainOptions();
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new InMemoryLoggerSink();
      const logger = new MonorepositoryConsoleLogger("test::artifacts", {color: false, sink});

      await expect(main(options, logger)).resolves.toBe(0);

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("[arolariu::test::artifacts]"))).toBe(true);
      expect(sink.records.some((record) => record.text.includes("Generated 7 artifact file(s)."))).toBe(true);
    });

    it("uses validated mirrored taxonomy artifacts when sources remain unavailable", async () => {
      harness.captureConsole();
      const options = await harness.createUnifiedMainOptions();
      await main(options);
      vi.useFakeTimers();
      const fetchMock = vi.fn(async () => new Response("Unavailable", {status: 503, statusText: "Service Unavailable"}));
      vi.stubGlobal("fetch", fetchMock);

      const generation = main(options);
      await vi.runAllTimersAsync();

      await expect(generation).resolves.toBe(0);
      expect(fetchMock).toHaveBeenCalledTimes(9);
      harness.expectMessage("warn", "[GPC] Source unavailable after retries; using validated cached artifact");
      harness.expectMessage("warn", "[ECOICOP] Source unavailable after retries; using validated cached artifact");
      harness.expectMessage("warn", "[NACE] Source unavailable after retries; using validated cached artifact");
    });

    it("rejects a divergent cached mirror when the source is unavailable", async () => {
      const roots = await harness.createOutputRoots("arolariu-divergent-cache-");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => harness.createSparqlResponse([{concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "Food"}}])),
      );
      const generator = new EcoicopTaxonomyClassificationGenerator(roots);
      const outputs = await generator.generate();
      await writeFile(outputs[1] ?? "", "{}", "utf8");
      vi.useFakeTimers();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("Unavailable", {status: 503, statusText: "Service Unavailable"})),
      );

      const expectation = expect(generator.generate()).rejects.toThrow(
        "Cached taxonomy artifact 'ecoicop-v2.min.json' is not byte-identical",
      );
      await vi.runAllTimersAsync();

      await expectation;
    });

    it("does not use cached artifacts for non-transient HTTP failures", async () => {
      const roots = await harness.createOutputRoots("arolariu-non-transient-");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => harness.createSparqlResponse([{concept: {value: "eco:01"}, notation: {value: "01"}, label: {value: "Food"}}])),
      );
      const generator = new EcoicopTaxonomyClassificationGenerator(roots);
      await generator.generate();
      const fetchMock = vi.fn(async () => new Response("Missing", {status: 404, statusText: "Not Found"}));
      vi.stubGlobal("fetch", fetchMock);

      await expect(generator.generate()).rejects.toThrow("SPARQL request failed with HTTP 404 Not Found.");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("logs unified lifecycle progress with the artifact prefix", async () => {
      harness.captureConsole();
      const options = await harness.createUnifiedMainOptions();

      await main(options);

      harness.expectMessage("info", "[arolariu::generate::artifacts]");
      harness.expectMessage("info", "[GPC] Fetching");
      harness.expectMessage("info", "[ECOICOP] Fetching");
      harness.expectMessage("info", "[NACE] Fetching");
      harness.expectMessage("info", "[Frontend licenses] Reading");
      harness.expectMessage("warn", "[Backend licenses] Generation is intentionally deferred");
      harness.expectMessage("info", "✅ Generated 7 artifact file(s).");
    });
  });

  describe("taxonomy artifact manifest", () => {
    it("matches the canonical paths written by every taxonomy generator", async () => {
      const workspaceRoot = await harness.createTemporaryDirectory("arolariu-taxonomy-manifest-");
      const outputRoots = [
        join(workspaceRoot, "sites", "api.arolariu.ro", "src", "Invoices", "Resources", "Taxonomies"),
        join(workspaceRoot, "sites", "arolariu.ro", "src", "data", "taxonomies"),
      ];
      harness.mockArchiveExtraction();
      harness.stubUnifiedFetch();

      const actualPaths = (
        await Promise.all([
          new Gs1GpcTaxonomyClassificationGenerator(outputRoots).generate(),
          new EcoicopTaxonomyClassificationGenerator(outputRoots).generate(),
          new NaceTaxonomyClassificationGenerator(outputRoots).generate(),
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
    it("routes no-task orchestration output through the supplied logger", async () => {
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new InMemoryLoggerSink();
      const logger = new MonorepositoryConsoleLogger("generate", {color: false, sink});

      await expect(
        generate(
          {
            verbose: false,
            generateEnv: false,
            generateGql: false,
            generateI18n: false,
            generateArtifacts: false,
          },
          logger,
        ),
      ).resolves.toBe(0);

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("No generation tasks selected"))).toBe(true);
    });

    it("routes GraphQL generator output through the supplied logger", async () => {
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new InMemoryLoggerSink();
      const logger = new MonorepositoryConsoleLogger("generate::gql", {color: false, sink});
      vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      const {main: generateGql} = await import("./generate.gql.ts");
      await expect(generateGql(false, logger)).resolves.toBe(0);

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("GraphQL generation completed"))).toBe(true);
    });

    it("routes i18n generator output through the supplied logger", async () => {
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new InMemoryLoggerSink();
      const logger = new MonorepositoryConsoleLogger("generate::i18n", {color: false, sink});
      vi.spyOn(fs, "readFileSync").mockReturnValue('{"greeting":"Hello"}');

      const {main: generateI18n} = await import("./generate.i18n.ts");
      await expect(generateI18n(false, logger)).resolves.toBe(0);

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("i18n synchronization completed"))).toBe(true);
    });

    it("loads Azure identity lazily and never logs environment secret values", async () => {
      const secretValue = "test-secret-value-that-must-not-be-logged";
      const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
        vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
      );
      const sink = new InMemoryLoggerSink();
      const logger = new MonorepositoryConsoleLogger("generate::env", {color: false, sink});
      vi.stubEnv("INFRA", "local");
      vi.stubEnv("VERBOSE", "false");
      vi.doMock("@azure/identity", () => {
        throw new Error("Azure identity loaded eagerly");
      });
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readFileSync").mockReturnValue(
        [
          "SITE_ENV=DEVELOPMENT",
          "SITE_NAME=Test",
          "SITE_URL=https://example.test",
          "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test",
          `CLERK_SECRET_KEY=${secretValue}`,
          "USE_CDN=false",
        ].join("\n"),
      );
      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);
      vi.spyOn(fs, "copyFileSync").mockImplementation(() => undefined);

      try {
        const {main: generateEnv} = await import("./generate.env.ts");
        await expect(generateEnv(false, logger)).resolves.toBe(0);
      } finally {
        vi.doUnmock("@azure/identity");
      }

      expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
      expect(sink.records.some((record) => record.text.includes("File content generated successfully"))).toBe(true);
      expect(sink.records.every((record) => !record.text.includes(secretValue))).toBe(true);
    });
  });

  describe("command contract", () => {
    it.each(["/artifacts", "/a", "--artifacts", "-a"])("selects artifacts for %s", (alias) => {
      expect(parseCommandLineOptions([alias]).generateArtifacts).toBe(true);
    });

    it.each(["/acks", "--acks", "/art", "-t"])("rejects removed alias %s", (alias) => {
      expect(parseCommandLineOptions([alias]).generateArtifacts).toBe(false);
    });
  });
});
