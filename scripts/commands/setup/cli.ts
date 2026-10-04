/**
 * @fileoverview effect/cli `setup` subcommand running the Effect setup program.
 * @module scripts/commands/setup/cli
 *
 * @remarks
 * Decodes `--dry-run`, `--yes`, `--engine`, and the global `--verbose` into a {@link SetupInput},
 * runs {@link runSetup}, and renders the completion: the result as the single JSON document in
 * `--json` mode, otherwise the legacy summary table, degraded capabilities, next actions, and
 * readiness banner. A run whose readiness is `failed` (a required phase failed, or was skipped by a
 * blocking dependency or outside a dry run) then fails with `ReportedFailure{exitCode: 1}`, the
 * legacy exit rule.
 */

import {Effect} from "effect";
import {Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {EngineFlag, engineInput, VerboseFlag, withCommandOutput} from "../flags.ts";
import {runSetup, setupOutcome, type SetupResult, type SetupRunRequirements} from "./index.ts";
import {formatSetupDuration} from "./runner.ts";
import type {SetupInput} from "./types.ts";

/** The setup program the subcommand runs for one decoded input. */
export type SetupProgram = (input: SetupInput) => Effect.Effect<SetupResult, never, SetupRunRequirements>;

/**
 * Renders the completion of one setup run.
 *
 * @remarks
 * Writes the result as the JSON document (JSON mode only), then the `Setup summary` table
 * (`Phase`, `Status`, `Duration`, `Summary`), a `Degraded capabilities` section warning each
 * degraded summary, a numbered `Next actions` section, and the readiness banner (human mode only).
 * A `failed` readiness then fails with `ReportedFailure{exitCode: 1}`.
 *
 * @param result - A result returned by the setup program.
 * @returns An effect rendering the completion; it dies for a result no setup run produced.
 */
export function renderSetupCompletion(result: SetupResult): Effect.Effect<void, ReportedFailure, Presenter> {
  return Effect.gen(function* () {
    const outcome = setupOutcome(result);
    if (outcome === undefined) {
      return yield* Effect.die(new Error("The setup result carries no recorded readiness."));
    }
    const presenter = yield* Presenter;
    yield* Effect.orDie(presenter.json(toJsonValue(result)));

    yield* presenter.section("Setup summary");
    yield* presenter.table({
      headers: ["Phase", "Status", "Duration", "Summary"],
      rows: result.phases.map((phase) => [phase.id, phase.status, formatSetupDuration(phase.durationMs), phase.summary]),
    });

    const degradedResults = result.phases.filter((phase) => phase.status === "degraded");
    if (degradedResults.length > 0) {
      yield* presenter.section("Degraded capabilities");
      for (const degradedResult of degradedResults) {
        yield* Effect.logWarning(degradedResult.summary);
      }
    }

    const nextActions = result.phases.flatMap((phase) => phase.nextActions);
    if (nextActions.length > 0) {
      yield* presenter.section("Next actions");
      for (const [index, nextAction] of nextActions.entries()) {
        yield* presenter.line("stdout", `${String(index + 1)}. ${nextAction}`);
      }
    }

    yield* presenter.banner(
      outcome === "failed"
        ? "Setup failed. Resolve the reported failures, then rerun setup."
        : outcome === "degraded"
          ? "Setup is ready with degraded capabilities."
          : "Setup is ready.",
    );
    if (outcome === "failed") {
      return yield* new ReportedFailure({exitCode: 1, message: "Setup failed. Resolve the reported failures, then rerun setup."});
    }
  });
}

/**
 * Builds the `setup` subcommand.
 *
 * @param program - The setup program; tests pass `runSetupWith(<phases>)`.
 * @returns The `setup` subcommand.
 */
export function makeSetupCommand(program: SetupProgram = runSetup): CliSubcommand {
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
        yield* renderSetupCompletion(yield* program({verbose, dryRun, yes, ...engineInput(engine)}));
      }).pipe(withCommandOutput("setup")),
  ).pipe(
    Command.withDescription(
      "Prepares a fresh checkout end to end: workspace dependencies, generated artifacts, and the .NET, React, Svelte, Python, and local infrastructure toolchains.",
    ),
  );
}
