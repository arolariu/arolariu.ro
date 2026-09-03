/**
 * @fileoverview Machine-readable startup and import-graph baseline reporter for `scripts/**`.
 * @module scripts/testing/architecture/report-script-architecture
 *
 * @remarks
 * This entrypoint is one of the narrow, named exceptions to the repository direct-output policy:
 * it emits raw JSON on `process.stdout` for CI and local consumption instead of routing through
 * `MonorepositoryConsoleLogger`, and it is excluded from production script source discovery.
 * It reports the static runtime source-graph size and a three-sample `--help` median for every
 * Commander entrypoint; the timings are informational, while the AST import-boundary tests remain
 * the structural enforcement mechanism. Run it with `npm run analyze:scripts:architecture`.
 */

import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {performance} from "node:perf_hooks";

import {commanderEntrypointSourcePaths} from "./script-entrypoint-definitions.ts";
import {discoverProductionScriptFiles} from "./script-source-files.ts";
import {buildScriptSourceGraph, collectReachableScriptSourcePaths} from "./script-source-graph.ts";
import {approvedScriptsArchitectureBaseline} from "./scripts-architecture-baseline.ts";
import {calculateMaintainedSourceLineReport, countMaintainedSourceLineRecords} from "./maintained-source-lines.ts";
import {measureInvocationMedianMilliseconds} from "./script-startup-benchmark.ts";

const repositoryRoot = process.cwd();
const sampleCount = 3;
const sourceTexts = new Map(discoverProductionScriptFiles().map((sourcePath) => [sourcePath, readFileSync(sourcePath, "utf8")] as const));
const graph = buildScriptSourceGraph(sourceTexts);

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
    const reachable = collectReachableScriptSourcePaths(graph, [sourcePath], "runtime");
    const runtimeGraphMaintainedLineCount = [...reachable].reduce(
      (total, reachablePath) => total + countMaintainedSourceLineRecords(requireSourceText(reachablePath)),
      0,
    );
    const helpMedianMilliseconds = measureInvocationMedianMilliseconds({
      sampleCount,
      now: () => performance.now(),
      invoke: () => runNode([sourcePath, "--help"]),
    });

    return [
      sourcePath,
      {
        runtimeGraphFileCount: reachable.size,
        runtimeGraphMaintainedLineCount,
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
      commands,
    },
    null,
    2,
  )}\n`,
);
