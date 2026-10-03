/**
 * @fileoverview effect/cli `containers` command group routing into the legacy image and Compose commands.
 * @module scripts/commands/containers/cli
 *
 * @remarks
 * `containers` has no handler of its own, so running it alone prints help. `containers build` and
 * `containers run` decode the required `--target` and `--engine` into an {@link ImageInput};
 * `containers compose` decodes the required `--file`, `--engine`, and every argument after `--`
 * into a {@link ComposeInput}. Compose without passthrough arguments keeps the legacy usage failure
 * (exit `2`). All three run the unmigrated commands through `runLegacy`.
 */

import {Effect} from "effect";
import {Argument, Command, Flag} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {CommandInputError, type CommandInvoker} from "../../common/commander.ts";
import {COMPOSE_USAGE_MESSAGE, composeCommand} from "../../container-runtime/compose.ts";
import {imageCommand} from "../../container-runtime/image.ts";
import type {ComposeInput, ImageAction, ImageInput, ImageTarget} from "../../container-runtime/types.ts";
import {EngineFlag, engineInput, withCommandOutput} from "../flags.ts";
import {decodeInput, runLegacy} from "../legacy.ts";

/** Every image target accepted by `--target`. */
const imageTargets = ["frontend", "backend", "cv", "exp"] as const satisfies readonly ImageTarget[];

/** Legacy invokers the `containers` subcommands run; tests pass recording invokers. */
export interface ContainersInvokers {
  /** Invoker of `containers build` and `containers run`; defaults to the legacy image command. */
  readonly image?: CommandInvoker<ImageInput, unknown>;
  /** Invoker of `containers compose`; defaults to the legacy Compose command. */
  readonly compose?: CommandInvoker<ComposeInput, unknown>;
}

/**
 * Builds one image subcommand.
 *
 * @param action - The image action the subcommand runs.
 * @param invoker - The legacy image invoker.
 * @returns The `build` or `run` subcommand.
 */
function makeImageCommand(action: ImageAction, invoker: CommandInvoker<ImageInput, unknown>): CliSubcommand {
  return Command.make(
    action,
    {
      target: Flag.Literals("target", imageTargets).pipe(Flag.withDescription("Image target: frontend, backend, cv, or exp.")),
      engine: EngineFlag,
    },
    ({target, engine}) => runLegacy("image", invoker, {action, target, ...engineInput(engine)}).pipe(withCommandOutput("image")),
  ).pipe(Command.withDescription("Builds or runs a local container image with the selected engine."));
}

/**
 * Builds the `containers` command group.
 *
 * @param invokers - Optional legacy invoker overrides.
 * @returns The `containers` group with its `build`, `run`, and `compose` subcommands.
 */
export function makeContainersCommand(invokers: ContainersInvokers = {}): CliSubcommand {
  const imageInvoker = invokers.image ?? imageCommand;
  const composeInvoker = invokers.compose ?? composeCommand;
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
        yield* runLegacy("compose", composeInvoker, input);
      }).pipe(withCommandOutput("compose")),
  ).pipe(Command.withDescription("Runs an arbitrary Compose file through the selected local container engine."));
  return Command.make("containers").pipe(
    Command.withDescription("Local container images and Compose stacks."),
    Command.withSubcommands([makeImageCommand("build", imageInvoker), makeImageCommand("run", imageInvoker), compose]),
  );
}
