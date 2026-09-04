// @vitest-environment node
/**
 * @fileoverview Barrel, module-size, and entrypoint-model policies for `scripts/**`.
 * @module scripts/testing/architecture/module-structure-policy.test
 *
 * @remarks
 * The size rule owns exactly the modules this cohort created or materially rewrote — everything
 * under `scripts/core/`, `scripts/adapters/`, and `scripts/features/` plus the single inspection
 * seam — and derives that subject set from path rules rather than from a suppression list, so the
 * untouched, legitimately larger legacy `scripts/inspection/**` modules are never evaluated.
 */

import {describe, expect, it} from "vitest";

import {countMaintainedSourceLineRecords} from "./maintained-source-lines.ts";
import {scriptEntrypointDefinitions} from "./script-entrypoint-definitions.ts";
import {discoverScriptSourceFiles, readProductionScriptSourceFiles} from "./script-source-files.ts";

/** Directories that own their modules directly and may therefore hold no barrel module. */
const barrelFreeDirectories = [
  "scripts/core/",
  "scripts/adapters/",
  "scripts/inspection/",
  "scripts/features/",
  "scripts/testing/",
] as const;

/** The single named barrel exception inside the policed families; Cohort 3 deletes it. */
const approvedBarrelModules = [{sourcePath: "scripts/common/index.ts", removalCohort: 3}] as const;

/** Directories whose every module this cohort created or materially rewrote. */
const sizeOwnedDirectories = ["scripts/core/", "scripts/adapters/", "scripts/features/"] as const;

/** Individually owned modules outside {@link sizeOwnedDirectories}. */
const sizeOwnedSourcePaths = ["scripts/inspection/runtime-capability.ts"] as const;

const maximumModuleMaintainedLineCount = 500;
const maximumComposedCommandMaintainedLineCount = 50;

/** One module larger than the limit its ownership rule allows. */
interface ModuleSizeViolation {
  readonly sourcePath: string;
  readonly maintainedLineCount: number;
}

/** One entrypoint inventory record, structurally matching the authoritative definitions. */
interface EntrypointArchitectureRecord {
  readonly sourcePath: string;
  readonly architectureModel: "composed-command" | "legacy-command" | "piscina";
  readonly removalCohort?: number;
}

function findBarrelModules(sourcePaths: readonly string[]): readonly string[] {
  return sourcePaths.filter(
    (sourcePath) => sourcePath.endsWith("/index.ts") && barrelFreeDirectories.some((directory) => sourcePath.startsWith(directory)),
  );
}

function isSizeOwnedModule(sourcePath: string): boolean {
  return (
    sizeOwnedDirectories.some((directory) => sourcePath.startsWith(directory))
    || sizeOwnedSourcePaths.some((ownedPath) => ownedPath === sourcePath)
  );
}

function findOversizedModules(
  sourceFiles: ReadonlyMap<string, string>,
  maximumMaintainedLineCount: number,
  isOwned: (sourcePath: string) => boolean,
): readonly ModuleSizeViolation[] {
  return [...sourceFiles]
    .filter(([sourcePath]) => isOwned(sourcePath))
    .map(([sourcePath, sourceText]) => ({sourcePath, maintainedLineCount: countMaintainedSourceLineRecords(sourceText)}))
    .filter(({maintainedLineCount}) => maintainedLineCount > maximumMaintainedLineCount);
}

function findEntrypointModelViolations(entrypoints: readonly EntrypointArchitectureRecord[]): readonly string[] {
  return entrypoints.flatMap(({sourcePath, architectureModel, removalCohort}) => {
    if (architectureModel === "composed-command") {
      return removalCohort === undefined ? [] : [`${sourcePath}: composed-command must not declare a removal cohort`];
    }

    return removalCohort === undefined ? [`${sourcePath}: ${architectureModel} must declare a removal cohort`] : [];
  });
}

describe("module structure policy", () => {
  it("keeps every owned directory free of a barrel module", () => {
    const sourcePaths = discoverScriptSourceFiles();

    expect(findBarrelModules(sourcePaths)).toEqual([]);
    expect(approvedBarrelModules.filter(({sourcePath}) => !sourcePaths.includes(sourcePath))).toEqual([]);
    expect(approvedBarrelModules.filter(({sourcePath}) => findBarrelModules([sourcePath]).length > 0)).toEqual([]);
  });

  it("rejects a barrel module added under the adapters directory", () => {
    expect(
      findBarrelModules(["scripts/adapters/node/index.ts", "scripts/adapters/node/node-platform.ts", "scripts/common/index.ts"]),
    ).toEqual(["scripts/adapters/node/index.ts"]);
  });

  it("keeps every created, rewritten, and composed-command module within its size limit", () => {
    const sourceFiles = readProductionScriptSourceFiles();
    const ownedSourcePaths = [...sourceFiles.keys()].filter((sourcePath) => isSizeOwnedModule(sourcePath));
    const composedCommandSourcePaths = scriptEntrypointDefinitions
      .filter(({architectureModel}) => architectureModel === "composed-command")
      .map(({sourcePath}) => sourcePath);

    expect(ownedSourcePaths).toContain("scripts/inspection/runtime-capability.ts");
    expect(ownedSourcePaths.some((sourcePath) => sourcePath.startsWith("scripts/core/"))).toBe(true);
    expect(findOversizedModules(sourceFiles, maximumModuleMaintainedLineCount, isSizeOwnedModule)).toEqual([]);
    expect(
      findOversizedModules(sourceFiles, maximumComposedCommandMaintainedLineCount, (sourcePath) =>
        composedCommandSourcePaths.includes(sourcePath),
      ),
    ).toEqual([]);
  });

  it("rejects an oversized core module while ignoring an untouched legacy inspection module", () => {
    const sourceFiles = new Map([
      ["scripts/core/command/synthetic.ts", "const line = 1;\n".repeat(500)],
      ["scripts/inspection/legacy.ts", "const line = 1;\n".repeat(899)],
    ]);

    expect(findOversizedModules(sourceFiles, maximumModuleMaintainedLineCount, isSizeOwnedModule)).toEqual([
      {sourcePath: "scripts/core/command/synthetic.ts", maintainedLineCount: 501},
    ]);
  });

  it("carries an explicit architecture model and removal cohort for every entrypoint", () => {
    expect(findEntrypointModelViolations(scriptEntrypointDefinitions)).toEqual([]);
    expect(
      scriptEntrypointDefinitions.map(
        ({sourcePath, architectureModel, removalCohort}) => `${sourcePath} ${architectureModel} ${removalCohort ?? "none"}`,
      ),
    ).toEqual([
      "scripts/container-runtime/aspire.ts legacy-command 6",
      "scripts/container-runtime/compose.ts legacy-command 6",
      "scripts/container-runtime/image.ts legacy-command 6",
      "scripts/container-runtime/selfhost.ts legacy-command 6",
      "scripts/features/documentation/command.ts composed-command none",
      "scripts/doctor.ts legacy-command 2",
      "scripts/generate.artifacts.ts legacy-command 4",
      "scripts/generate.env.ts legacy-command 4",
      "scripts/generate.gql.ts legacy-command 4",
      "scripts/generate.i18n.ts legacy-command 4",
      "scripts/generate.ts legacy-command 4",
      "scripts/setup.ts legacy-command 5",
      "scripts/status.ts legacy-command 3",
      "scripts/features/end-to-end/command.ts composed-command none",
      "scripts/features/exchange-rates/command.ts composed-command none",
      "scripts/inspection/aggregate-worker.ts legacy-command 2",
      "scripts/inspection/workspace.worker.ts legacy-command 2",
      "scripts/format.ts piscina 7",
      "scripts/lint.ts piscina 7",
      "scripts/workers/format.worker.ts piscina 7",
      "scripts/workers/lint.worker.ts piscina 7",
    ]);
  });

  it("rejects an entrypoint entry that omits or misplaces its removal cohort", () => {
    expect(
      findEntrypointModelViolations([
        {sourcePath: "scripts/legacy.ts", architectureModel: "legacy-command"},
        {sourcePath: "scripts/composed.ts", architectureModel: "composed-command"},
        {sourcePath: "scripts/composed-with-cohort.ts", architectureModel: "composed-command", removalCohort: 2},
      ]),
    ).toEqual([
      "scripts/legacy.ts: legacy-command must declare a removal cohort",
      "scripts/composed-with-cohort.ts: composed-command must not declare a removal cohort",
    ]);
  });
});
