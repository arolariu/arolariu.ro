/**
 * @fileoverview Machine-readable startup and import-graph baseline reporter for `scripts/**`.
 * @module scripts/testing/architecture/report-script-architecture
 *
 * @remarks
 * This entrypoint is one of the narrow, named exceptions to the repository direct-output policy:
 * it emits raw JSON on `process.stdout` for CI and local consumption instead of routing through
 * `ComposedTerminalPresenter`, and it is excluded from production script source discovery.
 * It reports the static runtime source-graph size, the eager (`--help`) import-graph size, each
 * entrypoint's architecture model and removal cohort, and a three-sample `--help` median for every
 * Commander entrypoint; the timings are informational, while the AST import-boundary tests remain
 * the structural enforcement mechanism. The runtime graph follows every non-type-only edge,
 * including literal dynamic imports, so `runtimeGraphMaintainedLineCount` measures transitive
 * literal runtime reachability rather than the eager `--help` import graph and is not comparable
 * to frozen historical `runtimeGraphLineCounts`. The eager graph follows only static, non-type-only
 * imports and re-exports, so `eagerGraphMaintainedLineCount` is what starting the entrypoint
 * actually pays for before it parses argv. Run it with `npm run analyze:scripts:architecture`.
 */

import {spawnSync} from "node:child_process";
import {performance} from "node:perf_hooks";

import {commanderEntrypointSourcePaths, scriptEntrypointDefinitions} from "./script-entrypoint-definitions.ts";
import {readProductionScriptSourceFiles} from "./script-source-files.ts";
import {buildScriptSourceGraph, collectReachableScriptSourcePaths} from "./script-source-graph.ts";
import {approvedScriptsArchitectureBaseline} from "./scripts-architecture-baseline.ts";
import {calculateMaintainedSourceLineReport, countMaintainedSourceLineRecords} from "./maintained-source-lines.ts";
import {measureInvocationMedianMilliseconds} from "./script-startup-benchmark.ts";

const repositoryRoot = process.cwd();
const sampleCount = 3;
const sourceTexts = readProductionScriptSourceFiles();
const graph = buildScriptSourceGraph(sourceTexts);
const entrypointModels = new Map<string, {readonly architectureModel: string; readonly removalCohort: number | null}>(
  scriptEntrypointDefinitions.map((definition) => [
    definition.sourcePath,
    {
      architectureModel: definition.architectureModel,
      removalCohort: "removalCohort" in definition ? definition.removalCohort : null,
    },
  ]),
);

function requireSourceText(sourcePath: string): string {
  const sourceText = sourceTexts.get(sourcePath);
  if (sourceText === undefined) {
    throw new Error(`Missing source text for ${sourcePath}.`);
  }
  return sourceText;
}

function runNode(args: readonly string[]): void {
  const result = spawnSync(process.execPath, [...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {...process.env, FORCE_COLOR: "0"},
  });
  if (result.error !== undefined || result.status !== 0) {
    const detail =
      [result.error?.message, result.stderr, result.stdout].find((value) => value !== undefined && value.trim().length > 0)
      ?? "unknown process failure";
    throw new Error(`Node benchmark invocation failed: ${args.join(" ")}\n${detail}`);
  }
}

const emptyNodeMedianMilliseconds = measureInvocationMedianMilliseconds({
  sampleCount,
  now: () => performance.now(),
  invoke: () => runNode(["--eval", ""]),
});

const commands = Object.fromEntries(
  commanderEntrypointSourcePaths.map((sourcePath) => {
    const countMaintainedLines = (reachable: ReadonlySet<string>): number =>
      [...reachable].reduce((total, reachablePath) => total + countMaintainedSourceLineRecords(requireSourceText(reachablePath)), 0);
    const reachable = collectReachableScriptSourcePaths(graph, [sourcePath], "runtime");
    const eagerReachable = collectReachableScriptSourcePaths(graph, [sourcePath], "eager");
    const helpMedianMilliseconds = measureInvocationMedianMilliseconds({
      sampleCount,
      now: () => performance.now(),
      invoke: () => runNode([sourcePath, "--help"]),
    });

    return [
      sourcePath,
      {
        ...(entrypointModels.get(sourcePath) ?? {architectureModel: null, removalCohort: null}),
        eagerGraphFileCount: eagerReachable.size,
        eagerGraphMaintainedLineCount: countMaintainedLines(eagerReachable),
        runtimeGraphFileCount: reachable.size,
        runtimeGraphMaintainedLineCount: countMaintainedLines(reachable),
        helpMedianMilliseconds,
      },
    ] as const;
  }),
);

process.stdout.write(
  `${JSON.stringify(
    {
      approvedBaseline: approvedScriptsArchitectureBaseline,
      currentMaintainedLines: calculateMaintainedSourceLineReport(repositoryRoot),
      measuredAt: new Date().toISOString(),
      nodeVersion: process.version,
      sampleCount,
      emptyNodeMedianMilliseconds,
      entrypoints: Object.fromEntries(entrypointModels),
      commands,
    },
    null,
    2,
  )}\n`,
);
