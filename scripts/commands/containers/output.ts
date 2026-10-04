/**
 * @fileoverview Completion and child-exit rendering shared by the container command handlers.
 * @module scripts/commands/containers/output
 *
 * @remarks
 * Used by `containers build|run|compose` and `dev aspire`. {@link renderContainerCompletion}
 * renders a successful result; {@link reportChildExit} renders a non-zero exit of the engine or
 * AppHost child, whose own output the user already saw.
 */

import {Effect} from "effect";

import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import {processErrorEvidence, type ProcessExited} from "../../platform/Process.ts";

/**
 * Reads the executable of a formatted process command (its first, possibly quoted, token).
 *
 * @param command - The command as rendered by `formatProcessRequest`.
 * @returns The executable name or path.
 */
function executableOf(command: string): string {
  if (command.startsWith('"')) {
    const match = /^"((?:[^"\\]|\\.)*)"/u.exec(command);
    return (match?.[1] ?? command).replaceAll('\\"', '"');
  }
  const space = command.indexOf(" ");
  return space === -1 ? command : command.slice(0, space);
}

/**
 * Reports a non-zero exit of a child whose output the user already saw.
 *
 * @remarks
 * The child ran with inherited or tee output, so in human mode its own diagnostics are already on
 * screen and the root renderer would repeat them as `stdout:`/`stderr:` evidence. Instead this
 * writes, in `--json` mode, the single failure document
 * `{status: "failed", kind: "operational", message, evidence}` (the shape of the root renderer's
 * document, with the process evidence), then renders one `<tool> exited with code <n>` diagnostic
 * through `Presenter.fatal`, and fails with `ReportedFailure{exitCode: 1}` carrying the same
 * message. Use it with `Effect.catchTag("ProcessExited", reportChildExit)`.
 *
 * @param error - The child exit.
 * @returns An effect rendering the diagnostic and failing with the reported failure.
 */
export function reportChildExit(error: ProcessExited): Effect.Effect<never, ReportedFailure, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const message = `${executableOf(error.command)} exited with code ${String(error.exitCode)}`;
    yield* Effect.orDie(presenter.json({status: "failed", kind: "operational", message, evidence: [...processErrorEvidence(error)]}));
    yield* presenter.fatal(message);
    return yield* new ReportedFailure({exitCode: 1, message});
  });
}

/**
 * Renders the successful completion of a container command.
 *
 * @param result - The command result, written as the JSON document in `--json` mode.
 * @param message - The human success line.
 * @returns An effect rendering the completion.
 */
export function renderContainerCompletion(result: unknown, message: string): Effect.Effect<void, never, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    yield* Effect.orDie(presenter.json(toJsonValue(result)));
    yield* presenter.success(message);
  });
}
