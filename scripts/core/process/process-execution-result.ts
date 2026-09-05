/**
 * @fileoverview Engine-neutral process execution result, termination signal, and failure evidence.
 * @module scripts/core/process/process-execution-result
 *
 * @remarks
 * Core owns its own termination-signal vocabulary so no core module depends on a host runtime's
 * signal union. A process adapter converts the host's reported signal name at its own boundary
 * through {@link toProcessTerminationSignal}.
 */

import type {TerminalPresenter} from "../presentation/terminal-presenter.ts";

/** Maximum rendered length of any single diagnostic excerpt. */
const MAX_PROCESS_DIAGNOSTIC_TEXT_LENGTH = 2_000;

/** Core-owned termination signal name reported by a terminated child process. */
export type ProcessTerminationSignal = `SIG${string}`;

/**
 * Narrows a host-reported signal name into a {@link ProcessTerminationSignal}.
 *
 * @param value - Signal name reported by a process adapter.
 * @returns The narrowed signal name, or `undefined` when the value is not a signal name.
 */
export function toProcessTerminationSignal(value: string): ProcessTerminationSignal | undefined {
  return value.startsWith("SIG") ? (value as ProcessTerminationSignal) : undefined;
}

/** Captured process output and duration metadata. */
export interface ProcessExecutionOutput {
  /** Captured standard output. */
  readonly stdout: string;
  /** Captured standard error. */
  readonly stderr: string;
  /** Elapsed wall-clock duration in milliseconds. */
  readonly durationMs: number;
}

/** Describes the complete typed result of one process invocation. */
export type ProcessExecutionResult =
  | (ProcessExecutionOutput & {readonly kind: "succeeded"; readonly exitCode: 0})
  | (ProcessExecutionOutput & {readonly kind: "exited"; readonly exitCode: number})
  | (ProcessExecutionOutput & {readonly kind: "signalled"; readonly signal: ProcessTerminationSignal})
  | (ProcessExecutionOutput & {readonly kind: "spawn-failed"; readonly message: string})
  | (ProcessExecutionOutput & {readonly kind: "timed-out"; readonly signal?: ProcessTerminationSignal})
  | (ProcessExecutionOutput & {readonly kind: "cancelled"; readonly signal?: ProcessTerminationSignal});

/** Narrows successful process execution results. */
export type SucceededProcessExecutionResult = Extract<ProcessExecutionResult, {readonly kind: "succeeded"}>;

/** Narrows failed or interrupted process execution results. */
export type FailedProcessExecutionResult = Exclude<ProcessExecutionResult, SucceededProcessExecutionResult>;

/**
 * Builds bounded failure evidence with stderr/stdout/spawn-message precedence.
 *
 * @param result - Failed or interrupted process execution result.
 * @param presenter - Optional presenter used for secret redaction.
 * @returns Sanitized evidence excerpt.
 */
export function processExecutionFailureEvidence(result: Readonly<FailedProcessExecutionResult>, presenter?: TerminalPresenter): string {
  return sanitizeProcessDiagnosticText(selectFailureEvidence(result), presenter);
}

/**
 * Bounds and redacts one diagnostic excerpt.
 *
 * @param text - Raw diagnostic text.
 * @param presenter - Optional presenter used for secret redaction.
 * @returns The sanitized excerpt, truncated to the shared diagnostic bound.
 */
export function sanitizeProcessDiagnosticText(text: string, presenter?: TerminalPresenter): string {
  const sanitized = presenter?.sanitize(text) ?? text;
  return sanitized.slice(0, MAX_PROCESS_DIAGNOSTIC_TEXT_LENGTH);
}

/**
 * Redacts every retained string of a failed result without changing its variant.
 *
 * @param result - Failed or interrupted process execution result.
 * @param presenter - Presenter used for secret redaction.
 * @returns A sanitized copy; the original object is never mutated.
 */
export function sanitizeFailedProcessExecutionResult(
  result: Readonly<FailedProcessExecutionResult>,
  presenter: TerminalPresenter,
): FailedProcessExecutionResult {
  const stdout = presenter.sanitize(result.stdout);
  const stderr = presenter.sanitize(result.stderr);

  switch (result.kind) {
    case "cancelled":
    case "exited":
    case "signalled":
    case "timed-out":
      return {...result, stdout, stderr};
    case "spawn-failed":
      return {...result, message: presenter.sanitize(result.message), stdout, stderr};
  }
}

/**
 * Summarizes why one process invocation did not succeed.
 *
 * @param result - Failed or interrupted process execution result.
 * @returns The human-readable failure summary used as the diagnostic prefix.
 */
export function describeProcessExecutionFailure(result: Readonly<FailedProcessExecutionResult>): string {
  switch (result.kind) {
    case "cancelled":
      return result.signal === undefined ? "Process cancelled" : `Process cancelled by ${result.signal}`;
    case "exited":
      return `Process exited with code ${result.exitCode}`;
    case "signalled":
      return `Process terminated by ${result.signal}`;
    case "spawn-failed":
      return "Process failed to start";
    case "timed-out":
      return result.signal === undefined ? "Process timed out" : `Process timed out with ${result.signal}`;
  }
}

function selectFailureEvidence(result: Readonly<FailedProcessExecutionResult>): string {
  if (result.stderr.length > 0) {
    return result.stderr;
  }

  if (result.stdout.length > 0) {
    return result.stdout;
  }

  if (result.kind === "spawn-failed") {
    return result.message;
  }

  return "";
}
