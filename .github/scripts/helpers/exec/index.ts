/**
 * @fileoverview Checked command execution layered over the native exec API.
 * @module github/scripts/helpers/exec
 *
 * @remarks
 * Use the SDK facade for caller-controlled exit handling. This convenience
 * requires a zero exit, retaining output for diagnosis instead of turning
 * operational failure into empty successful data.
 */
import {getExecOutput, type ExecOptions, type ExecOutput} from "../sdk/exec.ts";

/** Native options other than the exit policy this operation explicitly owns. */
export type CheckedExecOptions = Omit<ExecOptions, "ignoreReturnCode">;

/** Captured command failure; native startup/listener failures escape unchanged. */
export class CommandExecutionError extends Error {
  readonly command: string;
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;

  /**
   * Retains a nonzero result without automatically printing its potentially sensitive output.
   * @param command - Executable or native command-line input.
   * @param output - Captured nonzero execution result.
   */
  constructor(command: string, output: ExecOutput) {
    super(`Command '${command}' exited with code ${output.exitCode}`);
    this.name = "CommandExecutionError";
    this.command = command;
    this.exitCode = output.exitCode;
    this.stdout = output.stdout;
    this.stderr = output.stderr;
  }
}

/**
 * Captures a command result and requires successful completion.
 * @param command - Native executable/command-line input; prefer a separate argument vector.
 * @param args - Arguments copied before passing them to the native SDK.
 * @param options - Native stream, listener, cwd, environment, and input options.
 * @returns The native output after a zero exit.
 * @throws {CommandExecutionError} When the process returns a nonzero exit.
 * @throws Native startup/stream/listener errors without replacing their identity.
 */
export async function execChecked(
  command: string,
  args: readonly string[],
  options: Readonly<CheckedExecOptions> = {},
): Promise<ExecOutput> {
  const result = await getExecOutput(command, [...args], {...options, ignoreReturnCode: true});
  if (result.exitCode !== 0) throw new CommandExecutionError(command, result);
  return result;
}
