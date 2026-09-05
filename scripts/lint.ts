/**
 * @fileoverview Monorepo lint CLI that dispatches per-target tool pipelines in parallel.
 * @module scripts/lint
 *
 * @remarks
 * This module is the script entrypoint for `npm run lint`.
 *
 * It offloads actual lint execution to Piscina workers to keep the main thread
 * responsive and to reduce wall-clock time when linting multiple targets.
 */

import path from "node:path";
import process from "node:process";
import {format as formatText, styleText} from "node:util";
import Piscina from "piscina";
import {createProgressTracker, formatBytes, logWorkerComplete, logWorkerSpawn, printWorkerTimeline} from "./common/index.ts";
import {ComposedTerminalPresenter} from "./core/presentation/composed-terminal-presenter.ts";
import type {TerminalPresenter} from "./core/presentation/terminal-presenter.ts";
import {NodeTerminalPresenterSink, nodeTerminalPresenterRuntimeHost} from "./adapters/node/node-terminal-sink.ts";
import type {ESLintFileStats, LintWorkerInput, LintWorkerResult} from "./types/lint.ts";

type LintTarget = "all" | "packages" | "website" | "cv" | "status" | "api" | "exp";

/**
 * Maps lint targets to their ESLint config names.
 *
 * @remarks
 * The config names are used by the worker to select the correct configuration
 * and scope for the lint run.
 */
const configNameMap: Record<Exclude<LintTarget, "all">, string> = {
  packages: "[@arolariu/packages]",
  website: "[@arolariu/website]",
  cv: "[@arolariu/cv]",
  status: "[@arolariu/status]",
  api: "[dotnet]",
  exp: "[ruff]",
};

/**
 * All lint targets, in the order they're dispatched and printed.
 *
 * @remarks
 * `lint all` runs every target in parallel via Piscina. The pool's wall time is
 * bounded by the slowest target — currently `api`, which runs
 * `dotnet format --verify-no-changes` followed by `dotnet build` (~60-120s
 * on a cold .NET cache). This is a deliberate "do everything" target;
 * if a faster default is needed in the future, split this into a JS-only
 * `allTargets` and an `allTargetsFull` that adds api/exp.
 *
 * Ordering is preserved when printing results to keep output stable across runs.
 */
const allTargets: Exclude<LintTarget, "all">[] = ["packages", "website", "cv", "status", "api", "exp"];

/**
 * For non-ESLint targets, the worker doesn't report a file count.
 * Render the analysis scope instead so the badge is informative.
 *
 * @param configName - The worker's config name (e.g. "[dotnet]", "[ruff]")
 * @returns A human-readable scope label for the target.
 */
function scopeForTarget(configName: string): string {
  switch (configName) {
    case "[dotnet]":
      return "arolariu.slnx";
    case "[ruff]":
      return "sites/exp.arolariu.ro";
    default:
      return "(unknown)"; // shouldn't hit — ESLint configs always have fileCount > 0 after a real lint
  }
}

/**
 * Prints the result from an ESLint worker with formatted output.
 *
 * @remarks
 * This is a presentation helper. The worker may return either:
 * - `error`: an unexpected worker-level failure, or
 * - counts and textual output for standard ESLint results.
 *
 * @param result - The ESLint worker result.
 * @param logger - Logger used for presentation output.
 * @returns Nothing.
 */
function printWorkerResult(result: LintWorkerResult, logger: TerminalPresenter): void {
  const workerInfo = styleText("gray", `[Worker #${result.workerId}]`);
  const timingInfo = styleText("gray", `[init: ${result.initTimeMs}ms, work: ${result.workTimeMs}ms, total: ${result.durationMs}ms]`);
  // For ESLint targets, fileCount reflects the real number of files linted.
  // For api/exp the underlying tool (dotnet build, ruff check) doesn't report a
  // count back to the worker, so fileCount stays 0 — show the scope instead.
  const fileInfo =
    result.fileCount > 0
      ? styleText("gray", `[${result.fileCount} files]`)
      : styleText("gray", `[scope: ${scopeForTarget(result.configName)}]`);
  const memInfo = styleText("gray", `[${formatBytes(result.peakMemoryBytes)}]`);
  logger.line(styleText("cyan", `\n🔍 Lint target: ${styleText("bold", result.configName)} ${workerInfo}`));
  logger.line(styleText("gray", `   ${timingInfo} ${fileInfo} ${memInfo}`));

  if (result.skipped) {
    logger.line(styleText("gray", `  ⊘ ${result.configName} skipped: ${result.skipReason}`));
    return;
  }

  if (result.error) {
    logger.line(styleText("red", `  ✗ Worker error: ${result.error}`));
    return;
  }

  if (result.resultText) {
    logger.line(result.resultText);
  }

  // When a 2-step target fails on a non-ESLint step (svelte-check, dotnet format, dotnet build),
  // ESLint never runs — but neither do other downstream steps. Use the worker's `skippedStep`
  // (the actual next step in the target's pipeline) so api gets "dotnet build skipped", not
  // "ESLint skipped".
  if (result.failedStep && result.failedStep !== "eslint") {
    const skippedSuffix = result.skippedStep ? ` — ${result.skippedStep} skipped` : "";
    logger.line(styleText("red", `  ✗ ${result.failedStep} failed${skippedSuffix}`));
  } else if (result.errorCount > 0) {
    logger.line(styleText("red", `  ✗ ESLint found ${result.errorCount} error(s) and ${result.warningCount} warning(s)`));
  } else if (result.warningCount > 0) {
    logger.line(styleText("yellow", `  ⚠ ESLint found ${result.warningCount} warning(s)`));
  } else {
    logger.line(styleText("green", `  ✓ No linting issues found for ${result.configName}`));
  }
}

/**
 * Prints the slowest files report across all workers.
 *
 * @param results - All worker results containing slowest files data.
 * @param logger - Logger used for presentation output.
 */
function printSlowestFilesReport(results: readonly LintWorkerResult[], logger: TerminalPresenter): void {
  // Collect all file stats from all workers
  const allFileStats: ESLintFileStats[] = [];
  for (const result of results) {
    if (result.slowestFiles) {
      allFileStats.push(...result.slowestFiles);
    }
  }

  // Sort by lint time and take top 5
  const topSlowest = allFileStats.sort((a, b) => b.lintTimeMs - a.lintTimeMs).slice(0, 5);

  if (topSlowest.length === 0 || topSlowest.every((f) => f.lintTimeMs === 0)) {
    return; // No timing data available
  }

  logger.line(styleText("bold", "\n  🐢 Slowest Files to Lint:"));
  for (const [index, file] of topSlowest.entries()) {
    const relativePath = path.relative(process.cwd(), file.filePath);
    const timeStr = file.lintTimeMs > 0 ? styleText("yellow", `${file.lintTimeMs.toFixed(0)}ms`) : styleText("gray", "cached");
    logger.line(styleText("gray", `     ${index + 1}. `) + styleText("dim", relativePath) + ` ${timeStr}`);
  }
}

/**
 * Prints memory usage summary across all workers.
 *
 * @param results - All worker results containing memory data.
 * @param logger - Logger used for presentation output.
 */
function printMemorySummary(results: readonly LintWorkerResult[], logger: TerminalPresenter): void {
  const totalMemory = results.reduce((sum, r) => sum + r.peakMemoryBytes, 0);
  const maxMemory = Math.max(...results.map((r) => r.peakMemoryBytes));
  const totalFiles = results.reduce((sum, r) => sum + r.fileCount, 0);

  logger.line(styleText("bold", "\n  📊 Resource Usage:"));
  logger.line(styleText("gray", `     Total files linted: `) + styleText("cyan", `${totalFiles}`));
  logger.line(styleText("gray", `     Peak memory (max worker): `) + styleText("cyan", formatBytes(maxMemory)));
  logger.line(styleText("gray", `     Combined memory (all workers): `) + styleText("cyan", formatBytes(totalMemory)));
}

/**
 * Runs ESLint for the specified target using Piscina worker threads.
 *
 * @remarks
 * When `lintTarget` is `all`, this dispatches one worker per target and
 * aggregates counts to compute a conventional process exit code.
 * Uses Promise.allSettled for graceful degradation - if one worker fails,
 * others continue and results are collected.
 *
 * @param lintTarget - The target to lint.
 * @param filePatterns - Optional glob patterns for selective targeting.
 * @param logger - Logger used for lint lifecycle output.
 * @returns Exit code (0 for success, 1 for any error).
 */
async function startESLint(
  lintTarget: LintTarget,
  filePatterns: readonly string[] | undefined,
  logger: TerminalPresenter,
): Promise<number> {
  const hasSelectiveTargeting = filePatterns !== undefined && filePatterns.length > 0;
  const targetDisplay = hasSelectiveTargeting ? `${lintTarget} (${filePatterns.length} patterns)` : lintTarget;
  logger.line(styleText(["bold", "magenta"], `\n🔎 Running lint for: ${targetDisplay}`));

  if (hasSelectiveTargeting) {
    logger.line(styleText("gray", "   Patterns: " + filePatterns.join(", ")));
  }

  // Create Piscina worker pool
  const piscina = new Piscina({
    filename: new URL("./workers/lint.worker.ts", import.meta.url).href,
    minThreads: 1,
    maxThreads: 3,
    idleTimeout: 500,
  });

  try {
    if (lintTarget === "all") {
      logger.line(styleText("yellow", "⏱️  Running lint on all targets in parallel..."));
      logger.line(styleText(["bold", "cyan"], "\n  🧵 Dispatching parallel workers..."));
      logger.line(styleText("gray", `     Main process PID: ${process.pid}`));
      logger.line(styleText("gray", `     Worker pool: min=${piscina.options.minThreads}, max=${piscina.options.maxThreads}`));
      logger.line();

      const progress = createProgressTracker(allTargets.length, logger.child("progress"));
      const dispatchTime = Date.now();
      const results: (LintWorkerResult | null)[] = new Array(allTargets.length).fill(null);
      const completionEvents: Array<{index: number; target: string; durationMs: number; status: "success" | "error"}> = [];
      let failedWorkers = 0;

      // Log all spawn events first
      for (const [index, target] of allTargets.entries()) {
        logWorkerSpawn(index + 1, target, logger.child("workers"), new Date());
      }
      logger.line();

      // Start the progress bar
      progress.start();

      // Dispatch all targets in parallel
      const promises = allTargets.map((target, index) => {
        const configName = configNameMap[target];
        const input: LintWorkerInput = {
          target,
          configName,
          taskIndex: index,
          dispatchedAt: dispatchTime,
          ...(hasSelectiveTargeting ? {filePatterns} : {}),
        };

        return piscina.run(input) as Promise<LintWorkerResult>;
      });

      // Use Promise.allSettled for graceful degradation
      const settledResults = await Promise.allSettled(promises);

      // Process results
      for (const [index, settled] of settledResults.entries()) {
        const target = allTargets[index]!;

        if (settled.status === "fulfilled") {
          const result = settled.value;
          results[index] = result;
          completionEvents.push({
            index: index + 1,
            target,
            durationMs: result.durationMs,
            status: result.error ? "error" : "success",
          });
        } else {
          // Worker crashed - create error result
          failedWorkers++;
          const errorResult: LintWorkerResult = {
            configName: configNameMap[target],
            errorCount: 1,
            warningCount: 0,
            resultText: "",
            error: `Worker crashed: ${settled.reason}`,
            workerId: -1,
            durationMs: 0,
            workTimeMs: 0,
            initTimeMs: 0,
            fileCount: 0,
            peakMemoryBytes: 0,
            slowestFiles: [],
          };
          results[index] = errorResult;
          completionEvents.push({
            index: index + 1,
            target,
            durationMs: 0,
            status: "error",
          });
        }
        progress.increment();
      }

      progress.finish();

      // Log completion events in order they finished
      logger.line();
      for (const event of completionEvents) {
        logWorkerComplete(event.index, event.target, event.durationMs, event.status, logger.child("workers"), new Date());
      }

      // Show graceful degradation notice if any workers failed
      if (failedWorkers > 0) {
        logger.line(styleText("yellow", `\n  ⚠️  ${failedWorkers} worker(s) crashed but others continued (graceful degradation)`));
      }

      // Print timeline visualization (only for successful workers)
      const timelineEntries = allTargets
        .map((target, index) => ({
          target,
          durationMs: results[index]?.durationMs ?? 0,
        }))
        .filter((e) => e.durationMs > 0);

      if (timelineEntries.length > 0) {
        printWorkerTimeline(timelineEntries, logger.child("timeline"));
      }

      // Print results in `allTargets` order so output is stable across runs.
      let totalErrors = 0;
      let totalWarnings = 0;
      const validResults: LintWorkerResult[] = [];

      for (const result of results) {
        if (!result) continue;
        validResults.push(result);

        logger.line(styleText("gray", "\n─────────────────────────────────────────────────"));
        printWorkerResult(result, logger.child(result.configName));
        logger.line(styleText("gray", "─────────────────────────────────────────────────"));

        if (result.skipped) {
          // Skipped targets don't affect the error/warning totals.
        } else if (result.error) {
          totalErrors++;
        } else {
          totalErrors += result.errorCount;
          totalWarnings += result.warningCount;
        }
      }

      // Print enhanced summary
      printMemorySummary(validResults, logger.child("memory"));
      printSlowestFilesReport(validResults, logger.child("slowest"));

      logger.line(styleText(["bold", "cyan"], `\n📊 Summary: ${totalErrors} error(s), ${totalWarnings} warning(s)`));
      return totalErrors > 0 ? 1 : 0;
    } else {
      // Single target - still use worker for consistency
      const configName = configNameMap[lintTarget];
      const input: LintWorkerInput = {
        target: lintTarget,
        configName,
        taskIndex: 0,
        dispatchedAt: Date.now(),
        ...(hasSelectiveTargeting ? {filePatterns} : {}),
      };

      try {
        const result = (await piscina.run(input)) as LintWorkerResult;
        printWorkerResult(result, logger.child(result.configName));

        // Print slowest files for single target too
        if (result.slowestFiles && result.slowestFiles.length > 0) {
          printSlowestFilesReport([result], logger.child("slowest"));
        }

        if (result.skipped) {
          return 0; // Skipped targets don't fail the pipeline.
        }
        if (result.error) {
          return 1;
        }
        return result.errorCount > 0 ? 1 : 0;
      } catch (error) {
        logger.line(styleText("red", `  ✗ Worker crashed: ${error}`));
        return 1;
      }
    }
  } finally {
    // Always close the pool
    await piscina.close();
  }
}

/**
 * Runs the lint CLI.
 *
 * @remarks
 * This is the script entrypoint used by Nx/package scripts.
 * Supports selective targeting via additional glob pattern arguments.
 *
 * @param arg - Target name (`all`, `packages`, `website`, `cv`).
 * @param filePatterns - Optional glob patterns for selective targeting.
 * @param logger - Optional logger used for all lint output.
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string, filePatterns?: readonly string[], logger?: TerminalPresenter): Promise<number> {
  const output =
    logger ?? new ComposedTerminalPresenter("lint", {sink: new NodeTerminalPresenterSink(), runtimeHost: nodeTerminalPresenterRuntimeHost});
  output.line(styleText(["bold", "magenta"], "\n╔════════════════════════════════════════╗"));
  output.line(styleText(["bold", "magenta"], "║    arolariu.ro Code Linter Tool        ║"));
  output.line(styleText(["bold", "magenta"], "╚════════════════════════════════════════╝\n"));

  if (!arg) {
    output.line(styleText("red", "✗ Missing target argument"), "stderr");
    output.line(styleText("gray", "\n💡 Usage: lint <all|packages|website|cv|status|api|exp> [glob patterns...]"));
    output.line(styleText("gray", "   - all:      Lint all targets"));
    output.line(styleText("gray", "   - packages: Lint component packages"));
    output.line(styleText("gray", "   - website:  Lint main website"));
    output.line(styleText("gray", "   - cv:       Lint CV site (svelte-check + ESLint)"));
    output.line(styleText("gray", "   - status:   Lint status site (svelte-check + ESLint)"));
    output.line(styleText("gray", "   - api:      Lint .NET API (dotnet format + dotnet build)"));
    output.line(styleText("gray", "   - exp:      Lint Python service (ruff check)"));
    output.line(styleText("gray", "\n📁 Selective targeting:"));
    output.line(styleText("gray", '   lint website "src/**/*.tsx"       Lint only TSX files'));
    output.line(styleText("gray", '   lint all "**/*.test.ts"           Lint only test files\n'));
    output.line(styleText("gray", "\n💡 Valid targets: all, packages, website, cv, status, api, exp\n"));
    return 1;
  }

  try {
    let exitCode = 0;

    switch (arg) {
      case "all":
        exitCode = await startESLint("all", filePatterns, output.child("all"));
        break;
      case "packages":
        exitCode = await startESLint("packages", filePatterns, output.child("packages"));
        break;
      case "website":
        exitCode = await startESLint("website", filePatterns, output.child("website"));
        break;
      case "cv":
        exitCode = await startESLint("cv", filePatterns, output.child("cv"));
        break;
      case "status":
        exitCode = await startESLint("status", filePatterns, output.child("status"));
        break;
      case "api":
        exitCode = await startESLint("api", filePatterns, output.child("api"));
        break;
      case "exp":
        exitCode = await startESLint("exp", filePatterns, output.child("exp"));
        break;
      default:
        output.line(styleText("red", `✗ Invalid target: "${arg}"`), "stderr");
        output.line(styleText("gray", "\n💡 Valid targets: all, packages, website, cv, status, api, exp\n"));
        return 1;
    }

    if (exitCode === 0) {
      output.line(styleText(["bold", "green"], "\n✅ Linting completed successfully!\n"));
    } else {
      output.line(styleText(["bold", "red"], "\n❌ Linting completed with errors\n"));
    }

    return exitCode;
  } catch (error) {
    output.line(formatText(styleText(["bold", "red"], "\n❌ Linting failed with errors:"), error), "stderr");
    return 1;
  }
}

if (import.meta.main) {
  const output = new ComposedTerminalPresenter("lint", {
    sink: new NodeTerminalPresenterSink(),
    runtimeHost: nodeTerminalPresenterRuntimeHost,
  });
  const arg = process.argv[2];
  // Collect additional arguments as file patterns for selective targeting
  const filePatterns = process.argv.slice(3).filter((p) => p.length > 0);
  main(arg, filePatterns.length > 0 ? filePatterns : undefined, output)
    .then((code) => process.exit(code))
    .catch((err) => {
      output.line(err instanceof Error ? (err.stack ?? err.message) : String(err), "stderr");
      process.exit(1);
    });
}
