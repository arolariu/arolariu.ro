/**
 * @fileoverview Engine-aware Aspire AppHost startup command.
 * @module scripts/container-runtime/aspire
 *
 * @remarks
 * Every ambient effect this command used to reach for directly (the child process, the
 * repository filesystem, and the process environment) now arrives through the injected
 * {@link CommandExecutionContext.runtime} instead of Node globals, so the command is fully exercised by
 * the declarative command runtime's test fakes and never spawns Docker, Podman, or AppHost in a
 * test.
 */

import type {CommandExecutionContext} from "../core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "../core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "../core/command/command-specification.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {RunnerError} from "../common/runner.ts";
import {commandCancellationFromSignal} from "../common/runtime.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "./adapters.ts";
import {runContainerPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import type {AspireResult, ContainerEngine, ContainerEngineInput} from "./types.ts";

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
 * @param context - Command context whose runtime owns every ambient capability.
 * @param input - Typed command input.
 * @returns The engine Aspire AppHost ran with.
 * @throws When the engine cannot be resolved, preflight fails, or Aspire AppHost exits with a
 * nonzero code.
 */
async function executeAspire(context: Readonly<CommandExecutionContext>, input: Readonly<ContainerEngineInput>): Promise<AspireResult> {
  const {runtime} = context;
  const paths = await resolveRepositoryPaths(import.meta.url, runtime.files);
  const selection = await resolveRuntimeContainerEngine(
    {
      // The declarative command host only decodes untyped CLI strings; resolveRuntimeContainerEngine
      // validates the value (including the docker-deprecation message) before it is ever treated
      // as a real ContainerEngine.
      ...(input.engine === undefined ? {} : {requestedEngine: input.engine}),
      env: runtime.environment.variables,
      toolingConfigPath: paths.toolingConfig,
    },
    runtime.files,
  );
  const adapter = getContainerAdapter(selection.engine);

  await runContainerPreflight(adapter, {
    runner: runtime.runner,
    logger: runtime.presenter.child("preflight"),
    environment: runtime.environment,
    signal: runtime.signal,
  });

  const command = buildAspireCommand(adapter, runtime.environment.variables);
  try {
    await runtime.runner.expectSuccess(
      {command: command.command, args: command.args},
      {env: command.env, output: "inherit", signal: runtime.signal},
    );
  } catch (error) {
    if (error instanceof RunnerError && error.outcome.kind === "cancelled" && runtime.signal.aborted) {
      throw commandCancellationFromSignal(runtime.signal);
    }
    throw error;
  }

  return {engine: adapter.engine};
}

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("../adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("aspire"));

/**
 * Creates the Aspire AppHost startup command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `dev`/`aspire` command object.
 */
export function createAspireCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<ContainerEngineInput, AspireResult, never> {
  return defineCommand<ContainerEngineInput, AspireResult>(
    {
      name: "aspire",
      description: "Starts the Aspire AppHost with the selected local container engine.",
      usage: "[--engine <rancher|podman>]",
      examples: ["npm run dev -- --engine rancher", "npm run dev -- --engine podman"],
      configure: (program) => {
        program.option("--engine <engine>", "Container engine to use (rancher or podman).");
      },
      decode: (program) => {
        const {engine} = program.opts<{engine?: string}>();
        return engine === undefined ? {} : {engine: engine as ContainerEngine};
      },
      execute: executeAspire,
      complete: (result) => ({
        exitCode: 0,
        value: result,
        human: (logger) => logger.success(`Aspire AppHost exited successfully for engine '${result.engine}'.`),
      }),
    },
    options,
  );
}

/** Production singleton used by `npm run dev` and this module's direct entrypoint. */
export const aspireCommand: LazyMonorepoCommand<ContainerEngineInput, AspireResult, never> = createAspireCommand();

await aspireCommand.runIfMain(import.meta.url);
