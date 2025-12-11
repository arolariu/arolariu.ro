/**
 * @fileoverview Type definitions for format worker thread communication.
 * @module scripts/types/format
 *
 * @remarks
 * This module provides type definitions for the format Piscina worker threads,
 * enabling type-safe communication between the main thread and worker threads
 * during parallel code formatting operations (Prettier and dotnet format).
 *
 * @see {@link FormatTarget} - Valid formatting targets
 * @see {@link FormatWorkerInput} - Input type for format worker threads
 * @see {@link FormatWorkerResult} - Output type for format worker threads
 */

/**
 * Formatting target identifier for the format worker.
 *
 * @remarks
 * Defines valid targets for the code formatting operations:
 * - `packages`: Component library (Prettier)
 * - `website`: Main Next.js site (Prettier)
 * - `cv`: CV SvelteKit site (Prettier)
 * - `api`: .NET backend (dotnet format)
 */
export type FormatTarget = "packages" | "website" | "cv" | "api";

/**
 * Input payload for the format worker thread.
 *
 * @remarks
 * This interface defines the serializable data passed from the main thread
 * to a Piscina worker when dispatching a formatting task.
 *
 * @example
 * ```typescript
 * const input: FormatWorkerInput = { target: "website" };
 * const result = await piscina.run(input);
 * ```
 */
export interface FormatWorkerInput {
  /** The formatting target (e.g., "packages", "website", "cv", "api") */
  readonly target: FormatTarget;
}

/**
 * Result payload returned by the format worker thread.
 *
 * @remarks
 * This interface defines the serializable result returned from a Piscina worker
 * after completing a formatting task. Includes both check and format phases.
 *
 * @example
 * ```typescript
 * const result: FormatWorkerResult = await piscina.run({ target: "website" });
 * if (result.error) {
 *   console.error(result.error);
 * } else {
 *   console.log(result.resultText);
 * }
 * ```
 */
export interface FormatWorkerResult {
  /** The target that was formatted */
  readonly target: FormatTarget;
  /** Whether the check phase passed (code was already formatted) */
  readonly checkPassed: boolean;
  /** Whether formatting was applied */
  readonly formatted: boolean;
  /** Exit code (0 for success, non-zero for failure) */
  readonly exitCode: number;
  /** Formatted output text - buffered for ordered printing */
  readonly resultText: string;
  /** Error message if the worker encountered an exception */
  readonly error?: string;
  /** Worker thread ID (unique per worker) */
  readonly workerId: number;
  /** Duration of the worker execution in milliseconds */
  readonly durationMs: number;
}
