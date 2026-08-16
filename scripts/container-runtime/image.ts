/**
 * @fileoverview Engine-aware local image build/run helper.
 * @module scripts/container-runtime/image
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {getContainerAdapter, type ContainerRuntimeAdapter, type RuntimeCommand} from "./adapters.ts";
import {runSharedPreflight} from "./preflight.ts";
import {defaultRunner, formatCommand, type CommandRunner} from "./process.ts";
import {resolveContainerEngine} from "./selection.ts";
import {exitWithError} from "./types.ts";

export type ImageTarget = "frontend" | "backend" | "cv" | "exp";

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

function parseTarget(argv: readonly string[]): ImageTarget {
  const targetIndex = argv.indexOf("--target");
  const target = targetIndex === -1 ? undefined : argv[targetIndex + 1];
  if (target === "frontend" || target === "backend" || target === "cv" || target === "exp") {
    return target;
  }

  throw new Error("Use --target frontend|backend|cv|exp");
}

/**
 * Determines whether a container target needs generated taxonomy artifacts.
 *
 * @param target - Container image target.
 * @returns `true` for the API and website images.
 */
export function requiresTaxonomyArtifacts(target: ImageTarget): boolean {
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

async function runImageCommand(runner: CommandRunner, command: RuntimeCommand): Promise<void> {
  console.log(`$ ${formatCommand(command)}`);
  const result = await runner.run(command, {stdio: "tee"});
  if (result.code !== 0) throw new Error(result.output);
}

/**
 * Runs the local image build/run CLI wrapper.
 *
 * @param runner - Command runner used to execute runtime commands.
 */
export async function runImageCli(runner: CommandRunner = defaultRunner): Promise<void> {
  const selection = resolveContainerEngine({argv: process.argv, env: process.env});
  const adapter = getContainerAdapter(selection.engine);
  await runSharedPreflight(adapter, runner);

  const action = process.argv[2];
  const target = parseTarget(process.argv);
  const tag = `arolariu-${target}`;

  if (action === "build") {
    if (requiresTaxonomyArtifacts(target)) {
      await runImageCommand(runner, {command: "npm", args: ["run", "generate:artifacts"]});
    }

    await runImageCommand(
      runner,
      buildImageBuildCommand(adapter, {dockerfile: dockerfilesByTarget[target], tag, context: ".", buildArgs: {VERSION: "local"}}),
    );
    return;
  }

  if (action === "run") {
    await runImageCommand(runner, buildImageRunCommand(adapter, {tag, ports: portsByTarget[target], environment: {INFRA: "local"}}));
    return;
  }

  throw new Error("Use build or run as the first argument.");
}

const isDirectExecution = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    await runImageCli();
  } catch (error) {
    exitWithError(error);
  }
}
