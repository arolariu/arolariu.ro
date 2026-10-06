/**
 * @fileoverview effect/cli `generate` subcommand running the Effect generation orchestrator.
 * @module scripts/commands/generate/cli
 *
 * @remarks
 * Decodes the variadic `task` argument (`env`, `i18n`, `gql`, `artifacts`, in any order) and the
 * global `--verbose` into a {@link GenerateInput}, runs {@link runGenerate}, and renders the legacy
 * completion: the stop line plus `ReportedFailure{exitCode: 1}` when a task failed, otherwise the
 * success lines. No task keeps the legacy no-selection behavior (warning and tip, exit `0`). In
 * `--json` mode the {@link GenerateResult} is the single JSON document.
 */

import {Effect} from "effect";
import {Argument, Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {VerboseFlag, withCommandOutput} from "../flags.ts";
import {generateTaskDisplayName, runGenerate, type GenerateInput, type GenerateResult, type GenerateTaskName} from "./index.ts";

/** Every generator name accepted by the `task` argument. */
const generateTaskNames = ["env", "i18n", "gql", "artifacts"] as const satisfies readonly GenerateTaskName[];

/**
 * Renders the completion of one generation run.
 *
 * @remarks
 * Writes the result as the JSON document (JSON mode only). A failed task logs
 * `Generation stopped at the <displayName> task.` and fails with `ReportedFailure{exitCode: 1}`; a
 * run without selection renders nothing more; otherwise the legacy success lines follow.
 *
 * @param result - The orchestrator result.
 * @returns An effect rendering the completion.
 */
export function renderGenerateCompletion(result: Readonly<GenerateResult>): Effect.Effect<void, ReportedFailure, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    yield* Effect.orDie(presenter.json(toJsonValue(result)));

    if (result.failed !== undefined) {
      const message = `Generation stopped at the ${generateTaskDisplayName(result.failed)} task.`;
      yield* Effect.logError(message);
      return yield* new ReportedFailure({exitCode: 1, message});
    }
    if (result.selected.length === 0) {
      return;
    }

    yield* presenter.line("stdout", "");
    yield* presenter.success("All requested generation tasks completed.");
    yield* presenter.line("stdout", `   Executed ${String(result.completed.length)} task(s).`);
  });
}

/**
 * Builds the `generate` subcommand.
 *
 * @returns The `generate` subcommand.
 */
export function makeGenerateCommand(): CliSubcommand {
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
        const input: GenerateInput = {
          verbose,
          env: selected.has("env"),
          i18n: selected.has("i18n"),
          gql: selected.has("gql"),
          artifacts: selected.has("artifacts"),
        };
        yield* renderGenerateCompletion(yield* runGenerate(input));
      }).pipe(withCommandOutput("generate")),
  ).pipe(Command.withDescription("Generation orchestrator for monorepo build artifacts."));
}
