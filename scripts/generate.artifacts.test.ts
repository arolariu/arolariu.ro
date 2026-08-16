/**
 * @fileoverview Unit tests for taxonomy artifact generation.
 * @module scripts/generate.artifacts.test
 */

import {afterEach, describe, expect, it} from "vitest";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
  buildHierarchy,
  extractZipEntry,
  flattenGpcSchema,
  generateTaxonomyArtifacts,
  normalizeSparqlBindings,
  writeMirroredArtifacts,
  type TaxonomyArtifact,
} from "./generate.artifacts.ts";

const temporaryDirectories: string[] = [];

function createStoredZip(fileName: string, contents: string): Uint8Array {
  const fileNameBytes = Buffer.from(fileName, "utf8");
  const contentBytes = Buffer.from(contents, "utf8");
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt32LE(contentBytes.length, 18);
  localHeader.writeUInt32LE(contentBytes.length, 22);
  localHeader.writeUInt16LE(fileNameBytes.length, 26);

  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt32LE(contentBytes.length, 20);
  centralHeader.writeUInt32LE(contentBytes.length, 24);
  centralHeader.writeUInt16LE(fileNameBytes.length, 28);
  centralHeader.writeUInt32LE(0, 42);

  const centralOffset = localHeader.length + fileNameBytes.length + contentBytes.length;
  const centralSize = centralHeader.length + fileNameBytes.length;
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(1, 8);
  endRecord.writeUInt16LE(1, 10);
  endRecord.writeUInt32LE(centralSize, 12);
  endRecord.writeUInt32LE(centralOffset, 16);

  return Buffer.concat([localHeader, fileNameBytes, contentBytes, centralHeader, fileNameBytes, endRecord]);
}

function createFakeFetch(options: Readonly<{malformedBroader?: boolean}> = {}): typeof fetch {
  const gpcDocument = {
    LanguageCode: "EN",
    DateUtc: "20/5/2026",
    Schema: [
      {
        Level: 1,
        Code: 50000000,
        Title: "Food/Beverage/Tobacco",
        Definition: "Food products",
        DefinitionExcludes: null,
        Active: true,
        Childs: [],
      },
    ],
  };
  const zip = createStoredZip("GPC as of May 2026 (2026-05-20) EN.json", JSON.stringify(gpcDocument));

  return async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url === "https://ref.gs1.org/standards/gpc/2026-05/") {
      return new Response(zip, {status: 200});
    }

    const query = new URL(url).searchParams.get("query") ?? "";
    const binding = query.includes("ecoicop2")
      ? {
          concept: {value: "eco:01"},
          notation: {value: "01"},
          label: {value: "01 Food and non-alcoholic beverages"},
          ...(options.malformedBroader === true ? {broader: {type: "uri"}} : {}),
        }
      : {
          concept: {value: "nace:A"},
          notation: {value: "A"},
          label: {value: "A AGRICULTURE, FORESTRY AND FISHING"},
        };

    return Response.json({results: {bindings: [binding]}});
  };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, {force: true, recursive: true})));
});

describe("generate.artifacts", () => {
  it("keeps only active GPC segment, family, class, and brick nodes", () => {
    const nodes = flattenGpcSchema([
      {
        Level: 1,
        Code: 50000000,
        Title: "Food/Beverage/Tobacco",
        Definition: "Food products",
        DefinitionExcludes: null,
        Active: true,
        Childs: [
          {
            Level: 4,
            Code: 10000025,
            Title: "Milk (Perishable)",
            Definition: "Milk products",
            DefinitionExcludes: null,
            Active: true,
            Childs: [
              {
                Level: 5,
                Code: 20000001,
                Title: "Attribute",
                Definition: "Attribute definition",
                DefinitionExcludes: null,
                Active: true,
                Childs: [],
              },
            ],
          },
          {
            Level: 2,
            Code: 50010000,
            Title: "Inactive family",
            Definition: null,
            DefinitionExcludes: null,
            Active: false,
            Childs: [],
          },
        ],
      },
    ]);

    expect(nodes.map((node) => node.code)).toEqual(["50000000", "10000025"]);
    expect(nodes[1]?.hierarchyCodes).toEqual(["50000000", "10000025"]);
  });

  it("builds hierarchy from SPARQL broader links and strips code prefixes from labels", () => {
    const nodes = normalizeSparqlBindings("ECOICOP_V2", "2", [
      {concept: "eco:01", notation: "01", label: "01 Food and non-alcoholic beverages", broader: null},
      {concept: "eco:011", notation: "01.1", label: "01.1 Food", broader: "eco:01"},
    ]);

    expect(buildHierarchy(nodes, "01.1")).toMatchObject({
      officialLabel: "Food",
      hierarchyCodes: ["01", "01.1"],
      hierarchyLabels: ["Food and non-alcoholic beverages", "Food"],
    });
  });

  it("rejects SPARQL nodes whose broader concept is absent", () => {
    expect(() =>
      normalizeSparqlBindings("NACE_2_1", "2.1", [{concept: "nace:01", notation: "01", label: "01 Agriculture", broader: "nace:A"}]),
    ).toThrow("Unresolved parent 'nace:A'");
  });

  it("extracts a stored JSON entry from a ZIP archive", () => {
    const zip = createStoredZip("taxonomy EN.json", '{"ok":true}');
    expect(Buffer.from(extractZipEntry(zip, " EN.json")).toString("utf8")).toBe('{"ok":true}');
  });

  it("writes byte-identical minified backend and frontend files", async () => {
    const root = await mkdtemp(join(tmpdir(), "taxonomy-artifacts-"));
    temporaryDirectories.push(root);
    const backend = join(root, "backend");
    const frontend = join(root, "frontend");
    const artifact: TaxonomyArtifact = {
      system: "NACE_2_1",
      version: "2.1",
      sourceUrl: "https://example.test/nace",
      generatedAt: "2026-08-16T00:00:00.000Z",
      attribution: "European Union",
      nodes: [
        {
          code: "47.11",
          officialLabel: "Retail sale in non-specialised stores",
          level: "class",
          parentCode: null,
          hierarchyCodes: ["47.11"],
          hierarchyLabels: ["Retail sale in non-specialised stores"],
          definition: null,
          searchText: "47.11 retail sale in non-specialised stores",
        },
      ],
    };

    const outputs = await writeMirroredArtifacts("nace-2.1.min.json", artifact, [backend, frontend]);
    const contents = await Promise.all(outputs.map((path) => readFile(path, "utf8")));

    expect(contents).toEqual([JSON.stringify(artifact), JSON.stringify(artifact)]);
    expect(contents[0]).not.toContain("\n");
  });

  it("generates all six artifacts from deterministic external responses", async () => {
    const root = await mkdtemp(join(tmpdir(), "taxonomy-generation-"));
    temporaryDirectories.push(root);
    const backend = join(root, "backend");
    const frontend = join(root, "frontend");

    const outputs = await generateTaxonomyArtifacts(createFakeFetch(), [backend, frontend]);
    const names = outputs.map((path) => path.split(/[\\/]/u).at(-1));

    expect(outputs).toHaveLength(6);
    expect(names).toEqual([
      "gpc-2026-05.min.json",
      "gpc-2026-05.min.json",
      "ecoicop-v2.min.json",
      "ecoicop-v2.min.json",
      "nace-2.1.min.json",
      "nace-2.1.min.json",
    ]);

    const contents = await Promise.all(outputs.map((path) => readFile(path, "utf8")));
    expect(contents[0]).toBe(contents[1]);
    expect(contents[2]).toBe(contents[3]);
    expect(contents[4]).toBe(contents[5]);
  });

  it("surfaces external HTTP failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "taxonomy-failure-"));
    temporaryDirectories.push(root);
    const unavailableFetch: typeof fetch = async () => new Response("Unavailable", {status: 503, statusText: "Service Unavailable"});

    await expect(generateTaxonomyArtifacts(unavailableFetch, [join(root, "backend"), join(root, "frontend")])).rejects.toThrow("HTTP 503");
  });

  it("rejects a present optional SPARQL binding without a value", async () => {
    const root = await mkdtemp(join(tmpdir(), "taxonomy-malformed-binding-"));
    temporaryDirectories.push(root);

    await expect(
      generateTaxonomyArtifacts(createFakeFetch({malformedBroader: true}), [join(root, "backend"), join(root, "frontend")]),
    ).rejects.toThrow("SPARQL binding 'broader'.value must be a non-empty string");
  });
});
