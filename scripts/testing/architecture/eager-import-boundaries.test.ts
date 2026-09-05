// @vitest-environment node
/**
 * @fileoverview Eager import-graph and declared-capability policies for composed commands, proved
 * against the real production graph and against synthetic graphs that show each detector reacting.
 *
 * - **P7** fixes `"eager"` traversal: static imports and re-exports that are not type-only. Literal
 *   dynamic and type-only edges are excluded, which is what lets a `command.ts` name its workflow's
 *   types without loading the workflow.
 * - **P8** keeps a migrated `command.ts` free of an eager workflow, reporter, presenter, or adapter
 *   edge.
 * - **P9** checks two eager roots separately — every `composed-command` entrypoint and
 *   {@link nodeCommandHostSourcePath}, the module every command loads before parsing — so a
 *   regression in either is attributed precisely.
 * - **P10** governs `composed-command` entries only: their workflow modules declare a non-empty,
 *   exact capability subset covering every capability their own feature context uses. The complete
 *   `runtimeCapabilityNames` set a `defineCommand`-generated legacy direct workflow declares is
 *   recorded debt owned by that entry's `removalCohort` and is never evaluated here.
 * @module scripts/testing/architecture/eager-import-boundaries.test
 */

import {describe, expect, it} from "vitest";

import {runtimeCapabilityNames, type RuntimeCapabilityName} from "../../core/runtime/runtime-capability.ts";
import {documentationAssemblyWorkflowModule} from "../../features/documentation/workflow.ts";
import {endToEndWorkflowModule} from "../../features/end-to-end/workflow.ts";
import {exchangeRateUpdateWorkflowModule} from "../../features/exchange-rates/workflow.ts";
import {scriptEntrypointDefinitions} from "./script-entrypoint-definitions.ts";
import {readProductionScriptSourceFiles} from "./script-source-files.ts";
import {buildScriptSourceGraph, collectReachableScriptSourcePaths, type ScriptSourceGraphDefinition} from "./script-source-graph.ts";
import {collectTypeScriptModuleReferences, isEagerModuleReference} from "./typescript-module-analysis.ts";

/** The module every command loads before it can parse argv; its own help path must stay light. */
const nodeCommandHostSourcePath = "scripts/adapters/node/node-command-host.ts";

/** Local modules no eager help-path graph may reach, from either checked root. */
const forbiddenEagerSourcePathPatterns: readonly RegExp[] = [
  /^scripts\/features\/[^/]+\/(?:workflow|reporter)\.ts$/u,
  /^scripts\/adapters\/node\/node-(?:runtime-scope|lazy-capabilities|filesystem|http-client|process-runner|prompt-provider)\.ts$/u,
  /^scripts\/adapters\/execa\//u,
  /^scripts\/inspection\//u,
  /^scripts\/generate\.artifacts\.ts$/u,
];

/** External packages no eager help-path graph may import; `execa` is not a local source path. */
const forbiddenEagerModuleSpecifiers: ReadonlySet<string> = new Set(["execa"]);

/** Capability context type names mapped to the capability names they oblige a module to declare. */
const runtimeCapabilityContextTypeNames: ReadonlyMap<string, readonly RuntimeCapabilityName[]> = new Map([
  ["BaseWorkflowRuntimeExecutionContext", ["presenter", "signal", "cleanup"]],
  ["PresentationRuntimeCapability", ["presenter"]],
  ["CancellationRuntimeCapability", ["signal"]],
  ["CleanupRuntimeCapability", ["cleanup"]],
  ["EnvironmentRuntimeCapability", ["environment"]],
  ["FilesystemRuntimeCapability", ["files"]],
  ["NetworkRuntimeCapability", ["http"]],
  ["ProcessRuntimeCapability", ["runner"]],
  ["TimeRuntimeCapability", ["clock"]],
  ["TaskRuntimeCapability", ["tasks"]],
  ["PromptRuntimeCapability", ["prompts"]],
]);

/** Every migrated composed command's declared capability set, keyed by its entrypoint path. */
const composedCommandCapabilityDeclarations: ReadonlyMap<string, readonly RuntimeCapabilityName[]> = new Map([
  ["scripts/features/documentation/command.ts", documentationAssemblyWorkflowModule.runtimeCapabilities],
  ["scripts/features/end-to-end/command.ts", endToEndWorkflowModule.runtimeCapabilities],
  ["scripts/features/exchange-rates/command.ts", exchangeRateUpdateWorkflowModule.runtimeCapabilities],
]);

/** One forbidden eager edge, attributed to the root whose graph reached it. */
interface EagerImportViolation {
  readonly sourcePath: string;
  readonly reachable: string;
}

/** One capability a workflow uses without declaring, or declares although it does not exist. */
interface DeclaredCapabilityViolation {
  readonly sourcePath: string;
  readonly capability: string;
  readonly reason: "undeclared-context-capability" | "unknown-capability-name";
}

const composedCommandEntrypointSourcePaths: readonly string[] = scriptEntrypointDefinitions
  .filter(({architectureModel}) => architectureModel === "composed-command")
  .map(({sourcePath}) => sourcePath)
  .toSorted();

const collectEagerImportViolations = (graph: Readonly<ScriptSourceGraphDefinition>, root: string): readonly EagerImportViolation[] =>
  [...collectReachableScriptSourcePaths(graph, [root], "eager")]
    .toSorted()
    .filter((reachable) => forbiddenEagerSourcePathPatterns.some((pattern) => pattern.test(reachable)))
    .map((reachable) => ({sourcePath: root, reachable}));

const collectEagerSpecifierViolations = (
  graph: Readonly<ScriptSourceGraphDefinition>,
  sourceFiles: ReadonlyMap<string, string>,
  root: string,
): readonly EagerImportViolation[] =>
  [...collectReachableScriptSourcePaths(graph, [root], "eager")]
    .toSorted()
    .filter((reachable) =>
      collectTypeScriptModuleReferences(sourceFiles.get(reachable) ?? "", reachable).references.some(
        (reference) => isEagerModuleReference(reference) && forbiddenEagerModuleSpecifiers.has(reference.specifier),
      ),
    )
    .map((reachable) => ({sourcePath: root, reachable}));

function collectDeclaredCapabilityViolations(
  sourcePath: string,
  workflowSource: string,
  declared: readonly string[],
): readonly DeclaredCapabilityViolation[] {
  const declaredNames = new Set<string>(declared);
  const contextCapabilities = [...runtimeCapabilityContextTypeNames]
    .filter(([typeName]) => new RegExp(`\\b${typeName}\\b`, "u").test(workflowSource))
    .flatMap(([, capabilities]) => capabilities);

  return [
    ...declared
      .filter((capability) => !runtimeCapabilityNames.includes(capability as RuntimeCapabilityName))
      .map((capability): DeclaredCapabilityViolation => ({sourcePath, capability, reason: "unknown-capability-name"})),
    ...[...new Set(contextCapabilities)]
      .filter((capability) => !declaredNames.has(capability))
      .toSorted()
      .map((capability): DeclaredCapabilityViolation => ({sourcePath, capability, reason: "undeclared-context-capability"})),
  ];
}

const syntheticEntrypoint = "scripts/features/synthetic/command.ts";
const syntheticGraph = (commandSource: string): ScriptSourceGraphDefinition =>
  buildScriptSourceGraph(
    new Map([
      [syntheticEntrypoint, commandSource],
      ["scripts/features/synthetic/workflow.ts", "export type Result = 1;\nexport const workflowModule = 1;"],
      ["scripts/features/synthetic/reporter.ts", "export const presenter = 2;"],
      ["scripts/adapters/node/node-runtime-scope.ts", "export const createNodeCommandRuntimeFactory = 3;"],
      ["scripts/adapters/node/node-command-host.ts", "export const createNodeCommandHost = 4;"],
    ]),
  );

describe("eager import boundaries", () => {
  it("keeps every migrated command entrypoint free of eager workflow, reporter, adapter, and Execa imports", () => {
    const sourceFiles = readProductionScriptSourceFiles();
    const graph = buildScriptSourceGraph(sourceFiles);

    expect(composedCommandEntrypointSourcePaths.length).toBeGreaterThan(0);
    expect(composedCommandEntrypointSourcePaths.filter((sourcePath) => !graph.sourcePaths.includes(sourcePath))).toEqual([]);
    expect(composedCommandEntrypointSourcePaths.flatMap((sourcePath) => collectEagerImportViolations(graph, sourcePath))).toEqual([]);
    expect(composedCommandEntrypointSourcePaths.flatMap((s) => collectEagerSpecifierViolations(graph, sourceFiles, s))).toEqual([]);
  });

  it("keeps the Node command host help path free of the same eager modules", () => {
    const sourceFiles = readProductionScriptSourceFiles();
    const graph = buildScriptSourceGraph(sourceFiles);

    expect(graph.sourcePaths).toContain(nodeCommandHostSourcePath);
    expect(collectEagerImportViolations(graph, nodeCommandHostSourcePath)).toEqual([]);
    expect(collectEagerSpecifierViolations(graph, sourceFiles, nodeCommandHostSourcePath)).toEqual([]);
  });

  it("rejects a synthetic entrypoint that statically imports its workflow, reporter, or a lazy adapter", () => {
    const graph = syntheticGraph(
      'import {workflowModule} from "./workflow.ts";\nimport {presenter} from "./reporter.ts";\n'
        + 'import {createNodeCommandRuntimeFactory} from "../../adapters/node/node-runtime-scope.ts";\n'
        + "export const command = [workflowModule, presenter, createNodeCommandRuntimeFactory];\n",
    );

    expect(collectEagerImportViolations(graph, syntheticEntrypoint)).toEqual([
      {sourcePath: syntheticEntrypoint, reachable: "scripts/adapters/node/node-runtime-scope.ts"},
      {sourcePath: syntheticEntrypoint, reachable: "scripts/features/synthetic/reporter.ts"},
      {sourcePath: syntheticEntrypoint, reachable: "scripts/features/synthetic/workflow.ts"},
    ]);
  });

  it("accepts a synthetic entrypoint that names its workflow type-only and loads both modules dynamically", () => {
    const graph = syntheticGraph(
      'import type {Result} from "./workflow.ts";\nexport const loadWorkflow = async () => import("./workflow.ts");\n'
        + 'export const loadPresentation = async () => import("./reporter.ts");\n'
        + 'export const loadHost = async () => import("../../adapters/node/node-command-host.ts");\n'
        + "export const empty: Result | undefined = undefined;\n",
    );

    expect(collectEagerImportViolations(graph, syntheticEntrypoint)).toEqual([]);
    expect([...collectReachableScriptSourcePaths(graph, [syntheticEntrypoint], "all")].toSorted()).toEqual([
      "scripts/adapters/node/node-command-host.ts",
      syntheticEntrypoint,
      "scripts/features/synthetic/reporter.ts",
      "scripts/features/synthetic/workflow.ts",
    ]);
  });

  it("rejects a synthetic help-path module that eagerly imports Execa, and accepts a dynamic one", () => {
    const eager = new Map([["scripts/adapters/node/eager.ts", 'import {execa} from "execa";\nexport const host = execa;']]);
    const lazy = new Map([["scripts/adapters/node/lazy.ts", 'export const load = async () => import("execa");']]);

    expect(collectEagerSpecifierViolations(buildScriptSourceGraph(eager), eager, "scripts/adapters/node/eager.ts")).toEqual([
      {sourcePath: "scripts/adapters/node/eager.ts", reachable: "scripts/adapters/node/eager.ts"},
    ]);
    expect(collectEagerSpecifierViolations(buildScriptSourceGraph(lazy), lazy, "scripts/adapters/node/lazy.ts")).toEqual([]);
  });

  it("declares an exact, non-empty capability subset covering every capability its feature context uses", () => {
    const sourceFiles = readProductionScriptSourceFiles();

    expect([...composedCommandCapabilityDeclarations.keys()].toSorted()).toEqual(composedCommandEntrypointSourcePaths);
    expect(documentationAssemblyWorkflowModule.runtimeCapabilities).toEqual(["presenter", "signal", "cleanup", "files", "runner", "tasks"]);
    // The end-to-end feature runs its targets one at a time, so `tasks` must stay undeclared.
    const endToEndCapabilities = ["presenter", "signal", "cleanup", "files", "runner", "environment"];
    expect(endToEndWorkflowModule.runtimeCapabilities).toEqual(endToEndCapabilities);
    // The exchange-rate feature never spawns a child process, so `runner` must stay undeclared.
    const rateCapabilities = ["presenter", "signal", "cleanup", "files", "http", "clock", "environment"];
    expect(exchangeRateUpdateWorkflowModule.runtimeCapabilities).toEqual(rateCapabilities);
    for (const [sourcePath, capabilities] of composedCommandCapabilityDeclarations) {
      const workflowSourcePath = sourcePath.replace(/command\.ts$/u, "workflow.ts");
      const workflowSource = sourceFiles.get(workflowSourcePath);

      expect(workflowSource, workflowSourcePath).toBeDefined();
      expect(capabilities.length, sourcePath).toBeGreaterThan(0);
      expect(capabilities.length, sourcePath).toBeLessThan(runtimeCapabilityNames.length);
      expect(
        capabilities.every((name) => runtimeCapabilityNames.includes(name)),
        sourcePath,
      ).toBe(true);
      expect(collectDeclaredCapabilityViolations(workflowSourcePath, workflowSource ?? "", capabilities)).toEqual([]);
    }
  });

  it("rejects a synthetic composed workflow that uses an undeclared capability or an unknown name", () => {
    const synthetic =
      "export type SyntheticContext = Readonly<BaseWorkflowRuntimeExecutionContext & FilesystemRuntimeCapability & NetworkRuntimeCapability>;";

    expect(
      collectDeclaredCapabilityViolations("scripts/features/synthetic/workflow.ts", synthetic, [
        "presenter",
        "signal",
        "cleanup",
        "files",
        "inspect",
      ]),
    ).toEqual([
      {sourcePath: "scripts/features/synthetic/workflow.ts", capability: "inspect", reason: "unknown-capability-name"},
      {sourcePath: "scripts/features/synthetic/workflow.ts", capability: "http", reason: "undeclared-context-capability"},
    ]);
  });

  it("never evaluates a generated legacy direct workflow that declares the complete capability set", () => {
    const legacyDirectSourcePaths = scriptEntrypointDefinitions
      .filter(({architectureModel}) => architectureModel !== "composed-command")
      .map(({sourcePath}) => sourcePath);

    expect(legacyDirectSourcePaths.length).toBeGreaterThan(0);
    expect(legacyDirectSourcePaths.filter((sourcePath) => composedCommandCapabilityDeclarations.has(sourcePath))).toEqual([]);
    expect(collectDeclaredCapabilityViolations("scripts/legacy/workflow.ts", "", [...runtimeCapabilityNames])).toEqual([]);
  });
});
