/**
 * @fileoverview Preflight checks for local container runtime scripts.
 * @module scripts/container-runtime/preflight
 *
 * @remarks
 * Every probe runs through the Effect `Process` service, so tests script it instead of spawning
 * Docker or Podman. A failing probe becomes a typed {@link ContainerRuntimeError} whose message is
 * the legacy text, with the failure detail rebuilt from the {@link ProcessError} fields exactly as
 * the legacy `describeOutcomeFailure` built it from a process outcome. Cancellation is fiber
 * interruption: an interrupted probe stops the preflight without any further probe.
 */

import {Effect} from "effect";

import {resolveRepositoryPaths} from "../common/repository-paths.ts";
import {legacyReadOnlyFiles} from "../platform/bridge.ts";
import type {Environment} from "../platform/Environment.ts";
import type {ReadOnlyFiles} from "../platform/Files.ts";
import {withLogContext} from "../platform/Output.ts";
import {Process, type ProcessError, type ProcessOptions, type ProcessResult} from "../platform/Process.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "./adapters.ts";
import {resolveRuntimeContainerEngine} from "./selection.ts";
import {ContainerRuntimeError, type ContainerEngine, type ContainerEngineInput} from "./types.ts";

/** Fixed ports used by local Aspire and selfhost resources. */
export const requiredLocalPorts = [3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000] as const;

/** Longest failure detail embedded in a preflight message, as the legacy process diagnostics bounded it. */
const MAX_FAILURE_DETAIL_LENGTH = 2_000;

/** Probe options: a failure keeps its whole output, so the detail is the legacy leading excerpt rather than a tail. */
const probeOptions: ProcessOptions = {failureOutput: "full"};

/**
 * Combines stdout and stderr for backend/provider banner detection.
 *
 * @remarks
 * Some container CLI banners (for example Podman's external compose
 * provider notice, or a Docker Desktop version banner) are written to
 * stderr rather than stdout. Detection heuristics must inspect both
 * streams; this is unrelated to {@link describeProcessFailure}'s
 * stderr-first precedence, which is used only for diagnostic failure text.
 *
 * @param result - Process output to inspect.
 * @returns Lowercased stdout and stderr joined for substring detection.
 */
function combinedOutputForBannerDetection(result: Readonly<Pick<ProcessResult, "stdout" | "stderr">>): string {
  return `${result.stdout}\n${result.stderr}`.toLowerCase();
}

/**
 * Builds the diagnostic failure detail of a failed probe, exactly like the legacy outcome-based helper.
 *
 * @remarks
 * The detail is the first {@link MAX_FAILURE_DETAIL_LENGTH} characters of stderr, else stdout, else
 * (for a spawn failure) the spawn reason; when all are empty it falls back to a kind-specific
 * summary: `exit code <n>`, `terminated by <signal>`, or `timed out`.
 *
 * @param error - The probe failure.
 * @returns The most relevant available diagnostic text.
 */
function describeProcessFailure(error: ProcessError): string {
  const evidence =
    error.stderr.length > 0
      ? error.stderr
      : error.stdout.length > 0
        ? error.stdout
        : error._tag === "ProcessSpawnFailed"
          ? error.reason
          : "";
  if (evidence !== "") {
    return evidence.slice(0, MAX_FAILURE_DETAIL_LENGTH);
  }

  switch (error._tag) {
    case "ProcessExited":
      return `exit code ${String(error.exitCode)}`;
    case "ProcessSignalled":
      return `terminated by ${error.signal}`;
    case "ProcessSpawnFailed":
      return error.reason;
    case "ProcessTimedOut":
      return "timed out";
  }
}

/**
 * Builds the typed failure of a probe whose message ends with the probe's failure detail.
 *
 * @param prefix - Legacy message text before `Output: `.
 * @returns A mapper from the probe failure to {@link ContainerRuntimeError}.
 */
function probeFailure(prefix: string): (error: ProcessError) => ContainerRuntimeError {
  return (error) => new ContainerRuntimeError({message: `${prefix} Output: ${describeProcessFailure(error)}`});
}

/**
 * Verifies a required CLI tool is available.
 *
 * @param tool - CLI tool name to probe with `--version`.
 * @returns An effect failing with {@link ContainerRuntimeError} when the tool cannot be executed.
 */
export const assertToolAvailable: (tool: string) => Effect.Effect<void, ContainerRuntimeError, Process> = Effect.fn(
  "containers.assertToolAvailable",
)(function* (tool: string) {
  const runner = yield* Process;
  yield* runner
    .run({command: tool, args: ["--version"]}, probeOptions)
    .pipe(Effect.mapError(probeFailure(`Required tool '${tool}' is not available.`)));
});

/**
 * Rejects Docker Desktop when it appears as the active Docker-compatible backend.
 *
 * @remarks
 * The probe itself is advisory: a failed `docker version` cannot confirm a Docker Desktop banner,
 * so it is not an error. An interrupted probe still interrupts the preflight.
 *
 * @returns An effect failing with {@link ContainerRuntimeError} when Docker Desktop is detected.
 */
export const assertNoDockerDesktopBackend: () => Effect.Effect<void, ContainerRuntimeError, Process> = Effect.fn(
  "containers.assertNoDockerDesktopBackend",
)(function* () {
  const runner = yield* Process;
  const result = yield* runner.run({command: "docker", args: ["version"]}, probeOptions).pipe(
    Effect.map((output): ProcessResult | undefined => output),
    Effect.catch(() => Effect.succeed(undefined)),
  );

  if (result !== undefined && combinedOutputForBannerDetection(result).includes("docker desktop")) {
    return yield* new ContainerRuntimeError({
      message: "Docker Desktop is the active backend. Stop Docker Desktop and select Rancher Desktop or Podman Desktop.",
    });
  }
});

/**
 * Verifies Rancher Desktop owns the Docker-compatible CLI path.
 *
 * @returns An effect failing with {@link ContainerRuntimeError} when the backend is unavailable or
 * Docker Desktop is active.
 */
export const assertRancherBackend: () => Effect.Effect<void, ContainerRuntimeError, Process> = Effect.fn("containers.assertRancherBackend")(
  function* () {
    const runner = yield* Process;
    const result = yield* runner
      .run({command: "docker", args: ["version"]}, probeOptions)
      .pipe(Effect.mapError(probeFailure("Rancher Desktop Docker-compatible CLI is not available.")));

    if (combinedOutputForBannerDetection(result).includes("docker desktop")) {
      return yield* new ContainerRuntimeError({
        message:
          "Rancher engine selected but Docker Desktop appears to be active. Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop.",
      });
    }
  },
);

/**
 * Verifies Podman and its Compose provider are available.
 *
 * @returns An effect failing with {@link ContainerRuntimeError} when Podman or Compose support is
 * unavailable, or when Compose is delegated to a Docker Desktop provider.
 */
export const assertPodmanBackend: () => Effect.Effect<void, ContainerRuntimeError, Process> = Effect.fn("containers.assertPodmanBackend")(
  function* () {
    const runner = yield* Process;
    yield* runner
      .run({command: "podman", args: ["--version"]}, probeOptions)
      .pipe(Effect.mapError(probeFailure("Podman is not available.")));

    const compose = yield* runner
      .run({command: "podman", args: ["compose", "version"]}, probeOptions)
      .pipe(Effect.mapError(probeFailure("Podman Compose provider is not available. Configure Podman Desktop Compose support.")));

    const composeOutput = combinedOutputForBannerDetection(compose);
    const usesPodmanCompose = composeOutput.includes("podman-compose");
    const dockerComposeIndicators = ["\\docker\\", "/docker/", "/docker.app/", "docker desktop", "docker-compose.exe", "docker-compose"];
    if (!usesPodmanCompose && dockerComposeIndicators.some((indicator) => composeOutput.includes(indicator))) {
      return yield* new ContainerRuntimeError({
        message:
          "Podman Compose is currently delegated to a Docker Desktop compose provider. Install podman-compose and set PODMAN_COMPOSE_PROVIDER to the podman-compose executable.",
      });
    }
  },
);

/**
 * Warns when known local containers already exist for the selected engine.
 *
 * @remarks
 * The listing is advisory: a failed listing logs nothing. The warning is an `Effect.logWarning`
 * with the legacy text, rendered with the caller's log context.
 *
 * @param adapter - Selected runtime adapter.
 * @returns An effect that never fails.
 */
export const warnOnExistingLocalContainers: (adapter: ContainerRuntimeAdapter) => Effect.Effect<void, never, Process> = Effect.fn(
  "containers.warnOnExistingLocalContainers",
)(function* (adapter: ContainerRuntimeAdapter) {
  const names = ["traefik", "mssql", "cosmosdb", "azurite", "redis", "exp-arolariu-ro", "api-arolariu-ro", "website-arolariu-ro"];
  const runner = yield* Process;
  const listing = yield* runner.run({command: adapter.primaryCli, args: ["ps", "-a", "--format", "{{.Names}}"]}).pipe(
    Effect.map((output): string | undefined => output.stdout),
    Effect.catch(() => Effect.succeed(undefined)),
  );

  if (listing === undefined) return;

  const active = listing
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const collisions = names.filter((name) => active.includes(name));

  if (collisions.length > 0) {
    yield* Effect.logWarning(`Existing local containers detected for ${adapter.displayName}: ${collisions.join(", ")}`);
  }
});

/**
 * Runs common preflight checks for engine-aware local runtime commands.
 *
 * @remarks
 * Probes, in order: the engine CLI `--version`; for Rancher the Docker-compatible backend, for
 * Podman the advisory Docker Desktop probe and then the Podman backend; the engine's
 * `compose version`; and finally the existing-container listing, which only warns.
 *
 * @param engine - Selected container engine.
 * @returns The engine's runtime adapter, failing with {@link ContainerRuntimeError} when a required
 * runtime capability is missing.
 */
export const runContainerPreflight: (engine: ContainerEngine) => Effect.Effect<ContainerRuntimeAdapter, ContainerRuntimeError, Process> =
  Effect.fn("containers.runContainerPreflight")(function* (engine: ContainerEngine) {
    const adapter = getContainerAdapter(engine);
    yield* assertToolAvailable(adapter.primaryCli);

    if (adapter.engine === "rancher") {
      yield* assertRancherBackend();
    } else {
      yield* assertNoDockerDesktopBackend();
      yield* assertPodmanBackend();
    }

    const runner = yield* Process;
    yield* runner
      .run(adapter.compose(["version"]), probeOptions)
      .pipe(Effect.mapError(probeFailure(`${adapter.displayName} Compose provider is not available.`)));

    yield* warnOnExistingLocalContainers(adapter);
    return adapter;
  });

/**
 * Resolves the engine of one container command and runs its preflight.
 *
 * @remarks
 * Discovers the repository root through `ReadOnlyFiles` (for the persisted tooling configuration
 * path), resolves the engine with {@link resolveRuntimeContainerEngine}, and runs
 * {@link runContainerPreflight} under the `<command>::preflight` log context, so the
 * existing-container warning keeps the legacy `[arolariu::<command>::preflight]` prefix.
 *
 * @param input - The command input; its optional `engine` overrides the environment and configuration.
 * @param command - The command name used in the preflight log context.
 * @returns The selected engine's runtime adapter.
 */
export const prepareContainerEngine: (
  input: Readonly<ContainerEngineInput>,
  command: string,
) => Effect.Effect<ContainerRuntimeAdapter, ContainerRuntimeError, Process | ReadOnlyFiles | Environment> = Effect.fn(
  "containers.prepareContainerEngine",
)(function* (input: Readonly<ContainerEngineInput>, command: string) {
  const files = yield* legacyReadOnlyFiles;
  const paths = yield* Effect.promise(() => resolveRepositoryPaths(import.meta.url, files));
  const selection = yield* resolveRuntimeContainerEngine({
    // The CLI only accepts rancher/podman, but resolveRuntimeContainerEngine still validates every
    // source (including the docker-deprecation message) before it is treated as a real engine.
    ...(input.engine === undefined ? {} : {requestedEngine: input.engine}),
    toolingConfigPath: paths.toolingConfig,
  });
  return yield* runContainerPreflight(selection.engine).pipe(withLogContext(`${command}::preflight`));
});
