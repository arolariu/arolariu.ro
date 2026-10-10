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

import {join} from "node:path";
import {parseEnv} from "node:util";

import {Effect, FileSystem, type PlatformError} from "effect";

import {generateArtifacts} from "../commands/generate/artifacts.ts";
import type {ArtifactGenerationFailed, TaxonomySourceUnavailable} from "../commands/generate/errors.ts";
import {silently} from "../commands/generate/index.ts";
import {resolveRepositoryPaths, type RepositoryRootNotFound} from "../common/repository-paths.ts";
import {Environment} from "../platform/Environment.ts";
import type {PlatformServices} from "../platform/layers.ts";
import type {ProcessError} from "../platform/Process.ts";
import {runEchoedRuntimeCommand, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {prepareContainerEngine} from "./preflight.ts";
import {ContainerRuntimeError, type ImageInput, type ImageResult, type ImageTarget} from "./types.ts";

/** Options for building a local image with the selected engine. */
export interface ImageBuildOptions {
  readonly dockerfile: string;
  readonly tag: string;
  readonly context: string;
  readonly buildArgs: Readonly<Record<string, string>>;
  readonly secrets?: readonly {readonly id: string; readonly source: string}[];
}

/** Options for running a local image with the selected engine. */
export interface ImageRunOptions {
  readonly tag: string;
  readonly ports: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
  readonly environmentNames?: readonly string[];
  readonly mounts?: readonly string[];
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
  exp: ["5002:8080"],
};

const feedConfigsByTarget: Readonly<Record<ImageTarget, readonly [string, string]>> = {
  frontend: ["npm_config", "AROLARIU_CONTAINER_NPM_CONFIG"],
  backend: ["nuget_config", "AROLARIU_CONTAINER_NUGET_CONFIG"],
  cv: ["npm_config", "AROLARIU_CONTAINER_NPM_CONFIG"],
  exp: ["pip_config", "AROLARIU_CONTAINER_PIP_CONFIG"],
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
  const format = adapter.engine === "podman" ? ["--format", "docker"] : [];
  const secrets = (options.secrets ?? []).flatMap(({id, source}) => ["--secret", `id=${id},src=${source}`]);
  return adapter.build(["-f", options.dockerfile, "-t", options.tag, ...buildArgs, ...secrets, ...format, options.context]);
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
  const environmentNames = (options.environmentNames ?? []).flatMap((name) => ["-e", name]);
  const mounts = (options.mounts ?? []).flatMap((mount) => ["--mount", mount]);
  const environment = Object.entries(options.environment).flatMap(([name, value]) => ["-e", `${name}=${value}`]);
  return adapter.run(["--rm", ...ports, ...environmentNames, ...mounts, ...environment, options.tag]);
}

/**
 * Builds or runs a local image with the resolved local container engine.
 *
 * @remarks
 * Preflight runs first. A frontend or backend build then generates the taxonomy and license
 * artifacts with {@link generateArtifacts} (silently, `{verbose: false}`); a failed generation
 * stops before the engine CLI runs. Frontend builds forward only allowlisted public values from
 * the invocation environment or generated `.env`; private values never become build arguments.
 * Frontend runs parse `.env` and deliver values through the child environment by variable name;
 * exp runs mount its private configuration
 * read-only. Missing runtime files fail before image startup. The command is echoed as `$ <command>`
 * and runs with tee output; only runtime file paths, not their contents, reach that echo.
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
  | ContainerRuntimeError
  | RepositoryRootNotFound
  | ProcessError
  | TaxonomySourceUnavailable
  | ArtifactGenerationFailed
  | PlatformError.PlatformError,
  PlatformServices
> = Effect.fn("containers.image")(function* (input: Readonly<ImageInput>) {
  const adapter = yield* prepareContainerEngine(input, "image");
  const tag = `arolariu-${input.target}`;
  const paths = yield* resolveRepositoryPaths(import.meta.url);
  const fs = yield* FileSystem.FileSystem;

  if (input.action === "build") {
    if (shouldGenerateTaxonomyArtifacts(input.target)) {
      yield* silently(generateArtifacts({verbose: false}));
    }

    const buildArgs: Record<string, string> = {VERSION: "local"};
    const environment = yield* Environment;
    const secrets: {id: string; source: string}[] = [];
    const [id, variable] = feedConfigsByTarget[input.target];
    const source = environment.variables[variable];
    if (source !== undefined) {
      if (!(yield* fs.exists(source)) || (yield* fs.stat(source)).type !== "File") {
        return yield* new ContainerRuntimeError({message: `${variable} must select an existing build-only feed configuration file.`});
      }
      secrets.push({id, source});
    }
    if (input.target === "frontend") {
      const hasConfiguration = yield* fs.exists(paths.websiteEnvironment);
      if (hasConfiguration && (yield* fs.stat(paths.websiteEnvironment)).type !== "File") {
        return yield* new ContainerRuntimeError({message: `Website build configuration must be a file: ${paths.websiteEnvironment}`});
      }
      const fileValues = hasConfiguration ? parseEnv(yield* fs.readFileString(paths.websiteEnvironment)) : {};
      for (const key of ["SITE_ENV", "SITE_URL", "SITE_NAME", "USE_CDN"]) {
        const value = environment.variables[key] ?? fileValues[key];
        if (value !== undefined) buildArgs[key] = value;
      }
      if (hasConfiguration) {
        secrets.push({id: "website_env", source: paths.websiteEnvironment});
      }
    }

    yield* runEchoedRuntimeCommand(
      buildImageBuildCommand(adapter, {
        dockerfile: dockerfilesByTarget[input.target],
        tag,
        context: ".",
        buildArgs,
        secrets,
      }),
    );
    return {engine: adapter.engine, action: "build", target: input.target};
  }

  const environmentNames: string[] = [];
  let privateEnvironment: Readonly<Record<string, string | undefined>> | undefined;
  const mounts: string[] = [];
  const environment: Record<string, string> = {INFRA: "local"};
  if (input.target === "frontend" || input.target === "exp") {
    const configPath = input.target === "frontend" ? paths.websiteEnvironment : join(paths.expRoot, "config.docker.json");
    if (!(yield* fs.exists(configPath))) {
      return yield* new ContainerRuntimeError({message: `Required private runtime configuration is missing: ${configPath}`});
    }
    if ((yield* fs.stat(configPath)).type !== "File") {
      return yield* new ContainerRuntimeError({message: `Private runtime configuration must be a file: ${configPath}`});
    }
    if (input.target === "frontend") {
      const parsed = parseEnv(yield* fs.readFileString(configPath));
      privateEnvironment = parsed;
      environmentNames.push(...Object.keys(parsed));
    } else {
      mounts.push(`type=bind,source=${configPath},target=/app/config.docker.json,readonly`);
      environment["EXP_LOCAL_CONFIG_PATH"] = "/app/config.docker.json";
    }
  }
  yield* runEchoedRuntimeCommand(
    buildImageRunCommand(adapter, {tag, ports: portsByTarget[input.target], environment, environmentNames, mounts}),
    privateEnvironment === undefined ? {} : {env: privateEnvironment},
  );
  return {engine: adapter.engine, action: "run", target: input.target};
});
