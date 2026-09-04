/**
 * @fileoverview Preflight checks for local container runtime scripts.
 * @module scripts/container-runtime/preflight
 *
 * @remarks
 * The context-based {@link runContainerPreflight} implementation is the only preflight path: it
 * depends solely on the typed {@link ProcessRunner} boundary, never on Node's child-process
 * module directly, and every declarative container command (Aspire, Compose, Image, Selfhost)
 * calls it with its own invocation capabilities. The deprecated `runSharedPreflight()`,
 * `describeCommandFailure()`, `runArtifactGeneration()`, and `exitWithError()` (the last defined
 * in `types.ts`) compatibility surfaces were removed once Selfhost migrated in Task 21.
 */

import {NodeTerminalPresenterSink, nodeTerminalPresenterRuntimeHost} from "../adapters/node/node-terminal-sink.ts";
import {ComposedTerminalPresenter} from "../core/presentation/composed-terminal-presenter.ts";
import type {TerminalPresenter} from "../core/presentation/terminal-presenter.ts";
import {processFailureEvidence, type ProcessOutcome, type ProcessRunner} from "../common/runner.ts";
import {commandCancellationFromSignal, type RuntimeEnvironment} from "../common/runtime.ts";
import type {ContainerRuntimeAdapter} from "./adapters.ts";
import {ContainerRuntimeError} from "./types.ts";

/** Fixed ports used by local Aspire and selfhost resources. */
export const requiredLocalPorts = [3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000] as const;

/**
 * Combines stdout and stderr for backend/provider banner detection.
 *
 * @remarks
 * Some container CLI banners (for example Podman's external compose
 * provider notice, or a Docker Desktop version banner) are written to
 * stderr rather than stdout. Detection heuristics must inspect both
 * streams; this is unrelated to {@link describeOutcomeFailure}'s
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
 * @remarks
 * The probe itself is advisory: a failed `docker version` cannot confirm a Docker Desktop banner,
 * so it is not an error. A cancelled probe on the invocation's own aborted signal is different
 * and now surfaces the invocation's cancellation immediately, instead of letting the next
 * signal-aware probe report it one probe later.
 *
 * @param runner - Process runner used for probing.
 * @param signal - The owning invocation's cancellation signal, when probing through
 * {@link runContainerPreflight}.
 * @throws {ContainerRuntimeError} When Docker Desktop is detected.
 */
export async function assertNoDockerDesktopBackend(runner: ProcessRunner, signal?: AbortSignal): Promise<void> {
  const outcome = await runner.run({command: "docker", args: ["version"]});
  throwIfPreflightCancelled(outcome, signal);

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
  logger: TerminalPresenter = new ComposedTerminalPresenter("container::preflight", {
    sink: new NodeTerminalPresenterSink(),
    runtimeHost: nodeTerminalPresenterRuntimeHost,
  }),
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
  readonly logger: TerminalPresenter;
  /** Immutable snapshot of the ambient environment. */
  readonly environment: RuntimeEnvironment;
  /** Cancellation signal threaded into every preflight probe. */
  readonly signal: AbortSignal;
}

/**
 * Runs common preflight checks for engine-aware local runtime commands.
 *
 * @remarks
 * This is the only preflight path: every declarative container command calls it with its own
 * invocation runner, logger, environment snapshot, and cancellation signal.
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
    await assertNoDockerDesktopBackend(runner, context.signal);
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
