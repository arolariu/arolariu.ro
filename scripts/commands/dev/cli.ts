/**
 * @fileoverview effect/cli `dev` command group running the Effect Aspire and selfhost programs.
 * @module scripts/commands/dev/cli
 *
 * @remarks
 * `dev` has no handler of its own, so running it alone prints help. `dev aspire` decodes `--engine`
 * into a {@link ContainerEngineInput} and runs {@link runAspire}; `dev selfhost [start|stop|logs]`
 * (default `start`) decodes the action and `--engine` into a {@link SelfhostInput} and runs
 * {@link runSelfhost} with the {@link LocalBlobStorageLive} layer, which only this handler provides.
 * Each renders its result as the single JSON document (`--json`) or the legacy success line; a
 * non-zero exit of a child whose output the user already saw becomes `ReportedFailure{exitCode: 1}`
 * through {@link reportChildExit}.
 */

import {Effect, type Layer} from "effect";
import {Argument, Command} from "effect/cli";

import type {CliSubcommand} from "../../cli.ts";
import {runAspire} from "../../container-runtime/aspire.ts";
import {LocalBlobStorageLive, type LocalBlobStorage} from "../../container-runtime/selfhost.bootstrap.ts";
import {runSelfhost} from "../../container-runtime/selfhost.ts";
import type {ContainerEngineInput, SelfhostAction, SelfhostInput} from "../../container-runtime/types.ts";
import {renderContainerCompletion, reportChildExit} from "../containers/output.ts";
import {EngineFlag, engineInput, withCommandOutput} from "../flags.ts";

/** Every action accepted by the `dev selfhost` `action` argument. */
const selfhostActions = ["start", "stop", "logs"] as const satisfies readonly SelfhostAction[];

/** Options of {@link makeDevCommand}. */
export interface DevCommandOptions {
  /** Blob storage layer `dev selfhost` provisions Azurite through; defaults to {@link LocalBlobStorageLive}. */
  readonly localBlobStorage?: Layer.Layer<LocalBlobStorage>;
}

/**
 * Builds the `dev` command group.
 *
 * @param options - Optional blob storage layer override; tests pass a recording layer.
 * @returns The `dev` group with its `aspire` and `selfhost` subcommands.
 */
export function makeDevCommand(options: DevCommandOptions = {}): CliSubcommand {
  const localBlobStorage = options.localBlobStorage ?? LocalBlobStorageLive;
  const aspire = Command.make("aspire", {engine: EngineFlag}, ({engine}) =>
    Effect.gen(function* () {
      const input: ContainerEngineInput = engineInput(engine);
      const result = yield* runAspire(input);
      yield* renderContainerCompletion(result, `Aspire AppHost exited successfully for engine '${result.engine}'.`);
    }).pipe(Effect.catchTag("ProcessExited", reportChildExit), withCommandOutput("aspire")),
  ).pipe(Command.withDescription("Starts the Aspire AppHost with the selected local container engine."));
  const selfhost = Command.make(
    "selfhost",
    {
      action: Argument.Literals("action", selfhostActions).pipe(
        Argument.withDescription("Selfhost action: start, stop, or logs."),
        Argument.withDefault("start"),
      ),
      engine: EngineFlag,
    },
    ({action, engine}) =>
      Effect.gen(function* () {
        const input: SelfhostInput = {action, ...engineInput(engine)};
        const result = yield* runSelfhost(input);
        yield* renderContainerCompletion(result, `Selfhost ${result.action} completed for engine '${result.engine}'.`);
      }).pipe(Effect.catchTag("ProcessExited", reportChildExit), Effect.provide(localBlobStorage), withCommandOutput("selfhost")),
  ).pipe(Command.withDescription("Runs selfhost container orchestration for the selected local engine."));
  return Command.make("dev").pipe(Command.withDescription("Local development environments."), Command.withSubcommands([aspire, selfhost]));
}
