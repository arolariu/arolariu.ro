/**
 * @fileoverview Shared cross-platform command execution for monorepository scripts.
 * @module scripts/common/process
 */

import {constants as fileSystemConstants} from "node:fs";
import {EventEmitter, setMaxListeners} from "node:events";
import {access} from "node:fs/promises";
import {delimiter, isAbsolute, join, resolve as resolvePath} from "node:path";
import {StringDecoder} from "node:string_decoder";
import {execa} from "execa";
import type {MonorepositoryLogger} from "./logger.ts";

const DEFAULT_WINDOWS_COMMAND_EXTENSIONS = [".COM", ".EXE", ".BAT", ".CMD"] as const;
const COMMAND_NOT_FOUND_CODE = "ENOENT";
const PATH_LIKE_COMMAND = /[\\/]/;

interface ExecaResultLike {
  readonly code?: string | number;
  readonly durationMs?: number;
  readonly exitCode?: number;
  readonly message?: string;
  readonly originalMessage?: string;
  readonly shortMessage?: string;
  readonly signal?: string;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
  readonly timedOut?: boolean;
}

class CompatibleAbortSignal extends EventEmitter {
  readonly #listenerCallbacks = new WeakMap<object, EventListener>();
  public aborted = false;
  public reason: unknown;

  public addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = this.resolveListenerCallback(listener);
    this.on(type, callback);
  }

  public removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = this.resolveListenerCallback(listener);
    this.off(type, callback);
  }

  public dispatchEvent(event: Event): boolean {
    return this.emit(event.type, event);
  }

  public throwIfAborted(): void {
    if (this.aborted) {
      throw this.reason ?? createAbortReason();
    }
  }

  public get [Symbol.toStringTag](): string {
    return "AbortSignal";
  }

  private resolveListenerCallback(listener: EventListenerOrEventListenerObject): EventListener {
    if (typeof listener === "function") {
      return listener;
    }

    const existingCallback = this.#listenerCallbacks.get(listener);
    if (existingCallback !== undefined) {
      return existingCallback;
    }

    const callback = listener.handleEvent.bind(listener);
    this.#listenerCallbacks.set(listener, callback);
    return callback;
  }
}

class CompatibleAbortController {
  public readonly signal = new CompatibleAbortSignal();

  public abort(reason?: unknown): void {
    if (this.signal.aborted) {
      return;
    }

    this.signal.aborted = true;
    this.signal.reason = reason ?? createAbortReason();
    this.signal.dispatchEvent(new Event("abort"));
  }
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
  const spawnError = await findMissingExecutableMessage(command.command, environment, options.cwd);
  if (spawnError !== undefined) {
    return {
      code: 1,
      stdout: "",
      stderr: "",
      durationMs: performance.now() - startedAt,
      timedOut: false,
      spawnError,
    };
  }

  const stdoutWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stdout") : undefined;
  const stderrWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stderr") : undefined;
  const stdoutDecoder = new StringDecoder("utf8");
  const stderrDecoder = new StringDecoder("utf8");

  try {
    const subprocess = runWithCompatibleAbortController(() =>
      execa(command.command, [...command.args], {
        ...(options.cwd === undefined ? {} : {cwd: options.cwd}),
        env: environment,
        stdin: options.input === undefined ? "ignore" : "pipe",
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
      }),
    );

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
    return mapExecaResult(result, startedAt);
  } catch (error: unknown) {
    return mapExecaResult(error, startedAt);
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
 * Converts an Execa result or error into the shared non-throwing command result.
 *
 * @param result - Execa outcome or thrown error.
 * @param startedAt - Start time used when Execa did not report a duration.
 * @returns Shared command result.
 */
function mapExecaResult(result: unknown, startedAt: number): CommandResult {
  if (!isExecaResultLike(result)) {
    return {
      code: 1,
      stdout: "",
      stderr: "",
      durationMs: performance.now() - startedAt,
      timedOut: false,
      ...(result instanceof Error ? {spawnError: result.message} : {spawnError: String(result)}),
    };
  }

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
 * Detects commands that cannot be started before invoking Execa.
 *
 * @param command - Executable name or path.
 * @param environment - Fully merged process environment.
 * @param cwd - Optional working directory used for relative command paths.
 * @returns The legacy ENOENT message when the command is missing.
 */
async function findMissingExecutableMessage(
  command: string,
  environment: Readonly<Record<string, string>>,
  cwd?: string,
): Promise<string | undefined> {
  const candidates = buildCommandCandidates(command, environment, cwd);
  for (const candidate of candidates) {
    try {
      await access(candidate, fileSystemConstants.F_OK);
      return undefined;
    } catch {
      // Continue searching additional PATH and PATHEXT candidates.
    }
  }

  return `spawn ${command} ${COMMAND_NOT_FOUND_CODE}`;
}

/**
 * Expands one command into the host-specific candidate file paths Execa can start.
 *
 * @param command - Executable name or path.
 * @param environment - Fully merged process environment.
 * @param cwd - Optional working directory used for relative command paths.
 * @returns Candidate absolute or PATH-relative file paths.
 */
function buildCommandCandidates(
  command: string,
  environment: Readonly<Record<string, string>>,
  cwd?: string,
): readonly string[] {
  const commandCandidates = process.platform === "win32"
    ? buildWindowsCommandCandidates(command, environment)
    : [command];

  if (isPathLikeCommand(command)) {
    const basePath = isAbsolute(command) ? command : resolvePath(cwd ?? process.cwd(), command);
    return process.platform === "win32"
      ? buildWindowsCommandCandidates(basePath, environment)
      : [basePath];
  }

  const pathDirectories = readEnvironmentValue(environment, "PATH")
    ?.split(delimiter)
    .filter((directory) => directory.length > 0)
    ?? [];

  return pathDirectories.flatMap((directory) => commandCandidates.map((candidate) => join(directory, candidate)));
}

/**
 * Expands a Windows command into extension-aware candidate file names.
 *
 * @param command - Executable name or path.
 * @param environment - Fully merged process environment.
 * @returns Candidate file names or paths.
 */
function buildWindowsCommandCandidates(command: string, environment: Readonly<Record<string, string>>): readonly string[] {
  const extensions = readEnvironmentValue(environment, "PATHEXT")
    ?.split(";")
    .map((extension) => extension.trim())
    .filter((extension) => extension.length > 0)
    ?? [...DEFAULT_WINDOWS_COMMAND_EXTENSIONS];
  const normalizedExtensions = extensions.map((extension) => extension.toLowerCase());
  const normalizedCommand = command.toLowerCase();
  if (normalizedExtensions.some((extension) => normalizedCommand.endsWith(extension))) {
    return [command];
  }

  return [command, ...extensions.map((extension) => `${command}${extension}`)];
}

/**
 * Reads one environment value with Windows-compatible case-insensitive lookup.
 *
 * @param environment - Environment object to search.
 * @param key - Variable name to read.
 * @returns The configured value when present.
 */
function readEnvironmentValue(environment: Readonly<Record<string, string>>, key: string): string | undefined {
  const directValue = environment[key];
  if (directValue !== undefined || process.platform !== "win32") {
    return directValue;
  }

  const matchedEntry = Object.entries(environment).find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
  return matchedEntry?.[1];
}

/**
 * Determines whether a command should be resolved as a filesystem path.
 *
 * @param command - Executable name or path.
 * @returns `true` when the command includes an explicit path.
 */
function isPathLikeCommand(command: string): boolean {
  return isAbsolute(command) || PATH_LIKE_COMMAND.test(command);
}

/**
 * Runs one operation with a Node-compatible AbortController when the global one is incompatible.
 *
 * @param operation - Operation that constructs the Execa subprocess.
 * @returns The operation result.
 */
function runWithCompatibleAbortController<T>(operation: () => T): T {
  if (canUseGlobalAbortController()) {
    return operation();
  }

  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "AbortController");
  Object.defineProperty(globalThis, "AbortController", {
    configurable: true,
    writable: true,
    value: CompatibleAbortController,
  });

  try {
    return operation();
  } finally {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, "AbortController");
      return;
    }

    Object.defineProperty(globalThis, "AbortController", descriptor);
  }
}

/**
 * Determines whether the current global AbortController is compatible with Execa's Node event helpers.
 *
 * @returns `true` when Node event utilities accept the global AbortSignal implementation.
 */
function canUseGlobalAbortController(): boolean {
  try {
    setMaxListeners(Infinity, new AbortController().signal);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates the default abort reason used by the compatibility shim.
 *
 * @returns Abort reason matching the platform default as closely as possible.
 */
function createAbortReason(): Error {
  return typeof DOMException === "function"
    ? new DOMException("This operation was aborted", "AbortError")
    : new Error("This operation was aborted");
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

/**
 * Narrows unknown values to the Execa result shape used by the shared runner.
 *
 * @param value - Unknown value to inspect.
 * @returns `true` when the value exposes Execa result fields.
 */
function isExecaResultLike(value: unknown): value is ExecaResultLike {
  return typeof value === "object" && value !== null;
}

/** Default process-backed command runner. */
export const defaultCommandRunner: CommandRunner = {
  run: (command, options = {}) => runExecaCommand(command, options),
};
