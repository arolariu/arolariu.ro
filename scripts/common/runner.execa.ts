/**
 * @fileoverview Execa-backed process runner boundary for monorepository scripts.
 * @module scripts/common/runner.execa
 */

import {basename} from "node:path";
import {StringDecoder} from "node:string_decoder";
import {execa} from "execa";

import {AbstractProcessRunner, type ProcessEnvironment, type ProcessOutcome, type ProcessRequest, type ProcessRunOptions, type ProcessRunner} from "./runner.ts";

interface ExecaResultLike {
  readonly code?: string | number | undefined;
  readonly durationMs?: number | undefined;
  readonly exitCode?: number | undefined;
  readonly isCanceled?: boolean | undefined;
  readonly isTerminated?: boolean | undefined;
  readonly message?: string | undefined;
  readonly originalMessage?: string | undefined;
  readonly shortMessage?: string | undefined;
  readonly signal?: NodeJS.Signals | undefined;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
  readonly timedOut?: boolean | undefined;
}

/** Minimal Node.js `ChildProcess` spawn metadata used for Windows fallback detection. */
interface NodeChildProcessSpawnInfo {
  readonly spawnfile?: string;
  readonly spawnargs?: readonly string[];
}

/**
 * Stable dependencies for the Execa-backed process runner.
 */
export interface ExecaProcessRunnerOptions {
  /** Environment merged under invocation overrides. */
  readonly baseEnvironment: ProcessEnvironment;
  /** Platform used for Windows unresolved-command fallback detection. */
  readonly platform: NodeJS.Platform;
  /** Monotonic clock used for fallback duration measurement. */
  readonly monotonicNow: () => number;
}

interface ExecaExecutionContext extends ExecaProcessRunnerOptions {}

/**
 * Execa-backed implementation of the shared process runner contract.
 */
export class ExecaProcessRunner extends AbstractProcessRunner {
  readonly #baseEnvironment: ProcessEnvironment;
  readonly #platform: NodeJS.Platform;
  readonly #monotonicNow: () => number;

  public constructor(options: Readonly<Partial<ExecaProcessRunnerOptions>> = {}) {
    super();
    this.#baseEnvironment = options.baseEnvironment ?? process.env;
    this.#platform = options.platform ?? process.platform;
    this.#monotonicNow = options.monotonicNow ?? (() => performance.now());
  }

  protected override execute(
    request: Readonly<ProcessRequest>,
    options: Readonly<ProcessRunOptions>,
  ): Promise<ProcessOutcome> {
    if (options.signal?.aborted === true) {
      return Promise.resolve({kind: "cancelled", stdout: "", stderr: "", durationMs: 0});
    }

    return runExeca(request, options, {
      baseEnvironment: this.#baseEnvironment,
      platform: this.#platform,
      monotonicNow: this.#monotonicNow,
    });
  }
}

/** Default Execa-backed process runner. */
export const defaultProcessRunner: ProcessRunner = new ExecaProcessRunner();

async function runExeca(
  request: Readonly<ProcessRequest>,
  options: Readonly<ProcessRunOptions>,
  context: Readonly<ExecaExecutionContext>,
): Promise<ProcessOutcome> {
  const outputMode = options.output ?? "capture";
  const startedAt = context.monotonicNow();
  const environment = buildEnvironment(context.baseEnvironment, options.env);
  const stdoutWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stdout") : undefined;
  const stderrWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stderr") : undefined;
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  try {
    const subprocess = execa(request.command, [...request.args], {
      ...(options.cwd === undefined ? {} : {cwd: options.cwd}),
      env: environment,
      stdin: outputMode === "inherit" ? "inherit" : options.input === undefined ? "ignore" : "pipe",
      ...(options.input === undefined ? {} : {input: options.input}),
      reject: false,
      shell: false,
      preferLocal: false,
      cleanup: true,
      windowsHide: true,
      extendEnv: false,
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
    return mapExecaOutcome(result, startedAt, request, subprocess.nodeChildProcess, context);
  } catch (error: unknown) {
    return mapExecaFailure(error, startedAt, context);
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

function mapExecaOutcome(
  result: Readonly<ExecaResultLike>,
  startedAt: number,
  request: Readonly<ProcessRequest>,
  nodeChildProcess: Readonly<NodeChildProcessSpawnInfo> | undefined,
  context: Readonly<ExecaExecutionContext>,
): ProcessOutcome {
  const durationMs = typeof result.durationMs === "number" ? result.durationMs : context.monotonicNow() - startedAt;
  const stdout = normalizeOutput(result.stdout);
  const stderr = normalizeOutput(result.stderr);
  const signal = result.signal;

  if (result.isCanceled === true) {
    return {
      kind: "cancelled",
      stdout,
      stderr,
      durationMs,
      ...(signal === undefined ? {} : {signal}),
    };
  }

  if (result.timedOut === true) {
    return {
      kind: "timed-out",
      stdout,
      stderr,
      durationMs,
      ...(signal === undefined ? {} : {signal}),
    };
  }

  if (result.isTerminated === true && signal !== undefined) {
    return {
      kind: "signalled",
      signal,
      stdout,
      stderr,
      durationMs,
    };
  }

  const spawnFailureMessage = resolveSpawnFailureMessage(result, request, nodeChildProcess, context.platform);
  if (spawnFailureMessage !== undefined) {
    return {
      kind: "spawn-failed",
      message: spawnFailureMessage,
      stdout,
      stderr,
      durationMs,
    };
  }

  if (result.exitCode === 0) {
    return {
      kind: "succeeded",
      exitCode: 0,
      stdout,
      stderr,
      durationMs,
    };
  }

  if (typeof result.exitCode === "number") {
    return {
      kind: "exited",
      exitCode: result.exitCode,
      stdout,
      stderr,
      durationMs,
    };
  }

  return {
    kind: "spawn-failed",
    message: result.originalMessage ?? result.shortMessage ?? result.message ?? "Process failed to start",
    stdout,
    stderr,
    durationMs,
  };
}

function mapExecaFailure(
  error: unknown,
  startedAt: number,
  context: Readonly<ExecaExecutionContext>,
): ProcessOutcome {
  return {
    kind: "spawn-failed",
    message: error instanceof Error ? error.message : String(error),
    stdout: "",
    stderr: "",
    durationMs: context.monotonicNow() - startedAt,
  };
}

function resolveSpawnFailureMessage(
  result: Readonly<ExecaResultLike>,
  request: Readonly<ProcessRequest>,
  nodeChildProcess: Readonly<NodeChildProcessSpawnInfo> | undefined,
  platform: NodeJS.Platform,
): string | undefined {
  if (typeof result.code === "string") {
    return result.originalMessage ?? result.shortMessage ?? result.message ?? `spawn failed with ${result.code}`;
  }

  if (isUnresolvedWindowsCommand(request, nodeChildProcess, platform)) {
    return `spawn ${request.command} ENOENT`;
  }

  return undefined;
}

/** Matches `cmd.exe` (any casing, with or without extension) as a spawned file's basename. */
const WINDOWS_CMD_SHELL_BASENAME = /^cmd(?:\.exe)?$/i;

/** Matches a `cmd.exe` command line beginning with an absolute Windows path (drive-letter or UNC). */
const WINDOWS_RESOLVED_COMMAND_LINE_PREFIX = /^"(?:[A-Za-z]:[\\/]|\\\\)/;

function isUnresolvedWindowsCommand(
  request: Readonly<ProcessRequest>,
  nodeChildProcess: Readonly<NodeChildProcessSpawnInfo> | undefined,
  platform: NodeJS.Platform,
): boolean {
  if (platform !== "win32" || /[\\/]/.test(request.command)) {
    return false;
  }

  const spawnfile = nodeChildProcess?.spawnfile;
  if (typeof spawnfile !== "string" || !WINDOWS_CMD_SHELL_BASENAME.test(basename(spawnfile))) {
    return false;
  }

  const commandLine = nodeChildProcess?.spawnargs?.at(-1);
  return typeof commandLine === "string" && !WINDOWS_RESOLVED_COMMAND_LINE_PREFIX.test(commandLine);
}

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

function buildEnvironment(
  baseEnvironment: Readonly<ProcessEnvironment>,
  environmentOverrides?: Readonly<ProcessEnvironment>,
): Readonly<Record<string, string>> {
  const mergedEnvironment: Record<string, string | undefined> = {
    ...baseEnvironment,
    ...(environmentOverrides ?? {}),
  };
  const normalizedEnvironment: Record<string, string> = {};

  for (const [key, value] of Object.entries(mergedEnvironment)) {
    if (value !== undefined) {
      normalizedEnvironment[key] = value;
    }
  }

  return normalizedEnvironment;
}
