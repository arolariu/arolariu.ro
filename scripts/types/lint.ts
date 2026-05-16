/**
 * @fileoverview Type definitions for lint worker thread communication.
 * @module scripts/types/lint
 *
 * @remarks
 * This module provides type definitions for the Piscina lint worker threads,
 * enabling type-safe communication between the main thread and worker threads
 * during parallel linting operations.
 *
 * @see {@link LintWorkerInput} - Input type for lint worker threads
 * @see {@link LintWorkerResult} - Output type for lint worker threads
 */

/**
 * All supported lint targets in the monorepo.
 *
 * @remarks
 * - packages / website → ESLint only
 * - cv / status        → svelte-check + ESLint
 * - api                → dotnet format + dotnet build
 * - exp                → ruff check
 */
export type LintTarget = "packages" | "website" | "cv" | "status" | "api" | "exp";

/**
 * Input payload for the lint worker thread.
 *
 * @remarks
 * This interface defines the serializable data passed from the main thread
 * to a Piscina worker when dispatching a lint task.
 *
 * @example
 * ```typescript
 * const input: LintWorkerInput = {
 *   target: "website",
 *   configName: "[@arolariu/website]",
 *   taskIndex: 1,
 *   dispatchedAt: Date.now(),
 * };
 * const result = await piscina.run(input);
 * ```
 */
export interface LintWorkerInput {
  /** The lint target (determines which tools/steps to run) */
  readonly target: LintTarget;
  /** The ESLint config name to find and use (e.g., "[@arolariu/packages]") */
  readonly configName: string;
  /** Position in the task queue (0-based index) for ordering results */
  readonly taskIndex: number;
  /** Timestamp when the task was dispatched from the main thread (Date.now()) */
  readonly dispatchedAt: number;
  /** Optional glob patterns to filter files (selective targeting) */
  readonly filePatterns?: readonly string[];
}

/**
 * Per-file timing statistics from ESLint.
 */
export interface ESLintFileStats {
  /** File path */
  readonly filePath: string;
  /** Time spent linting this file in milliseconds */
  readonly lintTimeMs: number;
}

/**
 * Result payload returned by the lint worker thread.
 *
 * @remarks
 * This interface defines the serializable result returned from a Piscina worker
 * after completing a lint task. All console output is buffered in `resultText`
 * to enable ordered printing in the main thread.
 *
 * @example
 * ```typescript
 * const result: LintWorkerResult = await piscina.run({ target: "website", configName: "[@arolariu/website]" });
 * if (result.error) {
 *   console.error(result.error);
 * } else {
 *   console.log(result.resultText);
 * }
 * ```
 */
export interface LintWorkerResult {
  /** The config name that was linted */
  readonly configName: string;
  /** Total number of ESLint errors found */
  readonly errorCount: number;
  /** Total number of ESLint warnings found */
  readonly warningCount: number;
  /** Formatted output (stylish format for ESLint, raw output for other tools) - buffered for ordered printing */
  readonly resultText: string;
  /** Error message if the worker encountered an exception */
  readonly error?: string;
  /** Worker thread ID (unique per worker) */
  readonly workerId: number;
  /** Total duration including thread startup and module loading (milliseconds) */
  readonly durationMs: number;
  /** Time spent on actual linting work only (milliseconds) */
  readonly workTimeMs: number;
  /** Time spent on initialization/module loading (milliseconds) */
  readonly initTimeMs: number;
  /** Number of files that were linted */
  readonly fileCount: number;
  /** Peak memory usage in bytes (heap used) */
  readonly peakMemoryBytes: number;
  /** Top slowest files with their lint times */
  readonly slowestFiles: readonly ESLintFileStats[];
  /** Whether this target was skipped due to a missing tool (dotnet, ruff, etc.) */
  readonly skipped?: boolean;
  /** Human-readable reason for skipping, if skipped is true */
  readonly skipReason?: string;
  /** Label of the step that failed (e.g. "svelte-check", "dotnet build"), if any. */
  readonly failedStep?: string;
}

// ---------------------------------------------------------------------------
// Legacy aliases — kept for backward compatibility during the rename transition.
// Remove once all consumers have been updated to the canonical names above.
// ---------------------------------------------------------------------------

/** @deprecated Use {@link LintWorkerInput} instead. */
export type ESLintWorkerInput = LintWorkerInput;

/** @deprecated Use {@link LintWorkerResult} instead. */
export type ESLintWorkerResult = LintWorkerResult;
