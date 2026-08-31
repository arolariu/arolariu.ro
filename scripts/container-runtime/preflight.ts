/**
 * @fileoverview Preflight checks for local container runtime scripts.
 * @module scripts/container-runtime/preflight
 */

import {resolve} from "node:path";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {formatCommand, type CommandResult, type CommandRunner} from "../common/process.ts";
import type {ContainerRuntimeAdapter, RuntimeCommand} from "./adapters.ts";
import {ContainerRuntimeError} from "./types.ts";

/** Fixed ports used by local Aspire and selfhost resources. */
export const requiredLocalPorts = [3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000] as const;

/**
 * Builds a human-readable failure detail from a structured command result.
 *
 * @remarks
 * Preserves the `stdout`/`stderr`/`spawnError` distinction all the way to
 * diagnostics text instead of concatenating the fields into one opaque blob
 * and then guessing at the failure cause: standard error is preferred when
 * present, standard output is used when standard error is empty, a spawn
 * failure message is used when the process never started, and `fallback`
 * covers the remaining case where none of those are available.
 *
 * @param result - Structured command result to describe.
 * @param fallback - Text used when no stream or spawn error carries detail.
 * @returns The most relevant available diagnostic text.
 */
export function describeCommandFailure(result: Readonly<CommandResult>, fallback: string): string {
  return result.stderr.trim() || result.stdout.trim() || result.spawnError || fallback;
}

/**
 * Combines stdout and stderr for backend/provider banner detection.
 *
 * @remarks
 * Some container CLI banners (for example Podman's external compose
 * provider notice, or a Docker Desktop version banner) are written to
 * stderr rather than stdout. Detection heuristics must inspect both
 * streams; this is unrelated to {@link describeCommandFailure}'s
 * stderr-first precedence, which is used only for diagnostic failure text.
 *
 * @param result - Structured command result to inspect.
 * @returns Lowercased stdout and stderr joined for substring detection.
 */
function combinedOutputForBannerDetection(result: Readonly<CommandResult>): string {
  return `${result.stdout}\n${result.stderr}`.toLowerCase();
}

/**
 * Builds the host command that generates taxonomy and license artifacts.
 *
 * @returns Platform-safe Node command using the unified `/a` alias.
 */
export function buildArtifactGenerationCommand(): RuntimeCommand {
  return {
    command: process.execPath,
    args: [resolve("scripts/generate.ts"), "/a"],
  };
}

/**
 * Generates required artifacts before local frontend/backend container builds.
 *
 * @param runner - Command runner used to execute the generator.
 * @param logger - Logger used for command and child-process output.
 * @throws {ContainerRuntimeError} When generation fails.
 */
export async function runArtifactGeneration(
  runner: CommandRunner,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("container::preflight"),
): Promise<void> {
  const command = buildArtifactGenerationCommand();
  logger.command(formatCommand(command));
  const result = await runner.run(command, {output: "tee", logger});
  if (result.code !== 0) {
    throw new ContainerRuntimeError(`Artifact generation failed. Output: ${describeCommandFailure(result, `exit code ${result.code}`)}`);
  }
}

/**
 * Verifies a required CLI tool is available.
 *
 * @param tool - CLI tool name to probe.
 * @param runner - Command runner used for probing.
 * @throws {ContainerRuntimeError} When the tool cannot be executed.
 */
export async function assertToolAvailable(tool: string, runner: CommandRunner): Promise<void> {
  const result = await runner.run({command: tool, args: ["--version"]});
  if (result.code !== 0) {
    throw new ContainerRuntimeError(
      `Required tool '${tool}' is not available. Output: ${describeCommandFailure(result, `exit code ${result.code}`)}`,
    );
  }
}

/**
 * Rejects Docker Desktop when it appears as the active Docker-compatible backend.
 *
 * @param runner - Command runner used for probing.
 * @throws {ContainerRuntimeError} When Docker Desktop is detected.
 */
export async function assertNoDockerDesktopBackend(runner: CommandRunner): Promise<void> {
  const result = await runner.run({command: "docker", args: ["version"]});

  if (result.code === 0 && combinedOutputForBannerDetection(result).includes("docker desktop")) {
    throw new ContainerRuntimeError(
      "Docker Desktop is the active backend. Stop Docker Desktop and select Rancher Desktop or Podman Desktop.",
    );
  }
}

/**
 * Verifies Rancher Desktop owns the Docker-compatible CLI path.
 *
 * @param runner - Command runner used for probing.
 * @throws {ContainerRuntimeError} When the backend is unavailable or Docker Desktop is active.
 */
export async function assertRancherBackend(runner: CommandRunner): Promise<void> {
  const result = await runner.run({command: "docker", args: ["version"]});

  if (result.code !== 0) {
    throw new ContainerRuntimeError(
      `Rancher Desktop Docker-compatible CLI is not available. Output: ${describeCommandFailure(result, `exit code ${result.code}`)}`,
    );
  }

  if (combinedOutputForBannerDetection(result).includes("docker desktop")) {
    throw new ContainerRuntimeError(
      "Rancher engine selected but Docker Desktop appears to be active. Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop.",
    );
  }
}

/**
 * Verifies Podman and its Compose provider are available.
 *
 * @param runner - Command runner used for probing.
 * @throws {ContainerRuntimeError} When Podman or Compose support is unavailable.
 */
export async function assertPodmanBackend(runner: CommandRunner): Promise<void> {
  const podman = await runner.run({command: "podman", args: ["--version"]});
  if (podman.code !== 0) {
    throw new ContainerRuntimeError(`Podman is not available. Output: ${describeCommandFailure(podman, `exit code ${podman.code}`)}`);
  }

  const compose = await runner.run({command: "podman", args: ["compose", "version"]});
  if (compose.code !== 0) {
    throw new ContainerRuntimeError(
      `Podman Compose provider is not available. Configure Podman Desktop Compose support. Output: ${describeCommandFailure(compose, `exit code ${compose.code}`)}`,
    );
  }

  const composeOutput = combinedOutputForBannerDetection(compose);
  const usesPodmanCompose = composeOutput.includes("podman-compose");
  const dockerComposeIndicators = ["\\docker\\", "/docker/", "/docker.app/", "docker desktop", "docker-compose.exe", "docker-compose"];
  if (!usesPodmanCompose && dockerComposeIndicators.some((indicator) => composeOutput.includes(indicator))) {
    throw new ContainerRuntimeError(
      "Podman Compose is currently delegated to a Docker Desktop compose provider. Install podman-compose and set PODMAN_COMPOSE_PROVIDER to the podman-compose executable.",
    );
  }
}

/**
 * Warns when known local containers already exist for the selected engine.
 *
 * @param adapter - Selected runtime adapter.
 * @param runner - Command runner used for probing.
 * @param logger - Logger used for warning output.
 */
export async function warnOnExistingLocalContainers(
  adapter: ContainerRuntimeAdapter,
  runner: CommandRunner,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("container::preflight"),
): Promise<void> {
  const names = ["traefik", "mssql", "cosmosdb", "azurite", "redis", "exp-arolariu-ro", "api-arolariu-ro", "website-arolariu-ro"];
  const result = await runner.run({command: adapter.primaryCli, args: ["ps", "-a", "--format", "{{.Names}}"]});

  if (result.code !== 0) return;

  const active = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const collisions = names.filter((name) => active.includes(name));

  if (collisions.length > 0) {
    logger.warn(`Existing local containers detected for ${adapter.displayName}: ${collisions.join(", ")}`);
  }
}

/**
 * Runs common preflight checks for engine-aware local runtime commands.
 *
 * @param adapter - Selected runtime adapter.
 * @param runner - Command runner used for probing.
 * @param logger - Logger used for preflight output.
 * @throws {ContainerRuntimeError} When required runtime capabilities are missing.
 */
export async function runSharedPreflight(
  adapter: ContainerRuntimeAdapter,
  runner: CommandRunner,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("container::preflight"),
): Promise<void> {
  await assertToolAvailable(adapter.primaryCli, runner);

  if (adapter.engine === "rancher") {
    await assertRancherBackend(runner);
  } else {
    await assertNoDockerDesktopBackend(runner);
    await assertPodmanBackend(runner);
  }

  const composeResult = await runner.run(adapter.compose(["version"]));
  if (composeResult.code !== 0) {
    throw new ContainerRuntimeError(
      `${adapter.displayName} Compose provider is not available. Output: ${describeCommandFailure(composeResult, `exit code ${composeResult.code}`)}`,
    );
  }

  await warnOnExistingLocalContainers(adapter, runner, logger);
}
