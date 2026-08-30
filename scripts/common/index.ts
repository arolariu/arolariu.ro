/**
 * @fileoverview Shared utilities for monorepo scripts (CI detection, spinners, environment helpers).
 * @module scripts/common
 *
 * @remarks
 * These helpers are consumed by various `scripts/*.ts` entry points.
 * They are intentionally runtime-lightweight and avoid importing heavy toolchains.
 */

import {MonorepositoryConsoleLogger, type MonorepositoryLogger, type ProgressReporter} from "./logger.ts";
import {defaultCommandRunner} from "./process.ts";

/**
 * Runs a command with a spinner and captures output.
 *
 * @param command - The command to run.
 * @param args - Command arguments.
 * @param spinnerText - The text to show in the spinner.
 * @param hideOutput - Whether to hide the output (useful for parallel execution).
 * @param logger - Logger used for script-authored output.
 * @returns A promise resolving to the exit code and captured output.
 * @throws Error when inputs are invalid.
 */
export async function runWithSpinner(
  command: string,
  args: readonly string[],
  spinnerText: string,
  hideOutput: boolean = true,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("common"),
): Promise<{code: number; output: string}> {
  if (!command || command.trim().length === 0) {
    throw new Error("Command cannot be empty");
  }
  if (!Array.isArray(args)) {
    throw new Error("Arguments must be an array");
  }
  if (!spinnerText || spinnerText.trim().length === 0) {
    throw new Error("Spinner text cannot be empty");
  }

  switch (hideOutput) {
    case true: {
      const progress = logger.progress(spinnerText);
      const result = await defaultCommandRunner.run({command, args}, {output: "capture"});
      const output = result.stdout + result.stderr + (result.spawnError ?? "");

      if (result.spawnError !== undefined) {
        progress.fail(`${spinnerText} ✗`);
        logger.error(`Error: ${result.spawnError}`);
        return {code: 1, output};
      }

      if (result.code === 0) {
        progress.succeed(`${spinnerText} ✓`);
      } else {
        progress.fail(`${spinnerText} ✗`);
        if (output.trim().length > 0) {
          logger.line([{text: `\n${output.trim()}\n`, styles: ["gray"]}]);
        }
      }

      return {code: result.code, output};
    }
    case false: {
      logger.line([{text: `\n${spinnerText} ...`, styles: ["cyan"]}]);
      const result = await defaultCommandRunner.run({command, args}, {output: "inherit"});

      if (result.spawnError !== undefined) {
        logger.error(`  ✗ Error: ${result.spawnError}!\n`);
        return {code: 1, output: result.spawnError};
      }

      if (result.code === 0) {
        logger.line([{text: `  ✓ ${spinnerText} completed successfully!\n`, styles: ["green"]}]);
      } else {
        logger.line([{text: `  ✗ ${spinnerText} failed!\n`, styles: ["red"]}]);
      }

      return {code: result.code, output: ""};
    }
    default:
      throw new Error("The `hideOutput` variable should NOT be undefined!");
  }
}

/**
 * Environment flag to determine if we are in production.
 */
export const isProductionEnvironment = process.env["PRODUCTION"] === "true";

/**
 * Environment flag to determine if we are using Azure App Configuration.
 */
export const isAzureInfrastructure = process.env["INFRA"] === "azure";

/**
 * Environment flag to determine if we are in verbose mode.
 * In verbose mode, more detailed logs are emitted through the active logger.
 */
export const isVerboseMode = process.env["VERBOSE"] === "true";

/**
 * Environment flag to determine if we are in a CI/CD environment.
 */
export const isInCI = !!(process.env["CI"] ?? process.env["GITHUB_ACTIONS"]);

/**
 * Formats bytes into a human-readable string (KB, MB, GB).
 *
 * @param bytes - Number of bytes
 * @returns Human-readable string (e.g., "12.5 MB")
 *
 * @example
 * ```typescript
 * formatBytes(1024);      // "1.00 KB"
 * formatBytes(1048576);   // "1.00 MB"
 * formatBytes(1073741824); // "1.00 GB"
 * ```
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

// ============================================================================
// Worker Lifecycle Logging Utilities
// ============================================================================

/**
 * Formats the current time as HH:MM:SS.mmm for worker lifecycle logging.
 *
 * @returns Formatted timestamp string (e.g., "14:23:45.123")
 *
 * @example
 * ```typescript
 * formatTimestamp(); // "14:23:45.123"
 * ```
 */
export function formatTimestamp(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Logs a worker spawn event with timestamp and task name.
 *
 * @param workerId - The sequential worker ID (1-based)
 * @param taskName - Human-readable task name (e.g., "packages", "website")
 * @param logger - Logger used for worker presentation output.
 *
 * @example
 * ```typescript
 * logWorkerSpawn(1, "packages");
 * // Output: [14:23:45.123] 🚀 Worker #1 spawned for task "packages"
 * ```
 */
export function logWorkerSpawn(
  workerId: number,
  taskName: string,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("common"),
): void {
  logger.line([
    {text: `[${formatTimestamp()}]`, styles: ["gray"]},
    {text: " 🚀 "},
    {text: `Worker #${workerId}`, styles: ["cyan"]},
    {text: " spawned for task "},
    {text: `"${taskName}"`, styles: ["bold", "yellow"]},
  ]);
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "1.2s" or "500ms")
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Logs a worker completion event with timestamp, task name, and duration.
 *
 * @param workerId - The sequential worker ID (1-based)
 * @param taskName - Human-readable task name (e.g., "packages", "website")
 * @param durationMs - Duration of the worker execution in milliseconds
 * @param status - Whether the worker completed successfully or with an error
 * @param logger - Logger used for worker presentation output.
 *
 * @example
 * ```typescript
 * logWorkerComplete(1, "packages", 2222, "success");
 * // Output: [14:23:47.345] ✅ Worker #1 finished "packages" in 2.22s
 * ```
 */
export function logWorkerComplete(
  workerId: number,
  taskName: string,
  durationMs: number,
  status: "success" | "error",
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("common"),
): void {
  const icon = status === "success" ? "✅" : "❌";
  const colorName = status === "success" ? "green" : "red";
  logger.line([
    {text: `[${formatTimestamp()}]`, styles: ["gray"]},
    {text: ` ${icon} `},
    {text: `Worker #${workerId}`, styles: ["cyan"]},
    {text: " finished "},
    {text: `"${taskName}"`, styles: ["bold", "yellow"]},
    {text: " in "},
    {text: formatDurationMs(durationMs), styles: [colorName]},
  ]);
}

/**
 * Progress tracker state interface.
 */
interface ProgressTracker {
  /** Start displaying the progress bar */
  start(): void;
  /** Increment the completed count and update the progress display */
  increment(): void;
  /** Finalize the progress bar (print newline) */
  finish(): void;
  /** Get the current completed count */
  readonly completed: number;
}

/**
 * Creates a progress tracker that displays a real-time progress bar.
 *
 * @param total - Total number of items to track
 * @param logger - Logger used for progress output.
 * @returns Progress tracker with start(), increment(), and finish() methods
 *
 * @remarks
 * The progress bar updates in-place using carriage return (`\r`).
 * Call `start()` before any increments, and `finish()` when done.
 *
 * @example
 * ```typescript
 * const tracker = createProgressTracker(4);
 * tracker.start();      // ⏳ Progress: [░░░░░░░░░░░░░░░░░░░░] 0/4 workers completed
 * tracker.increment();  // ⏳ Progress: [█████░░░░░░░░░░░░░░░] 1/4 workers completed
 * tracker.increment();  // ⏳ Progress: [██████████░░░░░░░░░░] 2/4 workers completed
 * tracker.finish();     // Prints newline to finalize
 * ```
 */
export function createProgressTracker(
  total: number,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("common"),
): ProgressTracker {
  let completed = 0;
  let progress: ProgressReporter | null = null;

  function message(): string {
    const barWidth = 20;
    const filled = Math.round((completed / total) * barWidth);
    const empty = barWidth - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `  ⏳ Progress: [${bar}] ${completed}/${total} workers completed`;
  }

  function render(): void {
    const nextMessage = message();
    if (progress === null) {
      progress = logger.progress(nextMessage);
      return;
    }

    progress.update(nextMessage);
  }

  return {
    start(): void {
      render();
    },
    increment(): void {
      completed++;
      render();
    },
    finish(): void {
      progress?.stop();
      logger.line();
    },
    get completed() {
      return completed;
    },
  };
}

/**
 * Timeline entry for worker visualization.
 */
interface TimelineEntry {
  /** Target/task name */
  readonly target: string;
  /** Duration of execution in milliseconds */
  readonly durationMs: number;
}

/**
 * Prints a visual timeline showing the parallel execution of workers.
 *
 * @param results - Array of timeline entries with target and duration
 * @param logger - Logger used for timeline output.
 *
 * @remarks
 * The timeline normalizes all durations relative to the longest-running worker,
 * displaying a bar chart that visualizes parallel execution timing.
 *
 * @example
 * ```typescript
 * printWorkerTimeline([
 *   { target: "packages", durationMs: 2222 },
 *   { target: "website", durationMs: 1767 },
 *   { target: "cv", durationMs: 2885 },
 * ]);
 * // Output:
 * // 📊 Worker Timeline
 * // ──────────────────────────────────────────────────────────
 * // packages   │██████████████████████████████████░░░░░░│ 2,222ms
 * // website    │█████████████████████████████░░░░░░░░░░░│ 1,767ms
 * // cv         │████████████████████████████████████████│ 2,885ms
 * // ──────────────────────────────────────────────────────────
 * ```
 */
export function printWorkerTimeline(
  results: readonly TimelineEntry[],
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("common"),
): void {
  if (results.length === 0) return;

  const maxDuration = Math.max(...results.map((r) => r.durationMs));
  const barWidth = 40;
  const lineWidth = barWidth + 22;

  logger.line();
  logger.line([{text: "  📊 Worker Timeline", styles: ["bold"]}]);
  logger.line([{text: "  " + "─".repeat(lineWidth), styles: ["gray"]}]);

  for (const result of results) {
    const filled = Math.round((result.durationMs / maxDuration) * barWidth);
    const label = result.target.padEnd(10);
    const duration = formatDurationMs(result.durationMs).padStart(8);
    logger.line([
      {text: `  ${label} │`},
      {text: "█".repeat(filled), styles: ["cyan"]},
      {text: "░".repeat(barWidth - filled), styles: ["gray"]},
      {text: `│ ${duration}`},
    ]);
  }

  logger.line([{text: "  " + "─".repeat(lineWidth), styles: ["gray"]}]);
  logger.line([
    {
      text: `  ${"".padEnd(10)}  0s${" ".repeat(barWidth - 12)}${formatDurationMs(maxDuration)}`,
      styles: ["gray"],
    },
  ]);
}
