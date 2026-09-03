/**
 * @fileoverview Engine-aware Compose helper command for local spin-ups.
 * @module scripts/container-runtime/compose
 *
 * @remarks
 * Every ambient effect this command used to reach for directly (the child process, the
 * repository filesystem, and the process environment) now arrives through the injected
 * {@link CommandContext.runtime} instead of Node globals, so the command is fully exercised by
 * the declarative command runtime's test fakes and never spawns Docker or Podman in a test.
 * `decode()` verifies the literal `--` delimiter against the invocation's own pre-normalization
 * argv (via {@link getInvocationArgv}) instead of relying on Commander's post-parse
 * `program.args`, so a caller that supplies pass-through-looking tokens without the delimiter is
 * rejected instead of silently accepted.
 */

import {
  CommandInputError,
  getInvocationArgv,
  MonorepoCommand,
  type CommandContext,
  type CommandRuntimeFactory,
} from "../common/commander.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {runContainerPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import type {ComposeInput, ComposeResult, ContainerEngine} from "./types.ts";

/** Options for invoking an arbitrary Compose file through the selected engine. */
export interface ComposeOptions {
  readonly file: string;
  readonly args: readonly string[];
}

/** Usage message shared by every Compose input validation failure. */
const COMPOSE_USAGE_MESSAGE = "Use --file <compose-file> -- <compose arguments>";

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
    logger: runtime.logger.child("preflight"),
    environment: runtime.environment,
    signal: runtime.signal,
  });

  const command = buildComposeCommand(adapter, {file: input.file, args: input.passthrough});
  await runtime.runner.expectSuccess(command, {output: "tee", logger: runtime.logger, signal: runtime.signal});

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
      metadata: {
        name: "compose",
        description: "Runs an arbitrary Compose file through the selected local container engine.",
        usage: "--file <compose-file> [--engine <rancher|podman>] -- <compose arguments>",
        examples: ["npm run containers:compose -- --file infra/Local/Storage/docker-compose.yml -- up -d"],
      },
      configure: (program) => {
        program.option("--file <path>", "Compose file to invoke.");
        program.option("--engine <engine>", "Container engine to use (rancher or podman).");
        program.argument("[passthrough...]", "Arguments forwarded to Compose unchanged after --.");
      },
      decode: (program) => {
        const options = program.opts<{file?: string; engine?: string}>();
        const delimiterIndex = getInvocationArgv(program).indexOf("--");

        if (options.file === undefined || delimiterIndex === -1) {
          throw new CommandInputError(COMPOSE_USAGE_MESSAGE);
        }

        const passthrough = getInvocationArgv(program).slice(delimiterIndex + 1);
        if (passthrough.length === 0) {
          throw new CommandInputError(COMPOSE_USAGE_MESSAGE);
        }

        return {
          ...(options.engine === undefined ? {} : {engine: options.engine as ContainerEngine}),
          file: options.file,
          passthrough,
        };
      },
      execute: executeCompose,
      completion: (result) => ({
        exitCode: 0,
        human: (logger) => logger.success(`Compose completed for '${result.file}' with engine '${result.engine}'.`),
      }),
    },
    runtimeFactory,
  );
}

/** Production singleton used by `npm run containers:compose` and this module's direct entrypoint. */
export const composeCommand: MonorepoCommand<ComposeInput, ComposeResult> = createComposeCommand();

await composeCommand.runIfMain(import.meta.url);
