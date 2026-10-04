/**
 * @fileoverview Engine-aware Compose helper command for local spin-ups.
 * @module scripts/container-runtime/compose
 *
 * @remarks
 * Every ambient effect this command used to reach for directly (the child process, the
 * repository filesystem, and the process environment) now arrives through the injected
 * {@link CommandContext.runtime} instead of Node globals, so the command is fully exercised by
 * the declarative command runtime's test fakes and never spawns Docker or Podman in a test.
 */

import {Effect} from "effect";

import {MonorepoCommand, type CommandContext, type CommandRuntimeFactory} from "../common/commander.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {RunnerError} from "../common/runner.ts";
import {commandCancellationFromSignal} from "../common/runtime.ts";
import {runEffectOrThrow} from "../platform/bridge.ts";
import {withLogContext} from "../platform/Output.ts";
import type {ContainerRuntimeAdapter, RuntimeCommand} from "./adapters.ts";
import {runContainerPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import type {ComposeInput, ComposeResult} from "./types.ts";

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
 * @param context - Command context whose runtime owns every ambient capability.
 * @param input - Typed command input.
 * @returns The engine, file, and pass-through arguments Compose ran with.
 * @throws When the engine cannot be resolved, preflight fails, or Compose exits with a nonzero
 * code.
 */
async function executeCompose(context: Readonly<CommandContext>, input: Readonly<ComposeInput>): Promise<ComposeResult> {
  const {runtime} = context;
  const paths = await resolveRepositoryPaths(import.meta.url, runtime.files);
  // cohort 6 temporary: Task 6.3 runs selection and preflight directly in the Effect-native command.
  const adapter = await runEffectOrThrow(
    resolveRuntimeContainerEngine({
      // The declarative command host only decodes untyped CLI strings; resolveRuntimeContainerEngine
      // validates the value (including the docker-deprecation message) before it is ever treated
      // as a real ContainerEngine.
      ...(input.engine === undefined ? {} : {requestedEngine: input.engine}),
      toolingConfigPath: paths.toolingConfig,
    }).pipe(Effect.flatMap((selection) => runContainerPreflight(selection.engine).pipe(withLogContext("preflight")))),
    runtime,
  );

  const command = buildComposeCommand(adapter, {file: input.file, args: input.passthrough});
  try {
    await runtime.runner.expectSuccess(command, {
      output: "tee",
      logCommands: true,
      logger: runtime.logger,
      signal: runtime.signal,
    });
  } catch (error) {
    if (error instanceof RunnerError && error.outcome.kind === "cancelled" && runtime.signal.aborted) {
      throw commandCancellationFromSignal(runtime.signal);
    }
    throw error;
  }

  return {engine: adapter.engine, file: input.file, passthrough: input.passthrough};
}

/**
 * Creates the Compose helper command.
 *
 * @param runtimeFactory - Optional runtime factory; tests inject a fake instead of the Node adapter.
 * @returns The typed `containers:compose` command object.
 */
export function createComposeCommand(runtimeFactory?: CommandRuntimeFactory): MonorepoCommand<ComposeInput, ComposeResult> {
  return new MonorepoCommand<ComposeInput, ComposeResult>(
    {
      metadata: {name: "compose"},
      execute: executeCompose,
      completion: (result) => ({
        exitCode: 0,
        human: (logger) => logger.success(`Compose completed for '${result.file}' with engine '${result.engine}'.`),
      }),
    },
    runtimeFactory,
  );
}

/** Production singleton used by `npm run containers:compose`. */
export const composeCommand: MonorepoCommand<ComposeInput, ComposeResult> = createComposeCommand();
