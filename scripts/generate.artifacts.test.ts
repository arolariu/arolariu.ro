// @vitest-environment node
/**
 * @fileoverview Tests for the monorepo taxonomy artifact generator.
 * @module scripts/generate.artifacts.test
 */

import {ChildProcess, execFile} from "node:child_process";
import {mkdtemp, readFile, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {...actual, execFile: vi.fn(actual.execFile)};
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {...actual, readFile: vi.fn(actual.readFile)};
});
import {
  assertMirroredContentsIdentical,
  BackendLicenseGenerator,
  buildArchiveExtractionCommand,
  buildTaxonomyArtifactGenerationCommand,
  buildHierarchy,
  Gs1GpcTaxonomyClassificationGenerator,
  flattenGpcSchema,
  parseGpcDocument,
  writeMirroredArtifacts,
} from "./generate.artifacts.ts";
import type {TaxonomyArtifact, TaxonomyArtifactNode} from "./generate.artifacts.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

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
        if (typeof callback === "function") callback(error instanceof Error ? error : new Error(String(error)), "", "");
      });
    return childProcess;
  });
}

describe("parseGpcDocument", () => {
  const validNode = {
    Level: 1,
    Code: 50000000,
    Title: "Food/Beverage/Tobacco",
    Definition: "Includes any food product.",
    DefinitionExcludes: null,
    Active: true,
    Childs: [],
  };

  it("parses a well-formed document", () => {
    const parsed = parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: [validNode]});

    expect(parsed.LanguageCode).toBe("EN");
    expect(parsed.Schema).toHaveLength(1);
    expect(parsed.Schema[0]?.Code).toBe(50000000);
    expect(parsed.Schema[0]?.Definition).toBe("Includes any food product.");
  });

  it("accepts a null definition", () => {
    const parsed = parseGpcDocument({
      LanguageCode: "EN",
      DateUtc: "2026-05-01",
      Schema: [{...validNode, Definition: null}],
    });

    expect(parsed.Schema[0]?.Definition).toBeNull();
  });

  it("parses nested children recursively", () => {
    const parsed = parseGpcDocument({
      LanguageCode: "EN",
      DateUtc: "2026-05-01",
      Schema: [{...validNode, Childs: [{...validNode, Level: 2, Code: 50100000, Title: "Bread"}]}],
    });

    expect(parsed.Schema[0]?.Childs[0]?.Title).toBe("Bread");
  });

  it("throws when the root is not an object", () => {
    expect(() => parseGpcDocument("nope")).toThrow("GPC document must be an object.");
  });

  it("throws when a schema node is not an object", () => {
    expect(() => parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: ["nope"]})).toThrow(
      "GPC node must be an object.",
    );
  });

  it("throws when Schema is not an array", () => {
    expect(() => parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: {}})).toThrow(
      "GPC document Schema must be an array.",
    );
  });

  it("throws when a required string field is missing", () => {
    expect(() => parseGpcDocument({DateUtc: "2026-05-01", Schema: []})).toThrow(
      "GPC document LanguageCode must be a string.",
    );
  });

  it("throws when a required string field is blank", () => {
    expect(() => parseGpcDocument({LanguageCode: "   ", DateUtc: "2026-05-01", Schema: []})).toThrow(
      "GPC document LanguageCode must be a non-empty string.",
    );
  });

  it("throws when a node code is not a number", () => {
    expect(() =>
      parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: [{...validNode, Code: "50000000"}]}),
    ).toThrow("GPC node Code must be a number.");
  });

  it("throws when a node code is NaN", () => {
    expect(() =>
      parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: [{...validNode, Code: Number.NaN}]}),
    ).toThrow("GPC node Code must be a number.");
  });

  it("throws when a node Definition is neither a string nor null", () => {
    expect(() =>
      parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: [{...validNode, Definition: 123}]}),
    ).toThrow("GPC node Definition must be a string or null.");
  });

  it("throws when a node Active flag is not a boolean", () => {
    expect(() =>
      parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: [{...validNode, Active: "yes"}]}),
    ).toThrow("GPC node Active must be a boolean.");
  });

  it("throws when Childs is not an array", () => {
    expect(() =>
      parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: [{...validNode, Childs: null}]}),
    ).toThrow("GPC node Childs must be an array.");
  });
});

describe("flattenGpcSchema", () => {
  const brick = {
    Level: 4,
    Code: 10000266,
    Title: "Bread",
    Definition: "Includes any bread product.",
    DefinitionExcludes: null,
    Active: true,
    Childs: [],
  };
  const klass = {Level: 3, Code: 50192000, Title: "Bakery", Definition: null, DefinitionExcludes: null, Active: true, Childs: [brick]};
  const family = {Level: 2, Code: 50190000, Title: "Baked Goods", Definition: null, DefinitionExcludes: null, Active: true, Childs: [klass]};
  const segment = {Level: 1, Code: 50000000, Title: "Food", Definition: null, DefinitionExcludes: null, Active: true, Childs: [family]};

  it("flattens all four levels in document order", () => {
    const nodes = flattenGpcSchema([segment]);

    expect(nodes.map((node) => node.code)).toEqual(["50000000", "50190000", "50192000", "10000266"]);
    expect(nodes.map((node) => node.level)).toEqual(["segment", "family", "class", "brick"]);
  });

  it("records parent codes and full hierarchies", () => {
    const nodes = flattenGpcSchema([segment]);
    const leaf = nodes.at(-1);

    expect(leaf?.parentCode).toBe("50192000");
    expect(leaf?.hierarchyCodes).toEqual(["50000000", "50190000", "50192000", "10000266"]);
    expect(leaf?.hierarchyLabels).toEqual(["Food", "Baked Goods", "Bakery", "Bread"]);
  });

  it("gives root nodes a null parent", () => {
    expect(flattenGpcSchema([segment])[0]?.parentCode).toBeNull();
  });

  it("builds lowercase search text from code, title, definition and ancestors", () => {
    const leaf = flattenGpcSchema([segment]).at(-1);

    expect(leaf?.searchText).toContain("10000266");
    expect(leaf?.searchText).toContain("bread");
    expect(leaf?.searchText).toContain("includes any bread product.");
    expect(leaf?.searchText).toContain("bakery");
  });

  it("normalizes accents and punctuation in search text", () => {
    const [node] = flattenGpcSchema([
      {
        ...brick,
        Title: "Crème—Brûlée",
        Definition: "Ready-to-eat; chilled!",
      },
    ]);

    expect(node?.searchText).toBe("10000266 creme brulee ready to eat chilled");
  });

  it("skips inactive nodes and their descendants", () => {
    const inactiveFamily = {...family, Active: false};

    expect(flattenGpcSchema([{...segment, Childs: [inactiveFamily]}]).map((node) => node.code)).toEqual(["50000000"]);
  });

  it("skips unknown levels but still visits their children", () => {
    const attribute = {Level: 5, Code: 20000123, Title: "Colour", Definition: null, DefinitionExcludes: null, Active: true, Childs: [brick]};

    const nodes = flattenGpcSchema([{...klass, Childs: [attribute]}]);

    expect(nodes.map((node) => node.code)).toEqual(["50192000", "10000266"]);
    expect(nodes.at(-1)?.parentCode).toBe("50192000");
  });

  it("normalizes an empty definition to null", () => {
    const nodes = flattenGpcSchema([{...brick, Definition: "   "}]);

    expect(nodes[0]?.definition).toBeNull();
  });

  it("trims titles", () => {
    expect(flattenGpcSchema([{...brick, Title: "  Bread  "}])[0]?.officialLabel).toBe("Bread");
  });
});

describe("buildHierarchy", () => {
  const node = (code: string, label: string, parentCode: string | null): TaxonomyArtifactNode => ({
    code,
    officialLabel: label,
    level: "class",
    parentCode,
    hierarchyCodes: [code],
    hierarchyLabels: [label],
    definition: null,
    searchText: label.toLowerCase(),
  });

  const nodes = [node("A", "Alpha", null), node("B", "Beta", "A"), node("C", "Gamma", "B")];

  it("rebuilds the full ancestry from parent links", () => {
    const resolved = buildHierarchy(nodes, "C");

    expect(resolved.hierarchyCodes).toEqual(["A", "B", "C"]);
    expect(resolved.hierarchyLabels).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("returns a root node unchanged in hierarchy terms", () => {
    const resolved = buildHierarchy(nodes, "A");

    expect(resolved.hierarchyCodes).toEqual(["A"]);
  });

  it("recomputes search text across the ancestry", () => {
    expect(buildHierarchy(nodes, "C").searchText).toBe("c gamma alpha beta gamma");
  });

  it("throws when the requested code is absent", () => {
    expect(() => buildHierarchy(nodes, "Z")).toThrow("Taxonomy code 'Z' was not found.");
  });

  it("throws when a parent reference is dangling", () => {
    expect(() => buildHierarchy([node("B", "Beta", "A")], "B")).toThrow(
      "Taxonomy parent 'A' for 'B' was not found.",
    );
  });

  it("throws when the parent chain contains a cycle", () => {
    const cyclic = [node("A", "Alpha", "B"), node("B", "Beta", "A")];

    expect(() => buildHierarchy(cyclic, "A")).toThrow("Taxonomy hierarchy cycle detected at 'A'.");
  });
});


describe("writeMirroredArtifacts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const validNode: TaxonomyArtifactNode = {
    code: "50000000",
    officialLabel: "Food",
    level: "segment",
    parentCode: null,
    hierarchyCodes: ["50000000"],
    hierarchyLabels: ["Food"],
    definition: null,
    searchText: "50000000 food",
  };

  const artifact = (nodes: readonly TaxonomyArtifactNode[]): TaxonomyArtifact => ({
    system: "GS1_GPC",
    version: "2026-05",
    sourceUrl: "https://ref.gs1.org/standards/gpc/2026-05/",
    generatedAt: "2026-08-18T00:00:00.000Z",
    attribution: "GS1 Global Product Classification (GPC), May 2026 release.",
    nodes,
  });

  async function createRoots(): Promise<readonly string[]> {
    const base = await mkdtemp(join(tmpdir(), "arolariu-artifacts-"));
    return [join(base, "api"), join(base, "web")];
  }

  it("writes byte-identical files into every output root", async () => {
    const roots = await createRoots();

    const written = await writeMirroredArtifacts("gpc-2026-05.min.json", artifact([validNode]), roots);

    expect(written).toHaveLength(2);
    const [first, second] = await Promise.all(written.map((path) => readFile(path, "utf8")));
    expect(first).toBe(second);
    expect(JSON.parse(first ?? "")).toMatchObject({system: "GS1_GPC", version: "2026-05"});
  });

  it("writes minified JSON without insignificant whitespace", async () => {
    const roots = await createRoots();

    const [path] = await writeMirroredArtifacts("gpc-2026-05.min.json", artifact([validNode]), roots);

    expect(await readFile(path ?? "", "utf8")).not.toContain("\n");
  });

  it("creates output directories that do not yet exist", async () => {
    const roots = await createRoots();

    await expect(writeMirroredArtifacts("gpc-2026-05.min.json", artifact([validNode]), roots)).resolves.toHaveLength(2);
  });

  it("rejects an artifact with no nodes", async () => {
    const roots = await createRoots();

    await expect(writeMirroredArtifacts("gpc-2026-05.min.json", artifact([]), roots)).rejects.toThrow(
      "GS1_GPC artifact contains no taxonomy nodes.",
    );
  });

  it("rejects duplicate codes", async () => {
    const roots = await createRoots();

    await expect(
      writeMirroredArtifacts("gpc-2026-05.min.json", artifact([validNode, validNode]), roots),
    ).rejects.toThrow("GS1_GPC contains duplicate code '50000000'.");
  });

  it("rejects a dangling parent code", async () => {
    const roots = await createRoots();
    const orphan: TaxonomyArtifactNode = {...validNode, code: "50190000", parentCode: "99999999", hierarchyCodes: ["50190000"], hierarchyLabels: ["Baked"]};

    await expect(writeMirroredArtifacts("gpc-2026-05.min.json", artifact([orphan]), roots)).rejects.toThrow(
      "GS1_GPC parent '99999999' for '50190000' was not found.",
    );
  });

  it("rejects a hierarchy that does not end with its own code", async () => {
    const roots = await createRoots();
    const broken: TaxonomyArtifactNode = {...validNode, hierarchyCodes: ["12345678"]};

    await expect(writeMirroredArtifacts("gpc-2026-05.min.json", artifact([broken]), roots)).rejects.toThrow(
      "GS1_GPC hierarchy for '50000000' does not end with the selected code.",
    );
  });

  it("rejects mismatched hierarchy code and label lengths", async () => {
    const roots = await createRoots();
    const broken: TaxonomyArtifactNode = {...validNode, hierarchyLabels: ["Food", "Extra"]};

    await expect(writeMirroredArtifacts("gpc-2026-05.min.json", artifact([broken]), roots)).rejects.toThrow(
      "GS1_GPC hierarchy for '50000000' has mismatched code and label lengths.",
    );
  });

  it("rejects when a mirrored copy does not match what was written", async () => {
    const roots = await createRoots();
    vi.mocked(readFile).mockResolvedValueOnce("{}");

    await expect(writeMirroredArtifacts("gpc-2026-05.min.json", artifact([validNode]), roots)).rejects.toThrow(
      "Mirrored artifact 'gpc-2026-05.min.json' was not written identically.",
    );
  });
});

describe("assertMirroredContentsIdentical", () => {
  it("accepts copies that all match what was written", () => {
    expect(() => assertMirroredContentsIdentical("gpc-2026-05.min.json", '{"a":1}', ['{"a":1}', '{"a":1}'])).not.toThrow();
  });

  it("accepts an empty read-back set", () => {
    expect(() => assertMirroredContentsIdentical("gpc-2026-05.min.json", '{"a":1}', [])).not.toThrow();
  });

  it("throws when any copy diverges from what was written", () => {
    expect(() => assertMirroredContentsIdentical("gpc-2026-05.min.json", '{"a":1}', ['{"a":1}', "{}"])).toThrow(
      "Mirrored artifact 'gpc-2026-05.min.json' was not written identically.",
    );
  });

  it("names the offending artifact in the error", () => {
    expect(() => assertMirroredContentsIdentical("nace-2.1.min.json", "x", ["y"])).toThrow(
      "Mirrored artifact 'nace-2.1.min.json' was not written identically.",
    );
  });
});

describe("buildTaxonomyArtifactGenerationCommand", () => {
  it("targets the current Node executable and this module", () => {
    const command = buildTaxonomyArtifactGenerationCommand();

    expect(command.command).toBe(process.execPath);
    expect(command.args).toHaveLength(1);
    expect(command.args[0]).toMatch(/generate\.artifacts\.ts$/u);
  });
});

describe("License generators", () => {
  describe("BackendLicenseGenerator", () => {
    describe("generate", () => {
      it("returns no generated outputs", async () => {
        const generator = new BackendLicenseGenerator();

        await expect(generator.generate()).resolves.toEqual([]);
      });
    });
  });
});

describe("Taxonomy classification generator classes", () => {
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
      it("downloads, extracts, normalizes, and mirrors the GPC artifact", async () => {
        const document = {
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
              Childs: [],
            },
          ],
        };
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {status: 200})),
        );
        mockArchiveExtraction(document);
        const base = await mkdtemp(join(tmpdir(), "arolariu-gpc-class-"));
        const roots = [join(base, "api"), join(base, "web")];
        const generator = new Gs1GpcTaxonomyClassificationGenerator(roots);

        const outputs = await generator.generate();

        expect(outputs).toHaveLength(2);
        expect(await readFile(outputs[0] ?? "", "utf8")).toBe(await readFile(outputs[1] ?? "", "utf8"));
      });

      it("surfaces GPC HTTP failures", async () => {
        vi.stubGlobal(
          "fetch",
          vi.fn(async () => new Response("Unavailable", {status: 503, statusText: "Service Unavailable"})),
        );
        const generator = new Gs1GpcTaxonomyClassificationGenerator([]);

        await expect(generator.generate()).rejects.toThrow(
          "GPC download failed with HTTP 503 Service Unavailable.",
        );
      });
    });
  });
});
