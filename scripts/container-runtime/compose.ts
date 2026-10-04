/**
 * @fileoverview Engine-aware Compose helper program for local spin-ups.
 * @module scripts/container-runtime/compose
 *
 * @remarks
 * {@link runCompose} resolves the container engine, runs the shared preflight, and invokes the
 * engine's Compose provider through the Effect `Process` service with tee output, so tests script
 * every process instead of spawning Docker or Podman. Cancellation is fiber interruption, which
 * terminates the Compose process tree.
 */

import {Effect} from "effect";

import type {PlatformServices} from "../platform/layers.ts";
import type {ProcessError} from "../platform/Process.ts";
import {runEchoedRuntimeCommand, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {prepareContainerEngine} from "./preflight.ts";
import type {ComposeInput, ComposeResult, ContainerRuntimeError} from "./types.ts";

/** Options for invoking an arbitrary Compose file through the selected engine. */
export interface ComposeOptions {
  readonly file: string;
  readonly args: readonly string[];
}

/** Usage message shared by every Compose input validation failure. */
export const COMPOSE_USAGE_MESSAGE = "Use --file <compose-file> -- <compose arguments>";

/**
 * Builds an engine-owned Compose command.
 *
 * @param adapter - Selected runtime adapter.
 * @param options - Compose file and arguments.
 * @returns Runtime command for invoking Compose.
 */
export function buildComposeCommand(adapter: ContainerRuntimeAdapter, options: ComposeOptions): RuntimeCommand {
  return adapter.compose(["-f", options.file, ...options.args]);
}

/**
 * Runs an arbitrary Compose file through the resolved local container engine.
 *
 * @remarks
 * Preflight runs first; Compose then runs as exactly `compose -f <file> ...passthrough` through the
 * engine adapter, echoed as `$ <command>` and with tee output.
 *
 * @param input - Typed command input.
 * @returns The engine, file, and pass-through arguments Compose ran with, failing with
 * {@link ContainerRuntimeError} when the engine cannot be resolved or preflight fails, and with a
 * {@link ProcessError} when Compose fails.
 */
export const runCompose: (
  input: Readonly<ComposeInput>,
) => Effect.Effect<ComposeResult, ContainerRuntimeError | ProcessError, PlatformServices> = Effect.fn("containers.compose")(function* (
  input: Readonly<ComposeInput>,
) {
  const adapter = yield* prepareContainerEngine(input, "compose");
  yield* runEchoedRuntimeCommand(buildComposeCommand(adapter, {file: input.file, args: input.passthrough}));
  return {engine: adapter.engine, file: input.file, passthrough: input.passthrough};
});
