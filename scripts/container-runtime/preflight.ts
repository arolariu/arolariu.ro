/**
 * @fileoverview Preflight checks for local container runtime scripts.
 * @module scripts/container-runtime/preflight
 */

import {resolve} from "node:path";
import type {ContainerRuntimeAdapter, RuntimeCommand} from "./adapters.ts";
import {formatCommand, type CommandRunner} from "./process.ts";
import {ContainerRuntimeError} from "./types.ts";

/** Fixed ports used by local Aspire and selfhost resources. */
export const requiredLocalPorts = [3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000] as const;

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
 * @throws {ContainerRuntimeError} When generation fails.
 */
export async function runArtifactGeneration(runner: CommandRunner): Promise<void> {
  const command = buildArtifactGenerationCommand();
  console.log(`$ ${formatCommand(command)}`);
  const result = await runner.run(command, {stdio: "tee"});
  if (result.code !== 0) {
    throw new ContainerRuntimeError(`Artifact generation failed. Output: ${result.output.trim()}`);
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
    throw new ContainerRuntimeError(`Required tool '${tool}' is not available. Output: ${result.output.trim()}`);
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
  const output = result.output.toLowerCase();

  if (result.code === 0 && output.includes("docker desktop")) {
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
  const output = result.output.toLowerCase();

  if (result.code !== 0) {
    throw new ContainerRuntimeError(`Rancher Desktop Docker-compatible CLI is not available. Output: ${result.output.trim()}`);
  }

  if (output.includes("docker desktop")) {
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
    throw new ContainerRuntimeError(`Podman is not available. Output: ${podman.output.trim()}`);
  }

  const compose = await runner.run({command: "podman", args: ["compose", "version"]});
  if (compose.code !== 0) {
    throw new ContainerRuntimeError(
      `Podman Compose provider is not available. Configure Podman Desktop Compose support. Output: ${compose.output.trim()}`,
    );
  }

  const composeOutput = compose.output.toLowerCase();
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
 */
export async function warnOnExistingLocalContainers(adapter: ContainerRuntimeAdapter, runner: CommandRunner): Promise<void> {
  const names = ["traefik", "mssql", "cosmosdb", "azurite", "redis", "exp-arolariu-ro", "api-arolariu-ro", "website-arolariu-ro"];
  const result = await runner.run({command: adapter.primaryCli, args: ["ps", "-a", "--format", "{{.Names}}"]});

  if (result.code !== 0) return;

  const active = result.output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const collisions = names.filter((name) => active.includes(name));

  if (collisions.length > 0) {
    console.warn(`Existing local containers detected for ${adapter.displayName}: ${collisions.join(", ")}`);
  }
}

/**
 * Runs common preflight checks for engine-aware local runtime commands.
 *
 * @param adapter - Selected runtime adapter.
 * @param runner - Command runner used for probing.
 * @throws {ContainerRuntimeError} When required runtime capabilities are missing.
 */
export async function runSharedPreflight(adapter: ContainerRuntimeAdapter, runner: CommandRunner): Promise<void> {
  await assertToolAvailable(adapter.primaryCli, runner);

  if (adapter.engine === "rancher") {
    await assertRancherBackend(runner);
  } else {
    await assertNoDockerDesktopBackend(runner);
    await assertPodmanBackend(runner);
  }

  const composeResult = await runner.run(adapter.compose(["version"]));
  if (composeResult.code !== 0) {
    throw new ContainerRuntimeError(`${adapter.displayName} Compose provider is not available. Output: ${composeResult.output.trim()}`);
  }

  await warnOnExistingLocalContainers(adapter, runner);
}
