/**
 * @fileoverview effect/cli `containers` command group running the Effect image and Compose programs.
 * @module scripts/commands/containers/cli
 *
 * @remarks
 * `containers` has no handler of its own, so running it alone prints help. `containers build` and
 * `containers run` decode the required `--target` and `--engine` into an {@link ImageInput} and run
 * {@link runImage}; `containers compose` decodes the required `--file`, `--engine`, and every
 * argument after `--` into a {@link ComposeInput} and runs {@link runCompose}. Compose without
 * passthrough arguments keeps the legacy usage failure (exit `2`). A completion renders the result
 * as the single JSON document (`--json`) or the legacy success line; a non-zero engine CLI exit
 * becomes `ReportedFailure{exitCode: 1}` (see {@link reportChildExit}).
 */

import {Effect} from "effect";
import {Argument, Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {CommandInputError} from "../../common/commander.ts";
import {COMPOSE_USAGE_MESSAGE, runCompose} from "../../container-runtime/compose.ts";
import {runImage} from "../../container-runtime/image.ts";
import type {ComposeInput, ImageAction, ImageTarget} from "../../container-runtime/types.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import {Presenter, toJsonValue} from "../../platform/Output.ts";
import type {ProcessExited} from "../../platform/Process.ts";
import {EngineFlag, engineInput, withCommandOutput} from "../flags.ts";
import {decodeInput} from "../legacy.ts";

/** Every image target accepted by `--target`. */
const imageTargets = ["frontend", "backend", "cv", "exp"] as const satisfies readonly ImageTarget[];

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
 * The child ran with inherited or tee output, so its own diagnostics are already on screen; the
 * root renderer would repeat them as `stdout:`/`stderr:` evidence. Instead this renders one
 * `<tool> exited with code <n>` diagnostic through `Presenter.fatal` and fails with
 * `ReportedFailure{exitCode: 1}` carrying the same message. Use it with
 * `Effect.catchTag("ProcessExited", reportChildExit)`.
 *
 * @param error - The child exit.
 * @returns An effect rendering the diagnostic and failing with the reported failure.
 */
export function reportChildExit(error: ProcessExited): Effect.Effect<never, ReportedFailure, Presenter> {
  return Effect.gen(function* () {
    const message = `${executableOf(error.command)} exited with code ${String(error.exitCode)}`;
    yield* (yield* Presenter).fatal(message);
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

/**
 * Builds one image subcommand.
 *
 * @param action - The image action the subcommand runs.
 * @returns The `build` or `run` subcommand.
 */
function makeImageCommand(action: ImageAction): CliSubcommand {
  return Command.make(
    action,
    {
      target: Flag.Literals("target", imageTargets).pipe(Flag.withDescription("Image target: frontend, backend, cv, or exp.")),
      engine: EngineFlag,
    },
    ({target, engine}) =>
      Effect.gen(function* () {
        const result = yield* runImage({action, target, ...engineInput(engine)});
        yield* renderContainerCompletion(
          result,
          `Image ${result.action} completed for target '${result.target}' with engine '${result.engine}'.`,
        );
      }).pipe(Effect.catchTag("ProcessExited", reportChildExit), withCommandOutput("image")),
  ).pipe(Command.withDescription("Builds or runs a local container image with the selected engine."));
}

/**
 * Builds the `containers` command group.
 *
 * @returns The `containers` group with its `build`, `run`, and `compose` subcommands.
 */
export function makeContainersCommand(): CliSubcommand {
  const compose = Command.make(
    "compose",
    {
      file: Flag.String("file").pipe(Flag.withDescription("Compose file to invoke.")),
      engine: EngineFlag,
      passthrough: Argument.String("passthrough").pipe(
        Argument.withDescription("Arguments forwarded to Compose unchanged after --."),
        Argument.variadic(),
      ),
    },
    ({file, engine, passthrough}) =>
      Effect.gen(function* () {
        const input = yield* decodeInput((): ComposeInput => {
          if (passthrough.length === 0) {
            throw new CommandInputError(COMPOSE_USAGE_MESSAGE);
          }
          return {file, passthrough, ...engineInput(engine)};
        });
        const result = yield* runCompose(input);
        yield* renderContainerCompletion(result, `Compose completed for '${result.file}' with engine '${result.engine}'.`);
      }).pipe(Effect.catchTag("ProcessExited", reportChildExit), withCommandOutput("compose")),
  ).pipe(Command.withDescription("Runs an arbitrary Compose file through the selected local container engine."));
  return Command.make("containers").pipe(
    Command.withDescription("Local container images and Compose stacks."),
    Command.withSubcommands([makeImageCommand("build"), makeImageCommand("run"), compose]),
  );
}
