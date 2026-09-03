/**
 * @fileoverview Preflight checks for local container runtime scripts.
 * @module scripts/container-runtime/preflight
 *
 * @remarks
 * The context-based {@link runContainerPreflight} implementation is the production preflight
 * path for every migrated declarative container command (Aspire, Compose, Image): it depends
 * only on the typed {@link ProcessRunner} boundary, never on Node's child-process module
 * directly. `runSharedPreflight()`, `describeCommandFailure()`, and `exitWithError()` (the last
 * defined in `types.ts`) stay as deprecated compatibility surfaces for the still-legacy Selfhost
 * cohort until it migrates in Task 21; `runSharedPreflight()` delegates to
 * {@link runContainerPreflight} instead of duplicating the check sequence.
 */

import {resolve} from "node:path";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {formatCommand, type CommandResult, type CommandRunner} from "../common/process.ts";
import {
  AbstractProcessRunner,
  processFailureEvidence,
  type ProcessOutcome,
  type ProcessRequest,
  type ProcessRunOptions,
  type ProcessRunner,
} from "../common/runner.ts";
import {commandCancellationFromSignal, type RuntimeEnvironment} from "../common/runtime.ts";
import type {ContainerRuntimeAdapter, RuntimeCommand} from "./adapters.ts";
import {ContainerRuntimeError} from "./types.ts";

/** Fixed ports used by local Aspire and selfhost resources. */
export const requiredLocalPorts = [3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000] as const;

/**
 * Builds a human-readable failure detail from a structured command result.
 *
 * @deprecated Removed when Selfhost migrates in Task 21. Use {@link processFailureEvidence} for
 * typed {@link ProcessOutcome} failures.
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
 * @param outcome - Process outcome to inspect.
 * @returns Lowercased stdout and stderr joined for substring detection.
 */
function combinedOutputForBannerDetection(outcome: Readonly<Pick<ProcessOutcome, "stdout" | "stderr">>): string {
  return `${outcome.stdout}\n${outcome.stderr}`.toLowerCase();
}

/**
 * Builds a diagnostic failure detail from a typed process outcome.
 *
 * @param outcome - Failed or interrupted process outcome.
 * @returns The most relevant available diagnostic text, falling back to a kind-specific summary.
 */
function describeOutcomeFailure(outcome: Readonly<Exclude<ProcessOutcome, {readonly kind: "succeeded"}>>): string {
  const evidence = processFailureEvidence(outcome);
  if (evidence !== "") return evidence;

  switch (outcome.kind) {
    case "exited":
      return `exit code ${outcome.exitCode}`;
    case "signalled":
      return `terminated by ${outcome.signal}`;
    case "spawn-failed":
      return outcome.message;
    case "timed-out":
      return outcome.signal === undefined ? "timed out" : `timed out with ${outcome.signal}`;
    case "cancelled":
      return outcome.signal === undefined ? "cancelled" : `cancelled by ${outcome.signal}`;
  }
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
 * @deprecated Removed when Selfhost migrates in Task 21. Migrated commands invoke
 * `generateArtifactsCommand` directly through `CommandInvoker.invoke` instead.
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
 * Translates a preflight probe's cancelled outcome into the invocation's own typed cancellation
 * reason instead of an operational {@link ContainerRuntimeError}.
 *
 * @remarks
 * A cancelled invocation's exact SIGINT/SIGTERM exit code (`130`/`143`) is owned by its own
 * {@link CommandCancellation} reason; letting a cancelled preflight probe fall through to a
 * generic tool-unavailable message would misreport an interrupted invocation as an operational
 * failure and the shared Commander lifecycle would classify it as exit code `1`. A
 * `{kind:"cancelled"}` outcome observed while `signal` is not the invocation's own aborted signal
 * is not this invocation's cancellation and stays an operational failure.
 *
 * @param outcome - Preflight probe outcome to inspect.
 * @param signal - The owning invocation's cancellation signal, supplied only when the probe runs
 * through {@link runContainerPreflight}.
 * @throws {CommandCancellation} When `outcome` is cancelled and `signal` is aborted.
 */
function throwIfPreflightCancelled(outcome: Readonly<ProcessOutcome>, signal?: AbortSignal): void {
  if (outcome.kind === "cancelled" && signal?.aborted === true) {
    throw commandCancellationFromSignal(signal);
  }
}

/**
 * Verifies a required CLI tool is available.
 *
 * @param tool - CLI tool name to probe.
 * @param runner - Process runner used for probing.
 * @param signal - The owning invocation's cancellation signal, when probing through
 * {@link runContainerPreflight}.
 * @throws {ContainerRuntimeError} When the tool cannot be executed.
 */
export async function assertToolAvailable(tool: string, runner: ProcessRunner, signal?: AbortSignal): Promise<void> {
  const outcome = await runner.run({command: tool, args: ["--version"]});
  throwIfPreflightCancelled(outcome, signal);
  if (outcome.kind !== "succeeded") {
    throw new ContainerRuntimeError(`Required tool '${tool}' is not available. Output: ${describeOutcomeFailure(outcome)}`);
  }
}

/**
 * Rejects Docker Desktop when it appears as the active Docker-compatible backend.
 *
 * @param runner - Process runner used for probing.
 * @throws {ContainerRuntimeError} When Docker Desktop is detected.
 */
export async function assertNoDockerDesktopBackend(runner: ProcessRunner): Promise<void> {
  const outcome = await runner.run({command: "docker", args: ["version"]});

  if (outcome.kind === "succeeded" && combinedOutputForBannerDetection(outcome).includes("docker desktop")) {
    throw new ContainerRuntimeError(
      "Docker Desktop is the active backend. Stop Docker Desktop and select Rancher Desktop or Podman Desktop.",
    );
  }
}

/**
 * Verifies Rancher Desktop owns the Docker-compatible CLI path.
 *
 * @param runner - Process runner used for probing.
 * @param signal - The owning invocation's cancellation signal, when probing through
 * {@link runContainerPreflight}.
 * @throws {ContainerRuntimeError} When the backend is unavailable or Docker Desktop is active.
 */
export async function assertRancherBackend(runner: ProcessRunner, signal?: AbortSignal): Promise<void> {
  const outcome = await runner.run({command: "docker", args: ["version"]});
  throwIfPreflightCancelled(outcome, signal);

  if (outcome.kind !== "succeeded") {
    throw new ContainerRuntimeError(`Rancher Desktop Docker-compatible CLI is not available. Output: ${describeOutcomeFailure(outcome)}`);
  }

  if (combinedOutputForBannerDetection(outcome).includes("docker desktop")) {
    throw new ContainerRuntimeError(
      "Rancher engine selected but Docker Desktop appears to be active. Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop.",
    );
  }
}

/**
 * Verifies Podman and its Compose provider are available.
 *
 * @param runner - Process runner used for probing.
 * @param signal - The owning invocation's cancellation signal, when probing through
 * {@link runContainerPreflight}.
 * @throws {ContainerRuntimeError} When Podman or Compose support is unavailable.
 */
export async function assertPodmanBackend(runner: ProcessRunner, signal?: AbortSignal): Promise<void> {
  const podman = await runner.run({command: "podman", args: ["--version"]});
  throwIfPreflightCancelled(podman, signal);
  if (podman.kind !== "succeeded") {
    throw new ContainerRuntimeError(`Podman is not available. Output: ${describeOutcomeFailure(podman)}`);
  }

  const compose = await runner.run({command: "podman", args: ["compose", "version"]});
  throwIfPreflightCancelled(compose, signal);
  if (compose.kind !== "succeeded") {
    throw new ContainerRuntimeError(
      `Podman Compose provider is not available. Configure Podman Desktop Compose support. Output: ${describeOutcomeFailure(compose)}`,
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
 * @param runner - Process runner used for probing.
 * @param logger - Logger used for warning output.
 */
export async function warnOnExistingLocalContainers(
  adapter: ContainerRuntimeAdapter,
  runner: ProcessRunner,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("container::preflight"),
): Promise<void> {
  const names = ["traefik", "mssql", "cosmosdb", "azurite", "redis", "exp-arolariu-ro", "api-arolariu-ro", "website-arolariu-ro"];
  const outcome = await runner.run({command: adapter.primaryCli, args: ["ps", "-a", "--format", "{{.Names}}"]});

  if (outcome.kind !== "succeeded") return;

  const active = outcome.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const collisions = names.filter((name) => active.includes(name));

  if (collisions.length > 0) {
    logger.warn(`Existing local containers detected for ${adapter.displayName}: ${collisions.join(", ")}`);
  }
}

/** Capabilities {@link runContainerPreflight} depends on for one preflight run. */
export interface ContainerPreflightContext {
  /** Process runner used for every preflight probe. */
  readonly runner: ProcessRunner;
  /** Logger used for warning and diagnostic output. */
  readonly logger: MonorepositoryLogger;
  /** Immutable snapshot of the ambient environment. */
  readonly environment: RuntimeEnvironment;
  /** Cancellation signal threaded into every preflight probe. */
  readonly signal: AbortSignal;
}

/**
 * Runs common preflight checks for engine-aware local runtime commands.
 *
 * @remarks
 * This is the production preflight path for every migrated declarative container command; the
 * deprecated {@link runSharedPreflight} overload delegates to this implementation instead of
 * duplicating the check sequence.
 *
 * @param adapter - Selected runtime adapter.
 * @param context - Capabilities this preflight run depends on.
 * @throws {ContainerRuntimeError} When required runtime capabilities are missing.
 */
export async function runContainerPreflight(adapter: ContainerRuntimeAdapter, context: Readonly<ContainerPreflightContext>): Promise<void> {
  const runner = context.runner.scope({signal: context.signal});

  await assertToolAvailable(adapter.primaryCli, runner, context.signal);

  if (adapter.engine === "rancher") {
    await assertRancherBackend(runner, context.signal);
  } else {
    await assertNoDockerDesktopBackend(runner);
    await assertPodmanBackend(runner, context.signal);
  }

  const composeOutcome = await runner.run(adapter.compose(["version"]));
  throwIfPreflightCancelled(composeOutcome, context.signal);
  if (composeOutcome.kind !== "succeeded") {
    throw new ContainerRuntimeError(
      `${adapter.displayName} Compose provider is not available. Output: ${describeOutcomeFailure(composeOutcome)}`,
    );
  }

  await warnOnExistingLocalContainers(adapter, runner, context.logger);
}

/**
 * Converts a legacy {@link CommandResult} into a typed {@link ProcessOutcome}.
 *
 * @param result - Legacy command result to convert.
 * @returns The equivalent typed process outcome.
 */
function toProcessOutcome(result: Readonly<CommandResult>): ProcessOutcome {
  const output = {stdout: result.stdout, stderr: result.stderr, durationMs: result.durationMs};

  if (result.spawnError !== undefined) {
    return {...output, kind: "spawn-failed", message: result.spawnError};
  }
  if (result.timedOut) {
    return {...output, kind: "timed-out", ...(result.signal === undefined ? {} : {signal: result.signal})};
  }
  if (result.signal !== undefined) {
    return {...output, kind: "signalled", signal: result.signal};
  }
  if (result.code === 0) {
    return {...output, kind: "succeeded", exitCode: 0};
  }

  return {...output, kind: "exited", exitCode: result.code};
}

/** Adapts a legacy {@link CommandRunner} to the typed {@link ProcessRunner} contract. */
class LegacyProcessRunnerAdapter extends AbstractProcessRunner {
  readonly #runner: CommandRunner;

  public constructor(runner: CommandRunner) {
    super();
    this.#runner = runner;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    return toProcessOutcome(await this.#runner.run(request, options));
  }
}

/**
 * Inert environment snapshot for the deprecated {@link runSharedPreflight} overload.
 *
 * @remarks
 * Never read by {@link runContainerPreflight}'s check sequence; it exists only to satisfy the
 * {@link ContainerPreflightContext} contract without reading ambient `process.env`/`process.cwd`
 * state from this still-legacy overload.
 */
const legacyPreflightEnvironment: RuntimeEnvironment = {
  variables: {},
  cwd: "",
  executablePath: "",
  platform: "linux",
  architecture: "x64",
  stdinIsTTY: false,
  stdoutIsTTY: false,
  isCI: false,
};

/**
 * Runs common preflight checks for engine-aware local runtime commands.
 *
 * @deprecated Removed when Selfhost migrates in Task 21. Delegates to
 * {@link runContainerPreflight}; migrated commands call that function directly with their own
 * runtime capabilities instead.
 * @param adapter - Selected runtime adapter.
 * @param runner - Command runner used for probing.
 * @param logger - Logger used for preflight output.
 * @throws {ContainerRuntimeError} When required runtime capabilities are missing.
 */
export function runSharedPreflight(
  adapter: ContainerRuntimeAdapter,
  runner: CommandRunner,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("container::preflight"),
): Promise<void> {
  return runContainerPreflight(adapter, {
    runner: new LegacyProcessRunnerAdapter(runner),
    logger,
    environment: legacyPreflightEnvironment,
    signal: new AbortController().signal,
  });
}
