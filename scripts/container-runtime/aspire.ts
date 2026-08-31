/**
 * @fileoverview Engine-aware Aspire AppHost startup.
 * @module scripts/container-runtime/aspire
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {commanderExitCode, createToolProgram} from "../common/cli.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {defaultCommandRunner, type CommandRunner} from "../common/process.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "./adapters.ts";
import {runSharedPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import type {ContainerEngine} from "./types.ts";
import {exitWithError} from "./types.ts";

/** Aspire AppHost command with runtime-specific environment. */
export interface AspireCommand {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: NodeJS.ProcessEnv;
}

/** Optional boundary replacements for {@link runAspire}. */
export interface AspireCliDependencies {
  readonly runner?: CommandRunner;
  readonly logger?: MonorepositoryLogger;
}

/**
 * Builds the Aspire AppHost command for the selected container engine.
 *
 * @param adapter - Selected runtime adapter.
 * @returns Command and environment for starting AppHost.
 */
export function buildAspireCommand(adapter: ContainerRuntimeAdapter): AspireCommand {
  return {
    command: "dotnet",
    args: ["run", "--project", "tooling/AppHost"],
    env: {
      ...process.env,
      DOTNET_ASPIRE_CONTAINER_RUNTIME: adapter.aspireRuntime,
    },
  };
}

/**
 * Parses Aspire CLI arguments and starts Aspire AppHost with the selected runtime.
 *
 * @remarks
 * Accepts `argv` explicitly (a Commander "user" argument list, without a
 * leading node executable or script path) so tests never mutate
 * `process.argv`. `--help`/`-h`/`/h` route through the injected `logger` and
 * return without starting AppHost.
 *
 * @param argv - Raw CLI arguments following the Aspire entrypoint.
 * @param dependencies - Optional injected command runner and logger.
 * @throws {Error} When Aspire AppHost exits with a nonzero code.
 */
export async function runAspire(
  argv: readonly string[],
  dependencies: Readonly<AspireCliDependencies> = {},
): Promise<void> {
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("container::aspire");
  const program = createToolProgram({
    name: "aspire",
    description: "Starts the Aspire AppHost with the selected local container engine.",
    usage: "[--engine <rancher|podman>]",
    examples: ["npm run dev -- --engine rancher", "npm run dev -- --engine podman"],
    logger,
  });
  program.option("--engine <engine>", "Container engine to use (rancher or podman).");

  try {
    program.parse(argv, {from: "user"});
  } catch (error) {
    if (commanderExitCode(error) !== null) {
      return;
    }
    throw error;
  }

  const options = program.opts<{engine?: string}>();
  const runner = dependencies.runner ?? defaultCommandRunner;
  const paths = resolveRepositoryPaths();
  const selection = await resolveRuntimeContainerEngine({
    // Commander only yields untyped strings; resolveRuntimeContainerEngine
    // validates the value (including the docker-deprecation message) before
    // it is ever treated as a real ContainerEngine.
    ...(options.engine === undefined ? {} : {requestedEngine: options.engine as ContainerEngine}),
    env: process.env,
    toolingConfigPath: paths.toolingConfig,
  });
  const adapter = getContainerAdapter(selection.engine);

  await runSharedPreflight(adapter, runner, logger.child("preflight"));
  const command = buildAspireCommand(adapter);
  const result = await runner.run(command, {env: command.env, output: "inherit"});

  if (result.code !== 0) {
    throw new Error(`Aspire AppHost exited with code ${result.code} for engine '${adapter.engine}'.`);
  }
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    await runAspire(process.argv.slice(2));
  } catch (error) {
    exitWithError(error, new MonorepositoryConsoleLogger("container::aspire"));
  }
}
