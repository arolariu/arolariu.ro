/**
 * @fileoverview effect/cli `doctor` subcommand running the Effect doctor program.
 * @module scripts/commands/doctor/cli
 *
 * @remarks
 * Decodes `--quick` and the global `--verbose` into a {@link DoctorInput}, runs {@link runDoctor}
 * with the live {@link NetworkProbeLive}, and renders the completion: the report as the single JSON
 * document in `--json` mode, otherwise the legacy human report. A report with any failed diagnostic
 * then fails with `ReportedFailure{exitCode: 1}`, the legacy completion exit rule.
 */

import {Effect} from "effect";
import {Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {VerboseFlag, withCommandOutput} from "../flags.ts";
import {hasFailedDiagnostics, runDoctor} from "./index.ts";
import {NetworkProbeLive} from "./NetworkProbe.ts";
import {renderDoctorReport} from "./reporter.ts";
import type {DoctorInput, DoctorReport} from "./types.ts";

/**
 * Renders the completion of one doctor run.
 *
 * @remarks
 * Writes the report as the JSON document (JSON mode only) and as the human report (human mode
 * only), then fails with `ReportedFailure{exitCode: 1}` when any diagnostic failed.
 *
 * @param report - The doctor report.
 * @param input - The doctor input; `verbose` renders all evidence in full.
 * @returns An effect rendering the completion.
 */
export function renderDoctorCompletion(
  report: Readonly<DoctorReport>,
  input: Readonly<DoctorInput>,
): Effect.Effect<void, ReportedFailure, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    yield* Effect.orDie(presenter.json(toJsonValue(report)));
    yield* renderDoctorReport(report, {verbose: input.verbose});
    if (hasFailedDiagnostics(report)) {
      return yield* new ReportedFailure({exitCode: 1, message: `Doctor found ${String(report.summary.failed)} failing diagnostic(s).`});
    }
  });
}

/**
 * Builds the `doctor` subcommand.
 *
 * @returns The `doctor` subcommand.
 */
export function makeDoctorCommand(): CliSubcommand {
  return Command.make(
    "doctor",
    {
      quick: Flag.Boolean("quick").pipe(Flag.withDefault(false), Flag.withDescription("Skip slower and network-dependent checks.")),
    },
    ({quick}) =>
      Effect.gen(function* () {
        const verbose = yield* VerboseFlag;
        const input: DoctorInput = {quick, verbose};
        yield* renderDoctorCompletion(yield* runDoctor(input), input);
      }).pipe(Effect.provide(NetworkProbeLive), withCommandOutput("doctor")),
  ).pipe(Command.withDescription("Runs read-only workspace health diagnostics across every bounded context."));
}
