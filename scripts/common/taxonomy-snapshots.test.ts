import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {describe, expect, it} from "vitest";

import {makeTestLayer, runScoped} from "../platform/testing.ts";
import {getExpectedTaxonomyArtifactPaths} from "./taxonomy-artifacts.ts";
import {pinnedTaxonomyFixtureFiles} from "./taxonomy-fixtures.testing.ts";
import {inspectTaxonomySnapshots, taxonomyFreshness} from "./taxonomy-snapshots.ts";

describe("taxonomy freshness", () => {
  it.each([
    ["2024-02-29T12:00:00.000Z", "2024-08-29T11:59:59.999Z", "fresh"],
    ["2024-02-29T12:00:00.000Z", "2024-08-29T12:00:00.000Z", "review-due"],
    ["2024-02-29T12:00:00.000Z", "2025-02-28T11:59:59.999Z", "review-due"],
    ["2024-02-29T12:00:00.000Z", "2025-02-28T12:00:00.000Z", "overdue"],
    ["2025-08-31T12:00:00.000Z", "2026-02-28T12:00:00.000Z", "review-due"],
    ["2026-08-31T12:00:00.000Z", "2026-08-31T11:59:59.999Z", "unknown-age"],
  ] as const)("classifies %s at %s as %s", (capture, now, expected) => {
    expect(taxonomyFreshness(capture, new Date(now))).toBe(expected);
  });
});

describe("pinned taxonomy inspection", () => {
  it("verifies the checked-in graph, provenance, and both copies of each taxonomy", async () => {
    const root = join(import.meta.dirname, "..", "..");
    const harness = makeTestLayer({fileSystem: "node"});
    const result = await runScoped(inspectTaxonomySnapshots(root, new Date("2026-08-20T00:00:00.000Z")), harness.layer);

    expect(result.issues).toEqual([]);
    expect(result.snapshots).toMatchObject([
      {system: "GS1_GPC", version: "2026-05", freshness: "fresh", sha256: expect.stringMatching(/^[a-f0-9]{64}$/u)},
      {system: "ECOICOP_V2", version: "2", freshness: "fresh"},
      {system: "NACE_2_1", version: "2.1", freshness: "fresh"},
    ]);
  });

  it("distinguishes non-file, wrong-identity, and divergent pairs on disk", async () => {
    const root = await mkdtemp(join(tmpdir(), "arolariu-taxonomy-inspection-"));
    try {
      const [gpcApi, , ecoicopApi, ecoicopWeb, naceApi, naceWeb] = getExpectedTaxonomyArtifactPaths(root);
      if (!gpcApi || !ecoicopApi || !ecoicopWeb || !naceApi || !naceWeb) throw new Error("Missing fixture paths.");
      await mkdir(gpcApi, {recursive: true});
      const wrongIdentity = JSON.stringify({
        system: "ECOICOP_V2",
        version: "1",
        sourceUrl: "https://example.test/ecoicop",
        attribution: "Fixture",
        generatedAt: "2026-08-19T00:00:00.000Z",
        nodes: [
          {
            code: "01",
            officialLabel: "Food",
            level: "division",
            parentCode: null,
            hierarchyCodes: ["01"],
            hierarchyLabels: ["Food"],
            definition: null,
            searchText: "food",
          },
        ],
      });
      for (const [file, contents] of [
        [ecoicopApi, wrongIdentity],
        [ecoicopWeb, wrongIdentity],
        [naceApi, "{}"],
        [naceWeb, "{ }"],
      ] as const) {
        await mkdir(dirname(file), {recursive: true});
        await writeFile(file, contents);
      }
      const harness = makeTestLayer({fileSystem: "node"});
      const result = await runScoped(inspectTaxonomySnapshots(root, new Date("2026-11-19T00:00:00.000Z")), harness.layer);

      expect(result.snapshots).toEqual([]);
      expect(result.issues.map(({fileName, kind}) => [fileName, kind])).toEqual([
        ["gpc-2026-05.min.json", "unreadable"],
        ["ecoicop-v2.min.json", "invalid"],
        ["nace-2.1.min.json", "mismatched"],
      ]);
    } finally {
      await rm(root, {force: true, recursive: true});
    }
  });

  it("rejects unexpected node fields before a pinned pair reaches the strict Website decoder", async () => {
    const files = Object.fromEntries(
      Object.entries(pinnedTaxonomyFixtureFiles("/workspace")).map(([path, contents]) => [
        path,
        path.endsWith("nace-2.1.min.json") ? contents.replace('"level":"division"', '"level":"division","unexpected":true') : contents,
      ]),
    );
    const harness = makeTestLayer({environment: {cwd: "/workspace"}, files});

    const result = await runScoped(inspectTaxonomySnapshots("/workspace", new Date("2026-08-20T00:00:00.000Z")), harness.layer);

    expect(result.issues).toMatchObject([{fileName: "nace-2.1.min.json", kind: "invalid"}]);
  });
});
