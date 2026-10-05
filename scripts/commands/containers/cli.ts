/**
 * @fileoverview effect/cli `containers` command group running the Effect image and Compose programs.
 * @module scripts/commands/containers/cli
 *
 * @remarks
 * `containers` has no handler of its own, so running it alone prints help. `containers build` and
 * `containers run` decode the required `--target` and `--engine` into an {@link ImageInput} and run
 * {@link runImage}; `containers compose` decodes the required `--file`, `--engine`, and every
 * argument after `--` into a {@link ComposeInput} and runs {@link runCompose}. Compose without
 * passthrough arguments keeps the legacy usage failure (exit `2`), rendered by `reportUsageFailure`
 * (in `--json` mode, as the single usage failure document). A completion renders the result
 * as the single JSON document (`--json`) or the legacy success line; a non-zero engine CLI exit
 * becomes `ReportedFailure{exitCode: 1}` (see `reportChildExit` in `./output.ts`).
 */

import {Effect} from "effect";
import {Argument, Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {COMPOSE_USAGE_MESSAGE, runCompose} from "../../container-runtime/compose.ts";
import {runImage} from "../../container-runtime/image.ts";
import type {ComposeInput, ImageAction, ImageTarget} from "../../container-runtime/types.ts";
import {reportUsageFailure} from "../../platform/exit.ts";
import {EngineFlag, engineInput, withCommandOutput} from "../flags.ts";
import {renderContainerCompletion, reportChildExit} from "./output.ts";

/** Every image target accepted by `--target`. */
const imageTargets = ["frontend", "backend", "cv", "exp"] as const satisfies readonly ImageTarget[];

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
        if (passthrough.length === 0) {
          return yield* reportUsageFailure(COMPOSE_USAGE_MESSAGE);
        }
        const input: ComposeInput = {file, passthrough, ...engineInput(engine)};
        const result = yield* runCompose(input);
        yield* renderContainerCompletion(result, `Compose completed for '${result.file}' with engine '${result.engine}'.`);
      }).pipe(Effect.catchTag("ProcessExited", reportChildExit), withCommandOutput("compose")),
  ).pipe(Command.withDescription("Runs an arbitrary Compose file through the selected local container engine."));
  return Command.make("containers").pipe(
    Command.withDescription("Local container images and Compose stacks."),
    Command.withSubcommands([makeImageCommand("build"), makeImageCommand("run"), compose]),
  );
}
