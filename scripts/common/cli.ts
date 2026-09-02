/**
 * @fileoverview Shared Commander adapter for monorepository scripts.
 * @module scripts.common.cli
 *
 * @remarks
 * Transitional compatibility facade retained only for commands that have not yet been migrated to
 * the declarative host in `commander.ts`. Alias normalization is delegated to that host so both
 * paths share one behavior; no new consumer may be added here.
 */

import {Command, CommanderError, type ParseOptions} from "commander";

import {normalizeSlashArguments} from "./commander.ts";
import type {MonorepositoryLogger} from "./logger.ts";

export {normalizeSlashArguments};

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

  const {examples} = options;
  if (examples !== undefined && examples.length > 0) {
    program.addHelpText("after", () =>
      [
        "",
        "Examples:",
        ...examples.map((example) => `  ${example}`),
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
