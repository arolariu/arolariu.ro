/**
 * @fileoverview effect/cli `generate` subcommand routing into the legacy generation orchestrator.
 * @module scripts/commands/generate/cli
 *
 * @remarks
 * Decodes the variadic `task` argument (`env`, `i18n`, `gql`, `artifacts`, in any order) and the
 * global `--verbose` into a {@link GenerateInput} and runs the unmigrated orchestrator through
 * `runLegacy`. No task keeps the legacy no-selection input.
 */

import {Effect} from "effect";
import {Argument, Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {generateCommand, type GenerateInput, type GenerateTaskName} from "./index.ts";
import {VerboseFlag, withCommandOutput} from "../flags.ts";
import {runLegacy} from "../legacy.ts";

/** Every generator name accepted by the `task` argument. */
const generateTaskNames = ["env", "i18n", "gql", "artifacts"] as const satisfies readonly GenerateTaskName[];

/**
 * Builds the `generate` subcommand.
 *
 * @param invoker - The legacy generation invoker; tests pass a recording invoker.
 * @returns The `generate` subcommand.
 */
export function makeGenerateCommand(invoker: CommandInvoker<GenerateInput, unknown> = generateCommand): CliSubcommand {
  return Command.make(
    "generate",
    {
      tasks: Argument.Literals("task", generateTaskNames).pipe(
        Argument.withDescription("Generators to run: env, i18n, gql, or artifacts."),
        Argument.variadic(),
      ),
    },
    ({tasks}) =>
      Effect.gen(function* () {
        const verbose = yield* VerboseFlag;
        const selected = new Set<GenerateTaskName>(tasks);
        yield* runLegacy("generate", invoker, {
          verbose,
          env: selected.has("env"),
          i18n: selected.has("i18n"),
          gql: selected.has("gql"),
          artifacts: selected.has("artifacts"),
        });
      }).pipe(withCommandOutput("generate")),
  ).pipe(Command.withDescription("Generation orchestrator for monorepo build artifacts."));
}
