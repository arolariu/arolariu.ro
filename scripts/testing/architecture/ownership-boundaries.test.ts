// @vitest-environment node
/**
 * @fileoverview Directory-ownership policies for the split `scripts/**` runtime.
 * @module scripts/testing/architecture/ownership-boundaries.test
 *
 * @remarks
 * Every rule is proved twice: against the real production source graph, and against a synthetic
 * graph that shows the detector itself reacting. The inspection rule owns only the seam this
 * cohort created; the legacy `scripts/inspection/**` edges into `scripts/common/**` and the two
 * inspection entrypoints' literal dynamic Node command-host loaders are recorded Cohort 2 debt
 * that this policy deliberately does not evaluate.
 */

import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import {readProductionScriptSourceFiles} from "./script-source-files.ts";
import {buildScriptSourceGraph, collectReachableScriptSourcePaths, type ScriptSourceGraphDefinition} from "./script-source-graph.ts";

/** Module families no `scripts/core/**` module may reach on any edge. */
const isForbiddenCoreTarget = (candidate: string): boolean =>
  /^scripts\/(?:common|features|inspection|adapters|workers)\//u.test(candidate);

/** Module families no `scripts/adapters/**` module may reach on any edge. */
const isForbiddenAdapterTarget = (candidate: string): boolean => /^scripts\/(?:features|inspection)\//u.test(candidate);

/** Runtime targets outside the core and sibling-adapter surface an adapter is allowed to use. */
const isForeignAdapterRuntimeTarget = (target: string): boolean =>
  !target.startsWith("scripts/core/") && !target.startsWith("scripts/adapters/");

/** Any concrete Node or Execa adapter module. */
const isConcreteAdapter = (target: string): boolean => target.startsWith("scripts/adapters/");

/** Directory names a `scripts/core/**` module may not even mention in its source text. */
const forbiddenCoreSourceLiterals = ["adapters", "inspection"] as const;

/** The only two modules the Cohort 1 inspection-ownership rule governs. */
const inspectionOwnershipSourcePaths = [
  "scripts/inspection/runtime-capability.ts",
  "scripts/inspection/runtime-capability.test.ts",
] as const;

/** One forbidden ownership edge and the module that owns it. */
interface OwnershipViolation {
  readonly sourcePath: string;
  readonly reachable: string;
}

/**
 * Collects every forbidden module the roots depend on, either through their direct edges only or
 * through the full transitive closure of the selected traversal mode.
 */
function collectOwnershipViolations(
  graph: Readonly<ScriptSourceGraphDefinition>,
  roots: readonly string[],
  mode: "runtime" | "all",
  reach: "direct" | "transitive",
  isForbidden: (target: string) => boolean,
): readonly OwnershipViolation[] {
  const dependencies = mode === "runtime" ? graph.runtimeDependencies : graph.allDependencies;
  return roots.flatMap((sourcePath) => {
    const targets =
      reach === "direct"
        ? (dependencies.get(sourcePath) ?? [])
        : [...collectReachableScriptSourcePaths(graph, [sourcePath], mode)].filter((target) => target !== sourcePath).toSorted();
    return targets.filter((target) => isForbidden(target)).map((reachable) => ({sourcePath, reachable}));
  });
}

function buildSyntheticGraph(entries: readonly (readonly [string, string])[]): ScriptSourceGraphDefinition {
  return buildScriptSourceGraph(new Map(entries));
}

function selectSourcePathsUnder(graph: Readonly<ScriptSourceGraphDefinition>, prefix: string): readonly string[] {
  return graph.sourcePaths.filter((sourcePath) => sourcePath.startsWith(prefix));
}

describe("core ownership", () => {
  it("leaves the real core tree free of common, feature, inspection, adapter, and worker edges", () => {
    const sourceFiles = readProductionScriptSourceFiles();
    const graph = buildScriptSourceGraph(sourceFiles);
    const coreRoots = selectSourcePathsUnder(graph, "scripts/core/");
    const literalViolations = [...sourceFiles]
      .filter(([sourcePath]) => sourcePath.startsWith("scripts/core/"))
      .flatMap(([sourcePath, sourceText]) =>
        forbiddenCoreSourceLiterals.filter((literal) => sourceText.includes(literal)).map((literal) => ({sourcePath, literal})),
      );

    expect(coreRoots.length).toBeGreaterThan(0);
    expect(collectOwnershipViolations(graph, coreRoots, "all", "transitive", isForbiddenCoreTarget)).toEqual([]);
    expect(literalViolations).toEqual([]);
  });

  it("rejects a core module that reaches inspection type-only and an adapter through a dynamic import", () => {
    const graph = buildSyntheticGraph([
      [
        "scripts/core/command/synthetic.ts",
        'import type {X} from "../../inspection/runtime-capability.ts";\n'
          + 'export const load = async (): Promise<X> => import("../../adapters/node/node-command-host.ts");\n',
      ],
      ["scripts/inspection/runtime-capability.ts", "export type X = 1;\n"],
      ["scripts/adapters/node/node-command-host.ts", "export const host = 1;\n"],
    ]);

    expect(collectOwnershipViolations(graph, ["scripts/core/command/synthetic.ts"], "all", "transitive", isForbiddenCoreTarget)).toEqual([
      {sourcePath: "scripts/core/command/synthetic.ts", reachable: "scripts/adapters/node/node-command-host.ts"},
      {sourcePath: "scripts/core/command/synthetic.ts", reachable: "scripts/inspection/runtime-capability.ts"},
    ]);
  });
});

describe("adapter ownership", () => {
  it("keeps every real adapter edge inside core and sibling adapters", () => {
    const graph = buildScriptSourceGraph(readProductionScriptSourceFiles());
    const adapterRoots = selectSourcePathsUnder(graph, "scripts/adapters/");

    expect(adapterRoots.length).toBeGreaterThan(0);
    expect(collectOwnershipViolations(graph, adapterRoots, "all", "transitive", isForbiddenAdapterTarget)).toEqual([]);
    expect(collectOwnershipViolations(graph, adapterRoots, "runtime", "direct", isForeignAdapterRuntimeTarget)).toEqual([]);
  });

  it("rejects an adapter that reaches inspection through a literal dynamic import", () => {
    const graph = buildSyntheticGraph([
      ["scripts/adapters/node/synthetic.ts", 'export const load = async () => import("../../inspection/session.ts");\n'],
      ["scripts/inspection/session.ts", "export const session = 1;\n"],
    ]);

    expect(
      collectOwnershipViolations(graph, ["scripts/adapters/node/synthetic.ts"], "all", "transitive", isForbiddenAdapterTarget),
    ).toEqual([{sourcePath: "scripts/adapters/node/synthetic.ts", reachable: "scripts/inspection/session.ts"}]);
  });

  it("accepts an adapter that statically imports a sibling adapter and a core leaf", () => {
    const graph = buildSyntheticGraph([
      [
        "scripts/adapters/node/synthetic.ts",
        'import {sibling} from "./node-platform.ts";\nimport {leaf} from "../../core/runtime/task-scheduler.ts";\nexport const composed = [sibling, leaf];\n',
      ],
      ["scripts/adapters/node/node-platform.ts", "export const sibling = 1;\n"],
      ["scripts/core/runtime/task-scheduler.ts", "export const leaf = 1;\n"],
    ]);
    const roots = ["scripts/adapters/node/synthetic.ts"];

    expect(collectOwnershipViolations(graph, roots, "all", "transitive", isForbiddenAdapterTarget)).toEqual([]);
    expect(collectOwnershipViolations(graph, roots, "runtime", "direct", isForeignAdapterRuntimeTarget)).toEqual([]);
  });
});

describe("inspection ownership", () => {
  it("keeps the Cohort 1 inspection runtime capability and its test off every concrete adapter", () => {
    const sourceFiles = new Map(readProductionScriptSourceFiles());
    sourceFiles.set(inspectionOwnershipSourcePaths[1], readFileSync(inspectionOwnershipSourcePaths[1], "utf8"));
    const graph = buildScriptSourceGraph(sourceFiles);

    expect(inspectionOwnershipSourcePaths.filter((sourcePath) => !graph.sourcePaths.includes(sourcePath))).toEqual([]);
    expect(collectOwnershipViolations(graph, [...inspectionOwnershipSourcePaths], "all", "direct", isConcreteAdapter)).toEqual([]);
    expect(graph.allDependencies.get(inspectionOwnershipSourcePaths[0]) ?? []).toEqual(
      expect.arrayContaining(["scripts/core/runtime/runtime-execution-context.ts", "scripts/inspection/repository.ts"]),
    );
  });

  it("accepts a legacy inspection entrypoint host loader and a legacy common repository-paths edge", () => {
    const graph = buildSyntheticGraph([
      [
        "scripts/inspection/aggregate-worker.ts",
        'const loadProductionCommandHost = async () => import("../adapters/node/node-command-host.ts");\nexport const worker = loadProductionCommandHost;\n',
      ],
      ["scripts/inspection/runtime-capability.ts", 'import type {P} from "../common/repository-paths.ts";\nexport type Q = P;\n'],
      ["scripts/common/repository-paths.ts", "export type P = 1;\n"],
      ["scripts/adapters/node/node-command-host.ts", "export const host = 1;\n"],
    ]);

    expect(collectOwnershipViolations(graph, ["scripts/inspection/runtime-capability.ts"], "all", "direct", isConcreteAdapter)).toEqual([]);
    expect(graph.allDependencies.get("scripts/inspection/runtime-capability.ts")).toEqual(["scripts/common/repository-paths.ts"]);
    expect(graph.allDependencies.get("scripts/inspection/aggregate-worker.ts")).toEqual(["scripts/adapters/node/node-command-host.ts"]);
  });
});
