/**
 * @fileoverview effect/cli `test` command group running the Effect Newman E2E runner.
 * @module scripts/commands/e2e/cli
 *
 * @remarks
 * `test` has no handler of its own, so running it alone prints help. `test e2e <target>` decodes the
 * required target (`all`, `backend`, `frontend`, or `cv`) into an {@link E2EInput} and runs
 * {@link runE2e}. A completion renders as the single JSON document (`--json`) or the legacy success
 * line; a {@link NewmanFailed} renders through {@link reportNewmanFailure}.
 */

import {Effect} from "effect";
import {Argument, Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter} from "../../platform/Output.ts";
import {renderContainerCompletion} from "../containers/output.ts";
import {withCommandOutput} from "../flags.ts";
import type {NewmanFailed} from "./errors.ts";
import {runE2e, type E2EInput, type E2ETarget} from "./index.ts";

/** Every target accepted by the `target` argument. */
const e2eTargets = ["all", "backend", "frontend", "cv"] as const satisfies readonly E2ETarget[];

/**
 * Whether an evidence line is captured Newman output, which human mode already wrote.
 *
 * @param line - One evidence line.
 * @returns `true` for a `stdout: …` or `stderr: …` line.
 */
function isNewmanOutputEvidence(line: string): boolean {
  return line.startsWith("stdout: ") || line.startsWith("stderr: ");
}

/**
 * Reports a Newman failure whose evidence is already redacted.
 *
 * @remarks
 * In `--json` mode this writes the single failure document
 * `{status: "failed", kind: "operational", message, evidence}`. In human mode it writes one
 * `[arolariu::test:e2e] ⛔ <message>` line, then each evidence line that is not captured Newman
 * output (which was already written) on stderr. It then fails with `ReportedFailure{exitCode: 1}`.
 *
 * @param error - The Newman failure.
 * @returns An effect rendering the failure and failing with the reported failure.
 */
function reportNewmanFailure(error: NewmanFailed): Effect.Effect<never, ReportedFailure, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    yield* Effect.orDie(presenter.json({status: "failed", kind: "operational", message: error.message, evidence: [...error.evidence]}));
    yield* presenter.fatal(error.message);
    for (const line of error.evidence.filter((entry) => !isNewmanOutputEvidence(entry))) {
      yield* presenter.line("stderr", line);
    }
    return yield* new ReportedFailure({exitCode: 1, message: error.message});
  });
}

/**
 * Builds the `test` command group.
 *
 * @returns The `test` group with its `e2e` subcommand.
 */
export function makeE2eCommand(): CliSubcommand {
  const e2e = Command.make(
    "e2e",
    {target: Argument.Literals("target", e2eTargets).pipe(Argument.withDescription("E2E target: all, backend, frontend, or cv."))},
    ({target}) =>
      Effect.gen(function* () {
        const input: E2EInput = {target};
        const result = yield* runE2e(input);
        yield* renderContainerCompletion(
          result,
          `Completed ${String(result.completed.length)} of ${String(result.targets.length)} E2E target(s): ${result.completed.join(", ")}.`,
        );
      }).pipe(Effect.catchTag("NewmanFailed", reportNewmanFailure), withCommandOutput("test:e2e")),
  ).pipe(Command.withDescription("Runs Postman/Newman E2E tests for arolariu.ro targets."));
  return Command.make("test").pipe(Command.withDescription("Repository test suites."), Command.withSubcommands([e2e]));
}
