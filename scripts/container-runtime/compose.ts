/**
 * @fileoverview Engine-aware Compose helper for local spin-ups.
 * @module scripts/container-runtime/compose
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {commanderExitCode, createToolProgram} from "../common/cli.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {defaultCommandRunner, formatCommand, type CommandRunner} from "../common/process.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {describeCommandFailure, runSharedPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import type {ContainerEngine} from "./types.ts";
import {exitWithError} from "./types.ts";

/** Options for invoking an arbitrary Compose file through the selected engine. */
export interface ComposeOptions {
  readonly file: string;
  readonly args: readonly string[];
}

/** Optional boundary replacements for {@link runComposeCli}. */
export interface ComposeCliDependencies {
  readonly runner?: CommandRunner;
  readonly logger?: MonorepositoryLogger;
}

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
 * Parses Compose CLI arguments and runs the ad hoc Compose wrapper.
 *
 * @remarks
 * Accepts `argv` explicitly (a Commander "user" argument list, without a
 * leading node executable or script path) so tests never mutate
 * `process.argv`. Every argument after a literal `--` is forwarded to
 * Compose unchanged, preserving order and bytes. `--help`/`-h`/`/h` route
 * through the injected `logger` and return without running Compose.
 *
 * @param argv - Raw CLI arguments following the Compose entrypoint.
 * @param dependencies - Optional injected command runner and logger.
 * @throws {Error} When `--file` or pass-through arguments are missing, or Compose exits with a nonzero code.
 */
export async function runComposeCli(
  argv: readonly string[],
  dependencies: Readonly<ComposeCliDependencies> = {},
): Promise<void> {
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("container::compose");
  const program = createToolProgram({
    name: "compose",
    description: "Runs an arbitrary Compose file through the selected local container engine.",
    usage: "--file <compose-file> [--engine <rancher|podman>] -- <compose arguments>",
    examples: ["npm run containers:compose -- --file infra/Local/Storage/docker-compose.yml -- up -d"],
    logger,
  });
  program.option("--file <path>", "Compose file to invoke.");
  program.option("--engine <engine>", "Container engine to use (rancher or podman).");
  program.argument("[passthrough...]", "Arguments forwarded to Compose unchanged after --.");

  try {
    program.parse(argv, {from: "user"});
  } catch (error) {
    if (commanderExitCode(error) === 0) {
      return;
    }
    throw error;
  }

  const options = program.opts<{file?: string; engine?: string}>();
  const passthroughArgs = program.args;

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

  if (options.file === undefined || passthroughArgs.length === 0) {
    throw new Error("Use --file <compose-file> -- <compose arguments>");
  }

  const command = buildComposeCommand(adapter, {file: options.file, args: passthroughArgs});
  logger.command(formatCommand(command));
  const result = await runner.run(command, {output: "tee", logger});
  if (result.code !== 0) throw new Error(describeCommandFailure(result, `exit code ${result.code}`));
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    await runComposeCli(process.argv.slice(2));
  } catch (error) {
    exitWithError(error, new MonorepositoryConsoleLogger("container::compose"));
  }
}
