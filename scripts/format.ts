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
import pc from "picocolors";
import Piscina from "piscina";
import type {FormatTarget, FormatWorkerInput, FormatWorkerResult} from "./types/format.ts";

/** All available format targets in consistent order */
const allTargets: FormatTarget[] = ["packages", "website", "cv", "api"];

/** Target display configuration with icons and colors */
const targetConfig: Record<FormatTarget, {icon: string; color: (s: string) => string; description: string}> = {
  packages: {icon: "📦", color: pc.cyan, description: "Component Library"},
  website: {icon: "🌐", color: pc.blue, description: "Next.js Website"},
  cv: {icon: "📄", color: pc.magenta, description: "SvelteKit CV"},
  api: {icon: "⚙️", color: pc.yellow, description: ".NET Backend"},
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
    return pc.gray(box.horizontal.repeat(width));
  }
  const labelWithPadding = ` ${label} `;
  const remaining = width - labelWithPadding.length;
  const leftPad = Math.floor(remaining / 2);
  const rightPad = remaining - leftPad;
  return pc.gray(box.horizontal.repeat(leftPad)) + pc.bold(pc.white(labelWithPadding)) + pc.gray(box.horizontal.repeat(rightPad));
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

  const filled = pc.green("█".repeat(filledWidth));
  const empty = pc.gray("░".repeat(emptyWidth));
  const percentageText = pc.bold(pc.white(String(percentage) + "%"));

  return `${filled}${empty} ${percentageText}`;
}

/**
 * Creates a status badge for a worker result.
 *
 * @param result - The format worker result.
 * @returns A colored badge (CLEAN/FORMATTED/FAILED).
 */
function createStatusBadge(result: FormatWorkerResult): string {
  if (result.exitCode !== 0) {
    return pc.bgRed(pc.white(" FAILED "));
  }
  if (result.formatted) {
    return pc.bgYellow(pc.black(" FORMATTED "));
  }
  return pc.bgGreen(pc.black(" CLEAN "));
}

/**
 * Formats a duration with an appropriate unit and color.
 *
 * @param ms - Duration in milliseconds.
 * @returns A human-friendly duration string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return pc.green(`${ms}ms`);
  }
  if (ms < 5000) {
    return pc.yellow(`${(ms / 1000).toFixed(1)}s`);
  }
  return pc.red(`${(ms / 1000).toFixed(1)}s`);
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
 * @returns Nothing.
 */
function printWorkerResult(result: FormatWorkerResult, index?: number): void {
  const config = targetConfig[result.target];
  const cardWidth = 58;
  const innerWidth = cardWidth - 2; // Account for border characters

  // Card header
  console.log();
  console.log(pc.gray(`  ${box.topLeft}${box.horizontal.repeat(cardWidth)}${box.topRight}`));

  // Title row: [icon TARGET Description] [BADGE]
  const indexBadge = index === undefined ? "" : `#${index + 1} `;
  const coloredTitle = index === undefined ? "" : pc.gray(`#${index + 1} `);
  const fullTitle = `${coloredTitle}${config.icon} ${config.color(pc.bold(result.target.toUpperCase()))} ${pc.dim(config.description)}`;
  const badge = createStatusBadge(result);

  // Calculate padding: we need to account for ANSI codes in colored strings
  const titleVisibleLength = indexBadge.length + 2 + result.target.length + 1 + config.description.length + 2; // icon is ~2 chars

  // Badge visible lengths: CLEAN=7, FAILED=8, FORMATTED=11
  let badgeVisibleLength = 7; // CLEAN
  if (result.exitCode !== 0) {
    badgeVisibleLength = 8; // FAILED
  } else if (result.formatted) {
    badgeVisibleLength = 11; // FORMATTED
  }

  const paddingNeeded = innerWidth - titleVisibleLength - badgeVisibleLength + 1;
  const padding = " ".repeat(Math.max(0, paddingNeeded));

  console.log(pc.gray(`  ${box.vertical} `) + fullTitle + padding + badge + pc.gray(` ${box.vertical}`));

  // Separator
  console.log(pc.gray(`  ${box.teeRight}${box.horizontal.repeat(cardWidth)}${box.teeLeft}`));

  // Stats row: Worker info and Duration
  const workerText = `Worker #${result.workerId}`;
  const durationText = `Duration: ${formatDuration(result.durationMs)}`;
  const statsLine = ` ${pc.dim(workerText)}  ${pc.gray("│")}  ${durationText}`;
  // Visible length calculation for stats
  const statsVisibleLength = 1 + workerText.length + 3 + 10 + result.durationMs.toString().length + 2 + 2;
  const statsPadding = " ".repeat(Math.max(0, innerWidth - statsVisibleLength));

  console.log(pc.gray(`  ${box.vertical}`) + statsLine + statsPadding + pc.gray(`  ${box.vertical}`));

  // Result text (if any meaningful output)
  if (result.resultText && result.resultText.trim().length > 0) {
    console.log(pc.gray(`  ${box.teeRight}${box.horizontal.repeat(cardWidth)}${box.teeLeft}`));
    const lines = result.resultText.trim().split("\n").slice(0, 5); // Limit to 5 lines
    for (const line of lines) {
      const maxLineLength = innerWidth - 4;
      const truncatedLine = line.length > maxLineLength ? line.substring(0, maxLineLength - 3) + "..." : line;
      const linePadding = " ".repeat(Math.max(0, innerWidth - truncatedLine.length - 1));
      console.log(pc.gray(`  ${box.vertical} `) + truncatedLine + linePadding + pc.gray(`  ${box.vertical}`));
    }
    if (result.resultText.trim().split("\n").length > 5) {
      const moreText = "... and more";
      const morePadding = " ".repeat(innerWidth - moreText.length - 1);
      console.log(pc.gray(`  ${box.vertical} `) + pc.dim(moreText) + morePadding + pc.gray(`  ${box.vertical}`));
    }
  }

  // Card footer
  console.log(pc.gray(`  ${box.bottomLeft}${box.horizontal.repeat(cardWidth)}${box.bottomRight}`));
}

/**
 * Prints the target overview before processing.
 */
function printTargetOverview(): void {
  console.log();
  console.log(pc.bold("  📋 Targets to format:"));
  console.log();
  for (const target of allTargets) {
    const config = targetConfig[target];
    console.log(`     ${config.icon}  ${config.color(pc.bold(target.padEnd(10)))} ${pc.dim(config.description)}`);
  }
  console.log();
}

/**
 * Prints a summary section for all worker results.
 *
 * @param results - Array of format worker results.
 * @returns Nothing.
 */
function printSummaryBox(results: FormatWorkerResult[]): void {
  const alreadyFormatted = results.filter((r) => r.checkPassed).length;
  const formatted = results.filter((r) => r.formatted).length;
  const failed = results.filter((r) => r.exitCode !== 0).length;
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  const boxWidth = 50;

  console.log();
  console.log(createLine(boxWidth + 6, "📊 SUMMARY"));
  console.log();

  // Progress bar showing success rate
  const successCount = alreadyFormatted + formatted;
  const progressBar = createProgressBar(successCount, results.length, 25);
  console.log(`   Success Rate: ${progressBar}`);
  console.log();

  // Status breakdown with icons
  if (alreadyFormatted > 0) {
    const bar = pc.green("█".repeat(alreadyFormatted));
    console.log(`   ${pc.green("●")} ${pc.bold("Clean:")}     ${bar} ${pc.green(String(alreadyFormatted))} target(s) already formatted`);
  }
  if (formatted > 0) {
    const bar = pc.yellow("█".repeat(formatted));
    console.log(`   ${pc.yellow("●")} ${pc.bold("Fixed:")}     ${bar} ${pc.yellow(String(formatted))} target(s) were formatted`);
  }
  if (failed > 0) {
    const bar = pc.red("█".repeat(failed));
    console.log(`   ${pc.red("●")} ${pc.bold("Failed:")}    ${bar} ${pc.red(String(failed))} target(s) failed`);
  }

  console.log();

  // Timing info
  const avgDuration = Math.round(totalDuration / results.length);
  console.log(pc.dim(`   ⏱️  Total time: ${totalDuration}ms (avg: ${avgDuration}ms per target)`));

  console.log();
  console.log(createLine(boxWidth + 6));
}

/**
 * Runs formatting on all targets in parallel using Piscina workers.
 *
 * @remarks
 * This mode maximizes developer feedback speed by running independent targets
 * concurrently, then printing results in a deterministic target order.
 *
 * @returns Exit code (0 for success, non-zero for failure).
 */
async function runOnAllTargets(): Promise<number> {
  // Show what we're about to do
  printTargetOverview();

  console.log(pc.bold(pc.cyan("  🧵 Dispatching parallel workers...")));
  console.log();

  const piscina = new Piscina({
    filename: fileURLToPath(new URL("./workers/format.worker.ts", import.meta.url)),
    execArgv: ["--experimental-strip-types", "--no-warnings"],
  });

  console.log(pc.dim(`     PID: ${process.pid}  │  Workers: ${piscina.options.minThreads}-${piscina.options.maxThreads} threads`));
  console.log();

  // Show processing indicator
  console.log(pc.yellow("  ⏳ Processing..."));

  try {
    const startTime = Date.now();

    // Dispatch all workers in parallel
    const workerPromises = allTargets.map((target) => {
      const input: FormatWorkerInput = {target};
      return piscina.run(input) as Promise<FormatWorkerResult>;
    });

    // Wait for all workers to complete
    const results = await Promise.all(workerPromises);

    const elapsed = Date.now() - startTime;

    // Clear processing line and show completion
    console.log(pc.green(`  ✓ Completed in ${elapsed}ms`));

    // Print results in order with index
    for (const [index, result] of results.entries()) {
      printWorkerResult(result, index);
    }

    // Print fancy summary
    printSummaryBox(results);

    const failed = results.filter((r) => r.exitCode !== 0).length;
    return failed > 0 ? 1 : 0;
  } finally {
    await piscina.destroy();
  }
}

/**
 * Runs formatting on a single target using a Piscina worker.
 *
 * @param target - The specific target to format.
 * @returns Exit code (0 for success, non-zero for failure).
 */
async function runOnSingleTarget(target: FormatTarget): Promise<number> {
  const config = targetConfig[target];

  console.log();
  console.log(pc.bold(`  ${config.icon} Formatting: ${config.color(target.toUpperCase())}`) + pc.dim(` (${config.description})`));
  console.log();
  console.log(pc.yellow("  ⏳ Processing..."));

  const piscina = new Piscina({
    filename: fileURLToPath(new URL("./workers/format.worker.ts", import.meta.url)),
    execArgv: ["--experimental-strip-types", "--no-warnings"],
  });

  try {
    const startTime = Date.now();
    const input: FormatWorkerInput = {target};
    const result = (await piscina.run(input)) as FormatWorkerResult;
    const elapsed = Date.now() - startTime;

    console.log(pc.green(`  ✓ Completed in ${elapsed}ms`));

    printWorkerResult(result);

    return result.exitCode;
  } finally {
    await piscina.destroy();
  }
}

/**
 * Prints the fancy header banner.
 */
function printHeader(): void {
  const gradient = [pc.magenta, pc.blue, pc.cyan];

  console.log();
  console.log(gradient[0]!("  ╭─────────────────────────────────────────────────────╮"));
  console.log(gradient[0]!("  │") + pc.bold("          🎨 arolariu.ro Code Formatter              ") + gradient[0]!("│"));
  console.log(gradient[1]!("  │") + pc.dim("       Prettier • dotnet format • Parallel           ") + gradient[1]!("│"));
  console.log(gradient[2]!("  ╰─────────────────────────────────────────────────────╯"));
  console.log();
}

/**
 * Prints the help/usage information.
 */
function printHelp(): void {
  console.log(pc.bold("  📖 Usage:") + pc.cyan(" format <target>"));
  console.log();
  console.log(pc.bold("  Available targets:"));
  console.log();
  console.log(`     ${pc.cyan("all")}       ${pc.dim("→")} Format all targets in parallel`);
  console.log();
  for (const target of allTargets) {
    const config = targetConfig[target];
    console.log(`     ${config.icon} ${config.color(target.padEnd(9))} ${pc.dim("→")} ${config.description}`);
  }
  console.log();
  console.log(pc.dim("  Examples:"));
  console.log(pc.dim("     npm run format all"));
  console.log(pc.dim("     npm run format website"));
  console.log();
}

/**
 * Runs the formatter CLI.
 *
 * @remarks
 * This is the script entrypoint used by `npm run format`.
 * The function dispatches formatting work to worker threads and exits with a
 * conventional POSIX process exit code.
 *
 * @param arg - Target name (`all`, `packages`, `website`, `cv`, `api`).
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string): Promise<number> {
  printHeader();

  if (!arg) {
    console.log(pc.yellow("  ⚠️  Missing target argument"));
    console.log();
    printHelp();
    return 1;
  }

  try {
    let exitCode = 0;

    switch (arg) {
      case "all":
        exitCode = await runOnAllTargets();
        break;
      case "packages":
      case "website":
      case "cv":
      case "api":
        exitCode = await runOnSingleTarget(arg);
        break;
      default:
        console.error(pc.red(`✗ Invalid target: "${arg}"`));
        console.log(pc.gray("\n💡 Valid targets: all, packages, website, cv, api\n"));
        return 1;
    }

    if (exitCode === 0) {
      console.log();
      console.log(pc.bgGreen(pc.black(" SUCCESS ")) + pc.green(" All targets formatted successfully! ") + pc.bold("🎉"));
      console.log();
    } else {
      console.log();
      console.log(pc.bgYellow(pc.black(" WARNING ")) + pc.yellow(" Formatting completed with some issues ") + pc.bold("⚠️"));
      console.log();
    }

    return exitCode;
  } catch (error) {
    console.log();
    console.log(pc.bgRed(pc.white(" ERROR ")) + pc.red(" Formatting failed ") + pc.bold("❌"));
    console.log();

    if (error instanceof Error) {
      console.log(pc.gray(`  ${box.topLeft}${box.horizontal.repeat(50)}${box.topRight}`));
      console.log(pc.gray(`  ${box.vertical}`) + pc.red(` Error: ${error.message}`.padEnd(50)) + pc.gray(box.vertical));
      console.log(pc.gray(`  ${box.bottomLeft}${box.horizontal.repeat(50)}${box.bottomRight}`));

      if (error.stack) {
        console.log();
        console.log(pc.dim("  Stack trace:"));
        const stackLines = error.stack.split("\n").slice(1, 4);
        for (const line of stackLines) {
          console.log(pc.dim(`    ${line.trim()}`));
        }
      }
    } else {
      console.log(pc.red(`  ${String(error)}`));
    }

    console.log();
    return 1;
  }
}

if (import.meta.main) {
  const arg = process.argv[2];
  try {
    const code = await main(arg);
    process.exit(code);
  } catch (err: unknown) {
    console.error(err);
    process.exit(1);
  }
}
