/**
 * @fileoverview Tests for the monorepo taxonomy artifact generator.
 * @module scripts/generate.artifacts.test
 */

import {deflateRawSync} from "node:zlib";
import {mkdtemp, readFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {...actual, readFile: vi.fn(actual.readFile)};
});
import {buildHierarchy, extractZipEntry, flattenGpcSchema, parseGpcDocument, writeMirroredArtifacts} from "./generate.artifacts.ts";
import type {TaxonomyArtifact, TaxonomyArtifactNode} from "./generate.artifacts.ts";

/** Minimal ZIP entry description used by the archive builder below. */
interface ZipEntryInput {
  readonly name: string;
  readonly contents: string;
  /** 0 = stored, 8 = deflate. Any other value produces an intentionally unsupported archive. */
  readonly method: number;
}

/**
 * Builds a valid single-disk ZIP archive in memory.
 *
 * @param entries - Entries to place in the archive.
 * @returns Complete ZIP bytes.
 */
function createZipArchive(entries: readonly ZipEntryInput[]): Uint8Array {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const rawBytes = Buffer.from(entry.contents, "utf8");
    const payload = entry.method === 8 ? deflateRawSync(rawBytes) : rawBytes;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(entry.method, 8);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawBytes.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(entry.method, 10);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawBytes.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt32LE(localOffset, 42);

    localChunks.push(localHeader, nameBytes, payload);
    centralChunks.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + payload.length;
  }

  const localSection = Buffer.concat(localChunks);
  const centralSection = Buffer.concat(centralChunks);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSection.length, 12);
  eocd.writeUInt32LE(localSection.length, 16);

  return new Uint8Array(Buffer.concat([localSection, centralSection, eocd]));
}

describe("extractZipEntry", () => {
  it("extracts a deflate-compressed entry by suffix", () => {
    const archive = createZipArchive([
      {name: "readme.txt", contents: "ignore me", method: 8},
      {name: "GPC as of May 2026 EN.json", contents: '{"LanguageCode":"EN"}', method: 8},
    ]);

    const extracted = extractZipEntry(archive, " EN.json");

    expect(Buffer.from(extracted).toString("utf8")).toBe('{"LanguageCode":"EN"}');
  });

  it("extracts a stored entry by suffix", () => {
    const archive = createZipArchive([{name: "data EN.json", contents: "stored payload", method: 0}]);

    expect(Buffer.from(extractZipEntry(archive, " EN.json")).toString("utf8")).toBe("stored payload");
  });

  it("throws when no entry matches the suffix", () => {
    const archive = createZipArchive([{name: "readme.txt", contents: "x", method: 8}]);

    expect(() => extractZipEntry(archive, " EN.json")).toThrow("ZIP entry ending with ' EN.json' was not found.");
  });

  it("throws when the end-of-central-directory record is missing", () => {
    expect(() => extractZipEntry(new Uint8Array(8), "anything")).toThrow(
      "ZIP end-of-central-directory record was not found.",
    );
  });

  it("throws for an unsupported compression method", () => {
    const archive = createZipArchive([{name: "data EN.json", contents: "x", method: 12}]);

    expect(() => extractZipEntry(archive, " EN.json")).toThrow("Unsupported ZIP compression method 12");
  });
});

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

  it("throws when a node code is not a number", () => {
    expect(() =>
      parseGpcDocument({LanguageCode: "EN", DateUtc: "2026-05-01", Schema: [{...validNode, Code: "50000000"}]}),
    ).toThrow("GPC node Code must be a number.");
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
});
