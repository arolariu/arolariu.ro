/**
 * @fileoverview Type definitions for ESLint worker thread communication.
 * @module scripts/types/lint
 *
 * @remarks
 * This module provides type definitions for the ESLint Piscina worker threads,
 * enabling type-safe communication between the main thread and worker threads
 * during parallel linting operations.
 *
 * @see {@link ESLintWorkerInput} - Input type for ESLint worker threads
 * @see {@link ESLintWorkerResult} - Output type for ESLint worker threads
 */

/**
 * Input payload for the ESLint worker thread.
 *
 * @remarks
 * This interface defines the serializable data passed from the main thread
 * to a Piscina worker when dispatching an ESLint linting task.
 *
 * @example
 * ```typescript
 * const input: ESLintWorkerInput = { configName: "[@arolariu/website]" };
 * const result = await piscina.run(input);
 * ```
 */
export interface ESLintWorkerInput {
  /** The ESLint config name to find and use (e.g., "[@arolariu/packages]") */
  readonly configName: string;
}

/**
 * Result payload returned by the ESLint worker thread.
 *
 * @remarks
 * This interface defines the serializable result returned from a Piscina worker
 * after completing an ESLint linting task. All console output is buffered in
 * `resultText` to enable ordered printing in the main thread.
 *
 * @example
 * ```typescript
 * const result: ESLintWorkerResult = await piscina.run({ configName: "[@arolariu/website]" });
 * if (result.error) {
 *   console.error(result.error);
 * } else {
 *   console.log(result.resultText);
 * }
 * ```
 */
export interface ESLintWorkerResult {
  /** The config name that was linted */
  readonly configName: string;
  /** Total number of ESLint errors found */
  readonly errorCount: number;
  /** Total number of ESLint warnings found */
  readonly warningCount: number;
  /** Formatted ESLint output (stylish format) - buffered for ordered printing */
  readonly resultText: string;
  /** Error message if the worker encountered an exception */
  readonly error?: string;
  /** Worker thread ID (unique per worker) */
  readonly workerId: number;
  /** Duration of the worker execution in milliseconds */
  readonly durationMs: number;
}
