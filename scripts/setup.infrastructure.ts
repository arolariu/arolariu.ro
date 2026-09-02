/**
 * @fileoverview Local container runtime and infrastructure preparation.
 * @module scripts.setup.infrastructure
 *
 * @remarks
 * All readiness observations (runtime CLI/backend/compose availability, Docker Desktop conflict,
 * socket/context issues, required port occupancy and ownership, certificate presence, manifest
 * presence, and container inventory) are consumed from shared {@link InfrastructureFacts} through
 * `context.inspection.inspect("infrastructure")`. This module owns only mutation policy: engine
 * selection/persistence, package-manager discovery, container installation proposals, mkcert
 * install/trust/generation, credential isolation, consent, dry-run, and abort propagation.
 *
 * Every attempted mutation uses finally-safe exact invalidation: the attempted flag is set inside
 * the action execute callback, and invalidation runs in `finally` so a thrown, failed, or
 * interrupted mutation can never leave a partially mutated repository described by stale cached
 * facts. Planned and declined actions never set the attempted flag and therefore never invalidate.
 * After an executed disposition the already-invalidated key is re-inspected exactly once.
 */

import {mkdir} from "node:fs/promises";
import {dirname, resolve} from "node:path";

import type {CommandResult, CommandRunner, CommandRunOptions} from "./common/process.ts";
import type {ToolingConfigReadResult, ToolingConfigV1} from "./common/tooling-config.ts";
import {mergeToolingConfig, readToolingConfig, writeToolingConfig} from "./common/tooling-config.ts";
import {nodeFileSystem} from "./common/runtime.node.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "./container-runtime/adapters.ts";
import {resolveContainerEngine} from "./container-runtime/selection.ts";
import type {ContainerEngine, EngineSelectionSource} from "./container-runtime/types.ts";
import type {InfrastructureFacts} from "./inspection/infrastructure.ts";
import type {RepositoryInspectionKey} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import type {InstallationProposal, SetupActionScope, SetupContext, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";

const ENGINE_PERSIST_ACTION = "infrastructure.engine.persist";
const CONTAINER_INSTALL_ACTION = "infrastructure.container.install";
const MKCERT_INSTALL_ACTION = "infrastructure.mkcert.install";
const MKCERT_TRUST_ACTION = "infrastructure.mkcert.trust";
const CERTIFICATE_GENERATE_ACTION = "infrastructure.certificates.generate";
const SELECT_ENGINE_ACTION = "npm run setup -- --engine rancher|podman";
const MKCERT_MANUAL_URL = "https://github.com/FiloSottile/mkcert#installation";
const MKCERT_MANUAL_ACTION = `Install mkcert from ${MKCERT_MANUAL_URL}, then rerun setup.`;
const SQL_PASSWORD_ENVIRONMENT_KEY = "MSSQL_SA_PASSWORD";

// ---------------------------------------------------------------------------
// Credential isolation
// ---------------------------------------------------------------------------

function credentialIsolatedEnvironment(environment?: Readonly<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  const isolated: NodeJS.ProcessEnv = {};
  if (environment !== undefined) {
    for (const key of Object.keys(environment)) {
      if (key.toUpperCase() !== SQL_PASSWORD_ENVIRONMENT_KEY) {
        isolated[key] = environment[key];
      }
    }
  }
  isolated[SQL_PASSWORD_ENVIRONMENT_KEY] = undefined;
  return isolated;
}

function createCredentialIsolatedRunner(runner: CommandRunner): CommandRunner {
  return {
    run: (command, options: Readonly<CommandRunOptions> = {}) =>
      runner.run(command, {
        ...options,
        env: credentialIsolatedEnvironment(options.env),
      }),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isInterrupted(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function phaseResult(context: SetupContext, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: Math.max(0, context.now() - startedAt),
  };
}

function deduplicate(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

// ---------------------------------------------------------------------------
// Mutation wrapper
// ---------------------------------------------------------------------------

type InfrastructureMutationOutcome =
  | Readonly<{disposition: "planned"}>
  | Readonly<{disposition: "declined"}>
  | Readonly<{disposition: "executed"; outcome: InspectionOutcome<InfrastructureFacts>}>;

/**
 * Runs one policy-controlled infrastructure mutation with finally-safe exact invalidation.
 *
 * @remarks
 * The attempted flag is set inside the execute callback. Invalidation runs in `finally` so even a
 * thrown, failed, or interrupted mutation cannot leave stale cached facts. Planned and declined
 * actions never set the flag and never invalidate. After an executed disposition the
 * already-invalidated keys are re-inspected.
 *
 * @param context - Shared setup context carrying the inspection session.
 * @param action - Action identity, scope, summary, and the mutation to attempt.
 * @param invalidationKeys - Exact fact keys to invalidate after an attempted mutation.
 * @returns The disposition, plus refreshed infrastructure outcome when executed.
 */
async function runInfrastructureMutation(
  context: SetupContext,
  action: Readonly<{id: string; scope: SetupActionScope; summary: string; mutate: () => Promise<void>}>,
  invalidationKeys: readonly RepositoryInspectionKey[],
): Promise<InfrastructureMutationOutcome> {
  let attempted = false;
  try {
    const disposition = await context.actions.run({
      id: action.id,
      scope: action.scope,
      summary: action.summary,
      execute: async () => {
        attempted = true;
        await action.mutate();
      },
    });
    if (disposition !== "executed") {
      return disposition === "planned" ? {disposition: "planned"} : {disposition: "declined"};
    }
  } finally {
    if (attempted) {
      context.inspection.invalidate(...invalidationKeys);
    }
  }
  return {disposition: "executed", outcome: await context.inspection.inspect("infrastructure")};
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

async function discoverPackageManagers(context: SetupContext, platform: NodeJS.Platform): Promise<ReadonlySet<string>> {
  const managers = platform === "win32" ? ["winget"] : platform === "darwin" ? ["brew"] : platform === "linux" ? ["apt-get", "dnf"] : [];
  const available = new Set<string>();
  for (const manager of managers) {
    const result = await context.runner.run({command: manager, args: ["--version"]}, {cwd: context.paths.root});
    if (isSuccessfulCommand(result)) {
      available.add(manager);
    }
  }
  return available;
}

// ---------------------------------------------------------------------------
// Engine selection
// ---------------------------------------------------------------------------

interface SelectedEngine {
  readonly engine: ContainerEngine;
  readonly source: EngineSelectionSource | "interactive";
}

async function selectEngine(
  context: SetupContext,
  dependencies: InfrastructureSetupDependencies,
  configuredEngine: string | undefined,
): Promise<SelectedEngine> {
  try {
    return resolveContainerEngine({
      argv: context.options.engine === undefined ? [] : ["--engine", context.options.engine],
      env: dependencies.environment,
      ...(configuredEngine === undefined ? {} : {configuredEngine}),
    });
  } catch (error) {
    const noConfiguredSelection =
      context.options.engine === undefined
      && (dependencies.environment["AROLARIU_CONTAINER_ENGINE"] === undefined
        || dependencies.environment["AROLARIU_CONTAINER_ENGINE"]?.trim() === "")
      && configuredEngine === undefined;
    if (!noConfiguredSelection || !dependencies.interactive) {
      throw error;
    }

    const engine = await context.prompts.select<ContainerEngine>("Select the local container engine:", [
      {
        value: "rancher",
        label: "Rancher Desktop (Moby/dockerd; Docker Desktop must be stopped)",
      },
      {
        value: "podman",
        label: "Podman Desktop (podman compose provider required)",
      },
    ]);
    return {engine, source: "interactive"};
  }
}

// ---------------------------------------------------------------------------
// Shared command helpers
// ---------------------------------------------------------------------------

async function runRequiredCommand(context: SetupContext, command: InstallationProposal["command"], failureSummary: string): Promise<void> {
  const result = await context.runner.run(command, {
    cwd: context.paths.root,
    output: "inherit",
  });
  if (!isSuccessfulCommand(result)) {
    throw new Error(
      `${failureSummary}: ${result.stderr.trim() || result.stdout.trim() || result.spawnError || `exit code ${result.code}`}`,
    );
  }
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

async function prepareRuntime(
  context: SetupContext,
  dependencies: InfrastructureSetupDependencies,
  adapter: ContainerRuntimeAdapter,
  facts: InfrastructureFacts,
): Promise<RuntimeOutcome> {
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

  const packageManagers = await discoverPackageManagers(context, dependencies.platform);
  const proposal = selectContainerInstallationProposal({
    engine: adapter.engine,
    platform: dependencies.platform,
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

  const mutation = await runInfrastructureMutation(
    context,
    {
      id: CONTAINER_INSTALL_ACTION,
      scope: "system",
      summary: proposal.explanation,
      mutate: () => runRequiredCommand(context, proposal.command, "Container runtime installation failed"),
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

async function prepareCertificates(
  context: SetupContext,
  dependencies: InfrastructureSetupDependencies,
  facts: InfrastructureFacts,
): Promise<CertificateOutcome> {
  if (facts.certificateIssues.length === 0) {
    return {planned: false, degraded: false, evidence: ["Optional selfhost certificate and key are present."], nextActions: []};
  }

  const invalidKindIssues = facts.certificateIssues.filter((issue) => issue.includes("not a file"));
  if (invalidKindIssues.length > 0) {
    return degradedCertificateOutcome(
      [`Optional selfhost certificate paths have invalid kinds: ${invalidKindIssues.join(", ")}`],
      ["Replace or remove the invalid optional certificate paths, then rerun setup."],
    );
  }

  const certificatePath = resolve(context.paths.root, "infra", "Local", "Management", "certs", "local-cert.pem");
  const keyPath = resolve(context.paths.root, "infra", "Local", "Management", "certs", "local-key.pem");
  const evidence: string[] = ["Optional selfhost certificate generation is required."];
  let planned = false;

  try {
    let mkcertProbe = await context.runner.run({command: "mkcert", args: ["--version"]}, {cwd: context.paths.root});
    if (!isSuccessfulCommand(mkcertProbe)) {
      const managers = await discoverPackageManagers(context, dependencies.platform);
      const proposal = selectMkcertInstallationProposal(dependencies.platform, managers);
      if (proposal === null) {
        return degradedCertificateOutcome(
          [...evidence, "mkcert is unavailable and no reviewed installer was discovered."],
          [MKCERT_MANUAL_ACTION],
        );
      }
      const installMutation = await runInfrastructureMutation(
        context,
        {
          id: MKCERT_INSTALL_ACTION,
          scope: "system",
          summary: proposal.explanation,
          mutate: () => runRequiredCommand(context, proposal.command, "mkcert installation failed"),
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
        mkcertProbe = await context.runner.run({command: "mkcert", args: ["--version"]}, {cwd: context.paths.root});
        if (!isSuccessfulCommand(mkcertProbe)) {
          return degradedCertificateOutcome([...evidence, "mkcert remains unavailable after installation."], [MKCERT_MANUAL_ACTION]);
        }
      }
    } else {
      evidence.push("mkcert is available.");
    }

    const trustMutation = await runInfrastructureMutation(
      context,
      {
        id: MKCERT_TRUST_ACTION,
        scope: "system",
        summary: "Install the mkcert local certificate authority into the system trust stores.",
        mutate: () => runRequiredCommand(context, {command: "mkcert", args: ["-install"]}, "mkcert trust installation failed"),
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

    const generateMutation = await runInfrastructureMutation(
      context,
      {
        id: CERTIFICATE_GENERATE_ACTION,
        scope: "user",
        summary: "Generate the ignored localhost certificate and private key for selfhost.",
        mutate: async () => {
          await dependencies.createDirectory(dirname(certificatePath));
          await runRequiredCommand(
            context,
            {
              command: "mkcert",
              args: ["-key-file", keyPath, "-cert-file", certificatePath, "localhost", "*.localhost"],
            },
            "Selfhost certificate generation failed",
          );
        },
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
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    return degradedCertificateOutcome(
      [...evidence, `Optional selfhost certificate preparation failed: ${errorMessage(error)}`],
      ["Resolve the reported certificate preparation failure, then rerun setup."],
    );
  }
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

interface InfrastructureSetupDependencies {
  readonly platform: NodeJS.Platform;
  readonly environment: Readonly<NodeJS.ProcessEnv>;
  readonly interactive: boolean;
  readonly readConfig: (path: string) => Promise<ToolingConfigReadResult>;
  readonly writeConfig: (path: string, config: Readonly<ToolingConfigV1>) => Promise<void>;
  readonly createDirectory: (path: string) => Promise<void>;
}

const defaultDependencies: InfrastructureSetupDependencies = {
  platform: process.platform,
  environment: process.env,
  interactive: process.stdin.isTTY === true,
  readConfig: (path) => readToolingConfig(path, nodeFileSystem),
  writeConfig: (path, config) => writeToolingConfig(path, config, nodeFileSystem),
  createDirectory: (path) => mkdir(path, {recursive: true}).then(() => undefined),
};

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

async function runInfrastructureSetup(context: SetupContext, dependencies: InfrastructureSetupDependencies): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const evidence: string[] = [];
  const phaseContext: SetupContext = {
    ...context,
    runner: createCredentialIsolatedRunner(context.runner),
  };

  try {
    const configRead = await dependencies.readConfig(context.paths.toolingConfig);
    if (configRead.status === "invalid") {
      return phaseResult(context, startedAt, {
        id: "infrastructure",
        status: "failed",
        summary: "The local tooling configuration is invalid; infrastructure was not changed.",
        evidence: [configRead.error],
        nextActions: ["Correct or remove the invalid non-secret local tooling configuration, then rerun setup."],
      });
    }

    const currentConfig = configRead.status === "valid" ? configRead.config : undefined;
    let selection: SelectedEngine;
    try {
      selection = await selectEngine(context, dependencies, currentConfig?.containerEngine);
    } catch (error) {
      if (isInterrupted(error)) {
        throw error;
      }
      return phaseResult(context, startedAt, {
        id: "infrastructure",
        status: "failed",
        summary: "A supported local container engine was not selected.",
        evidence: [errorMessage(error)],
        nextActions: [SELECT_ENGINE_ACTION],
      });
    }

    const adapter = getContainerAdapter(selection.engine);
    evidence.push(
      selection.source === "interactive"
        ? `Selected ${adapter.displayName} interactively.`
        : `Selected ${adapter.displayName} from ${selection.source}.`,
    );

    // Make the selected engine visible to the shared inspection session so a subsequent
    // invalidate + inspect cycle observes the correct container runtime.
    context.inspection.updateInfrastructureEngine(selection.engine);

    let planned = false;
    if (currentConfig?.containerEngine !== selection.engine) {
      const persistMutation = await runInfrastructureMutation(
        context,
        {
          id: ENGINE_PERSIST_ACTION,
          scope: "repository",
          summary: `Persist ${adapter.displayName} as the non-secret local container engine selection.`,
          mutate: async () => {
            const latest = await dependencies.readConfig(context.paths.toolingConfig);
            if (latest.status === "invalid") {
              throw new Error(latest.error);
            }
            await dependencies.writeConfig(
              context.paths.toolingConfig,
              mergeToolingConfig(latest.status === "valid" ? latest.config : undefined, {
                containerEngine: selection.engine,
              }),
            );
          },
        },
        ["infrastructure"],
      );
      if (persistMutation.disposition === "declined") {
        return phaseResult(context, startedAt, {
          id: "infrastructure",
          status: "failed",
          summary: "Persisting the required container engine selection was declined.",
          evidence: [...evidence, `Declined action: ${ENGINE_PERSIST_ACTION}`],
          nextActions: [`Allow required action '${ENGINE_PERSIST_ACTION}', then rerun setup.`],
        });
      }
      if (persistMutation.disposition === "planned") {
        planned = true;
        evidence.push(`Planned action: ${ENGINE_PERSIST_ACTION}`);
      } else {
        evidence.push(`Executed action: ${ENGINE_PERSIST_ACTION}`);
      }
    } else {
      evidence.push("The persisted container engine selection is already current.");
    }

    const infraOutcome = await context.inspection.inspect("infrastructure");
    if (infraOutcome.kind !== "available") {
      return phaseResult(context, startedAt, {
        id: "infrastructure",
        status: "failed",
        summary: "Shared infrastructure inspection failed.",
        evidence: [...evidence, infraOutcome.kind === "unavailable" ? infraOutcome.reason : infraOutcome.issues.join("; ")],
        nextActions: ["Resolve the reported infrastructure inspection failure, then rerun setup."],
      });
    }
    let facts = infraOutcome.value;

    const runtime = await prepareRuntime(phaseContext, dependencies, adapter, facts);
    evidence.push(...runtime.evidence);
    planned ||= runtime.planned;

    // If a runtime installation executed successfully, facts were already invalidated and
    // re-inspected inside prepareRuntime. Re-inspect here so the rest of the phase uses the
    // refreshed ports, certificates, and manifests.
    if (!runtime.blocked && !runtime.planned && runtime.evidence.some((line) => line.startsWith("Executed action:"))) {
      const refreshed = await context.inspection.inspect("infrastructure");
      if (refreshed.kind === "available") {
        facts = refreshed.value;
      }
    }

    const ports = evaluatePortReadiness(facts, adapter);
    evidence.push(...ports.evidence);

    const manifestEvidence: string[] = [];
    let manifestBlocked = false;
    if (facts.manifestIssues.length > 0) {
      manifestBlocked = true;
      manifestEvidence.push(...facts.manifestIssues);
    }
    evidence.push(...manifestEvidence);

    const certificates = await prepareCertificates(phaseContext, dependencies, facts);
    evidence.push(...certificates.evidence);
    planned ||= certificates.planned;
    const degraded = ports.degraded || certificates.degraded;
    const blocked = runtime.blocked || ports.blocked || manifestBlocked;
    const nextActions = deduplicate([
      ...runtime.nextActions,
      ...ports.nextActions,
      ...(manifestBlocked ? ["Restore the required tracked local infrastructure files, then rerun setup."] : []),
      ...certificates.nextActions,
    ]);

    return phaseResult(context, startedAt, {
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
    });
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    return phaseResult(context, startedAt, {
      id: "infrastructure",
      status: "failed",
      summary: "Local infrastructure preparation failed.",
      evidence: [errorMessage(error)],
      nextActions: ["Resolve the reported infrastructure preparation failure, then rerun setup."],
    });
  }
}

/**
 * Creates the independently executable infrastructure setup phase.
 *
 * @param overrides - Optional production-boundary overrides for deterministic tests.
 * @returns Infrastructure setup phase definition.
 */
export function createInfrastructureSetupPhase(overrides: Readonly<Partial<InfrastructureSetupDependencies>> = {}): SetupPhaseDefinition {
  const dependencies: InfrastructureSetupDependencies = {...defaultDependencies, ...overrides};
  return {
    id: "infrastructure",
    title: "Local infrastructure",
    required: true,
    dependsOn: [],
    run: (context) => runInfrastructureSetup(context, dependencies),
  };
}

/** Default production infrastructure setup phase. */
export const infrastructureSetupPhase: SetupPhaseDefinition = createInfrastructureSetupPhase();
