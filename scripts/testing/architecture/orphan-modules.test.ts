// @vitest-environment node

import {describe, expect, it} from "vitest";

import {
  additionalScriptSourceRootPaths,
  scriptEntrypointDefinitions,
  temporaryExternalScriptModuleReferenceDefinitions,
} from "./script-entrypoint-definitions.ts";
import {readProductionScriptSourceFiles} from "./script-source-files.ts";
import {buildScriptSourceGraph, findUnreachableScriptSourcePaths} from "./script-source-graph.ts";

describe("script source reachability", () => {
  it("has no orphan modules, dynamic roots, or unexplained external relative imports", () => {
    const graph = buildScriptSourceGraph(readProductionScriptSourceFiles());
    const roots = [...scriptEntrypointDefinitions.map(({sourcePath}) => sourcePath), ...additionalScriptSourceRootPaths];

    expect(graph.nonLiteralDynamicImports).toEqual([]);
    expect(graph.unresolvedLocalModuleReferences).toEqual(
      temporaryExternalScriptModuleReferenceDefinitions.map(({sourcePath, specifier}) => ({
        sourcePath,
        specifier,
      })),
    );
    expect(findUnreachableScriptSourcePaths(graph, roots)).toEqual([]);
  });
});
