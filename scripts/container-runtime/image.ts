/**
 * @fileoverview Engine-aware local image build/run command.
 * @module scripts/container-runtime/image
 *
 * @remarks
 * Every ambient effect this command used to reach for directly (the child process, the
 * repository filesystem, and the process environment) now arrives through the injected
 * {@link CommandExecutionContext.runtime} instead of Node globals, so the command is fully exercised by
 * the declarative command runtime's test fakes and never spawns Docker or Podman in a test. The
 * frontend/backend taxonomy artifact prerequisite runs as a nested, in-process invocation of
 * `generateArtifactsCommand` (through `{parent: context, presentation: "silent"}`) instead of a
 * spawned Node subprocess, so it inherits this invocation's cancellation, redactions, and
 * cleanup ownership.
 */

import {CommandInputError, type CommandInvoker} from "../core/command/command-execution.ts";
import type {CommandExecutionContext} from "../core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "../core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "../core/command/command-specification.ts";
import type {TerminalPresenter} from "../core/presentation/terminal-presenter.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {ProcessRunnerError, type ProcessRunner} from "../core/process/process-runner.ts";
import {CommandCancellation, commandCancellationFromSignal} from "../common/runtime.ts";
import {generateArtifactsCommand, type ArtifactGenerationResult, type GenerateArtifactsInput} from "../generate.artifacts.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {runContainerPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import type {ContainerEngine, ImageInput, ImageResult, ImageTarget} from "./types.ts";

/** Options for building a local image with the selected engine. */
export interface ImageBuildOptions {
  readonly dockerfile: string;
  readonly tag: string;
  readonly context: string;
  readonly buildArgs: Readonly<Record<string, string>>;
}

/** Options for running a local image with the selected engine. */
export interface ImageRunOptions {
  readonly tag: string;
  readonly ports: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
}

/** Optional collaborators {@link createImageCommand} composes. */
export interface ImageCommandDependencies {
  /** Taxonomy and license artifact generator invoked as the frontend/backend build prerequisite. */
  readonly artifacts?: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>;
}

const dockerfilesByTarget: Readonly<Record<ImageTarget, string>> = {
  frontend: "infra/containers/Dockerfile.frontend",
  backend: "infra/containers/Dockerfile.backend",
  cv: "infra/containers/Dockerfile.cv",
  exp: "infra/containers/Dockerfile.exp",
};

const portsByTarget: Readonly<Record<ImageTarget, readonly string[]>> = {
  frontend: ["3000:3000"],
  backend: ["5000:8080"],
  cv: ["4173:3000"],
  exp: ["5002:80"],
};

/**
 * Determines whether an image consumes generated taxonomy artifacts.
 *
 * @param target - Image target.
 * @returns `true` for frontend and backend images.
 */
function requiresTaxonomyArtifacts(target: ImageTarget): boolean {
  return target === "frontend" || target === "backend";
}

/**
 * Builds an engine-owned image build command.
 *
 * @param adapter - Selected runtime adapter.
 * @param options - Image build options.
 * @returns Runtime command for building the image.
 */
export function buildImageBuildCommand(adapter: ContainerRuntimeAdapter, options: ImageBuildOptions): RuntimeCommand {
  const buildArgs = Object.entries(options.buildArgs).flatMap(([name, value]) => ["--build-arg", `${name}=${value}`]);
  return adapter.build(["-f", options.dockerfile, "-t", options.tag, ...buildArgs, options.context]);
}

/**
 * Builds an engine-owned image run command.
 *
 * @param adapter - Selected runtime adapter.
 * @param options - Image run options.
 * @returns Runtime command for running the image.
 */
export function buildImageRunCommand(adapter: ContainerRuntimeAdapter, options: ImageRunOptions): RuntimeCommand {
  const ports = options.ports.flatMap((port) => ["-p", port]);
  const environment = Object.entries(options.environment).flatMap(([name, value]) => ["-e", `${name}=${value}`]);
  return adapter.run(["--rm", ...ports, ...environment, options.tag]);
}

/**
 * Runs the taxonomy and license artifact generator as a nested, silent invocation.
 *
 * @param artifacts - Taxonomy and license artifact generator command.
 * @param context - Command context whose runtime scope owns the nested invocation.
 * @throws {CommandCancellation} When the nested invocation was cancelled.
 * @throws When the nested invocation failed or unexpectedly returned help.
 */
async function runArtifactPrerequisite(
  artifacts: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>,
  context: Readonly<CommandExecutionContext>,
): Promise<void> {
  const execution = await artifacts.invoke({verbose: false}, {parent: context, presentation: "silent"});

  switch (execution.status) {
    case "completed":
      return;
    case "cancelled":
      throw new CommandCancellation(execution.failure.message, execution.exitCode);
    case "failed":
      throw new Error(execution.failure.message, {cause: execution.failure.cause});
    case "help":
      throw new Error("Artifact generation returned help during a nested invocation.");
  }
}

/**
 * Runs the resolved engine-owned image build/run command, translating a cancelled runner outcome
 * on the invocation's own aborted signal into the invocation's typed cancellation reason instead
 * of an operational failure.
 *
 * @remarks
 * A cancelled invocation's exact SIGINT/SIGTERM exit code (`130`/`143`) is owned by its own
 * {@link CommandCancellation} reason; letting `expectSuccess`'s `ProcessRunnerError` for a cancelled
 * outcome escape unclassified would misreport an interrupted invocation as an operational failure
 * and the shared Commander lifecycle would classify it as exit code `1`. A `{kind:"cancelled"}`
 * outcome observed while `signal` is not the invocation's own aborted signal is not this
 * invocation's cancellation and stays an operational failure.
 *
 * @param runner - Process runner used to run `command`.
 * @param command - Engine-owned build or run command to execute.
 * @param presenter - Presenter used for tee output and command echo.
 * @param signal - The owning invocation's cancellation signal.
 * @throws {CommandCancellation} When `command` is cancelled on `signal`.
 * @throws {ProcessRunnerError} When `command` fails for any other reason.
 */
async function runImageBusinessCommand(
  runner: ProcessRunner,
  command: Readonly<RuntimeCommand>,
  presenter: TerminalPresenter,
  signal: AbortSignal,
): Promise<void> {
  try {
    await runner.expectSuccess(command, {output: "tee", logCommands: true, presenter, signal});
  } catch (error) {
    if (error instanceof ProcessRunnerError && error.result.kind === "cancelled" && signal.aborted) {
      throw commandCancellationFromSignal(signal);
    }
    throw error;
  }
}

/**
 * Builds and runs the local image build/run business logic.
 *
 * @param artifacts - Taxonomy and license artifact generator command.
 * @param context - Command context whose runtime owns every ambient capability.
 * @param input - Typed command input.
 * @returns The engine, action, and target this invocation ran with.
 * @throws When the engine cannot be resolved, preflight fails, the artifact prerequisite fails,
 * or the runtime command exits with a nonzero code.
 */
async function executeImage(
  artifacts: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>,
  context: Readonly<CommandExecutionContext>,
  input: Readonly<ImageInput>,
): Promise<ImageResult> {
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

  const tag = `arolariu-${input.target}`;

  if (input.action === "build") {
    if (requiresTaxonomyArtifacts(input.target)) {
      await runArtifactPrerequisite(artifacts, context);
    }

    const command = buildImageBuildCommand(adapter, {
      dockerfile: dockerfilesByTarget[input.target],
      tag,
      context: ".",
      buildArgs: {VERSION: "local"},
    });
    await runImageBusinessCommand(runtime.runner, command, runtime.presenter, runtime.signal);
    return {engine: adapter.engine, action: "build", target: input.target};
  }

  const command = buildImageRunCommand(adapter, {tag, ports: portsByTarget[input.target], environment: {INFRA: "local"}});
  await runImageBusinessCommand(runtime.runner, command, runtime.presenter, runtime.signal);
  return {engine: adapter.engine, action: "run", target: input.target};
}

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("../adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("image"));

/**
 * Creates the local image build/run command.
 *
 * @param dependencies - Optional artifact generator collaborator.
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `containers:build`/`containers:run` command object.
 */
export function createImageCommand(
  dependencies: Readonly<ImageCommandDependencies> = {},
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<ImageInput, ImageResult, never> {
  const artifacts = dependencies.artifacts ?? generateArtifactsCommand;

  return defineCommand<ImageInput, ImageResult>(
    {
      name: "image",
      description: "Builds or runs a local container image with the selected engine.",
      usage: "<build|run> --target <frontend|backend|cv|exp> [--engine <rancher|podman>]",
      examples: [
        "npm run containers:build -- --target frontend --engine rancher",
        "npm run containers:run -- --target backend --engine podman",
      ],
      configure: (program) => {
        program.argument("[action]", "Image action to run: build or run.");
        program.option("--target <target>", "Image target: frontend, backend, cv, or exp.");
        program.option("--engine <engine>", "Container engine to use (rancher or podman).");
      },
      decode: (program) => {
        const options = program.opts<{target?: string; engine?: string}>();
        const [action] = program.args as [string | undefined];

        if (options.target !== "frontend" && options.target !== "backend" && options.target !== "cv" && options.target !== "exp") {
          throw new CommandInputError("Use --target frontend|backend|cv|exp");
        }

        if (action !== "build" && action !== "run") {
          throw new CommandInputError("Use build or run as the first argument.");
        }

        return {
          action,
          target: options.target,
          ...(options.engine === undefined ? {} : {engine: options.engine as ContainerEngine}),
        };
      },
      execute: (context, input) => executeImage(artifacts, context, input),
      complete: (result) => ({
        exitCode: 0,
        value: result,
        human: (logger) => logger.success(`Image ${result.action} completed for target '${result.target}' with engine '${result.engine}'.`),
      }),
    },
    options,
  );
}

/** Production singleton used by `npm run containers:build`/`npm run containers:run` and this module's direct entrypoint. */
export const imageCommand: LazyMonorepoCommand<ImageInput, ImageResult, never> = createImageCommand();

await imageCommand.runIfMain(import.meta.url);
