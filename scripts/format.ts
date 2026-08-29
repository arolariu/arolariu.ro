/**
 * @fileoverview Monorepo formatting CLI with parallel worker execution.
 * @module scripts/format
 *
 * @remarks
 * This module is the interactive entrypoint for `npm run format`.
 *
 * It dispatches format jobs for multiple targets (packages/website/cv/api)
 * via Piscina workers, then renders human-friendly summaries.
 */

import process from "node:process";
import {fileURLToPath} from "node:url";
import {styleText} from "node:util";
import Piscina from "piscina";
import {createProgressTracker, formatBytes, formatTimestamp, logWorkerComplete, printWorkerTimeline} from "./common/index.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import type {FormatTarget, FormatWorkerInput, FormatWorkerResult} from "./types/format.ts";

/** All available format targets in consistent order */
const allTargets: FormatTarget[] = ["packages", "website", "cv", "api", "status", "exp"];

/** Target display configuration with icons and colors */
const targetConfig: Record<FormatTarget, {icon: string; color: (s: string) => string; description: string}> = {
  packages: {icon: "📦", color: (s: string) => styleText("cyan", s), description: "Component Library"},
  website: {icon: "🌐", color: (s: string) => styleText("blue", s), description: "Next.js Website"},
  cv: {icon: "📄", color: (s: string) => styleText("magenta", s), description: "SvelteKit CV"},
  api: {icon: "⚙️", color: (s: string) => styleText("yellow", s), description: ".NET Backend"},
  status: {icon: "📊", color: (s: string) => styleText("green", s), description: "SvelteKit Status Page"},
  exp: {icon: "🐍", color: (s: string) => styleText("magentaBright", s), description: "FastAPI Experimental (Python)"},
};

/** Box drawing characters for fancy borders */
const box = {
  topLeft: "╭",
  topRight: "╮",
  bottomLeft: "╰",
  bottomRight: "╯",
  horizontal: "─",
  vertical: "│",
  teeRight: "├",
  teeLeft: "┤",
};

/**
 * Creates a horizontal line for CLI box rendering.
 *
 * @remarks
 * This is a presentation helper. Width is intended to be measured in
 * *visible* monospace characters (not counting ANSI color sequences).
 *
 * @param width - Total width of the line in visible characters.
 * @param label - Optional centered label.
 * @returns The rendered line with ANSI coloring applied.
 */
function createLine(width: number, label?: string): string {
  if (!label) {
    return styleText("gray", box.horizontal.repeat(width));
  }
  const labelWithPadding = ` ${label} `;
  const remaining = width - labelWithPadding.length;
  const leftPad = Math.floor(remaining / 2);
  const rightPad = remaining - leftPad;
  return (
    styleText("gray", box.horizontal.repeat(leftPad))
    + styleText(["bold", "white"], labelWithPadding)
    + styleText("gray", box.horizontal.repeat(rightPad))
  );
}

/**
 * Creates a progress bar visualization for CLI output.
 *
 * @param completed - Number of completed items.
 * @param total - Total number of items.
 * @param width - Width of the progress bar in visible characters.
 * @returns A progress bar string with color and percentage.
 */
function createProgressBar(completed: number, total: number, width: number = 20): string {
  const percentage = Math.round((completed / total) * 100);
  const filledWidth = Math.round((completed / total) * width);
  const emptyWidth = width - filledWidth;

  const filled = styleText("green", "█".repeat(filledWidth));
  const empty = styleText("gray", "░".repeat(emptyWidth));
  const percentageText = styleText(["bold", "white"], String(percentage) + "%");

  return `${filled}${empty} ${percentageText}`;
}

/**
 * Creates a status badge for a worker result.
 *
 * @param result - The format worker result.
 * @returns A colored badge (CLEAN/FORMATTED/FAILED/SKIPPED).
 */
function createStatusBadge(result: FormatWorkerResult): string {
  if (result.skipped) {
    return styleText(["bgGray", "white"], " SKIPPED ");
  }
  if (result.exitCode !== 0) {
    return styleText(["bgRed", "white"], " FAILED ");
  }
  if (result.formatted) {
    return styleText(["bgYellow", "black"], " FORMATTED ");
  }
  return styleText(["bgGreen", "black"], " CLEAN ");
}

/**
 * Formats a duration with an appropriate unit and color.
 *
 * @param ms - Duration in milliseconds.
 * @returns A human-friendly duration string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return styleText("green", `${ms}ms`);
  }
  if (ms < 5000) {
    return styleText("yellow", `${(ms / 1000).toFixed(1)}s`);
  }
  return styleText("red", `${(ms / 1000).toFixed(1)}s`);
}

/**
 * Prints a format worker result as a styled CLI card.
 *
 * @remarks
 * This function is intentionally presentation-only and should not influence
 * formatting outcomes. It truncates verbose tool output to keep logs readable.
 *
 * @param result - The format worker result to print.
 * @param index - Optional index used for stable visual ordering.
 * @param logger - Logger used for presentation output.
 * @returns Nothing.
 */
function printWorkerResult(result: FormatWorkerResult, index: number | undefined, logger: MonorepositoryLogger): void {
  const config = targetConfig[result.target];
  const cardWidth = 58;
  const innerWidth = cardWidth - 2; // Account for border characters

  // Card header
  logger.line();
  logger.line(styleText("gray", `  ${box.topLeft}${box.horizontal.repeat(cardWidth)}${box.topRight}`));

  // Title row: [icon TARGET Description] [BADGE]
  const indexBadge = index === undefined ? "" : `#${index + 1} `;
  const coloredTitle = index === undefined ? "" : styleText("gray", `#${index + 1} `);
  const fullTitle = `${coloredTitle}${config.icon} ${config.color(styleText("bold", result.target.toUpperCase()))} ${styleText("dim", config.description)}`;
  const badge = createStatusBadge(result);

  // Calculate padding: we need to account for ANSI codes in colored strings
  const titleVisibleLength = indexBadge.length + 2 + result.target.length + 1 + config.description.length + 2; // icon is ~2 chars

  // Badge visible lengths: CLEAN=7, SKIPPED=9, FAILED=8, FORMATTED=11
  let badgeVisibleLength = 7; // CLEAN
  if (result.skipped) {
    badgeVisibleLength = 9; // SKIPPED
  } else if (result.exitCode !== 0) {
    badgeVisibleLength = 8; // FAILED
  } else if (result.formatted) {
    badgeVisibleLength = 11; // FORMATTED
  }

  const paddingNeeded = innerWidth - titleVisibleLength - badgeVisibleLength + 1;
  const padding = " ".repeat(Math.max(0, paddingNeeded));

  logger.line(styleText("gray", `  ${box.vertical} `) + fullTitle + padding + badge + styleText("gray", ` ${box.vertical}`));

  // Separator
  logger.line(styleText("gray", `  ${box.teeRight}${box.horizontal.repeat(cardWidth)}${box.teeLeft}`));

  // Stats row: Worker info and Duration breakdown
  const workerText = `Worker #${result.workerId}`;
  const timingText = `init: ${result.initTimeMs}ms, work: ${result.workTimeMs}ms`;
  const statsLine = ` ${styleText("dim", workerText)}  ${styleText("gray", "│")}  ${styleText("dim", timingText)}`;
  // Visible length calculation for stats
  const statsVisibleLength = 1 + workerText.length + 3 + timingText.length;
  const statsPadding = " ".repeat(Math.max(0, innerWidth - statsVisibleLength));

  logger.line(styleText("gray", `  ${box.vertical}`) + statsLine + statsPadding + styleText("gray", `  ${box.vertical}`));

  // Second stats row: Total duration
  const durationText = `Total: ${formatDuration(result.durationMs)}`;
  const memoryText = `Memory: ${formatBytes(result.peakMemoryBytes)}`;
  const statsLine2 = ` ${durationText}  ${styleText("gray", "│")}  ${styleText("dim", memoryText)}`;
  const statsVisibleLength2 = 1 + 7 + result.durationMs.toString().length + 2 + 3 + 8 + 10;
  const statsPadding2 = " ".repeat(Math.max(0, innerWidth - statsVisibleLength2));

  logger.line(styleText("gray", `  ${box.vertical}`) + statsLine2 + statsPadding2 + styleText("gray", `  ${box.vertical}`));

  // Result text (if any meaningful output)
  if (result.resultText && result.resultText.trim().length > 0) {
    logger.line(styleText("gray", `  ${box.teeRight}${box.horizontal.repeat(cardWidth)}${box.teeLeft}`));
    const lines = result.resultText.trim().split("\n").slice(0, 5); // Limit to 5 lines
    for (const line of lines) {
      const maxLineLength = innerWidth - 4;
      const truncatedLine = line.length > maxLineLength ? line.substring(0, maxLineLength - 3) + "..." : line;
      const linePadding = " ".repeat(Math.max(0, innerWidth - truncatedLine.length - 1));
      logger.line(styleText("gray", `  ${box.vertical} `) + truncatedLine + linePadding + styleText("gray", `  ${box.vertical}`));
    }
    if (result.resultText.trim().split("\n").length > 5) {
      const moreText = "... and more";
      const morePadding = " ".repeat(innerWidth - moreText.length - 1);
      logger.line(
        styleText("gray", `  ${box.vertical} `) + styleText("dim", moreText) + morePadding + styleText("gray", `  ${box.vertical}`),
      );
    }
  }

  // Card footer
  logger.line(styleText("gray", `  ${box.bottomLeft}${box.horizontal.repeat(cardWidth)}${box.bottomRight}`));
}

/**
 * Prints the target overview before processing.
 *
 * @param logger - Logger used for presentation output.
 */
function printTargetOverview(logger: MonorepositoryLogger): void {
  logger.line();
  logger.line(styleText("bold", "  📋 Targets to format:"));
  logger.line();
  for (const target of allTargets) {
    const config = targetConfig[target];
    logger.line(`     ${config.icon}  ${config.color(styleText("bold", target.padEnd(10)))} ${styleText("dim", config.description)}`);
  }
  logger.line();
}

/**
 * Prints a summary section for all worker results.
 *
 * @param results - Array of format worker results.
 * @param logger - Logger used for presentation output.
 * @returns Nothing.
 */
function printSummaryBox(results: FormatWorkerResult[], logger: MonorepositoryLogger): void {
  const alreadyFormatted = results.filter((r) => r.checkPassed).length;
  const formatted = results.filter((r) => r.formatted).length;
  const failed = results.filter((r) => r.exitCode !== 0).length;
  const skipped = results.filter((r) => r.skipped === true).length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  const totalFiles = results.reduce((sum, r) => sum + r.fileCount, 0);
  const totalMemory = results.reduce((sum, r) => sum + r.peakMemoryBytes, 0);
  const maxMemory = Math.max(...results.map((r) => r.peakMemoryBytes));

  const boxWidth = 50;

  logger.line();
  logger.line(createLine(boxWidth + 6, "📊 SUMMARY"));
  logger.line();

  // Progress bar showing success rate
  const successCount = alreadyFormatted + formatted + skipped;
  const progressBar = createProgressBar(successCount, results.length, 25);
  logger.line(`   Success Rate: ${progressBar}`);
  logger.line();

  // Status breakdown with icons
  if (alreadyFormatted > 0) {
    const bar = styleText("green", "█".repeat(alreadyFormatted));
    logger.line(
      `   ${styleText("green", "●")} ${styleText("bold", "Clean:")}     ${bar} ${styleText("green", String(alreadyFormatted))} target(s) already formatted`,
    );
  }
  if (formatted > 0) {
    const bar = styleText("yellow", "█".repeat(formatted));
    logger.line(
      `   ${styleText("yellow", "●")} ${styleText("bold", "Fixed:")}     ${bar} ${styleText("yellow", String(formatted))} target(s) were formatted`,
    );
  }
  if (failed > 0) {
    const bar = styleText("red", "█".repeat(failed));
    logger.line(
      `   ${styleText("red", "●")} ${styleText("bold", "Failed:")}    ${bar} ${styleText("red", String(failed))} target(s) failed`,
    );
  }
  if (skipped > 0) {
    const bar = styleText("gray", "█".repeat(skipped));
    logger.line(
      `   ${styleText("gray", "●")} ${styleText("bold", "Skipped:")}   ${bar} ${styleText("gray", String(skipped))} target(s) skipped (tool not installed)`,
    );
  }

  logger.line();

  // Resource usage
  logger.line(styleText("bold", "   📊 Resource Usage:"));
  if (totalFiles > 0) {
    logger.line(styleText("dim", `      Files processed: ${totalFiles}`));
  }
  logger.line(styleText("dim", `      Peak memory (max worker): ${formatBytes(maxMemory)}`));
  logger.line(styleText("dim", `      Combined memory: ${formatBytes(totalMemory)}`));

  logger.line();

  // Timing info
  const avgDuration = Math.round(totalDuration / results.length);
  const totalInitTime = results.reduce((sum, r) => sum + r.initTimeMs, 0);
  const totalWorkTime = results.reduce((sum, r) => sum + r.workTimeMs, 0);
  logger.line(styleText("dim", `   ⏱️  Total time: ${totalDuration}ms (avg: ${avgDuration}ms per target)`));
  logger.line(styleText("dim", `      Init time: ${totalInitTime}ms  │  Work time: ${totalWorkTime}ms`));

  logger.line();
  logger.line(createLine(boxWidth + 6));
}

/**
 * Runs formatting on all targets in parallel using Piscina workers.
 *
 * @remarks
 * This mode maximizes developer feedback speed by running independent targets
 * concurrently, then printing results in a deterministic target order.
 * Uses Promise.allSettled for graceful degradation - if one worker fails,
 * others continue and results are collected.
 *
 * @param filePatterns - Optional glob patterns for selective targeting.
 * @param logger - Logger used for formatting lifecycle output.
 * @returns Exit code (0 for success, non-zero for failure).
 */
async function runOnAllTargets(filePatterns: readonly string[] | undefined, logger: MonorepositoryLogger): Promise<number> {
  // Show what we're about to do
  printTargetOverview(logger.child("overview"));

  if (filePatterns && filePatterns.length > 0) {
    logger.line(styleText("gray", "  📁 Selective targeting: " + filePatterns.join(", ")));
    logger.line();
  }

  logger.line(styleText(["bold", "cyan"], "  🧵 Dispatching parallel workers..."));
  logger.line();

  const piscina = new Piscina({
    filename: fileURLToPath(new URL("./workers/format.worker.ts", import.meta.url)),
    execArgv: ["--experimental-strip-types", "--no-warnings"],
  });

  logger.line(
    styleText("dim", `     PID: ${process.pid}  │  Workers: ${piscina.options.minThreads}-${piscina.options.maxThreads} threads`),
  );
  logger.line();

  try {
    const startTime = Date.now();
    const progress = createProgressTracker(allTargets.length, logger.child("progress"));
    const dispatchTime = Date.now();
    const results: (FormatWorkerResult | null)[] = new Array(allTargets.length).fill(null);
    const completionEvents: Array<{index: number; target: string; durationMs: number; status: "success" | "error"}> = [];
    let failedWorkers = 0;

    // Log all spawn events first with target-specific icons
    for (const [index, target] of allTargets.entries()) {
      const config = targetConfig[target];
      const timestamp = styleText("gray", `[${formatTimestamp()}]`);
      const workerLabel = styleText("cyan", `Worker #${index + 1}`);
      logger.line(`${timestamp} 🚀 ${workerLabel} spawned for ${config.icon} ${config.color(styleText("bold", target))}`);
    }
    logger.line();

    // Start the progress bar
    progress.start();

    // Dispatch all workers in parallel
    const workerPromises = allTargets.map((target, index) => {
      const input: FormatWorkerInput = {
        target,
        taskIndex: index,
        dispatchedAt: dispatchTime,
        ...(filePatterns === undefined ? {} : {filePatterns}),
      };

      return piscina.run(input) as Promise<FormatWorkerResult>;
    });

    // Use Promise.allSettled for graceful degradation
    const settledResults = await Promise.allSettled(workerPromises);

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
          status: result.exitCode === 0 ? "success" : "error",
        });
      } else {
        // Worker crashed - create error result
        failedWorkers++;
        const errorResult: FormatWorkerResult = {
          target,
          checkPassed: false,
          formatted: false,
          exitCode: 1,
          resultText: `Worker crashed: ${settled.reason}`,
          error: String(settled.reason),
          workerId: -1,
          durationMs: 0,
          workTimeMs: 0,
          initTimeMs: 0,
          fileCount: 0,
          peakMemoryBytes: 0,
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
      logWorkerComplete(event.index, event.target, event.durationMs, event.status, logger.child("workers"));
    }

    // Show graceful degradation notice if any workers failed
    if (failedWorkers > 0) {
      logger.line(styleText("yellow", `\n  ⚠️  ${failedWorkers} worker(s) crashed but others continued (graceful degradation)`));
    }

    const elapsed = Date.now() - startTime;

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

    // Show completion
    logger.line(styleText("green", `\n  ✓ Completed in ${elapsed}ms`));

    // Print results in order with index
    const validResults: FormatWorkerResult[] = [];
    for (const [index, result] of results.entries()) {
      if (result) {
        validResults.push(result);
        printWorkerResult(result, index, logger.child(result.target));
      }
    }

    // Print fancy summary
    printSummaryBox(validResults, logger.child("summary"));

    const failed = validResults.filter((r) => r.exitCode !== 0).length;
    return failed > 0 ? 1 : 0;
  } finally {
    await piscina.destroy();
  }
}

/**
 * Runs formatting on a single target using a Piscina worker.
 *
 * @param target - The specific target to format.
 * @param filePatterns - Optional glob patterns for selective targeting.
 * @param logger - Logger used for formatting lifecycle output.
 * @returns Exit code (0 for success, non-zero for failure).
 */
async function runOnSingleTarget(
  target: FormatTarget,
  filePatterns: readonly string[] | undefined,
  logger: MonorepositoryLogger,
): Promise<number> {
  const config = targetConfig[target];

  logger.line();
  logger.line(
    styleText("bold", `  ${config.icon} Formatting: ${config.color(target.toUpperCase())}`) + styleText("dim", ` (${config.description})`),
  );

  if (filePatterns && filePatterns.length > 0) {
    logger.line(styleText("gray", "  📁 Patterns: " + filePatterns.join(", ")));
  }

  logger.line();
  logger.line(styleText("yellow", "  ⏳ Processing..."));

  const piscina = new Piscina({
    filename: fileURLToPath(new URL("./workers/format.worker.ts", import.meta.url)),
    execArgv: ["--experimental-strip-types", "--no-warnings"],
  });

  try {
    const startTime = Date.now();
    const input: FormatWorkerInput = {
      target,
      taskIndex: 0,
      dispatchedAt: Date.now(),
      ...(filePatterns === undefined ? {} : {filePatterns}),
    };

    try {
      const result = (await piscina.run(input)) as FormatWorkerResult;
      const elapsed = Date.now() - startTime;

      logger.line(styleText("green", `  ✓ Completed in ${elapsed}ms`));

      printWorkerResult(result, undefined, logger.child("result"));

      return result.exitCode;
    } catch (error) {
      logger.line(styleText("red", `  ✗ Worker crashed: ${error}`));
      return 1;
    }
  } finally {
    await piscina.destroy();
  }
}

/**
 * Prints the fancy header banner.
 *
 * @param logger - Logger used for presentation output.
 */
function printHeader(logger: MonorepositoryLogger): void {
  const gradient = [(s: string) => styleText("magenta", s), (s: string) => styleText("blue", s), (s: string) => styleText("cyan", s)];

  logger.line();
  logger.line(gradient[0]!("  ╭─────────────────────────────────────────────────────╮"));
  logger.line(gradient[0]!("  │") + styleText("bold", "          🎨 arolariu.ro Code Formatter              ") + gradient[0]!("│"));
  logger.line(gradient[1]!("  │") + styleText("dim", "       Prettier • dotnet format • Parallel           ") + gradient[1]!("│"));
  logger.line(gradient[2]!("  ╰─────────────────────────────────────────────────────╯"));
  logger.line();
}

/**
 * Prints the help/usage information.
 *
 * @param logger - Logger used for presentation output.
 */
function printHelp(logger: MonorepositoryLogger): void {
  logger.line(styleText("bold", "  📖 Usage:") + styleText("cyan", " format <target> [glob patterns...]"));
  logger.line();
  logger.line(styleText("bold", "  Available targets:"));
  logger.line();
  logger.line(`     ${styleText("cyan", "all")}       ${styleText("dim", "→")} Format all targets in parallel`);
  logger.line();
  for (const target of allTargets) {
    const config = targetConfig[target];
    logger.line(`     ${config.icon} ${config.color(target.padEnd(9))} ${styleText("dim", "→")} ${config.description}`);
  }
  logger.line();
  logger.line(styleText("bold", "  📁 Selective targeting:"));
  logger.line(styleText("dim", '     format website "src/**/*.tsx"    Format only TSX files in website'));
  logger.line(styleText("dim", '     format packages "**/*.ts"        Format only TS files in packages'));
  logger.line();
  logger.line(styleText("dim", "  Examples:"));
  logger.line(styleText("dim", "     npm run format all"));
  logger.line(styleText("dim", "     npm run format website"));
  logger.line();
}

/**
 * Runs the formatter CLI.
 *
 * @remarks
 * This is the script entrypoint used by `npm run format`.
 * The function dispatches formatting work to worker threads and exits with a
 * conventional POSIX process exit code.
 * Supports selective targeting via additional glob pattern arguments.
 *
 * @param arg - Target name (`all`, `packages`, `website`, `cv`, `api`).
 * @param filePatterns - Optional glob patterns for selective targeting.
 * @param logger - Optional logger used for all formatter output.
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string, filePatterns?: readonly string[], logger?: MonorepositoryLogger): Promise<number> {
  const output = logger ?? new MonorepositoryConsoleLogger("format");
  printHeader(output);

  if (!arg) {
    output.line(styleText("yellow", "  ⚠️  Missing target argument"));
    output.line();
    printHelp(output.child("help"));
    return 1;
  }

  try {
    let exitCode = 0;

    switch (arg) {
      case "all":
        exitCode = await runOnAllTargets(filePatterns, output.child("all"));
        break;
      case "packages":
      case "website":
      case "cv":
      case "api":
      case "status":
      case "exp":
        exitCode = await runOnSingleTarget(arg, filePatterns, output.child(arg));
        break;
      default:
        output.line(styleText("red", `✗ Invalid target: "${arg}"`), "stderr");
        output.line(styleText("gray", "\n💡 Valid targets: all, packages, website, cv, api, status, exp\n"));
        return 1;
    }

    if (exitCode === 0) {
      output.line();
      output.line(
        styleText(["bgGreen", "black"], " SUCCESS ")
          + styleText("green", " All targets formatted successfully! ")
          + styleText("bold", "🎉"),
      );
      output.line();
    } else {
      output.line();
      output.line(
        styleText(["bgYellow", "black"], " WARNING ")
          + styleText("yellow", " Formatting completed with some issues ")
          + styleText("bold", "⚠️"),
      );
      output.line();
    }

    return exitCode;
  } catch (error) {
    output.line();
    output.line(styleText(["bgRed", "white"], " ERROR ") + styleText("red", " Formatting failed ") + styleText("bold", "❌"));
    output.line();

    if (error instanceof Error) {
      output.line(styleText("gray", `  ${box.topLeft}${box.horizontal.repeat(50)}${box.topRight}`));
      output.line(
        styleText("gray", `  ${box.vertical}`) + styleText("red", ` Error: ${error.message}`.padEnd(50)) + styleText("gray", box.vertical),
      );
      output.line(styleText("gray", `  ${box.bottomLeft}${box.horizontal.repeat(50)}${box.bottomRight}`));

      if (error.stack) {
        output.line();
        output.line(styleText("dim", "  Stack trace:"));
        const stackLines = error.stack.split("\n").slice(1, 4);
        for (const line of stackLines) {
          output.line(styleText("dim", `    ${line.trim()}`));
        }
      }
    } else {
      output.line(styleText("red", `  ${String(error)}`));
    }

    output.line();
    return 1;
  }
}

if (import.meta.main) {
  const output = new MonorepositoryConsoleLogger("format");
  const arg = process.argv[2];
  // Collect additional arguments as file patterns for selective targeting
  const filePatterns = process.argv.slice(3).filter((p) => p.length > 0);
  try {
    const code = await main(arg, filePatterns.length > 0 ? filePatterns : undefined, output);
    process.exit(code);
  } catch (err: unknown) {
    output.line(err instanceof Error ? (err.stack ?? err.message) : String(err), "stderr");
    process.exit(1);
  }
}
