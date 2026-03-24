/**
 * @fileoverview Monorepo ESLint CLI that runs per-target configs in parallel.
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
import {styleText} from "node:util";
import Piscina from "piscina";
import {
  createProgressTracker,
  formatBytes,
  logWorkerComplete,
  logWorkerSpawn,
  printWorkerTimeline,
} from "./common/index.ts";
import type {ESLintFileStats, ESLintWorkerInput, ESLintWorkerResult} from "./types/lint.ts";

type LintTarget = "all" | "packages" | "website" | "cv";

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
};

/**
 * All lint targets in consistent order for parallel execution.
 *
 * @remarks
 * Ordering is preserved when printing results to keep output stable across runs.
 */
const allTargets: Exclude<LintTarget, "all">[] = ["packages", "website", "cv"];

/**
 * Prints the result from an ESLint worker with formatted output.
 *
 * @remarks
 * This is a presentation helper. The worker may return either:
 * - `error`: an unexpected worker-level failure, or
 * - counts and textual output for standard ESLint results.
 *
 * @param result - The ESLint worker result.
 * @returns Nothing.
 */
function printWorkerResult(result: ESLintWorkerResult): void {
  const workerInfo = styleText("gray", `[Worker #${result.workerId}]`);
  const timingInfo = styleText("gray", `[init: ${result.initTimeMs}ms, work: ${result.workTimeMs}ms, total: ${result.durationMs}ms]`);
  const fileInfo = styleText("gray", `[${result.fileCount} files]`);
  const memInfo = styleText("gray", `[${formatBytes(result.peakMemoryBytes)}]`);
  console.log(
    styleText("cyan", `\n🔍 ESLint config: ${styleText("bold", result.configName)} ${workerInfo}`),
  );
  console.log(styleText("gray", `   ${timingInfo} ${fileInfo} ${memInfo}`));

  if (result.error) {
    console.log(styleText("red", `  ✗ Worker error: ${result.error}`));
    return;
  }

  if (result.resultText) {
    console.log(result.resultText);
  }

  if (result.errorCount > 0 || result.warningCount > 0) {
    if (result.errorCount > 0) {
      console.log(styleText("red", `  ✗ ESLint found ${result.errorCount} error(s) and ${result.warningCount} warning(s)`));
    } else {
      console.log(styleText("yellow", `  ⚠ ESLint found ${result.warningCount} warning(s)`));
    }
  } else {
    console.log(styleText("green", `  ✓ No linting issues found for ${result.configName}`));
  }
}

/**
 * Prints the slowest files report across all workers.
 *
 * @param results - All worker results containing slowest files data.
 */
function printSlowestFilesReport(results: ESLintWorkerResult[]): void {
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

  console.log(styleText("bold", "\n  🐢 Slowest Files to Lint:"));
  for (const [index, file] of topSlowest.entries()) {
    const relativePath = path.relative(process.cwd(), file.filePath);
    const timeStr = file.lintTimeMs > 0 ? styleText("yellow", `${file.lintTimeMs.toFixed(0)}ms`) : styleText("gray", "cached");
    console.log(styleText("gray", `     ${index + 1}. `) + styleText("dim", relativePath) + ` ${timeStr}`);
  }
}

/**
 * Prints memory usage summary across all workers.
 *
 * @param results - All worker results containing memory data.
 */
function printMemorySummary(results: ESLintWorkerResult[]): void {
  const totalMemory = results.reduce((sum, r) => sum + r.peakMemoryBytes, 0);
  const maxMemory = Math.max(...results.map((r) => r.peakMemoryBytes));
  const totalFiles = results.reduce((sum, r) => sum + r.fileCount, 0);

  console.log(styleText("bold", "\n  📊 Resource Usage:"));
  console.log(styleText("gray", `     Total files linted: `) + styleText("cyan", `${totalFiles}`));
  console.log(styleText("gray", `     Peak memory (max worker): `) + styleText("cyan", formatBytes(maxMemory)));
  console.log(styleText("gray", `     Combined memory (all workers): `) + styleText("cyan", formatBytes(totalMemory)));
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
 * @returns Exit code (0 for success, 1 for any error).
 */
async function startESLint(lintTarget: LintTarget, filePatterns?: string[]): Promise<number> {
  const hasSelectiveTargeting = filePatterns && filePatterns.length > 0;
  const targetDisplay = hasSelectiveTargeting ? `${lintTarget} (${filePatterns.length} patterns)` : lintTarget;
  console.log(styleText(["bold", "magenta"], `\n🔎 Running ESLint for: ${targetDisplay}`));

  if (hasSelectiveTargeting) {
    console.log(styleText("gray", "   Patterns: " + filePatterns.join(", ")));
  }

  // Create Piscina worker pool
  const piscina = new Piscina({
    filename: new URL("./workers/eslint.worker.ts", import.meta.url).href,
    minThreads: 1,
    maxThreads: 3,
    idleTimeout: 500,
  });

  try {
    if (lintTarget === "all") {
      console.log(styleText("yellow", "⏱️  Running lint on all targets in parallel..."));
      console.log(styleText(["bold", "cyan"], "\n  🧵 Dispatching parallel workers..."));
      console.log(styleText("gray", `     Main process PID: ${process.pid}`));
      console.log(styleText("gray", `     Worker pool: min=${piscina.options.minThreads}, max=${piscina.options.maxThreads}`));
      console.log();

      const progress = createProgressTracker(allTargets.length);
      const dispatchTime = Date.now();
      const results: (ESLintWorkerResult | null)[] = new Array(allTargets.length).fill(null);
      const completionEvents: Array<{index: number; target: string; durationMs: number; status: "success" | "error"}> =
        [];
      let failedWorkers = 0;

      // Log all spawn events first
      for (const [index, target] of allTargets.entries()) {
        logWorkerSpawn(index + 1, target);
      }
      console.log();

      // Start the progress bar
      progress.start();

      // Dispatch all targets in parallel
      const promises = allTargets.map((target, index) => {
        const configName = configNameMap[target];
        const input: ESLintWorkerInput = {
          configName,
          taskIndex: index,
          dispatchedAt: dispatchTime,
          filePatterns: hasSelectiveTargeting ? filePatterns : undefined,
        };

        return piscina.run(input) as Promise<ESLintWorkerResult>;
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
          const errorResult: ESLintWorkerResult = {
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
      console.log();
      for (const event of completionEvents) {
        logWorkerComplete(event.index, event.target, event.durationMs, event.status);
      }

      // Show graceful degradation notice if any workers failed
      if (failedWorkers > 0) {
        console.log(
          styleText("yellow", `\n  ⚠️  ${failedWorkers} worker(s) crashed but others continued (graceful degradation)`),
        );
      }

      // Print timeline visualization (only for successful workers)
      const timelineEntries = allTargets
        .map((target, index) => ({
          target,
          durationMs: results[index]?.durationMs ?? 0,
        }))
        .filter((e) => e.durationMs > 0);

      if (timelineEntries.length > 0) {
        printWorkerTimeline(timelineEntries);
      }

      // Print results in consistent order (packages → website → cv)
      let totalErrors = 0;
      let totalWarnings = 0;
      const validResults: ESLintWorkerResult[] = [];

      for (const result of results) {
        if (!result) continue;
        validResults.push(result);

        console.log(styleText("gray", "\n─────────────────────────────────────────────────"));
        printWorkerResult(result);
        console.log(styleText("gray", "─────────────────────────────────────────────────"));

        if (result.error) {
          totalErrors++;
        } else {
          totalErrors += result.errorCount;
          totalWarnings += result.warningCount;
        }
      }

      // Print enhanced summary
      printMemorySummary(validResults);
      printSlowestFilesReport(validResults);

      console.log(styleText(["bold", "cyan"], `\n📊 Summary: ${totalErrors} error(s), ${totalWarnings} warning(s)`));
      return totalErrors > 0 ? 1 : 0;
    } else {
      // Single target - still use worker for consistency
      const configName = configNameMap[lintTarget];
      const input: ESLintWorkerInput = {
        configName,
        taskIndex: 0,
        dispatchedAt: Date.now(),
        filePatterns: hasSelectiveTargeting ? filePatterns : undefined,
      };

      try {
        const result = (await piscina.run(input)) as ESLintWorkerResult;
        printWorkerResult(result);

        // Print slowest files for single target too
        if (result.slowestFiles && result.slowestFiles.length > 0) {
          printSlowestFilesReport([result]);
        }

        if (result.error) {
          return 1;
        }
        return result.errorCount > 0 ? 1 : 0;
      } catch (error) {
        console.log(styleText("red", `  ✗ Worker crashed: ${error}`));
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
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string, filePatterns?: string[]): Promise<number> {
  console.log(styleText(["bold", "magenta"], "\n╔════════════════════════════════════════╗"));
  console.log(styleText(["bold", "magenta"], "║    arolariu.ro Code Linter Tool        ║"));
  console.log(styleText(["bold", "magenta"], "╚════════════════════════════════════════╝\n"));

  if (!arg) {
    console.error(styleText("red", "✗ Missing target argument"));
    console.log(styleText("gray", "\n💡 Usage: lint <all|packages|website|cv> [glob patterns...]"));
    console.log(styleText("gray", "   - all:      Lint all targets"));
    console.log(styleText("gray", "   - packages: Lint component packages"));
    console.log(styleText("gray", "   - website:  Lint main website"));
    console.log(styleText("gray", "   - cv:       Lint CV site"));
    console.log(styleText("gray", "\n📁 Selective targeting:"));
    console.log(styleText("gray", '   lint website "src/**/*.tsx"       Lint only TSX files'));
    console.log(styleText("gray", '   lint all "**/*.test.ts"           Lint only test files\n'));
    return 1;
  }

  try {
    let exitCode = 0;

    switch (arg) {
      case "all":
        exitCode = await startESLint("all", filePatterns);
        break;
      case "packages":
        exitCode = await startESLint("packages", filePatterns);
        break;
      case "website":
        exitCode = await startESLint("website", filePatterns);
        break;
      case "cv":
        exitCode = await startESLint("cv", filePatterns);
        break;
      default:
        console.error(styleText("red", `✗ Invalid target: "${arg}"`));
        console.log(styleText("gray", "\n💡 Valid targets: all, packages, website, cv\n"));
        return 1;
    }

    if (exitCode === 0) {
      console.log(styleText(["bold", "green"], "\n✅ Linting completed successfully!\n"));
    } else {
      console.log(styleText(["bold", "red"], "\n❌ Linting completed with errors\n"));
    }

    return exitCode;
  } catch (error) {
    console.error(styleText(["bold", "red"], "\n❌ Linting failed with errors:"), error);
    return 1;
  }
}

if (import.meta.main) {
  const arg = process.argv[2];
  // Collect additional arguments as file patterns for selective targeting
  const filePatterns = process.argv.slice(3).filter((p) => p.length > 0);
  main(arg, filePatterns.length > 0 ? filePatterns : undefined)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
