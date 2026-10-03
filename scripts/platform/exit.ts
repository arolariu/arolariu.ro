/**
 * @fileoverview Mapping from a finished command `Exit` to the process exit code.
 * @module scripts/platform/exit
 *
 * @remarks
 * The CLI entry point is the only caller of {@link exitCodeFor}. Codes: `0` success (including
 * `--help`); `1` business-negative result, typed failure, or defect; `2` CLI usage error or
 * {@link ReportedFailure} with `exitCode: 2`; `130` interruption after `SIGINT`, interruption with
 * no recorded signal, or a terminal quit; `143` interruption after `SIGTERM`.
 */

import {Cause, Exit, Result, Schema, Terminal} from "effect";
import {CliError} from "effect/cli";

/** Process exit codes a command can finish with. */
export type CommandExitCode = 0 | 1 | 2 | 130 | 143;

/** Termination signals the CLI records to choose an interruption exit code. */
export type TerminationSignal = "SIGINT" | "SIGTERM";

/** A failure that has already been rendered to the user; the process exits with `exitCode`. */
export class ReportedFailure extends Schema.TaggedError<ReportedFailure>()("ReportedFailure", {
  exitCode: Schema.Literals([1, 2]),
  message: Schema.String,
}) {}

/**
 * Narrows an unknown failure to a {@link ReportedFailure}.
 *
 * @param error - The failure value.
 * @returns Whether `error` is a {@link ReportedFailure}.
 */
function isReportedFailure(error: unknown): error is ReportedFailure {
  return error instanceof ReportedFailure;
}

/**
 * Maps a finished command exit and the last recorded termination signal to a process exit code.
 *
 * @remarks
 * Interruption takes precedence over any failure (finalizer failures included), so a signalled run
 * keeps its signal exit code. Otherwise the first typed failure decides; defects map to `1`.
 *
 * @param exit - The exit of the command program.
 * @param signal - The last termination signal received while the program ran, if any.
 * @returns The process exit code.
 */
export function exitCodeFor(exit: Exit.Exit<unknown, unknown>, signal: TerminationSignal | undefined): CommandExitCode {
  if (Exit.isSuccess(exit)) {
    return 0;
  }

  const {cause} = exit;
  if (Cause.hasInterrupts(cause)) {
    if (signal === "SIGTERM") {
      return 143;
    }
    if (signal === "SIGINT" || Cause.hasInterruptsOnly(cause)) {
      return 130;
    }
  }

  const failure = Cause.findError(cause);
  if (!Result.isSuccess(failure)) {
    return 1;
  }

  const error: unknown = failure.success;
  if (isReportedFailure(error)) {
    return error.exitCode;
  }
  if (CliError.isCliError(error)) {
    return error._tag === "ShowHelp" && error.errors.length === 0 ? 0 : 2;
  }
  if (Terminal.isQuitError(error)) {
    return 130;
  }
  return 1;
}
