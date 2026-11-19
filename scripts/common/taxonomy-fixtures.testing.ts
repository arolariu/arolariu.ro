import {basename} from "node:path";

import {getExpectedTaxonomyArtifactPaths, taxonomyArtifactFileNames, taxonomyArtifactIdentities} from "./taxonomy-artifacts.ts";

/** Provides small, real taxonomy payloads for both mirrors in filesystem fixtures. */
export function pinnedTaxonomyFixtureFiles(root: string, generatedAt = "2026-08-19T00:00:00.000Z"): Readonly<Record<string, string>> {
  const node = {
    code: "01",
    officialLabel: "Example",
    level: "division",
    parentCode: null,
    hierarchyCodes: ["01"],
    hierarchyLabels: ["Example"],
    definition: null,
    searchText: "example",
  };
  const keys = ["gpc", "ecoicop", "nace"] as const;
  return Object.fromEntries(
    getExpectedTaxonomyArtifactPaths(root).map((path) => {
      const key = keys.find((candidate) => taxonomyArtifactFileNames[candidate] === basename(path));
      if (key === undefined) throw new Error(`Unknown taxonomy fixture: ${path}`);
      return [path, JSON.stringify({...taxonomyArtifactIdentities[key], generatedAt, nodes: [node]})];
    }),
  );
}
