/**
 * @fileoverview Shared Commander adapter for monorepository scripts.
 * @module scripts.common.cli
 */

import {Command, CommanderError, type ParseOptions} from "commander";

import type {MonorepositoryLogger} from "./logger.ts";

/** Default slash-prefixed aliases recognized by every tool program. */
const defaultSlashAliases: Readonly<Record<string, string>> = {
  "/h": "--help",
  "/help": "--help",
};

/** Options used to construct a configured Commander program. */
export interface ToolProgramOptions {
  readonly name: string;
  readonly description: string;
  readonly usage?: string;
  readonly examples?: readonly string[];
  readonly logger: MonorepositoryLogger;
  readonly slashAliases?: Readonly<Record<string, string>>;
}

/**
 * Rewrites argv tokens when an exact slash alias is registered.
 *
 * @param argv - Raw argv tokens to normalize.
 * @param aliases - Optional exact-match slash alias map.
 * @returns Normalized argv tokens.
 */
export function normalizeSlashArguments(
  argv: readonly string[],
  aliases?: Readonly<Record<string, string>>,
): readonly string[] {
  const effectiveAliases: Readonly<Record<string, string>> = {
    ...defaultSlashAliases,
    ...(aliases ?? {}),
  };

  return argv.map((argument) => effectiveAliases[argument] ?? argument);
}

/**
 * Creates a Commander program wired to the shared logger and slash alias rules.
 *
 * @param options - Program metadata, output destination, and alias map.
 * @returns Configured Commander program.
 */
export function createToolProgram(options: Readonly<ToolProgramOptions>): Command {
  const program = new Command();

  program
    .name(options.name)
    .description(options.description)
    .usage(options.usage ?? "[options]")
    .showHelpAfterError()
    .exitOverride()
    .configureOutput({
      writeOut: (text) => options.logger.write(text, "stdout"),
      writeErr: (text) => options.logger.write(text, "stderr"),
    });

  if (options.examples !== undefined && options.examples.length > 0) {
    program.addHelpText("after", () =>
      [
        "",
        "Examples:",
        ...options.examples.map((example) => `  ${example}`),
      ].join("\n"),
    );
  }

  const parse = program.parse.bind(program);
  program.parse = ((argv?: readonly string[], parseOptions?: ParseOptions) => {
    const normalizedArguments = argv === undefined ? process.argv : argv;
    return parse([...normalizeSlashArguments(normalizedArguments, options.slashAliases)], parseOptions ?? {from: "node"});
  }) as Command["parse"];

  const parseAsync = program.parseAsync.bind(program);
  program.parseAsync = (async (argv?: readonly string[], parseOptions?: ParseOptions) => {
    const normalizedArguments = argv === undefined ? process.argv : argv;
    return parseAsync([...normalizeSlashArguments(normalizedArguments, options.slashAliases)], parseOptions ?? {from: "node"});
  }) as Command["parseAsync"];

  return program;
}

/**
 * Extracts the exit code from a Commander error, if present.
 *
 * @param error - Error raised by Commander or another subsystem.
 * @returns Exit code for Commander failures; otherwise null.
 */
export function commanderExitCode(error: unknown): number | null {
  if (error instanceof CommanderError) {
    return error.exitCode;
  }

  return null;
}
