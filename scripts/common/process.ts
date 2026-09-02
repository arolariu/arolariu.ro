/**
 * @fileoverview Deprecated compatibility facade over the shared process runner contracts.
 * @module scripts/common/process
 */

import {formatProcessRequest, type ProcessOutcome, type ProcessOutputMode, type ProcessRequest, type ProcessRunOptions, type ProcessRunner} from "./runner.ts";
import {nodeProcessRunner} from "./runtime.node.ts";

/** @deprecated Use {@link ProcessRequest} from `runner.ts`. */
export type CommandSpec = ProcessRequest;

/** @deprecated Use {@link ProcessOutputMode} from `runner.ts`. */
export type CommandOutputMode = ProcessOutputMode;

/** @deprecated Use {@link ProcessRunOptions} from `runner.ts`. */
export type CommandRunOptions = ProcessRunOptions;

/** Describes the complete outcome of one command execution. */
export interface CommandResult {
  /** Exit code, or `1` when the process did not produce one. */
  readonly code: number;
  /** Captured standard output. */
  readonly stdout: string;
  /** Captured standard error. */
  readonly stderr: string;
  /** Elapsed wall-clock duration in milliseconds. */
  readonly durationMs: number;
  /** Whether the configured timeout terminated the process. */
  readonly timedOut: boolean;
  /** Signal reported when the process was terminated by a signal. */
  readonly signal?: NodeJS.Signals;
  /** Spawn failure message when the executable could not be started. */
  readonly spawnError?: string;
}

/** Executes argument-based commands. */
export interface CommandRunner {
  /** Runs one command and resolves with its complete result. */
  readonly run: (command: Readonly<CommandSpec>, options?: Readonly<CommandRunOptions>) => Promise<CommandResult>;
}

/**
 * Formats a command for human-readable diagnostics without including stdin.
 *
 * @param command - Executable and arguments to format.
 * @returns Shell-like command text.
 */
export function formatCommand(command: Readonly<CommandSpec>): string {
  return formatProcessRequest(command);
}

function toLegacyCommandResult(outcome: Readonly<ProcessOutcome>): CommandResult {
  switch (outcome.kind) {
    case "succeeded":
      return {
        code: 0,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        durationMs: outcome.durationMs,
        timedOut: false,
      };
    case "exited":
      return {
        code: outcome.exitCode,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        durationMs: outcome.durationMs,
        timedOut: false,
      };
    case "timed-out":
      return {
        code: 1,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        durationMs: outcome.durationMs,
        timedOut: true,
        ...(outcome.signal === undefined ? {} : {signal: outcome.signal}),
      };
    case "signalled":
      return {
        code: 1,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        durationMs: outcome.durationMs,
        timedOut: false,
        signal: outcome.signal,
      };
    case "cancelled":
      return {
        code: 1,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        durationMs: outcome.durationMs,
        timedOut: false,
        ...(outcome.signal === undefined ? {} : {signal: outcome.signal}),
      };
    case "spawn-failed":
      return {
        code: 1,
        stdout: outcome.stdout,
        stderr: outcome.stderr,
        durationMs: outcome.durationMs,
        timedOut: false,
        spawnError: outcome.message,
      };
  }
}

/** Adapts a typed process runner to the legacy command-runner contract. */
export function toLegacyCommandRunner(runner: ProcessRunner): CommandRunner {
  return {
    run: async (request, options) => toLegacyCommandResult(await runner.run(request, options)),
  };
}

/**
 * Default process-backed command runner.
 *
 * @remarks
 * The delegate is resolved on each call rather than at module load. `runtime.node.ts` is the sole
 * Node adapter and now composes the repository inspection registry, so it can transitively import
 * this deprecated facade; resolving `nodeProcessRunner` eagerly here would read that binding while
 * the adapter is still initializing. Deferring the read keeps the existing per-call environment
 * snapshot semantics of {@link nodeProcessRunner} exactly as they were.
 */
export const defaultCommandRunner: CommandRunner = {
  run: (command, options) => toLegacyCommandRunner(nodeProcessRunner).run(command, options),
};
