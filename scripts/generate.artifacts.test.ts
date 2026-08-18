// @vitest-environment node
/**
 * @fileoverview Tests for unified taxonomy and license artifact generation.
 * @module scripts/generate.artifacts.test
 */

import {ChildProcess, execFile} from "node:child_process";
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
  Gs1GpcTaxonomyClassificationGenerator,
  main,
  NaceTaxonomyClassificationGenerator,
} from "./generate.artifacts.ts";
import {MonorepositoryConsoleLogger} from "./common/logger.ts";
import {parseCommandLineOptions} from "./generate.ts";

class ArtifactGeneratorTestHarness {
  readonly #temporaryDirectories: string[] = [];
  readonly #consoleMessages: Record<"debug" | "info" | "warn" | "error", string[]> = {
    debug: [],
    info: [],
    warn: [],
    error: [],
  };

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

  public async createTemporaryDirectory(prefix: string): Promise<string> {
    const directory = await mkdtemp(join(tmpdir(), prefix));
    this.#temporaryDirectories.push(directory);
    return directory;
  }

  public async createOutputRoots(prefix: string): Promise<readonly string[]> {
    const root = await this.createTemporaryDirectory(prefix);
    return [join(root, "api"), join(root, "web")];
  }

  public async writeJson(path: string, value: unknown): Promise<void> {
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, JSON.stringify(value), "utf8");
  }

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

  public mockArchiveExtraction(document: unknown = this.gpcDocument): void {
    vi.mocked(execFile).mockImplementation((_file, args, callback) => {
      const outputIndex = args?.findIndex((value) => value === "-C" || value === "-d") ?? -1;
      const outputDirectory = args?.[outputIndex + 1];
      if (outputDirectory === undefined) throw new Error("Output directory argument is missing.");

      const childProcess = new ChildProcess();
      void writeFile(join(outputDirectory, "GPC 2026-05 EN.json"), JSON.stringify(document), "utf8")
        .then(() => {
          if (typeof callback === "function") callback(null, "", "");
        })
        .catch((error: unknown) => {
          if (typeof callback === "function") {
            callback(error instanceof Error ? error : new Error(String(error)), "", "");
          }
        });
      return childProcess;
    });
  }

  public createSparqlResponse(bindings: readonly unknown[]): Response {
    return Response.json({results: {bindings}});
  }

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

  public stubGpcFailure(error: Error): void {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        if (String(input) === "https://ref.gs1.org/standards/gpc/2026-05/") throw error;
        return this.createSparqlResponse([]);
      }),
    );
  }

  public captureConsole(): void {
    for (const level of ["debug", "info", "warn", "error"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: readonly unknown[]) => {
        this.#consoleMessages[level].push(
          stripVTControlCharacters(args.map((argument) => String(argument)).join(" ")),
        );
      });
    }
  }

  public expectMessage(
    level: "debug" | "info" | "warn" | "error",
    expected: string,
  ): void {
    expect(this.#consoleMessages[level]).toEqual(
      expect.arrayContaining([expect.stringContaining(expected)]),
    );
  }

  public async createUnifiedMainOptions(): Promise<
    Readonly<{outputRoots: readonly string[]; workspaceRoot: string}>
  > {
    const workspaceRoot = await this.createTemporaryDirectory("arolariu-unified-main-");
    const outputRoots = [join(workspaceRoot, "api"), join(workspaceRoot, "web")];
    await this.writeJson(join(workspaceRoot, "sites", "arolariu.ro", "package.json"), {});
    this.mockArchiveExtraction();
    this.stubUnifiedFetch();
    return {outputRoots, workspaceRoot};
  }

  public async cleanup(): Promise<void> {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await Promise.all(
      this.#temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, {recursive: true, force: true})),
    );
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
        vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), {status: 200})));
        harness.mockArchiveExtraction();
        const roots = await harness.createOutputRoots("arolariu-gpc-class-");

        const outputs = await new Gs1GpcTaxonomyClassificationGenerator(roots).generate();

        expect(outputs.map((output) => basename(output))).toEqual([
          "gpc-2026-05.min.json",
          "gpc-2026-05.min.json",
        ]);
      });

      it("surfaces HTTP failures", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => new Response("Unavailable", {status: 503, statusText: "Service Unavailable"})),
        );

        await expect(new Gs1GpcTaxonomyClassificationGenerator([]).generate()).rejects.toThrow(
          "GPC download failed with HTTP 503 Service Unavailable.",
        );
      });

      it("logs a generator error and rethrows the original failure", async () => {
        harness.captureConsole();
        const failure = new Error("GPC unavailable");
        harness.stubGpcFailure(failure);
        const roots = await harness.createOutputRoots("arolariu-gpc-error-");

        await expect(new Gs1GpcTaxonomyClassificationGenerator(roots).generate()).rejects.toBe(
          failure,
        );
        harness.expectMessage("error", "⛔ [GPC] GPC unavailable");
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

        expect(outputs.map((output) => basename(output))).toEqual([
          "ecoicop-v2.min.json",
          "ecoicop-v2.min.json",
        ]);
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
            harness.createSparqlResponse([
              {concept: {value: "eco:final"}, notation: {value: "9999.1"}, label: {value: "Final"}},
            ]),
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

        expect(outputs.map((output) => basename(output))).toEqual([
          "nace-2.1.min.json",
          "nace-2.1.min.json",
        ]);
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

        expect(harness.readObjectArray(await readFile(output ?? "", "utf8"), "production")).toMatchObject([
          {name: "production-package"},
        ]);
        expect(harness.readObjectArray(await readFile(output ?? "", "utf8"), "development")).toMatchObject([
          {name: "development-package"},
        ]);
        expect(harness.readObjectArray(await readFile(output ?? "", "utf8"), "peer")).toMatchObject([
          {name: "peer-package"},
        ]);
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

  describe("logger", () => {
    it("writes the fixed prefix, icons, and semantic console levels", () => {
      const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
      const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const logger = new MonorepositoryConsoleLogger("generate::artifacts");

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warning message");
      logger.error("error message");
      logger.success("success message");

      expect(debug).toHaveBeenCalledWith(
        expect.stringContaining("[arolariu::generate::artifacts] 🐛 debug message"),
      );
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining("[arolariu::generate::artifacts] ℹ️ info message"),
      );
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining("[arolariu::generate::artifacts] ✅ success message"),
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("[arolariu::generate::artifacts] ⚠️ warning message"),
      );
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining("[arolariu::generate::artifacts] ⛔ error message"),
      );
    });
  });

  describe("module surface", () => {
    it("exports only main and the seven generator classes", async () => {
      const artifactModule = await import("./generate.artifacts.ts");

      expect(Object.keys(artifactModule).toSorted()).toEqual([
        "BackendLicenseGenerator",
        "EcoicopTaxonomyClassificationGenerator",
        "FrontendLicenseGenerator",
        "Gs1GpcTaxonomyClassificationGenerator",
        "LicenseGenerator",
        "NaceTaxonomyClassificationGenerator",
        "TaxonomyClassificationGenerator",
        "main",
      ]);
    });
  });

  describe("main", () => {
    it("returns zero after unified generation succeeds", async () => {
      const options = await harness.createUnifiedMainOptions();

      await expect(main(options)).resolves.toBe(0);
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
      harness.expectMessage(
        "warn",
        "[Backend licenses] Generation is intentionally deferred",
      );
      harness.expectMessage("info", "✅ Generated 7 artifact file(s).");
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
