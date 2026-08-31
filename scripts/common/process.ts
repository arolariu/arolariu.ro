/**
 * @fileoverview Shared cross-platform command execution for monorepository scripts.
 * @module scripts/common/process
 */

import {StringDecoder} from "node:string_decoder";
import {execa} from "execa";
import type {MonorepositoryLogger} from "./logger.ts";

interface ExecaResultLike {
  readonly code?: string | number | undefined;
  readonly durationMs?: number | undefined;
  readonly exitCode?: number | undefined;
  readonly message?: string | undefined;
  readonly originalMessage?: string | undefined;
  readonly shortMessage?: string | undefined;
  readonly signal?: string | undefined;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
  readonly timedOut?: boolean | undefined;
}

/** Describes one executable and its argument array. */
export interface CommandSpec {
  /** Executable name or path. */
  readonly command: string;
  /** Arguments passed directly to the executable. */
  readonly args: readonly string[];
}

/** Selects captured, logger-backed tee, or inherited child output. */
export type CommandOutputMode = "capture" | "tee" | "inherit";

/** Configures one command execution. */
export interface CommandRunOptions {
  /** Working directory for the child process. */
  readonly cwd?: string;
  /** Environment values merged over the parent process environment. */
  readonly env?: Readonly<NodeJS.ProcessEnv>;
  /** Child output handling mode. */
  readonly output?: CommandOutputMode;
  /** Optional payload written once to piped child stdin. */
  readonly input?: string | Uint8Array;
  /** Optional timeout after which the child is terminated. */
  readonly timeoutMs?: number;
  /** Optional cancellation signal. */
  readonly signal?: AbortSignal;
  /** Logger that receives child chunks in tee mode. */
  readonly logger?: MonorepositoryLogger;
}

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
  const args = command.args.map((argument) => (/\s/.test(argument) ? `"${argument}"` : argument));
  return [command.command, ...args].join(" ");
}

/**
 * Executes one command through Execa while preserving the shared command contract.
 *
 * @param command - Executable and arguments to run.
 * @param options - Execution options.
 * @returns The complete process result.
 */
async function runExecaCommand(command: Readonly<CommandSpec>, options: Readonly<CommandRunOptions>): Promise<CommandResult> {
  const outputMode = options.output ?? "capture";
  if (outputMode === "inherit" && options.input !== undefined) {
    throw new Error("Cannot supply input when output is inherited");
  }

  const startedAt = performance.now();
  if (options.signal?.aborted === true) {
    return {
      code: 1,
      stdout: "",
      stderr: "",
      durationMs: performance.now() - startedAt,
      timedOut: false,
    };
  }

  const environment = buildEnvironment(options.env);
  const stdoutWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stdout") : undefined;
  const stderrWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stderr") : undefined;
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  try {
    const subprocess = execa(command.command, [...command.args], {
      ...(options.cwd === undefined ? {} : {cwd: options.cwd}),
      env: environment,
      stdin: outputMode === "inherit" ? "inherit" : options.input === undefined ? "ignore" : "pipe",
      ...(options.input === undefined ? {} : {input: options.input}),
      reject: false,
      shell: false,
      preferLocal: false,
      cleanup: true,
      windowsHide: true,
      stripFinalNewline: false,
      ...(options.timeoutMs === undefined ? {} : {timeout: options.timeoutMs}),
      ...(options.signal === undefined ? {} : {cancelSignal: options.signal}),
      forceKillAfterDelay: 1_000,
      stdout: outputMode === "inherit" ? "inherit" : "pipe",
      stderr: outputMode === "inherit" ? "inherit" : "pipe",
    });

    if (outputMode === "tee") {
      subprocess.stdout?.on("data", (chunk: string | Uint8Array) => {
        const decoded = stdoutDecoder.write(Buffer.from(chunk));
        if (decoded.length > 0) {
          stdoutWriter?.write(decoded);
        }
      });

      subprocess.stderr?.on("data", (chunk: string | Uint8Array) => {
        const decoded = stderrDecoder.write(Buffer.from(chunk));
        if (decoded.length > 0) {
          stderrWriter?.write(decoded);
        }
      });
    }

    const result = await subprocess;
    return mapExecaSuccess(result, startedAt);
  } catch (error: unknown) {
    return mapExecaFailure(error, startedAt);
  } finally {
    if (outputMode === "tee") {
      const stdoutTail = stdoutDecoder.end();
      if (stdoutTail.length > 0) {
        stdoutWriter?.write(stdoutTail);
      }
      stdoutWriter?.end();

      const stderrTail = stderrDecoder.end();
      if (stderrTail.length > 0) {
        stderrWriter?.write(stderrTail);
      }
      stderrWriter?.end();
    }
  }
}

/**
 * Converts a resolved Execa result into the shared non-throwing command result.
 *
 * With `reject: false`, Execa always resolves (never rejects) for ordinary process
 * outcomes, including nonzero exits, timeouts, cancellations, and genuine startup
 * failures reported through its own result fields (for example a string `code` set
 * from an underlying Node.js system error). Only that resolved result is mapped here.
 *
 * @param result - Execa outcome for a subprocess that was started.
 * @param startedAt - Start time used when Execa did not report a duration.
 * @returns Shared command result.
 */
function mapExecaSuccess(result: ExecaResultLike, startedAt: number): CommandResult {
  const signal = typeof result.signal === "string" ? (result.signal as NodeJS.Signals) : undefined;
  const spawnError =
    typeof result.code === "string"
      ? (result.originalMessage ?? result.shortMessage ?? result.message ?? `spawn failed with ${result.code}`)
      : undefined;

  return {
    code: typeof result.exitCode === "number" ? result.exitCode : 1,
    stdout: normalizeOutput(result.stdout),
    stderr: normalizeOutput(result.stderr),
    durationMs: typeof result.durationMs === "number" ? result.durationMs : performance.now() - startedAt,
    timedOut: result.timedOut === true,
    ...(signal === undefined ? {} : {signal}),
    ...(spawnError === undefined ? {} : {spawnError}),
  };
}

/**
 * Converts a thrown exception into the shared non-throwing command result.
 *
 * Reaching this path means Execa itself could not be invoked (for example an option
 * validation failure) rather than reporting an ordinary resolved process outcome, so
 * the caught message always represents a startup failure and is preserved verbatim
 * in `spawnError`.
 *
 * @param error - Exception thrown while constructing or awaiting the subprocess.
 * @param startedAt - Start time used to compute the elapsed duration.
 * @returns Shared command result with `spawnError` populated.
 */
function mapExecaFailure(error: unknown, startedAt: number): CommandResult {
  return {
    code: 1,
    stdout: "",
    stderr: "",
    durationMs: performance.now() - startedAt,
    timedOut: false,
    spawnError: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Converts Execa output values into stable UTF-8 strings.
 *
 * @param output - Output value returned by Execa.
 * @returns Concatenated UTF-8 text.
 */
function normalizeOutput(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }
  if (output instanceof Uint8Array) {
    return Buffer.from(output).toString("utf8");
  }
  if (Array.isArray(output)) {
    return output.map((value) => normalizeOutput(value)).join("");
  }
  return "";
}

/**
 * Merges and normalizes process environment values for child-process execution.
 *
 * @param environmentOverrides - Optional environment overrides merged over the parent environment.
 * @returns Environment entries containing only string values.
 */
function buildEnvironment(environmentOverrides?: Readonly<NodeJS.ProcessEnv>): Readonly<Record<string, string>> {
  const mergedEnvironment = environmentOverrides === undefined ? process.env : {...process.env, ...environmentOverrides};
  const normalizedEntries = Object.entries(mergedEnvironment)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, typeof value === "string" ? value : String(value)] as const);

  return Object.fromEntries(normalizedEntries);
}

/** Default process-backed command runner. */
export const defaultCommandRunner: CommandRunner = {
  run: (command, options = {}) => runExecaCommand(command, options),
};
