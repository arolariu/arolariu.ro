// @vitest-environment node
/**
 * @fileoverview Tests for unified taxonomy and license artifact generation.
 * @module scripts/generate.artifacts.test
 */

import {ChildProcess, execFile} from "node:child_process";
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {...actual, execFile: vi.fn(actual.execFile)};
});

import {
  assertMirroredContentsIdentical,
  BackendLicenseGenerator,
  buildArchiveExtractionCommand,
  buildHierarchy,
  buildTaxonomyArtifactGenerationCommand,
  EcoicopTaxonomyClassificationGenerator,
  flattenGpcSchema,
  FrontendLicenseGenerator,
  generateArtifacts,
  Gs1GpcTaxonomyClassificationGenerator,
  main,
  NaceTaxonomyClassificationGenerator,
  parseGpcDocument,
  writeMirroredArtifacts,
} from "./generate.artifacts.ts";
import {parseCommandLineOptions} from "./generate.ts";
import type {TaxonomyArtifact, TaxonomyArtifactNode} from "./generate.artifacts.ts";

const temporaryDirectories: string[] = [];

const gpcDocument = {
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

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, {recursive: true, force: true})),
  );
});

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function createOutputRoots(prefix: string): Promise<readonly string[]> {
  const root = await createTemporaryDirectory(prefix);
  return [join(root, "api"), join(root, "web")];
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, JSON.stringify(value), "utf8");
}

function readObjectArray(contents: string, key: string): readonly unknown[] {
  const parsed: unknown = JSON.parse(contents);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("Generated document must be an object.");
  }

  const value = Reflect.get(parsed, key);
  if (!Array.isArray(value)) throw new TypeError(`Generated document '${key}' field must be an array.`);
  return value;
}

function mockArchiveExtraction(document: unknown): void {
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

function createSparqlResponse(bindings: readonly unknown[]): Response {
  return Response.json({results: {bindings}});
}

function stubUnifiedFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.href === "https://ref.gs1.org/standards/gpc/2026-05/") {
        return new Response(new Uint8Array([1, 2, 3]), {status: 200});
      }

      const query = url.searchParams.get("query") ?? "";
      const isEcoicop = query.includes("ecoicop2");
      return createSparqlResponse([
        {
          concept: {value: isEcoicop ? "eco:01" : "nace:A"},
          notation: {value: isEcoicop ? "01" : "A"},
          label: {value: isEcoicop ? "01 Food" : "A Agriculture"},
        },
      ]);
    }),
  );
}

function createArtifact(nodes: readonly TaxonomyArtifactNode[]): TaxonomyArtifact {
  return {
    system: "GS1_GPC",
    version: "2026-05",
    sourceUrl: "https://ref.gs1.org/standards/gpc/2026-05/",
    generatedAt: "2026-08-18T00:00:00.000Z",
    attribution: "GS1",
    nodes,
  };
}

describe("Taxonomy classification generators", () => {
  describe("shared taxonomy behavior", () => {
    describe("source validation", () => {
      it("parses a valid GPC document", () => {
        expect(parseGpcDocument(gpcDocument).Schema).toHaveLength(1);
      });

      it("rejects blank required strings", () => {
        expect(() => parseGpcDocument({...gpcDocument, LanguageCode: "   "})).toThrow(
          "GPC document LanguageCode must be a non-empty string.",
        );
      });
    });

    describe("normalization", () => {
      it("flattens hierarchy and normalizes search text", () => {
        const nodes = flattenGpcSchema(gpcDocument.Schema);

        expect(nodes.map((node) => node.code)).toEqual(["50000000", "10000266"]);
        expect(nodes[1]).toMatchObject({
          parentCode: "50000000",
          hierarchyCodes: ["50000000", "10000266"],
          searchText: "10000266 bread ready to eat chilled food",
        });
      });

      it("detects hierarchy cycles", () => {
        const node = (code: string, parentCode: string): TaxonomyArtifactNode => ({
          code,
          officialLabel: code,
          level: "class",
          parentCode,
          hierarchyCodes: [code],
          hierarchyLabels: [code],
          definition: null,
          searchText: code.toLowerCase(),
        });

        expect(() => buildHierarchy([node("A", "B"), node("B", "A")], "A")).toThrow(
          "Taxonomy hierarchy cycle detected at 'A'.",
        );
      });
    });

    describe("artifact writing", () => {
      const node: TaxonomyArtifactNode = {
        code: "50000000",
        officialLabel: "Food",
        level: "segment",
        parentCode: null,
        hierarchyCodes: ["50000000"],
        hierarchyLabels: ["Food"],
        definition: null,
        searchText: "50000000 food",
      };

      it("writes byte-identical minified files", async () => {
        const roots = await createOutputRoots("arolariu-artifact-write-");

        const outputs = await writeMirroredArtifacts("gpc-2026-05.min.json", createArtifact([node]), roots);
        const contents = await Promise.all(outputs.map((output) => readFile(output, "utf8")));

        expect(contents[0]).toBe(contents[1]);
        expect(contents[0]).not.toContain("\n");
      });

      it("rejects duplicate taxonomy codes", async () => {
        const roots = await createOutputRoots("arolariu-artifact-invalid-");

        await expect(
          writeMirroredArtifacts("gpc-2026-05.min.json", createArtifact([node, node]), roots),
        ).rejects.toThrow("GS1_GPC contains duplicate code '50000000'.");
      });

      it("detects divergent mirrored contents", () => {
        expect(() =>
          assertMirroredContentsIdentical("gpc-2026-05.min.json", '{"ok":true}', ['{"ok":true}', "{}"]),
        ).toThrow("Mirrored artifact 'gpc-2026-05.min.json' was not written identically.");
      });
    });
  });

  describe("archive adapters", () => {
    describe("buildArchiveExtractionCommand", () => {
      it("uses tar.exe on Windows", () => {
        expect(buildArchiveExtractionCommand("win32", "source.zip", "output")).toEqual({
          command: "tar.exe",
          args: ["-xf", "source.zip", "-C", "output"],
        });
      });

      it("uses unzip on Linux and macOS", () => {
        expect(buildArchiveExtractionCommand("linux", "source.zip", "output")).toEqual({
          command: "unzip",
          args: ["-qq", "source.zip", "-d", "output"],
        });
        expect(buildArchiveExtractionCommand("darwin", "source.zip", "output")).toEqual({
          command: "unzip",
          args: ["-qq", "source.zip", "-d", "output"],
        });
      });
    });
  });

  describe("Gs1GpcTaxonomyClassificationGenerator", () => {
    describe("generate", () => {
      it("generates the mirrored GPC artifact", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([1]), {status: 200})));
        mockArchiveExtraction(gpcDocument);
        const roots = await createOutputRoots("arolariu-gpc-class-");

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
    });
  });

  describe("EcoicopTaxonomyClassificationGenerator", () => {
    describe("generate", () => {
      it("generates a mirrored ECOICOP v2 hierarchy", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () =>
            createSparqlResponse([
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
        const roots = await createOutputRoots("arolariu-ecoicop-class-");

        const outputs = await new EcoicopTaxonomyClassificationGenerator(roots).generate();
        const nodes = readObjectArray(await readFile(outputs[0] ?? "", "utf8"), "nodes");

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
          .mockResolvedValueOnce(createSparqlResponse(firstPage))
          .mockResolvedValueOnce(
            createSparqlResponse([{concept: {value: "eco:final"}, notation: {value: "9999.1"}, label: {value: "Final"}}]),
          );
        vi.stubGlobal("fetch", fetchMock);
        const roots = await createOutputRoots("arolariu-ecoicop-pages-");

        await new EcoicopTaxonomyClassificationGenerator(roots).generate();

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it("rejects malformed optional bindings", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () =>
            createSparqlResponse([
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
            createSparqlResponse([
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
        const roots = await createOutputRoots("arolariu-nace-class-");

        const outputs = await new NaceTaxonomyClassificationGenerator(roots).generate();
        const nodes = readObjectArray(await readFile(outputs[0] ?? "", "utf8"), "nodes");

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
  describe("FrontendLicenseGenerator", () => {
    describe("generate", () => {
      it("groups direct frontend dependencies", async () => {
        const workspace = await createTemporaryDirectory("arolariu-license-class-");
        await writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"production-package": "1.0.0"},
          devDependencies: {"development-package": "2.0.0"},
          peerDependencies: {"peer-package": "3.0.0"},
        });
        await writeJson(join(workspace, "node_modules", "production-package", "package.json"), {
          name: "production-package",
          version: "1.0.0",
          license: "MIT",
        });
        await writeJson(join(workspace, "node_modules", "development-package", "package.json"), {
          name: "development-package",
          version: "2.0.0",
          license: "Apache-2.0",
        });
        await writeJson(join(workspace, "node_modules", "peer-package", "package.json"), {
          name: "peer-package",
          version: "3.0.0",
          license: "BSD-3-Clause",
        });

        const [output] = await new FrontendLicenseGenerator(workspace).generate();

        expect(readObjectArray(await readFile(output ?? "", "utf8"), "production")).toMatchObject([
          {name: "production-package"},
        ]);
        expect(readObjectArray(await readFile(output ?? "", "utf8"), "development")).toMatchObject([
          {name: "development-package"},
        ]);
        expect(readObjectArray(await readFile(output ?? "", "utf8"), "peer")).toMatchObject([
          {name: "peer-package"},
        ]);
      });

      it("sorts scoped packages and applies defaults", async () => {
        const workspace = await createTemporaryDirectory("arolariu-license-order-");
        await writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"zeta-package": "1.0.0", "@scope/alpha-package": "2.0.0"},
        });
        await writeJson(join(workspace, "node_modules", "zeta-package", "package.json"), {
          name: "zeta-package",
          repository: {url: "https://example.test/zeta"},
        });
        await writeJson(join(workspace, "node_modules", "@scope", "alpha-package", "package.json"), {
          name: "@scope/alpha-package",
          author: {name: "Alpha Author"},
        });

        const [output] = await new FrontendLicenseGenerator(workspace).generate();
        const packages = readObjectArray(await readFile(output ?? "", "utf8"), "production");

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
        const workspace = await createTemporaryDirectory("arolariu-license-invalid-");
        const manifestPath = join(workspace, "node_modules", "broken-package", "package.json");
        await writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
          dependencies: {"broken-package": "1.0.0"},
        });
        await writeJson(manifestPath, {name: "broken-package", description: 42});

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
  describe("generateArtifacts", () => {
    it("runs all five concrete generators", async () => {
      const workspace = await createTemporaryDirectory("arolariu-unified-artifacts-");
      const outputRoots = [join(workspace, "api"), join(workspace, "web")];
      await writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {
        dependencies: {"production-package": "1.0.0"},
      });
      await writeJson(join(workspace, "node_modules", "production-package", "package.json"), {
        name: "production-package",
        version: "1.0.0",
        license: "MIT",
      });
      mockArchiveExtraction(gpcDocument);
      stubUnifiedFetch();

      const outputs = await generateArtifacts({outputRoots, workspaceRoot: workspace});

      expect(outputs.map((output) => basename(output)).toSorted()).toEqual(
        [
          "ecoicop-v2.min.json",
          "ecoicop-v2.min.json",
          "gpc-2026-05.min.json",
          "gpc-2026-05.min.json",
          "licenses.json",
          "nace-2.1.min.json",
          "nace-2.1.min.json",
        ].toSorted(),
      );
    });
  });

  describe("main", () => {
    it("returns zero after unified generation succeeds", async () => {
      const workspace = await createTemporaryDirectory("arolariu-unified-main-");
      const outputRoots = [join(workspace, "api"), join(workspace, "web")];
      await writeJson(join(workspace, "sites", "arolariu.ro", "package.json"), {});
      mockArchiveExtraction(gpcDocument);
      stubUnifiedFetch();

      await expect(main({outputRoots, workspaceRoot: workspace})).resolves.toBe(0);
    });
  });

  describe("command contract", () => {
    it("builds a platform-safe direct Node command", () => {
      const command = buildTaxonomyArtifactGenerationCommand();

      expect(command.command).toBe(process.execPath);
      expect(command.args[0]).toMatch(/generate\.artifacts\.ts$/u);
    });

    it.each(["/artifacts", "/a", "--artifacts", "-a"])("selects artifacts for %s", (alias) => {
      expect(parseCommandLineOptions([alias]).generateArtifacts).toBe(true);
    });

    it.each(["/acks", "--acks", "/art", "-t"])("rejects removed alias %s", (alias) => {
      expect(parseCommandLineOptions([alias]).generateArtifacts).toBe(false);
    });
  });
});
