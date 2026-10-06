/**
 * @fileoverview Engine-aware local image build/run program.
 * @module scripts/container-runtime/image
 *
 * @remarks
 * {@link runImage} resolves the container engine, runs the shared preflight, and builds or runs
 * the image through the Effect `Process` service with tee output, so tests script every process
 * instead of spawning Docker or Podman. The frontend/backend taxonomy artifact prerequisite runs
 * {@link generateArtifacts} directly and silently (as the legacy nested `presentation: "silent"`
 * invocation did), after preflight and before the build. Cancellation is fiber interruption.
 */

import {Effect} from "effect";

import {generateArtifacts} from "../commands/generate/artifacts.ts";
import type {ArtifactGenerationFailed, TaxonomySourceUnavailable} from "../commands/generate/errors.ts";
import {silently} from "../commands/generate/index.ts";
import type {RepositoryRootNotFound} from "../common/repository-paths.ts";
import type {PlatformServices} from "../platform/layers.ts";
import type {ProcessError} from "../platform/Process.ts";
import {runEchoedRuntimeCommand, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {prepareContainerEngine} from "./preflight.ts";
import type {ContainerRuntimeError, ImageInput, ImageResult, ImageTarget} from "./types.ts";

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
 * Determines whether an image build consumes generated taxonomy artifacts.
 *
 * @param target - Image target.
 * @returns `true` for frontend and backend images.
 */
export function shouldGenerateTaxonomyArtifacts(target: ImageTarget): boolean {
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
 * Builds or runs a local image with the resolved local container engine.
 *
 * @remarks
 * Preflight runs first. A frontend or backend build then generates the taxonomy and license
 * artifacts with {@link generateArtifacts} (silently, `{verbose: false}`); a failed generation
 * stops before the engine CLI runs. The build or run command is echoed as `$ <command>` and runs
 * with tee output.
 *
 * @param input - Typed command input.
 * @returns The engine, action, and target this invocation ran with, failing with
 * {@link ContainerRuntimeError} when the engine cannot be resolved or preflight fails, with
 * `RepositoryRootNotFound` outside a repository, with {@link TaxonomySourceUnavailable} or {@link ArtifactGenerationFailed} when the artifact
 * prerequisite fails, and with a {@link ProcessError} when the engine command fails.
 */
export const runImage: (
  input: Readonly<ImageInput>,
) => Effect.Effect<
  ImageResult,
  ContainerRuntimeError | RepositoryRootNotFound | ProcessError | TaxonomySourceUnavailable | ArtifactGenerationFailed,
  PlatformServices
> = Effect.fn("containers.image")(function* (input: Readonly<ImageInput>) {
  const adapter = yield* prepareContainerEngine(input, "image");
  const tag = `arolariu-${input.target}`;

  if (input.action === "build") {
    if (shouldGenerateTaxonomyArtifacts(input.target)) {
      yield* silently(generateArtifacts({verbose: false}));
    }

    yield* runEchoedRuntimeCommand(
      buildImageBuildCommand(adapter, {
        dockerfile: dockerfilesByTarget[input.target],
        tag,
        context: ".",
        buildArgs: {VERSION: "local"},
      }),
    );
    return {engine: adapter.engine, action: "build", target: input.target};
  }

  yield* runEchoedRuntimeCommand(buildImageRunCommand(adapter, {tag, ports: portsByTarget[input.target], environment: {INFRA: "local"}}));
  return {engine: adapter.engine, action: "run", target: input.target};
});
