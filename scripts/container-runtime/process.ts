/**
 * @fileoverview Process helpers for container runtime scripts.
 * @module scripts/container-runtime/process
 */

import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {
  defaultCommandRunner,
  formatCommand as formatCommonCommand,
  type CommandRunOptions,
  type CommandRunner as CommonCommandRunner,
} from "../common/process.ts";
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
  readonly logger?: MonorepositoryLogger;
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
  return formatCommonCommand(command);
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

/**
 * Adapts the shared command result to the legacy container-runtime shape.
 *
 * @param runner - Shared command runner to adapt.
 * @returns A container-runtime compatible command runner.
 */
export function adaptCommandRunner(runner: CommonCommandRunner): CommandRunner {
  return {
    run: async (command, options) => {
      const output = options?.stdio === "pipe" ? "capture" : (options?.stdio ?? "capture");
      const compatibilityLogger =
        output === "tee" ? (options?.logger ?? new MonorepositoryConsoleLogger("container::process")) : options?.logger;
      const commonOptions: CommandRunOptions = {
        output,
        ...(options?.cwd === undefined ? {} : {cwd: options.cwd}),
        ...(options?.env === undefined ? {} : {env: options.env}),
        ...(compatibilityLogger === undefined ? {} : {logger: compatibilityLogger}),
      };
      const result = await runner.run(command, commonOptions);

      return {
        code: result.code,
        output: result.stdout + result.stderr + (result.spawnError === undefined ? "" : result.spawnError),
      };
    },
  };
}

/** Default process-backed command runner for runtime wrappers. */
export const defaultRunner: CommandRunner = adaptCommandRunner(defaultCommandRunner);
