/**
 * @fileoverview effect/cli `setup` subcommand routing into the legacy setup command.
 * @module scripts/commands/setup/cli
 *
 * @remarks
 * Decodes `--dry-run`, `--yes`, `--engine`, and the global `--verbose` into a {@link SetupInput} and
 * runs the unmigrated setup command through `runLegacy`.
 */

import {Effect} from "effect";
import {Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {setupCommand} from "../../setup.ts";
import type {SetupInput} from "../../setup.types.ts";
import {EngineFlag, engineInput, VerboseFlag, withCommandOutput} from "../flags.ts";
import {runLegacy} from "../legacy.ts";

/**
 * Builds the `setup` subcommand.
 *
 * @param invoker - The legacy setup invoker; tests pass a recording invoker.
 * @returns The `setup` subcommand.
 */
export function makeSetupCommand(invoker: CommandInvoker<SetupInput, unknown> = setupCommand): CliSubcommand {
  return Command.make(
    "setup",
    {
      dryRun: Flag.Boolean("dry-run").pipe(
        Flag.withDefault(false),
        Flag.withDescription("Plan every phase mutation without executing it."),
      ),
      yes: Flag.Boolean("yes").pipe(Flag.withDefault(false), Flag.withDescription("Approve system-scoped mutations without prompting.")),
      engine: EngineFlag,
    },
    ({dryRun, yes, engine}) =>
      Effect.gen(function* () {
        const verbose = yield* VerboseFlag;
        yield* runLegacy("setup", invoker, {verbose, dryRun, yes, ...engineInput(engine)});
      }).pipe(withCommandOutput("setup")),
  ).pipe(
    Command.withDescription(
      "Prepares a fresh checkout end to end: workspace dependencies, generated artifacts, and the .NET, React, Svelte, Python, and local infrastructure toolchains.",
    ),
  );
}
