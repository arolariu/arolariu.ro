/**
 * @fileoverview Local container runtime and infrastructure preparation.
 * @module scripts/commands/setup/phases/infrastructure
 *
 * @remarks
 * All readiness observations (runtime CLI/backend/compose availability, Docker Desktop conflict,
 * socket/context issues, required port occupancy and ownership, certificate presence, manifest
 * presence, and container inventory) are consumed from shared {@link InfrastructureFacts} through
 * `context.inspection.inspect("infrastructure")`. This module owns only mutation policy: engine
 * selection/persistence, package-manager discovery, container installation proposals, mkcert
 * install/trust/generation, credential isolation, consent, and dry-run.
 *
 * Every attempted mutation runs through {@link runInfrastructureMutation}, which invalidates its
 * exact fact keys in a finalizer whenever the mutation was actually attempted, so a failed or
 * interrupted mutation can never leave a partially mutated repository described by stale cached
 * facts. Planned and declined actions never attempt the mutation and therefore never invalidate.
 * After an executed disposition the already-invalidated key is re-inspected exactly once.
 *
 * The engine is selected from the `--engine` option, `AROLARIU_CONTAINER_ENGINE`, or the persisted
 * non-secret tooling configuration; only when none is set and stdin is interactive does the phase
 * ask through `Prompts.select`. The tooling configuration is read and written through the bridge's
 * legacy filesystem view, and the write happens only inside the consent-gated persistence action,
 * after the prompt resolved, so a dry run never writes and an interruption at the prompt leaves the
 * file untouched. Commands run through `Process` with the setup command defaults and never observe
 * `MSSQL_SA_PASSWORD`; the platform and the environment come from `Environment`.
 */

import {dirname, resolve} from "node:path";

import {Clock, Effect, FileSystem, Terminal} from "effect";

import {mergeToolingConfig, readToolingConfig, writeToolingConfig} from "../../../common/tooling-config.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "../../../container-runtime/adapters.ts";
import {resolveContainerEngine} from "../../../container-runtime/selection.ts";
import type {ContainerEngine, ContainerEngineSelection, EngineSelectionSource} from "../../../container-runtime/types.ts";
import type {InfrastructureFacts} from "../../../inspection/infrastructure.ts";
import type {RepositoryInspectionKey} from "../../../inspection/repository.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import {legacyFileSystem} from "../../../platform/bridge.ts";
import {Environment, type EnvironmentSnapshot} from "../../../platform/Environment.ts";
import type {ProcessError, ProcessRequest} from "../../../platform/Process.ts";
import {Prompts} from "../../../platform/Prompts.ts";
import {SetupActionFailed} from "../errors.ts";
import {phaseResult, processFailureOutput, runPhaseCommand, submitSetupAction, type PhaseCommandOutcome} from "../phase-support.ts";
import type {
  InstallationProposal,
  SetupActionScope,
  SetupContext,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupRequirements,
} from "../types.ts";

const ENGINE_PERSIST_ACTION = "infrastructure.engine.persist";
const CONTAINER_INSTALL_ACTION = "infrastructure.container.install";
const MKCERT_INSTALL_ACTION = "infrastructure.mkcert.install";
const MKCERT_TRUST_ACTION = "infrastructure.mkcert.trust";
const CERTIFICATE_GENERATE_ACTION = "infrastructure.certificates.generate";
const SELECT_ENGINE_ACTION = "npm run setup -- --engine rancher|podman";
const MKCERT_MANUAL_URL = "https://github.com/FiloSottile/mkcert#installation";
const MKCERT_MANUAL_ACTION = `Install mkcert from ${MKCERT_MANUAL_URL}, then rerun setup.`;
const SQL_PASSWORD_ENVIRONMENT_KEY = "MSSQL_SA_PASSWORD";

/**
 * Bounded ceiling for every long-running container-desktop installation, mkcert install/trust, and
 * certificate-generation mutation.
 *
 * @remarks
 * Setup commands default to a probe-sized timeout, which is correct for a `--version` probe but
 * would truncate a container-desktop or mkcert install. Each such mutation therefore requests this
 * ceiling explicitly. Probes keep the bounded default instead.
 */
const LONG_RUNNING_MUTATION_TIMEOUT_MS = 1_200_000;

/**
 * Environment override every command of this phase runs with: an `undefined` value unsets the
 * variable, so no child ever observes `MSSQL_SA_PASSWORD`, whatever the invocation environment
 * carries, without mutating the immutable `Environment` snapshot.
 */
const CREDENTIAL_ISOLATION: Readonly<Record<string, string | undefined>> = {[SQL_PASSWORD_ENVIRONMENT_KEY]: undefined};

/** A step of the phase: fails with {@link SetupActionFailed} for a failed mutation. */
type InfrastructureStep<A> = Effect.Effect<A, SetupActionFailed, SetupRequirements>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function deduplicate(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

/**
 * Converts one failed process into bounded, non-secret evidence.
 *
 * @param error - The process failure.
 * @returns The failure kind line, then the bounded child output.
 */
function commandFailureEvidence(error: ProcessError): readonly string[] {
  const evidence = processFailureOutput(error);
  return [
    ...(error._tag === "ProcessExited" ? [`Command exited with code ${String(error.exitCode)}.`] : []),
    ...(error._tag === "ProcessTimedOut" ? ["Command timed out."] : []),
    ...(error._tag === "ProcessSignalled" ? [`Command stopped with signal ${error.signal}.`] : []),
    ...(error._tag === "ProcessSpawnFailed" ? [`Unable to start command: ${error.message}`] : []),
    ...(evidence === "" ? [] : [evidence]),
  ];
}

/**
 * Runs one credential-isolated command of this phase with the setup command defaults.
 *
 * @param context - The setup context.
 * @param request - The command.
 * @param options - `output` and `timeoutMs` overrides of a long-running mutation.
 * @returns The command outcome; an interruption propagates.
 */
function runInfrastructureCommand(
  context: SetupContext,
  request: ProcessRequest,
  options: Readonly<{output?: "inherit"; timeoutMs?: number}> = {},
): Effect.Effect<PhaseCommandOutcome, never, SetupRequirements> {
  return runPhaseCommand(context, request, {cwd: context.paths.root, env: CREDENTIAL_ISOLATION, ...options});
}

/**
 * Runs one required mutation command and fails the submitting action when it does not succeed.
 *
 * @param context - The setup context.
 * @param actionId - The submitting action.
 * @param command - The command.
 * @param failureSummary - Non-secret summary naming the mutation that failed (without its period).
 * @returns The command effect; an interruption propagates.
 */
function runRequiredCommand(
  context: SetupContext,
  actionId: string,
  command: ProcessRequest,
  failureSummary: string,
): InfrastructureStep<void> {
  return Effect.flatMap(
    runInfrastructureCommand(context, command, {output: "inherit", timeoutMs: LONG_RUNNING_MUTATION_TIMEOUT_MS}),
    (outcome) =>
      outcome.kind === "succeeded"
        ? Effect.void
        : Effect.fail(
            new SetupActionFailed({actionId, message: [`${failureSummary}.`, ...commandFailureEvidence(outcome.error)].join("\n")}),
          ),
  );
}

// ---------------------------------------------------------------------------
// Mutation wrapper
// ---------------------------------------------------------------------------

type InfrastructureMutationOutcome =
  | Readonly<{disposition: "planned"}>
  | Readonly<{disposition: "declined"}>
  | Readonly<{disposition: "executed"; outcome: InspectionOutcome<InfrastructureFacts>}>;

/**
 * Runs one policy-controlled infrastructure mutation with finalizer-safe exact invalidation.
 *
 * @remarks
 * The attempted flag is set when `SetupActions` starts the mutation. The invalidation runs in a
 * finalizer, so even a failed or interrupted mutation cannot leave stale cached facts. Planned and
 * declined actions never set the flag and never invalidate. After an executed disposition the
 * `"infrastructure"` fact is re-inspected.
 *
 * @param context - Shared setup context carrying the inspection session.
 * @param action - Action identity, scope, summary, and the mutation to attempt.
 * @param invalidationKeys - Exact fact keys to invalidate after an attempted mutation.
 * @returns The disposition, plus the refreshed infrastructure outcome when executed; fails with
 * {@link SetupActionFailed} when the action failed. An interruption propagates.
 */
function runInfrastructureMutation(
  context: SetupContext,
  action: Readonly<{id: string; scope: SetupActionScope; summary: string; mutate: InfrastructureStep<void>}>,
  invalidationKeys: readonly RepositoryInspectionKey[],
): InfrastructureStep<InfrastructureMutationOutcome> {
  return Effect.gen(function* () {
    let attempted = false;
    const submitted = yield* submitSetupAction({
      id: action.id,
      scope: action.scope,
      summary: action.summary,
      execute: Effect.suspend(() => {
        attempted = true;
        return action.mutate;
      }),
    }).pipe(Effect.ensuring(Effect.suspend(() => (attempted ? context.inspection.invalidate(...invalidationKeys) : Effect.void))));

    if (submitted.kind === "failed") {
      return yield* new SetupActionFailed({actionId: action.id, message: submitted.message});
    }
    if (submitted.kind === "planned" || submitted.kind === "declined") {
      return {disposition: submitted.kind};
    }
    return {disposition: "executed", outcome: yield* context.inspection.inspect("infrastructure")};
  });
}

/**
 * Selects a supported container desktop installation proposal.
 *
 * @param input - Selected engine, platform, and discovered package managers.
 * @returns A reviewed installation command, or `null` when automation is unsupported.
 */
export function selectContainerInstallationProposal(
  input: Readonly<{
    engine: ContainerEngine;
    platform: NodeJS.Platform;
    availablePackageManagers: ReadonlySet<string>;
  }>,
): InstallationProposal | null {
  if (input.platform === "win32" && input.availablePackageManagers.has("winget")) {
    const packageId = input.engine === "rancher" ? "SUSE.RancherDesktop" : "RedHat.Podman-Desktop";
    return {
      command: {
        command: "winget",
        args: ["install", "--id", packageId, "--exact", "--accept-package-agreements", "--accept-source-agreements"],
      },
      explanation: `Install ${getContainerAdapter(input.engine).displayName} with Windows Package Manager.`,
    };
  }

  if (input.platform === "darwin" && input.availablePackageManagers.has("brew")) {
    return {
      command: {
        command: "brew",
        args: ["install", "--cask", input.engine === "rancher" ? "rancher" : "podman-desktop"],
      },
      explanation: `Install ${getContainerAdapter(input.engine).displayName} with Homebrew.`,
    };
  }

  if (input.platform === "linux" && input.engine === "podman") {
    const manager = input.availablePackageManagers.has("apt-get") ? "apt-get" : input.availablePackageManagers.has("dnf") ? "dnf" : null;
    if (manager !== null) {
      return {
        command: {command: "sudo", args: [manager, "install", "-y", "podman", "podman-compose"]},
        explanation: `Install Podman and its Compose provider with ${manager}.`,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Installation proposals - mkcert
// ---------------------------------------------------------------------------

function selectMkcertInstallationProposal(
  platform: NodeJS.Platform,
  availablePackageManagers: ReadonlySet<string>,
): InstallationProposal | null {
  if (platform === "win32" && availablePackageManagers.has("winget")) {
    return {
      command: {
        command: "winget",
        args: ["install", "--id", "FiloSottile.mkcert", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
      },
      explanation: "Install mkcert with Windows Package Manager.",
    };
  }
  if (platform === "darwin" && availablePackageManagers.has("brew")) {
    return {
      command: {command: "brew", args: ["install", "mkcert"]},
      explanation: "Install mkcert with Homebrew.",
    };
  }
  if (platform === "linux" && availablePackageManagers.has("apt-get")) {
    return {
      command: {command: "sudo", args: ["apt-get", "install", "-y", "mkcert", "libnss3-tools"]},
      explanation: "Install mkcert and NSS tools with apt.",
    };
  }
  if (platform === "linux" && availablePackageManagers.has("dnf")) {
    return {
      command: {command: "sudo", args: ["dnf", "install", "-y", "mkcert", "nss-tools"]},
      explanation: "Install mkcert and NSS tools with dnf.",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Package manager discovery
// ---------------------------------------------------------------------------

/**
 * Discovers the package managers of the host platform with sequential `--version` probes.
 *
 * @param context - The setup context.
 * @param platform - The host platform.
 * @returns The available package managers.
 */
function discoverPackageManagers(
  context: SetupContext,
  platform: NodeJS.Platform,
): Effect.Effect<ReadonlySet<string>, never, SetupRequirements> {
  return Effect.gen(function* () {
    const managers = platform === "win32" ? ["winget"] : platform === "darwin" ? ["brew"] : platform === "linux" ? ["apt-get", "dnf"] : [];
    const available = new Set<string>();
    for (const manager of managers) {
      const outcome = yield* runInfrastructureCommand(context, {command: manager, args: ["--version"]});
      if (outcome.kind === "succeeded") {
        available.add(manager);
      }
    }
    return available;
  });
}

// ---------------------------------------------------------------------------
// Engine selection
// ---------------------------------------------------------------------------

interface SelectedEngine {
  readonly engine: ContainerEngine;
  readonly source: EngineSelectionSource | "interactive";
}

/** The engine selection, or the message of why no supported engine was selected. */
type EngineSelectionOutcome = Readonly<{kind: "selected"; selection: SelectedEngine}> | Readonly<{kind: "failed"; message: string}>;

/** The legacy engine prompt message. */
const ENGINE_PROMPT_MESSAGE = "Select the local container engine:";

/** The legacy engine prompt choices, in order. */
const ENGINE_PROMPT_CHOICES = [
  {
    value: "rancher",
    label: "Rancher Desktop (Moby/dockerd; Docker Desktop must be stopped)",
  },
  {
    value: "podman",
    label: "Podman Desktop (podman compose provider required)",
  },
] as const satisfies readonly {readonly value: ContainerEngine; readonly label: string}[];

/**
 * Resolves the configured engine: the `--engine` option, then `AROLARIU_CONTAINER_ENGINE`, then the
 * persisted configuration.
 *
 * @param context - The setup context.
 * @param environment - The invocation environment.
 * @param configuredEngine - The persisted engine, when one is configured.
 * @returns The resolved selection, or the selection error.
 */
function resolveConfiguredEngine(
  context: SetupContext,
  environment: EnvironmentSnapshot,
  configuredEngine: ContainerEngine | undefined,
): Readonly<{kind: "resolved"; selection: ContainerEngineSelection}> | Readonly<{kind: "unresolved"; error: unknown}> {
  try {
    return {
      kind: "resolved",
      selection: resolveContainerEngine({
        argv: context.options.engine === undefined ? [] : ["--engine", context.options.engine],
        env: environment.variables,
        ...(configuredEngine === undefined ? {} : {configuredEngine}),
      }),
    };
  } catch (error) {
    return {kind: "unresolved", error};
  }
}

/**
 * Selects the container engine, prompting only when nothing configures one and stdin is interactive.
 *
 * @remarks
 * Without any configured selection on an interactive terminal the phase asks through
 * `Prompts.select`. A `PromptUnavailable` becomes a `failed` outcome with its message; a terminal
 * quit interrupts the setup run. Any other selection error is a `failed` outcome too.
 *
 * @param context - The setup context.
 * @param configuredEngine - The persisted engine, when one is configured.
 * @returns The selection outcome; an interruption propagates.
 */
function selectEngine(
  context: SetupContext,
  configuredEngine: ContainerEngine | undefined,
): Effect.Effect<EngineSelectionOutcome, never, SetupRequirements> {
  return Effect.gen(function* () {
    const environment = yield* Environment;
    const resolved = resolveConfiguredEngine(context, environment, configuredEngine);
    if (resolved.kind === "resolved") {
      return {kind: "selected", selection: resolved.selection};
    }

    const configuredEngineVariable = environment.variables["AROLARIU_CONTAINER_ENGINE"];
    const noConfiguredSelection =
      context.options.engine === undefined
      && (configuredEngineVariable === undefined || configuredEngineVariable.trim() === "")
      && configuredEngine === undefined;
    if (!noConfiguredSelection || !environment.stdinIsTTY) {
      return {kind: "failed", message: errorMessage(resolved.error)};
    }

    const prompts = yield* Prompts;
    return yield* prompts.select<ContainerEngine>(ENGINE_PROMPT_MESSAGE, ENGINE_PROMPT_CHOICES).pipe(
      Effect.map((engine): EngineSelectionOutcome => ({kind: "selected", selection: {engine, source: "interactive"}})),
      Effect.catch((error) =>
        Terminal.isQuitError(error) ? Effect.interrupt : Effect.succeed<EngineSelectionOutcome>({kind: "failed", message: error.message}),
      ),
    );
  });
}

/**
 * Persists the selected engine: re-reads the latest tooling configuration and writes the merged
 * document through the bridge's legacy filesystem view.
 *
 * @remarks
 * Runs only inside the consent-gated persistence action. The read-modify-write is uninterruptible,
 * so an interruption waits for the atomic write to settle before the invalidation finalizer runs.
 *
 * @param context - The setup context.
 * @param engine - The selected engine.
 * @returns The write; fails with {@link SetupActionFailed} for an invalid configuration or a failed write.
 */
function persistEngine(context: SetupContext, engine: ContainerEngine): InfrastructureStep<void> {
  return Effect.gen(function* () {
    const files = yield* legacyFileSystem;
    const latest = yield* Effect.promise(() => readToolingConfig(context.paths.toolingConfig, files));
    if (latest.status === "invalid") {
      return yield* new SetupActionFailed({actionId: ENGINE_PERSIST_ACTION, message: latest.error});
    }
    yield* Effect.tryPromise({
      try: () =>
        writeToolingConfig(
          context.paths.toolingConfig,
          mergeToolingConfig(latest.status === "valid" ? latest.config : undefined, {containerEngine: engine}),
          files,
        ),
      catch: (error) => new SetupActionFailed({actionId: ENGINE_PERSIST_ACTION, message: errorMessage(error)}),
    });
  }).pipe(Effect.uninterruptible);
}

// ---------------------------------------------------------------------------
// Runtime readiness from shared facts
// ---------------------------------------------------------------------------

interface RuntimeReadiness {
  readonly ready: boolean;
  readonly installable: boolean;
  readonly manualStart: boolean;
  readonly evidence: readonly string[];
}

function evaluateRuntimeReadiness(adapter: ContainerRuntimeAdapter, facts: InfrastructureFacts): RuntimeReadiness {
  if (facts.dockerConflict) {
    return {
      ready: false,
      installable: false,
      manualStart: false,
      evidence: [`${adapter.displayName} runtime postcondition failed: Docker Desktop appears to be active as the container backend.`],
    };
  }
  if (!facts.cliAvailable) {
    return {
      ready: false,
      installable: true,
      manualStart: false,
      evidence: [`${adapter.displayName} runtime postcondition failed: the ${adapter.primaryCli} CLI is not available.`],
    };
  }
  if (!facts.composeAvailable) {
    return {
      ready: false,
      installable: true,
      manualStart: false,
      evidence: [`${adapter.displayName} runtime postcondition failed: the compose provider is not available.`],
    };
  }
  if (!facts.backendAvailable) {
    return {
      ready: false,
      installable: false,
      manualStart: true,
      evidence: [`${adapter.displayName} runtime postcondition failed: the container backend is not reachable.`],
    };
  }
  if (facts.socketContextIssues.length > 0) {
    return {
      ready: false,
      installable: false,
      manualStart: true,
      evidence: [`${adapter.displayName} runtime postcondition failed: ${facts.socketContextIssues.join("; ")}`],
    };
  }
  return {
    ready: true,
    installable: false,
    manualStart: false,
    evidence: [`${adapter.displayName} runtime postcondition is satisfied.`],
  };
}

function runtimeManualAction(adapter: ContainerRuntimeAdapter): string {
  return `Start or restart ${adapter.displayName}, then rerun setup.`;
}

function manualInstallAction(engine: ContainerEngine): string {
  return engine === "rancher"
    ? "Install Rancher Desktop from https://rancherdesktop.io/, then rerun setup."
    : "Install Podman Desktop from https://podman-desktop.io/downloads, then rerun setup.";
}

interface RuntimeOutcome {
  readonly blocked: boolean;
  readonly planned: boolean;
  readonly evidence: readonly string[];
  readonly nextActions: readonly string[];
}

function prepareRuntime(
  context: SetupContext,
  platform: NodeJS.Platform,
  adapter: ContainerRuntimeAdapter,
  facts: InfrastructureFacts,
): InfrastructureStep<RuntimeOutcome> {
  return Effect.gen(function* () {
    const readiness = evaluateRuntimeReadiness(adapter, facts);

    if (readiness.ready) {
      return {blocked: false, planned: false, evidence: readiness.evidence, nextActions: []};
    }

    if (!readiness.installable) {
      return {
        blocked: true,
        planned: false,
        evidence: readiness.evidence,
        nextActions: [
          readiness.manualStart ? runtimeManualAction(adapter) : "Resolve the reported container runtime conflict, then rerun setup.",
        ],
      };
    }

    const packageManagers = yield* discoverPackageManagers(context, platform);
    const proposal = selectContainerInstallationProposal({
      engine: adapter.engine,
      platform,
      availablePackageManagers: packageManagers,
    });
    if (proposal === null) {
      return {
        blocked: true,
        planned: false,
        evidence: readiness.evidence,
        nextActions: [manualInstallAction(adapter.engine)],
      };
    }

    const mutation = yield* runInfrastructureMutation(
      context,
      {
        id: CONTAINER_INSTALL_ACTION,
        scope: "system",
        summary: proposal.explanation,
        mutate: runRequiredCommand(context, CONTAINER_INSTALL_ACTION, proposal.command, "Container runtime installation failed"),
      },
      ["infrastructure", "aggregate"],
    );

    if (mutation.disposition === "declined") {
      return {
        blocked: true,
        planned: false,
        evidence: [...readiness.evidence, `Declined action: ${CONTAINER_INSTALL_ACTION}`],
        nextActions: [manualInstallAction(adapter.engine)],
      };
    }
    if (mutation.disposition === "planned") {
      return {
        blocked: false,
        planned: true,
        evidence: [...readiness.evidence, `Planned action: ${CONTAINER_INSTALL_ACTION}`],
        nextActions: [],
      };
    }

    const refreshed = mutation.outcome;
    if (refreshed.kind !== "available") {
      return {
        blocked: true,
        planned: false,
        evidence: [
          `Executed action: ${CONTAINER_INSTALL_ACTION}`,
          `${adapter.displayName} runtime postcondition still failed: refreshed infrastructure facts are unavailable.`,
        ],
        nextActions: [runtimeManualAction(adapter)],
      };
    }
    const postReadiness = evaluateRuntimeReadiness(adapter, refreshed.value);
    if (!postReadiness.ready) {
      return {
        blocked: true,
        planned: false,
        evidence: [`Executed action: ${CONTAINER_INSTALL_ACTION}`, ...postReadiness.evidence],
        nextActions: [postReadiness.manualStart ? runtimeManualAction(adapter) : manualInstallAction(adapter.engine)],
      };
    }
    return {
      blocked: false,
      planned: false,
      evidence: [`Executed action: ${CONTAINER_INSTALL_ACTION}`, ...postReadiness.evidence],
      nextActions: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Port readiness from shared facts
// ---------------------------------------------------------------------------

interface PortOutcome {
  readonly blocked: boolean;
  readonly degraded: boolean;
  readonly evidence: readonly string[];
  readonly nextActions: readonly string[];
}

function evaluatePortReadiness(facts: InfrastructureFacts, adapter: ContainerRuntimeAdapter): PortOutcome {
  const evidence: string[] = [];
  let blocked = false;
  let degraded = false;

  for (const portFact of facts.ports) {
    if (portFact.available) {
      evidence.push(`Port ${portFact.port} is available.`);
      continue;
    }
    if (portFact.error !== undefined) {
      blocked = true;
      evidence.push(`Port ${portFact.port} inspection failed: ${portFact.error}`);
      continue;
    }
    if (portFact.repositoryOwned === true) {
      degraded = true;
      const owner =
        portFact.pid === undefined
          ? (portFact.processName ?? "a repository process")
          : `PID ${portFact.pid} (${portFact.processName ?? "unknown"})`;
      evidence.push(`Port ${portFact.port} is occupied by repository ${owner}.`);
      continue;
    }

    blocked = true;
    const owner =
      portFact.pid === undefined
        ? (portFact.processName ?? "an unidentified listener")
        : `PID ${portFact.pid} (${portFact.processName ?? "unknown"})`;
    evidence.push(`Port ${portFact.port} is occupied by ${owner}.`);
  }

  return {
    blocked,
    degraded,
    evidence,
    nextActions: degraded
      ? [`npm run dev:selfhost:stop -- --engine ${adapter.engine}`, "Stop the owning foreground Aspire/npm process directly."]
      : [],
  };
}

// ---------------------------------------------------------------------------
// Certificate preparation from shared facts
// ---------------------------------------------------------------------------

interface CertificateOutcome {
  readonly planned: boolean;
  readonly degraded: boolean;
  readonly evidence: readonly string[];
  readonly nextActions: readonly string[];
}

function degradedCertificateOutcome(evidence: readonly string[], nextActions: readonly string[] = []): CertificateOutcome {
  return {planned: false, degraded: true, evidence, nextActions};
}

/**
 * Creates the certificate directory and generates the localhost certificate and key with mkcert.
 *
 * @param context - The setup context.
 * @param certificatePath - The certificate file.
 * @param keyPath - The private key file.
 * @returns The mutation; fails with {@link SetupActionFailed} when either step fails.
 */
function generateCertificates(context: SetupContext, certificatePath: string, keyPath: string): InfrastructureStep<void> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const directory = dirname(certificatePath);
    yield* fs.makeDirectory(directory, {recursive: true}).pipe(
      Effect.mapError(
        (error) =>
          new SetupActionFailed({
            actionId: CERTIFICATE_GENERATE_ACTION,
            message: `Failed to createDirectory '${directory}': ${error.message}`,
          }),
      ),
    );
    yield* runRequiredCommand(
      context,
      CERTIFICATE_GENERATE_ACTION,
      {command: "mkcert", args: ["-key-file", keyPath, "-cert-file", certificatePath, "localhost", "*.localhost"]},
      "Selfhost certificate generation failed",
    );
  });
}

/**
 * Prepares the optional selfhost certificates: installs and trusts mkcert, then generates them.
 *
 * @param context - The setup context.
 * @param platform - The host platform.
 * @param evidence - Mutable accumulator of this step's evidence.
 * @returns The certificate outcome, before any failure is converted; fails with
 * {@link SetupActionFailed} when an action failed.
 */
function prepareCertificateChain(
  context: SetupContext,
  platform: NodeJS.Platform,
  evidence: string[],
): InfrastructureStep<CertificateOutcome> {
  return Effect.gen(function* () {
    const root = context.paths.root;
    const certificatePath = resolve(root, "infra", "Local", "Management", "certs", "local-cert.pem");
    const keyPath = resolve(root, "infra", "Local", "Management", "certs", "local-key.pem");
    const mkcertVersion: ProcessRequest = {command: "mkcert", args: ["--version"]};
    let planned = false;

    let mkcertProbe = yield* runInfrastructureCommand(context, mkcertVersion);
    if (mkcertProbe.kind === "succeeded") {
      evidence.push("mkcert is available.");
    } else {
      const managers = yield* discoverPackageManagers(context, platform);
      const proposal = selectMkcertInstallationProposal(platform, managers);
      if (proposal === null) {
        return degradedCertificateOutcome(
          [...evidence, "mkcert is unavailable and no reviewed installer was discovered."],
          [MKCERT_MANUAL_ACTION],
        );
      }
      const installMutation = yield* runInfrastructureMutation(
        context,
        {
          id: MKCERT_INSTALL_ACTION,
          scope: "system",
          summary: proposal.explanation,
          mutate: runRequiredCommand(context, MKCERT_INSTALL_ACTION, proposal.command, "mkcert installation failed"),
        },
        ["infrastructure"],
      );
      if (installMutation.disposition === "declined") {
        return degradedCertificateOutcome(
          [...evidence, `Declined action: ${MKCERT_INSTALL_ACTION}`],
          [`Allow action '${MKCERT_INSTALL_ACTION}' or install mkcert manually from ${MKCERT_MANUAL_URL}, then rerun setup.`],
        );
      }
      if (installMutation.disposition === "planned") {
        planned = true;
        evidence.push(`Planned action: ${MKCERT_INSTALL_ACTION}`);
      } else {
        evidence.push(`Executed action: ${MKCERT_INSTALL_ACTION}`);
        mkcertProbe = yield* runInfrastructureCommand(context, mkcertVersion);
        if (mkcertProbe.kind !== "succeeded") {
          return degradedCertificateOutcome([...evidence, "mkcert remains unavailable after installation."], [MKCERT_MANUAL_ACTION]);
        }
      }
    }

    const trustMutation = yield* runInfrastructureMutation(
      context,
      {
        id: MKCERT_TRUST_ACTION,
        scope: "system",
        summary: "Install the mkcert local certificate authority into the system trust stores.",
        mutate: runRequiredCommand(
          context,
          MKCERT_TRUST_ACTION,
          {command: "mkcert", args: ["-install"]},
          "mkcert trust installation failed",
        ),
      },
      ["infrastructure"],
    );
    if (trustMutation.disposition === "declined") {
      return degradedCertificateOutcome(
        [...evidence, `Declined action: ${MKCERT_TRUST_ACTION}`],
        [`Allow action '${MKCERT_TRUST_ACTION}', then rerun setup.`],
      );
    }
    if (trustMutation.disposition === "planned") {
      planned = true;
      evidence.push(`Planned action: ${MKCERT_TRUST_ACTION}`);
    } else {
      evidence.push(`Executed action: ${MKCERT_TRUST_ACTION}`);
    }

    const generateMutation = yield* runInfrastructureMutation(
      context,
      {
        id: CERTIFICATE_GENERATE_ACTION,
        scope: "user",
        summary: "Generate the ignored localhost certificate and private key for selfhost.",
        mutate: generateCertificates(context, certificatePath, keyPath),
      },
      ["infrastructure"],
    );
    if (generateMutation.disposition === "declined") {
      return degradedCertificateOutcome(
        [...evidence, `Declined action: ${CERTIFICATE_GENERATE_ACTION}`],
        [`Allow action '${CERTIFICATE_GENERATE_ACTION}', then rerun setup.`],
      );
    }
    if (generateMutation.disposition === "planned") {
      planned = true;
      evidence.push(`Planned action: ${CERTIFICATE_GENERATE_ACTION}`);
    } else {
      evidence.push(`Executed action: ${CERTIFICATE_GENERATE_ACTION}`);
      const refreshed = generateMutation.outcome;
      if (refreshed.kind !== "available" || refreshed.value.certificateIssues.length > 0) {
        return degradedCertificateOutcome(
          [...evidence, "Optional selfhost certificate generation postcondition failed."],
          ["Resolve the reported certificate generation failure, then rerun setup."],
        );
      }
      evidence.push("Optional selfhost certificate generation postcondition is satisfied.");
    }

    return {planned, degraded: false, evidence, nextActions: []};
  });
}

/**
 * Prepares the optional selfhost certificates from shared facts.
 *
 * @remarks
 * A failed certificate action degrades the phase instead of failing it, because the certificates
 * are optional; an interruption propagates.
 *
 * @param context - The setup context.
 * @param platform - The host platform.
 * @param facts - The infrastructure facts.
 * @returns The certificate outcome.
 */
function prepareCertificates(
  context: SetupContext,
  platform: NodeJS.Platform,
  facts: InfrastructureFacts,
): Effect.Effect<CertificateOutcome, never, SetupRequirements> {
  if (facts.certificateIssues.length === 0) {
    return Effect.succeed({
      planned: false,
      degraded: false,
      evidence: ["Optional selfhost certificate and key are present."],
      nextActions: [],
    });
  }

  const invalidKindIssues = facts.certificateIssues.filter((issue) => issue.includes("not a file"));
  if (invalidKindIssues.length > 0) {
    return Effect.succeed(
      degradedCertificateOutcome(
        [`Optional selfhost certificate paths have invalid kinds: ${invalidKindIssues.join(", ")}`],
        ["Replace or remove the invalid optional certificate paths, then rerun setup."],
      ),
    );
  }

  const evidence: string[] = ["Optional selfhost certificate generation is required."];
  return prepareCertificateChain(context, platform, evidence).pipe(
    Effect.catch((error) =>
      Effect.succeed(
        degradedCertificateOutcome(
          [...evidence, `Optional selfhost certificate preparation failed: ${error.message}`],
          ["Resolve the reported certificate preparation failure, then rerun setup."],
        ),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

/**
 * Prepares the local infrastructure up to its result, without its duration.
 *
 * @param context - The setup context.
 * @returns The phase result; fails with {@link SetupActionFailed} when a required action failed.
 */
function prepareInfrastructure(context: SetupContext): InfrastructureStep<Omit<SetupPhaseResult, "durationMs">> {
  return Effect.gen(function* () {
    const evidence: string[] = [];
    const {platform} = yield* Environment;
    const files = yield* legacyFileSystem;

    const configRead = yield* Effect.promise(() => readToolingConfig(context.paths.toolingConfig, files));
    if (configRead.status === "invalid") {
      return {
        id: "infrastructure",
        status: "failed",
        summary: "The local tooling configuration is invalid; infrastructure was not changed.",
        evidence: [configRead.error],
        nextActions: ["Correct or remove the invalid non-secret local tooling configuration, then rerun setup."],
      };
    }

    const currentConfig = configRead.status === "valid" ? configRead.config : undefined;
    const selected = yield* selectEngine(context, currentConfig?.containerEngine);
    if (selected.kind === "failed") {
      return {
        id: "infrastructure",
        status: "failed",
        summary: "A supported local container engine was not selected.",
        evidence: [selected.message],
        nextActions: [SELECT_ENGINE_ACTION],
      };
    }
    const {selection} = selected;

    const adapter = getContainerAdapter(selection.engine);
    evidence.push(
      selection.source === "interactive"
        ? `Selected ${adapter.displayName} interactively.`
        : `Selected ${adapter.displayName} from ${selection.source}.`,
    );

    // Make the selected engine visible to the shared inspection session so a subsequent
    // invalidate + inspect cycle observes the correct container runtime.
    yield* context.inspection.updateInfrastructureEngine(selection.engine);

    let planned = false;
    if (currentConfig?.containerEngine === selection.engine) {
      evidence.push("The persisted container engine selection is already current.");
    } else {
      const persistMutation = yield* runInfrastructureMutation(
        context,
        {
          id: ENGINE_PERSIST_ACTION,
          scope: "repository",
          summary: `Persist ${adapter.displayName} as the non-secret local container engine selection.`,
          mutate: persistEngine(context, selection.engine),
        },
        ["infrastructure"],
      );
      if (persistMutation.disposition === "declined") {
        return {
          id: "infrastructure",
          status: "failed",
          summary: "Persisting the required container engine selection was declined.",
          evidence: [...evidence, `Declined action: ${ENGINE_PERSIST_ACTION}`],
          nextActions: [`Allow required action '${ENGINE_PERSIST_ACTION}', then rerun setup.`],
        };
      }
      if (persistMutation.disposition === "planned") {
        planned = true;
        evidence.push(`Planned action: ${ENGINE_PERSIST_ACTION}`);
      } else {
        evidence.push(`Executed action: ${ENGINE_PERSIST_ACTION}`);
      }
    }

    const infraOutcome = yield* context.inspection.inspect("infrastructure");
    if (infraOutcome.kind !== "available") {
      return {
        id: "infrastructure",
        status: "failed",
        summary: "Shared infrastructure inspection failed.",
        evidence: [...evidence, infraOutcome.kind === "unavailable" ? infraOutcome.reason : infraOutcome.issues.join("; ")],
        nextActions: ["Resolve the reported infrastructure inspection failure, then rerun setup."],
      };
    }
    let facts = infraOutcome.value;

    const runtimeOutcome = yield* prepareRuntime(context, platform, adapter, facts);
    evidence.push(...runtimeOutcome.evidence);
    planned ||= runtimeOutcome.planned;

    // If a runtime installation executed successfully, facts were already invalidated and
    // re-inspected inside prepareRuntime. Re-inspect here so the rest of the phase uses the
    // refreshed ports, certificates, and manifests.
    if (!runtimeOutcome.blocked && !runtimeOutcome.planned && runtimeOutcome.evidence.some((line) => line.startsWith("Executed action:"))) {
      const refreshed = yield* context.inspection.inspect("infrastructure");
      if (refreshed.kind === "available") {
        facts = refreshed.value;
      }
    }

    const ports = evaluatePortReadiness(facts, adapter);
    evidence.push(...ports.evidence);

    const manifestBlocked = facts.manifestIssues.length > 0;
    evidence.push(...facts.manifestIssues);

    const certificates = yield* prepareCertificates(context, platform, facts);
    evidence.push(...certificates.evidence);
    planned ||= certificates.planned;
    const degraded = ports.degraded || certificates.degraded;
    const blocked = runtimeOutcome.blocked || ports.blocked || manifestBlocked;
    const nextActions = deduplicate([
      ...runtimeOutcome.nextActions,
      ...ports.nextActions,
      ...(manifestBlocked ? ["Restore the required tracked local infrastructure files, then rerun setup."] : []),
      ...certificates.nextActions,
    ]);

    return {
      id: "infrastructure",
      status: blocked ? "failed" : planned ? "skipped" : degraded ? "degraded" : "succeeded",
      summary: blocked
        ? "Required local infrastructure preparation is blocked."
        : planned
          ? "Local infrastructure preparation is planned by dry-run."
          : degraded
            ? "Local infrastructure is ready with degraded optional or repository-owned state."
            : "Local infrastructure is ready.",
      evidence,
      nextActions,
    };
  });
}

/**
 * Runs the infrastructure phase: a failed required action becomes one failed result carrying the
 * reported failure; an interruption propagates.
 *
 * @param context - The setup context.
 * @returns The phase result.
 */
function runInfrastructureSetup(context: SetupContext): Effect.Effect<SetupPhaseResult, never, SetupRequirements> {
  return Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis;
    const outcome = yield* Effect.result(prepareInfrastructure(context));
    if (outcome._tag === "Success") {
      return yield* phaseResult(startedAt, outcome.success);
    }
    return yield* phaseResult(startedAt, {
      id: "infrastructure",
      status: "failed",
      summary: "Local infrastructure preparation failed.",
      evidence: [outcome.failure.message],
      nextActions: ["Resolve the reported infrastructure preparation failure, then rerun setup."],
    });
  }).pipe(Effect.withSpan("setup.infrastructure"));
}

/**
 * Creates the infrastructure setup phase.
 *
 * @remarks
 * The phase accepts no host, filesystem, or prompt boundary: the platform, the environment, the
 * processes, the prompts, the filesystem, and the clock all come from the invocation services, so a
 * test replaces them through its layer rather than on this factory.
 *
 * @returns The infrastructure setup phase definition.
 */
export function createInfrastructureSetupPhase(): SetupPhaseDefinition {
  return {
    id: "infrastructure",
    title: "Local infrastructure",
    required: true,
    dependsOn: [],
    run: (context) => runInfrastructureSetup(context),
  };
}

/** Default production infrastructure setup phase. */
export const infrastructureSetupPhase: SetupPhaseDefinition = createInfrastructureSetupPhase();
