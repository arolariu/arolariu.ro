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
  flattenGpcSchema,
  normalizeSparqlBindings,
  writeMirroredArtifacts,
  type TaxonomyArtifact,
} from "./generate.artifacts.ts";

const temporaryDirectories: string[] = [];

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
});
