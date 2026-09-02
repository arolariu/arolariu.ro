/**
 * @fileoverview Shared shell-spawn helpers for monorepo CLI workers.
 * @module scripts/workers/shell
 *
 * @remarks
 * Used by both format.worker.ts and lint.worker.ts to spawn child processes.
 * Centralizes:
 *   - Windows `.cmd` shim handling via `cmd.exe /c` (CVE-2024-27980 mitigation).
 *   - Tool-availability probing (`<cmd> --version`).
 *   - Ruff resolution with `python -m ruff` fallback for sandboxed Python installs
 *     (e.g. Microsoft Store Python).
 *
 * Each consumer worker imports these as functions; module-scope state
 * (the `cachedRuffInvocation` cache) is per-worker-process, which is the
 * desired lifetime — caching across runs of the same worker process is safe.
 */

import {defaultProcessRunner} from "../common/runner.execa.ts";

/**
 * Runs a command and captures merged stdout+stderr output.
 *
 * Automatically routes Windows .cmd shims (e.g. `npx`) through cmd.exe /c.
 * Real binaries (node, dotnet, ruff, python) are spawned directly.
 *
 * @param command The command to run
 * @param args Command arguments
 * @param opts Optional options (cwd)
 * @returns Promise with exit code and merged output
 */
export async function runCommand(
  command: string,
  args: readonly string[],
  opts?: Readonly<{cwd?: string}>,
): Promise<{code: number; output: string}> {
  const outcome = await defaultProcessRunner.run({command, args}, opts?.cwd === undefined ? undefined : {cwd: opts.cwd});

  return {
    code: outcome.kind === "succeeded" ? 0 : outcome.kind === "exited" ? outcome.exitCode : 1,
    output: outcome.stdout + outcome.stderr + (outcome.kind === "spawn-failed" ? outcome.message : ""),
  };
}

/**
 * Probes whether a CLI tool is available by attempting `<cmd> --version`.
 *
 * @param cmd The tool name (e.g. "ruff", "dotnet", "node")
 * @returns true if the tool exited with code 0
 */
export async function isToolAvailable(cmd: string): Promise<boolean> {
  const result = await runCommand(cmd, ["--version"]);
  return result.code === 0;
}

/**
 * Resolved ruff invocation as a non-empty tuple. The first element is the
 * executable; the rest is the arg prefix needed to invoke ruff (empty for
 * direct `ruff`, ["-m", "ruff"] when going through python).
 */
export type RuffInvocation = readonly [string, ...string[]];

/**
 * Resolves how to invoke ruff. Probe order:
 *   1. `ruff` on PATH (standard install via pipx or PATH-aware pip).
 *   2. `python -m ruff` (fallback for Microsoft Store Python or sandboxed installs).
 *
 * Cached at module scope for the lifetime of the worker process. Returns null
 * if ruff is not invokable through either path.
 *
 * @returns The ruff invocation tuple, or null if ruff is unavailable.
 */
let cachedRuffInvocation: RuffInvocation | null | undefined;

export async function resolveRuff(): Promise<RuffInvocation | null> {
  if (cachedRuffInvocation !== undefined) return cachedRuffInvocation;

  if (await isToolAvailable("ruff")) {
    cachedRuffInvocation = ["ruff"];
    return cachedRuffInvocation;
  }

  if (await isToolAvailable("python")) {
    const result = await runCommand("python", ["-m", "ruff", "--version"]);
    if (result.code === 0) {
      cachedRuffInvocation = ["python", "-m", "ruff"];
      return cachedRuffInvocation;
    }
  }

  cachedRuffInvocation = null;
  return cachedRuffInvocation;
}
