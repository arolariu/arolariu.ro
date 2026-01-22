/**
 * @fileoverview Shared utilities for monorepo scripts (CI detection, spinners, environment helpers).
 * @module scripts/common
 *
 * @remarks
 * These helpers are consumed by various `scripts/*.ts` entry points.
 * They are intentionally runtime-lightweight and avoid importing heavy toolchains.
 */

import {createSpinner} from "nanospinner";
import {spawn} from "node:child_process";
import pc from "picocolors";

/**
 * Runs a command with a spinner and captures output.
 *
 * @param command - The command to run.
 * @param args - Command arguments.
 * @param spinnerText - The text to show in the spinner.
 * @param hideOutput - Whether to hide the output (useful for parallel execution).
 * @returns A promise resolving to the exit code and captured output.
 * @throws Error when inputs are invalid.
 */
export async function runWithSpinner(
  command: string,
  args: string[],
  spinnerText: string,
  hideOutput: boolean = true,
): Promise<{code: number; output: string}> {
  // Input validation
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
      const spinner = createSpinner(spinnerText).start();

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: "pipe",
          windowsHide: true,
        });

        let output = "";
        let errorOutput = "";

        // Wait for the spawn event to ensure PID is available
        child.on("spawn", () => {
          const pidText = pc.gray(`[PID: ${child.pid || "N/A"}]`);
          spinner.update({text: `${spinnerText} ${pidText}`});
        });

        child.stdout?.on("data", (data) => {
          output += data.toString();
        });

        child.stderr?.on("data", (data) => {
          errorOutput += data.toString();
        });

        child.on("close", (code) => {
          const fullOutput = output + errorOutput;
          const pidText = pc.gray(`[PID: ${child.pid}]`);
          if (code === 0) {
            spinner.success({text: `${spinnerText} ${pc.green("✓")} ${pidText}`});
          } else {
            spinner.error({text: `${spinnerText} ${pc.red("✗")} ${pidText}`});
            if (fullOutput.trim()) {
              console.log(pc.gray(`\n${fullOutput.trim()}\n`));
            }
          }
          resolve({code: code ?? 1, output: fullOutput});
        });

        child.on("error", (error) => {
          spinner.error({text: `${spinnerText} ${pc.red("✗")}`});
          console.error(pc.red(`Error: ${error.message}`));
          resolve({code: 1, output: error.message});
        });
      });
    }
    case false: {
      console.log(pc.cyan(`\n${spinnerText} ...`));

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: "inherit",
          windowsHide: true,
        });

        child.on("close", (code) => {
          if (code === 0) {
            console.log(pc.green(`  ✓ ${spinnerText} completed successfully!\n`));
          } else {
            console.log(pc.red(`  ✗ ${spinnerText} failed!\n`));
          }
          resolve({code: code ?? 1, output: ""});
        });

        child.on("error", (error) => {
          console.error(pc.red(`  ✗ Error: ${error.message}!\n`));
          resolve({code: 1, output: error.message});
        });
      });
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
 * In verbose mode, more detailed logs are printed to the console.
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
 * console.log(formatTimestamp()); // "14:23:45.123"
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
 *
 * @example
 * ```typescript
 * logWorkerSpawn(1, "packages");
 * // Output: [14:23:45.123] 🚀 Worker #1 spawned for task "packages"
 * ```
 */
export function logWorkerSpawn(workerId: number, taskName: string): void {
  const timestamp = pc.gray(`[${formatTimestamp()}]`);
  const workerLabel = pc.cyan(`Worker #${workerId}`);
  const taskLabel = pc.bold(pc.yellow(`"${taskName}"`));
  console.log(`${timestamp} 🚀 ${workerLabel} spawned for task ${taskLabel}`);
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
): void {
  const timestamp = pc.gray(`[${formatTimestamp()}]`);
  const icon = status === "success" ? "✅" : "❌";
  const workerLabel = pc.cyan(`Worker #${workerId}`);
  const taskLabel = pc.bold(pc.yellow(`"${taskName}"`));
  const durationColor = status === "success" ? pc.green : pc.red;
  const formattedDuration = durationColor(formatDurationMs(durationMs));
  console.log(`${timestamp} ${icon} ${workerLabel} finished ${taskLabel} in ${formattedDuration}`);
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
export function createProgressTracker(total: number): ProgressTracker {
  let completed = 0;

  function render(): void {
    const barWidth = 20;
    const filled = Math.round((completed / total) * barWidth);
    const empty = barWidth - filled;
    const bar = pc.green("█".repeat(filled)) + pc.gray("░".repeat(empty));
    process.stdout.write(`\r  ⏳ Progress: [${bar}] ${completed}/${total} workers completed`);
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
      console.log(); // New line after completion
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
export function printWorkerTimeline(results: readonly TimelineEntry[]): void {
  if (results.length === 0) return;

  const maxDuration = Math.max(...results.map((r) => r.durationMs));
  const barWidth = 40;
  const lineWidth = barWidth + 22;

  console.log();
  console.log(pc.bold("  📊 Worker Timeline"));
  console.log(pc.gray("  " + "─".repeat(lineWidth)));

  for (const result of results) {
    const filled = Math.round((result.durationMs / maxDuration) * barWidth);
    const bar = pc.cyan("█".repeat(filled)) + pc.gray("░".repeat(barWidth - filled));
    const label = result.target.padEnd(10);
    const duration = formatDurationMs(result.durationMs).padStart(8);
    console.log(`  ${label} │${bar}│ ${duration}`);
  }

  console.log(pc.gray("  " + "─".repeat(lineWidth)));
  console.log(pc.gray(`  ${"".padEnd(10)}  0s${" ".repeat(barWidth - 12)}${formatDurationMs(maxDuration)}`));
}
