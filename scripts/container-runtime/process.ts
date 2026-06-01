/**
 * @fileoverview Process helpers for container runtime scripts.
 * @module scripts/container-runtime/process
 */

import {spawn} from "node:child_process";
import type {RuntimeCommand} from "./adapters.ts";

/** Output handling mode for child processes. */
export type CommandStdioMode = "pipe" | "tee" | "inherit";

/** Result of executing a runtime command. */
export interface ProcessResult {
  readonly code: number;
  readonly output: string;
}

/** Options that control runtime command execution. */
export interface CommandRunnerOptions {
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly stdio?: CommandStdioMode;
}

/** Abstraction over process execution used by runtime wrappers and tests. */
export interface CommandRunner {
  readonly run: (command: RuntimeCommand, options?: CommandRunnerOptions) => Promise<ProcessResult>;
}

/**
 * Formats a runtime command for diagnostics.
 *
 * @param command - Runtime command to format.
 * @returns A shell-like command string.
 */
export function formatCommand(command: RuntimeCommand): string {
  const args = command.args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg));
  return [command.command, ...args].join(" ");
}

/**
 * Creates a command runner that records commands without executing them.
 *
 * @returns A dry-run runner and the recorded command list.
 */
export function makeDryRunRunner(): CommandRunner & {readonly commands: readonly string[]} {
  const commands: string[] = [];

  return {
    commands,
    run: async (command) => {
      commands.push(formatCommand(command));
      return {code: 0, output: ""};
    },
  };
}

/** Default process-backed command runner for runtime wrappers. */
export const defaultRunner: CommandRunner = {
  run: (command, options) =>
    new Promise((resolve) => {
      const stdioMode = options?.stdio ?? "pipe";
      const child = spawn(command.command, [...command.args], {
        cwd: options?.cwd,
        env: options?.env === undefined ? process.env : {...process.env, ...options.env},
        stdio: stdioMode === "inherit" ? "inherit" : "pipe",
        windowsHide: true,
      });

      let output = "";

      child.stdout?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        if (stdioMode === "tee") {
          process.stdout.write(chunk);
        }
      });

      child.stderr?.on("data", (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        if (stdioMode === "tee") {
          process.stderr.write(chunk);
        }
      });

      child.on("close", (code) => {
        resolve({code: code ?? 1, output});
      });

      child.on("error", (error) => {
        resolve({code: 1, output: error.message});
      });
    }),
};
