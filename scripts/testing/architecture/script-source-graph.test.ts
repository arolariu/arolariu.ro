// @vitest-environment node

import {describe, expect, it} from "vitest";

import {buildScriptSourceGraph, collectReachableScriptSourcePaths, findUnreachableScriptSourcePaths} from "./script-source-graph.ts";

describe("script source graph", () => {
  it("resolves relative imports and separates runtime from type-only reachability", () => {
    const graph = buildScriptSourceGraph(
      new Map([
        [
          "scripts/entry.ts",
          ['import type {Type} from "./type.ts";', 'import "./runtime.ts";', 'import "./doctor.types";', 'import "./missing.ts";'].join(
            "\n",
          ),
        ],
        ["scripts/type.ts", "export interface Type { readonly value: string; }"],
        ["scripts/runtime.ts", 'export * from "./nested.ts";'],
        ["scripts/nested.ts", "export const value = 1;"],
        ["scripts/doctor.types.ts", "export const value = 2;"],
        ["scripts/orphan.ts", "export const orphan = true;"],
      ]),
    );

    expect([...collectReachableScriptSourcePaths(graph, ["scripts/entry.ts"], "runtime")].toSorted()).toEqual([
      "scripts/doctor.types.ts",
      "scripts/entry.ts",
      "scripts/nested.ts",
      "scripts/runtime.ts",
    ]);
    expect([...collectReachableScriptSourcePaths(graph, ["scripts/entry.ts"], "all")].toSorted()).toEqual([
      "scripts/doctor.types.ts",
      "scripts/entry.ts",
      "scripts/nested.ts",
      "scripts/runtime.ts",
      "scripts/type.ts",
    ]);
    expect(findUnreachableScriptSourcePaths(graph, ["scripts/entry.ts"])).toEqual(["scripts/orphan.ts"]);
    expect(graph.unresolvedLocalModuleReferences).toEqual([{sourcePath: "scripts/entry.ts", specifier: "./missing.ts"}]);
  });

  it("separates eager edges from literal dynamic and type-only ones", () => {
    const graph = buildScriptSourceGraph(
      new Map([
        [
          "scripts/entry.ts",
          [
            'import type {Type} from "./type.ts";',
            'export * from "./re-exported.ts";',
            'export const load = async (): Promise<Type | undefined> => import("./lazy.ts").then(() => undefined);',
          ].join("\n"),
        ],
        ["scripts/type.ts", "export interface Type { readonly value: string; }"],
        ["scripts/re-exported.ts", "export const value = 1;"],
        ["scripts/lazy.ts", "export const lazy = 2;"],
      ]),
    );

    expect(graph.eagerDependencies.get("scripts/entry.ts")).toEqual(["scripts/re-exported.ts"]);
    expect(graph.runtimeDependencies.get("scripts/entry.ts")).toEqual(["scripts/lazy.ts", "scripts/re-exported.ts"]);
    expect(graph.allDependencies.get("scripts/entry.ts")).toEqual(["scripts/lazy.ts", "scripts/re-exported.ts", "scripts/type.ts"]);
    expect([...collectReachableScriptSourcePaths(graph, ["scripts/entry.ts"], "eager")].toSorted()).toEqual([
      "scripts/entry.ts",
      "scripts/re-exported.ts",
    ]);
  });
});
