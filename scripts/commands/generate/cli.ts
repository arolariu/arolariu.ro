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

import {Effect, Option} from "effect";
import {Argument, Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {Environment} from "../../platform/Environment.ts";
import {reportUsageFailure, ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {JsonFlag, VerboseFlag, withCommandOutput} from "../flags.ts";
import {generateTaskDisplayName, runGenerate, type GenerateInput, type GenerateResult, type GenerateTaskName} from "./index.ts";
import {prepareWebsiteLicenses} from "./prepare-website-licenses.ts";
import {checkTaxonomies} from "./taxonomy-check.ts";
import {refreshTaxonomies} from "./taxonomy-refresh.ts";

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
      checkTaxonomies: Flag.Boolean("check-taxonomies").pipe(
        Flag.withDefault(false),
        Flag.withDescription("Check the integrity and age of the Git-tracked taxonomy snapshots."),
      ),
      refreshTaxonomies: Flag.Boolean("refresh-taxonomies").pipe(
        Flag.withDefault(false),
        Flag.withDescription("Fetch fresh taxonomy candidates for review without modifying the checkout snapshots."),
      ),
      outputDir: Flag.String("output-dir").pipe(
        Flag.optional,
        Flag.withDescription("New candidate directory for --refresh-taxonomies; its parent must exist."),
      ),
      websiteLicensesOnly: Flag.Boolean("website-licenses-only").pipe(
        Flag.withDefault(false),
        Flag.withDescription("Generate only website attribution from the repository working directory; do not select other tasks."),
      ),
      tasks: Argument.Literals("task", generateTaskNames).pipe(
        Argument.withDescription("Generators to run: env, i18n, gql, or artifacts."),
        Argument.variadic(),
      ),
    },
    ({tasks, websiteLicensesOnly, checkTaxonomies: check, refreshTaxonomies: refresh, outputDir}) =>
      Effect.gen(function* () {
        if ((check && refresh) || ((check || refresh) && (websiteLicensesOnly || tasks.length > 0))) {
          return yield* reportUsageFailure(
            "Taxonomy modes cannot be combined with each other, generator tasks, or --website-licenses-only.",
          );
        }
        if (!refresh && Option.isSome(outputDir)) {
          return yield* reportUsageFailure("--output-dir is only valid with --refresh-taxonomies.");
        }
        if (check) return yield* checkTaxonomies(yield* JsonFlag);
        if (refresh) {
          if (Option.isNone(outputDir) || outputDir.value.trim() === "") {
            return yield* reportUsageFailure("--refresh-taxonomies requires --output-dir <new-directory>.");
          }
          const environment = yield* Environment;
          const presenter = yield* Presenter;
          const result = yield* refreshTaxonomies(environment.cwd, outputDir.value).pipe(
            Effect.catch((error) =>
              Effect.andThen(
                presenter.fatal(error.message.replace(/[\r\n]/gu, " ")),
                new ReportedFailure({exitCode: 1, message: error.message}),
              ),
            ),
          );
          for (const {candidate, added, removed, changed} of result.taxonomies) {
            yield* presenter.line(
              "stdout",
              `${candidate.system}: ${added.length} added, ${removed.length} removed, ${changed.length} changed.`,
            );
          }
          yield* presenter.success(`Review ${result.reportPath} before promoting any candidates. Pinned snapshots were not modified.`);
          yield* Effect.orDie(presenter.json(toJsonValue(result)));
          return;
        }
        if (websiteLicensesOnly) {
          if (tasks.length > 0) {
            return yield* reportUsageFailure("--website-licenses-only cannot be combined with generator tasks.");
          }
          const environment = yield* Environment;
          const paths = yield* prepareWebsiteLicenses(environment.cwd);
          const presenter = yield* Presenter;
          yield* presenter.json(toJsonValue({paths}));
          return;
        }
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
