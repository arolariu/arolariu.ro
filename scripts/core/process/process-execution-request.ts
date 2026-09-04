/**
 * @fileoverview Engine-neutral process execution request and invocation options.
 * @module scripts/core/process/process-execution-request
 *
 * @remarks
 * This module owns the vocabulary of *what* is executed and *how* one invocation is configured.
 * It never spawns, inspects, or terminates anything, and it never names a process engine.
 */

import type {TerminalPresenter} from "../presentation/terminal-presenter.ts";

/** Describes one executable and its argument vector. */
export interface ProcessExecutionRequest {
  /** Executable name or path. */
  readonly command: string;
  /** Arguments passed directly to the executable. */
  readonly args: readonly string[];
}

/** Selects captured, tee, or inherited child output behavior. */
type ProcessExecutionOutputMode = "capture" | "tee" | "inherit";

/** Defines invocation-specific environment overrides. */
export type ProcessEnvironment = Readonly<Record<string, string | undefined>>;

/** Configures one process invocation. */
export interface ProcessExecutionOptions {
  /** Working directory for the child process. */
  readonly cwd?: string;
  /** Environment values merged over inherited defaults. */
  readonly env?: ProcessEnvironment;
  /** Child output handling mode. */
  readonly output?: ProcessExecutionOutputMode;
  /** Optional payload written once to piped child stdin. */
  readonly input?: string | Uint8Array;
  /** Optional timeout after which the child is terminated. */
  readonly timeoutMs?: number;
  /** Optional cancellation signal. */
  readonly signal?: AbortSignal;
  /** Presenter used for tee output and command diagnostics. */
  readonly presenter?: TerminalPresenter;
  /** Whether the formatted command is echoed before execution. */
  readonly logCommands?: boolean;
}

/**
 * Formats a request for diagnostics without including stdin or environment values.
 *
 * @param request - Process execution request to render.
 * @returns Shell-like command text.
 */
export function formatProcessExecutionRequest(request: Readonly<ProcessExecutionRequest>): string {
  return [request.command, ...request.args].map(formatProcessToken).join(" ");
}

function formatProcessToken(token: string): string {
  if (token.length === 0 || /\s/u.test(token) || token.includes('"')) {
    return `"${token.replaceAll('"', '\\"')}"`;
  }

  return token;
}
