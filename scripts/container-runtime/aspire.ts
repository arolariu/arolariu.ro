/**
 * @fileoverview Engine-aware Aspire AppHost startup program.
 * @module scripts/container-runtime/aspire
 *
 * @remarks
 * {@link runAspire} resolves the container engine, runs the shared preflight, and starts the
 * AppHost through the Effect `Process` service with inherited output, so tests script every
 * process instead of spawning Docker, Podman, or AppHost. Cancellation is fiber interruption,
 * which terminates the AppHost process tree.
 */

import {Effect} from "effect";

import {Environment} from "../platform/Environment.ts";
import type {PlatformServices} from "../platform/layers.ts";
import {Process, type ProcessError} from "../platform/Process.ts";
import type {ContainerRuntimeAdapter} from "./adapters.ts";
import {prepareContainerEngine} from "./preflight.ts";
import type {AspireResult, ContainerEngineInput, ContainerRuntimeError} from "./types.ts";

/** Aspire AppHost command with runtime-specific environment. */
export interface AspireCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string | undefined>>;
}

/**
 * Builds the Aspire AppHost command for the selected container engine.
 *
 * @param adapter - Selected runtime adapter.
 * @param baseEnvironment - Environment values merged under the Aspire runtime override.
 * @returns Command and environment for starting AppHost.
 */
export function buildAspireCommand(
  adapter: ContainerRuntimeAdapter,
  baseEnvironment: Readonly<Record<string, string | undefined>>,
): AspireCommand {
  return {
    command: "dotnet",
    args: ["run", "--project", "tooling/AppHost"],
    env: {
      ...baseEnvironment,
      DOTNET_ASPIRE_CONTAINER_RUNTIME: adapter.aspireRuntime,
    },
  };
}

/**
 * Starts Aspire AppHost with the resolved local container engine.
 *
 * @remarks
 * Preflight runs first; AppHost then runs with inherited output and the `Environment` variables
 * merged under `DOTNET_ASPIRE_CONTAINER_RUNTIME`.
 *
 * @param input - Typed command input.
 * @returns The engine Aspire AppHost ran with, failing with {@link ContainerRuntimeError} when the
 * engine cannot be resolved or preflight fails, and with a {@link ProcessError} when AppHost fails.
 */
export const runAspire: (
  input: Readonly<ContainerEngineInput>,
) => Effect.Effect<AspireResult, ContainerRuntimeError | ProcessError, PlatformServices> = Effect.fn("containers.aspire")(function* (
  input: Readonly<ContainerEngineInput>,
) {
  const adapter = yield* prepareContainerEngine(input, "aspire");
  const environment = yield* Environment;
  const command = buildAspireCommand(adapter, environment.variables);
  const runner = yield* Process;
  yield* runner.run({command: command.command, args: command.args}, {env: command.env, output: "inherit"});
  return {engine: adapter.engine};
});
