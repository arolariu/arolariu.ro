/**
 * @fileoverview Engine-aware local image build/run helper.
 * @module scripts/container-runtime/image
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {commanderExitCode, createToolProgram} from "../common/cli.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {defaultCommandRunner, formatCommand, type CommandRunner} from "../common/process.ts";
import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {describeCommandFailure, runArtifactGeneration, runSharedPreflight} from "./preflight.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import type {ContainerEngine} from "./types.ts";
import {exitWithError} from "./types.ts";

type ImageTarget = "frontend" | "backend" | "cv" | "exp";

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

/** Optional boundary replacements for {@link runImageCli}. */
export interface ImageCliDependencies {
  readonly runner?: CommandRunner;
  readonly logger?: MonorepositoryLogger;
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

function parseTarget(target: string | undefined): ImageTarget {
  if (target === "frontend" || target === "backend" || target === "cv" || target === "exp") {
    return target;
  }

  throw new Error("Use --target frontend|backend|cv|exp");
}

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

async function runImageCommand(runner: CommandRunner, command: RuntimeCommand, logger: MonorepositoryLogger): Promise<void> {
  logger.command(formatCommand(command));
  const result = await runner.run(command, {output: "tee", logger});
  if (result.code !== 0) throw new Error(describeCommandFailure(result, `exit code ${result.code}`));
}

/**
 * Parses image CLI arguments and runs the local build/run wrapper.
 *
 * @remarks
 * Accepts `argv` explicitly (a Commander "user" argument list, without a
 * leading node executable or script path) so tests never mutate
 * `process.argv`. `--help`/`-h`/`/h` route through the injected `logger` and
 * return without building or running an image.
 *
 * @param argv - Raw CLI arguments following the image entrypoint.
 * @param dependencies - Optional injected command runner and logger.
 * @throws {Error} When the action or `--target` is missing/invalid, or the runtime command exits with a nonzero code.
 */
export async function runImageCli(
  argv: readonly string[],
  dependencies: Readonly<ImageCliDependencies> = {},
): Promise<void> {
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("container::image");
  const program = createToolProgram({
    name: "image",
    description: "Builds or runs a local container image with the selected engine.",
    usage: "<build|run> --target <frontend|backend|cv|exp> [--engine <rancher|podman>]",
    examples: [
      "npm run containers:build -- --target frontend --engine rancher",
      "npm run containers:run -- --target backend --engine podman",
    ],
    logger,
  });
  program.argument("[action]", "Image action to run: build or run.");
  program.option("--target <target>", "Image target: frontend, backend, cv, or exp.");
  program.option("--engine <engine>", "Container engine to use (rancher or podman).");

  try {
    program.parse(argv, {from: "user"});
  } catch (error) {
    if (commanderExitCode(error) === 0) {
      return;
    }
    throw error;
  }

  const [action] = program.args as [string | undefined];
  const options = program.opts<{target?: string; engine?: string}>();

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
  const preflightLogger = logger.child("preflight");
  await runSharedPreflight(adapter, runner, preflightLogger);

  const target = parseTarget(options.target);
  const tag = `arolariu-${target}`;

  if (action === "build") {
    if (requiresTaxonomyArtifacts(target)) {
      await runArtifactGeneration(runner, preflightLogger);
    }

    await runImageCommand(
      runner,
      buildImageBuildCommand(adapter, {dockerfile: dockerfilesByTarget[target], tag, context: ".", buildArgs: {VERSION: "local"}}),
      logger,
    );
    return;
  }

  if (action === "run") {
    await runImageCommand(
      runner,
      buildImageRunCommand(adapter, {tag, ports: portsByTarget[target], environment: {INFRA: "local"}}),
      logger,
    );
    return;
  }

  throw new Error("Use build or run as the first argument.");
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    await runImageCli(process.argv.slice(2));
  } catch (error) {
    exitWithError(error, new MonorepositoryConsoleLogger("container::image"));
  }
}
