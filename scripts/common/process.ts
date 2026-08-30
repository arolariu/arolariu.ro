/**
 * @fileoverview Shared cross-platform command execution for monorepository scripts.
 * @module scripts/common/process
 */

import {spawn} from "node:child_process";
import {StringDecoder} from "node:string_decoder";
import type {MonorepositoryLogger} from "./logger.ts";

const WINDOWS_COMMAND_SHIMS: ReadonlySet<string> = new Set(["npm", "npx", "pnpm", "yarn"]);
const WINDOWS_COMMAND_METACHARACTERS = /[&|^<>"]/;
const TERMINATION_GRACE_MS = 1_000;

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
 * Resolves npm-family Windows command shims through `cmd.exe`.
 *
 * @param command - Executable and arguments to resolve.
 * @param platform - Target process platform.
 * @returns A command safe to pass to `spawn`.
 * @throws When a Windows shim argument contains an unsupported cmd.exe metacharacter.
 */
export function resolveSpawnCommand(command: Readonly<CommandSpec>, platform: NodeJS.Platform = process.platform): CommandSpec {
  if (platform !== "win32" || !WINDOWS_COMMAND_SHIMS.has(command.command.toLowerCase())) {
    return {
      command: command.command,
      args: command.args,
    };
  }

  const unsafeArgument = command.args.find((argument) => WINDOWS_COMMAND_METACHARACTERS.test(argument));
  if (unsafeArgument !== undefined) {
    throw new Error(`Unsafe Windows command-shim argument: ${unsafeArgument}`);
  }

  return {
    command: "cmd.exe",
    args: ["/d", "/s", "/c", command.command, ...command.args],
  };
}

/**
 * Executes one already-resolved command.
 *
 * @param command - Spawn-ready executable and arguments.
 * @param options - Execution options with a fully merged environment.
 * @returns The complete process result.
 */
async function runSpawnedCommand(command: Readonly<CommandSpec>, options: Readonly<CommandRunOptions>): Promise<CommandResult> {
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

  return new Promise<CommandResult>((resolve) => {
    const child = spawn(command.command, [...command.args], {
      cwd: options.cwd,
      env: options.env,
      stdio: outputMode === "inherit" ? "inherit" : [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");
    const stdoutWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stdout") : undefined;
    const stderrWriter = outputMode === "tee" ? options.logger?.createStreamWriter("stderr") : undefined;
    let timedOut = false;
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;
    let escalationTimeout: NodeJS.Timeout | undefined;
    let terminationStarted = false;

    const cleanup = (): void => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      if (escalationTimeout !== undefined) {
        clearTimeout(escalationTimeout);
      }
      options.signal?.removeEventListener("abort", abort);
    };

    const settle = (code: number | null, signal: NodeJS.Signals | null, spawnError?: string): void => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
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

      const result: CommandResult = {
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        durationMs: performance.now() - startedAt,
        timedOut,
        ...(signal === null ? {} : {signal}),
        ...(spawnError === undefined ? {} : {spawnError}),
      };
      resolve(result);
    };

    function terminate(forTimeout: boolean): void {
      if (settled || terminationStarted) {
        return;
      }

      terminationStarted = true;
      if (forTimeout) {
        timedOut = true;
      } else if (timeout !== undefined) {
        clearTimeout(timeout);
        timeout = undefined;
      }

      child.kill("SIGTERM");
      if (!settled) {
        escalationTimeout = setTimeout(() => {
          if (!settled) {
            child.kill("SIGKILL");
          }
        }, TERMINATION_GRACE_MS);
      }
    }

    function abort(): void {
      terminate(false);
    }

    child.stdout?.on("data", (data: Buffer) => {
      stdoutChunks.push(Buffer.from(data));
      if (outputMode === "tee") {
        const chunk = stdoutDecoder.write(data);
        if (chunk.length > 0) {
          stdoutWriter?.write(chunk);
        }
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderrChunks.push(Buffer.from(data));
      if (outputMode === "tee") {
        const chunk = stderrDecoder.write(data);
        if (chunk.length > 0) {
          stderrWriter?.write(chunk);
        }
      }
    });

    child.once("close", (code, signal) => {
      settle(code, signal);
    });

    child.once("error", (error) => {
      settle(1, null, error.message);
    });

    if (options.timeoutMs !== undefined) {
      timeout = setTimeout(() => {
        timeout = undefined;
        terminate(true);
      }, options.timeoutMs);
    }

    if (options.signal !== undefined) {
      options.signal.addEventListener("abort", abort, {once: true});
      if (options.signal.aborted) {
        abort();
      }
    }

    if (options.input !== undefined) {
      child.stdin?.once("error", () => undefined);
      child.stdin?.end(options.input);
    }
  });
}

/** Default process-backed command runner. */
export const defaultCommandRunner: CommandRunner = {
  run: (command, options = {}) => {
    const startedAt = performance.now();
    let resolvedCommand: CommandSpec;
    try {
      resolvedCommand = resolveSpawnCommand(command);
    } catch (error) {
      return Promise.resolve({
        code: 1,
        stdout: "",
        stderr: "",
        durationMs: performance.now() - startedAt,
        timedOut: false,
        spawnError: error instanceof Error ? error.message : String(error),
      });
    }

    return runSpawnedCommand(resolvedCommand, {
      ...options,
      env: options.env === undefined ? process.env : {...process.env, ...options.env},
    });
  },
};
