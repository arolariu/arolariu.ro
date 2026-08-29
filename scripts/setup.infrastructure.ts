/**
 * @fileoverview Local container runtime and infrastructure preparation.
 * @module scripts.setup.infrastructure
 */

import {mkdir, stat} from "node:fs/promises";
import {createServer} from "node:net";
import {dirname, resolve} from "node:path";

import {defaultCommandRunner, type CommandResult} from "./common/process.ts";
import type {ToolingConfigReadResult, ToolingConfigV1} from "./common/tooling-config.ts";
import {mergeToolingConfig, readToolingConfig, writeToolingConfig} from "./common/tooling-config.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "./container-runtime/adapters.ts";
import {requiredLocalPorts, runSharedPreflight} from "./container-runtime/preflight.ts";
import {adaptCommandRunner} from "./container-runtime/process.ts";
import {resolveContainerEngine} from "./container-runtime/selection.ts";
import type {ContainerEngine, EngineSelectionSource} from "./container-runtime/types.ts";
import type {InstallationProposal, SetupContext, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";

/** Read-only availability and ownership evidence for one required local port. */
export interface PortState {
  readonly port: number;
  readonly available: boolean;
  readonly pid?: number;
  readonly processName?: string;
  readonly repositoryOwned?: boolean;
  readonly error?: string;
}

type FileKind = "file" | "missing" | "other";

interface InfrastructureSetupDependencies {
  readonly platform: NodeJS.Platform;
  readonly environment: Readonly<NodeJS.ProcessEnv>;
  readonly interactive: boolean;
  readonly readConfig: (path: string) => Promise<ToolingConfigReadResult>;
  readonly writeConfig: (path: string, config: Readonly<ToolingConfigV1>) => Promise<void>;
  readonly inspectPorts: (ports: readonly number[]) => Promise<readonly PortState[]>;
  readonly inspectFile: (path: string) => Promise<FileKind>;
  readonly createDirectory: (path: string) => Promise<void>;
}

const ENGINE_PERSIST_ACTION = "infrastructure.engine.persist";
const CONTAINER_INSTALL_ACTION = "infrastructure.container.install";
const MKCERT_INSTALL_ACTION = "infrastructure.mkcert.install";
const MKCERT_TRUST_ACTION = "infrastructure.mkcert.trust";
const CERTIFICATE_GENERATE_ACTION = "infrastructure.certificates.generate";
const SELECT_ENGINE_ACTION = "npm run setup -- --engine rancher|podman";
const MKCERT_MANUAL_ACTION = "Install mkcert from https://github.com/FiloSottile/mkcert#installation, then rerun setup.";

function isInterrupted(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function invalidPortState(port: number): PortState | null {
  return Number.isInteger(port) && port >= 1 && port <= 65_535
    ? null
    : {port, available: false, error: `Invalid TCP port ${String(port)}.`};
}

async function lookupListener(port: number): Promise<Omit<PortState, "port" | "available">> {
  if (process.platform === "win32") {
    const script = [
      `$connection = Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction Stop | Select-Object -First 1`,
      "if ($null -eq $connection) { throw 'No listener owner found.' }",
      '$owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction Stop',
      "[pscustomobject]@{ pid = $connection.OwningProcess; processName = if ($owner.CommandLine) { $owner.CommandLine } else { $owner.Name } } | ConvertTo-Json -Compress",
    ].join("; ");
    const result = await defaultCommandRunner.run({
      command: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-Command", script],
    });
    if (!isSuccessfulCommand(result)) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || result.spawnError || `PowerShell exited with code ${result.code}.`);
    }
    const value: unknown = JSON.parse(result.stdout);
    if (
      typeof value !== "object"
      || value === null
      || !("pid" in value)
      || typeof value.pid !== "number"
      || !("processName" in value)
      || typeof value.processName !== "string"
    ) {
      throw new Error("PowerShell returned invalid listener ownership evidence.");
    }
    return {pid: value.pid, processName: value.processName};
  }

  const lsof = await defaultCommandRunner.run({
    command: "lsof",
    args: ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"],
  });
  if (!isSuccessfulCommand(lsof)) {
    throw new Error(lsof.stderr.trim() || lsof.stdout.trim() || lsof.spawnError || `lsof exited with code ${lsof.code}.`);
  }
  const firstLine = lsof.stdout.split(/\r?\n/u).find((line) => line.trim() !== "");
  const pid = firstLine === undefined ? Number.NaN : Number(firstLine.trim());
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    throw new Error("lsof returned no valid listener PID.");
  }
  const ps = await defaultCommandRunner.run({
    command: "ps",
    args: ["-p", String(pid), "-o", "command="],
  });
  if (!isSuccessfulCommand(ps) || ps.stdout.trim() === "") {
    throw new Error(ps.stderr.trim() || ps.stdout.trim() || ps.spawnError || `ps exited with code ${ps.code}.`);
  }
  return {pid, processName: ps.stdout.trim()};
}

async function inspectPort(port: number): Promise<PortState> {
  const invalid = invalidPortState(port);
  if (invalid !== null) {
    return invalid;
  }

  return new Promise<PortState>((resolvePort) => {
    const server = createServer();
    const settle = (state: PortState): void => {
      server.removeAllListeners();
      resolvePort(state);
    };
    server.unref();
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EADDRINUSE") {
        settle({port, available: false, error: `Port availability probe failed: ${error.message}`});
        return;
      }
      void lookupListener(port).then(
        (owner) => settle({port, available: false, ...owner}),
        (lookupError: unknown) =>
          settle({
            port,
            available: false,
            error: `Listener lookup failed: ${errorMessage(lookupError)}`,
          }),
      );
    });
    server.once("listening", () => {
      server.close((error) => {
        settle(
          error === undefined ? {port, available: true} : {port, available: false, error: `Port probe cleanup failed: ${error.message}`},
        );
      });
    });
    server.listen({host: "127.0.0.1", port, exclusive: true});
  });
}

function phaseResult(context: SetupContext, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: Math.max(0, context.now() - startedAt),
  };
}

async function inspectRegularFile(path: string): Promise<FileKind> {
  try {
    return (await stat(path)).isFile() ? "file" : "other";
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return "missing";
    }
    throw error;
  }
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

/**
 * Inspects required local ports without starting or stopping services.
 *
 * @param ports - Optional ordered ports to inspect.
 * @returns Availability and listener ownership evidence in input order.
 */
export async function inspectRequiredPorts(ports: readonly number[] = requiredLocalPorts): Promise<readonly PortState[]> {
  const states: PortState[] = [];
  for (const port of ports) {
    states.push(await inspectPort(port));
  }
  return states;
}

interface SelectedEngine {
  readonly engine: ContainerEngine;
  readonly source: EngineSelectionSource | "interactive";
}

interface RuntimeOutcome {
  readonly blocked: boolean;
  readonly planned: boolean;
  readonly evidence: readonly string[];
  readonly nextActions: readonly string[];
  readonly inventory: string;
}

interface PortOutcome {
  readonly blocked: boolean;
  readonly degraded: boolean;
  readonly evidence: readonly string[];
  readonly nextActions: readonly string[];
}

interface FileOutcome {
  readonly blocked: boolean;
  readonly evidence: readonly string[];
}

interface CertificateOutcome {
  readonly planned: boolean;
  readonly degraded: boolean;
  readonly evidence: readonly string[];
  readonly nextActions: readonly string[];
}

const SELFHOST_CONTAINER_NAMES: ReadonlySet<string> = new Set([
  "traefik",
  "healthchecks",
  "mssql",
  "cosmosdb",
  "azurite",
  "redis",
  "exp-arolariu-ro",
  "api-arolariu-ro",
  "website-arolariu-ro",
]);
const ASPIRE_RESOURCE_TOKENS = ["traefik", "healthchecks", "mssql", "cosmos", "azurite", "redis", "exp", "api", "website"] as const;

function repositoryProcessOwnsPort(port: number, processName: string, root: string): boolean {
  const command = processName.replaceAll("\\", "/").toLowerCase();
  const normalizedRoot = root.replaceAll("\\", "/").toLowerCase();
  if (command.includes(normalizedRoot)) {
    return true;
  }
  if ([3000, 3002, 4173].includes(port)) {
    return /\bnode(?:\.exe)?\b/u.test(command) && /(arolariu|nx|next|vite|svelte)/u.test(command);
  }
  if (port === 5000) {
    return /\bdotnet(?:\.exe)?\b/u.test(command) && /(apphost|api|arolariu)/u.test(command);
  }
  if (port === 5002) {
    return /\b(?:python|python3|py)(?:\.exe)?\b/u.test(command) && /(uvicorn|main:app|exp|arolariu)/u.test(command);
  }
  return false;
}

function isRepositoryContainer(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (SELFHOST_CONTAINER_NAMES.has(normalized)) {
    return true;
  }
  const hasMarker = normalized.includes("aspire") || normalized.includes("dcp");
  return hasMarker && ASPIRE_RESOURCE_TOKENS.some((token) => normalized.includes(token));
}

function repositoryContainersByPort(inventory: string): ReadonlyMap<number, string> {
  const owners = new Map<number, string>();
  for (const line of inventory.split(/\r?\n/u)) {
    const [name, ports = ""] = line.split("\t", 2);
    if (name === undefined || !isRepositoryContainer(name)) {
      continue;
    }
    for (const match of ports.matchAll(/:(\d+)->/gu)) {
      const port = Number(match[1]);
      if (Number.isInteger(port)) {
        owners.set(port, name);
      }
    }
  }
  return owners;
}

async function inspectInfrastructurePorts(
  context: SetupContext,
  dependencies: InfrastructureSetupDependencies,
  adapter: ContainerRuntimeAdapter,
  inventory: string,
): Promise<PortOutcome> {
  const states = await dependencies.inspectPorts(requiredLocalPorts);
  const containerOwners = repositoryContainersByPort(inventory);
  const evidence: string[] = [];
  let blocked = false;
  let degraded = false;

  for (const state of states) {
    if (state.available) {
      evidence.push(`Port ${state.port} is available.`);
      continue;
    }
    if (state.error !== undefined) {
      blocked = true;
      evidence.push(`Port ${state.port} inspection failed: ${state.error}`);
      continue;
    }

    const container = containerOwners.get(state.port);
    const repositoryOwned =
      state.repositoryOwned === true
      || container !== undefined
      || (state.processName !== undefined && repositoryProcessOwnsPort(state.port, state.processName, context.paths.root));
    if (repositoryOwned) {
      degraded = true;
      if (container !== undefined) {
        evidence.push(`Port ${state.port} is occupied by repository container '${container}'.`);
      } else {
        const owner =
          state.pid === undefined ? (state.processName ?? "a repository process") : `PID ${state.pid} (${state.processName ?? "unknown"})`;
        evidence.push(`Port ${state.port} is occupied by repository ${owner}.`);
      }
      continue;
    }

    blocked = true;
    const owner =
      state.pid === undefined ? (state.processName ?? "an unidentified listener") : `PID ${state.pid} (${state.processName ?? "unknown"})`;
    evidence.push(`Port ${state.port} is occupied by ${owner}.`);
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

function requiredRuntimeFiles(root: string): readonly string[] {
  return [
    resolve(root, "tooling", "AppHost", "AppHost.csproj"),
    resolve(root, "infra", "Local", "Management", "docker-compose.yml"),
    resolve(root, "infra", "Local", "Storage", "docker-compose.yml"),
    resolve(root, "infra", "Local", "Backend", "docker-compose.yml"),
    resolve(root, "infra", "Local", "Frontend", "docker-compose.yml"),
  ];
}

async function inspectRuntimeFiles(dependencies: InfrastructureSetupDependencies, root: string): Promise<FileOutcome> {
  const evidence: string[] = [];
  let blocked = false;
  for (const path of requiredRuntimeFiles(root)) {
    try {
      const kind = await dependencies.inspectFile(path);
      if (kind === "file") {
        evidence.push(`Required runtime file is present: ${path}`);
      } else {
        blocked = true;
        evidence.push(
          kind === "missing" ? `Required runtime file is missing: ${path}` : `Required runtime path is not a regular file: ${path}`,
        );
      }
    } catch (error) {
      if (isInterrupted(error)) {
        throw error;
      }
      blocked = true;
      evidence.push(`Unable to inspect required runtime file ${path}: ${errorMessage(error)}`);
    }
  }
  return {blocked, evidence};
}

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

function degradedCertificateOutcome(
  evidence: readonly string[],
  nextActions: readonly string[] = [MKCERT_MANUAL_ACTION],
): CertificateOutcome {
  return {planned: false, degraded: true, evidence, nextActions};
}

async function prepareCertificates(context: SetupContext, dependencies: InfrastructureSetupDependencies): Promise<CertificateOutcome> {
  const certificatePath = resolve(context.paths.root, "infra", "Local", "Management", "certs", "local-cert.pem");
  const keyPath = resolve(context.paths.root, "infra", "Local", "Management", "certs", "local-key.pem");
  let certificateKind: FileKind;
  let keyKind: FileKind;
  try {
    certificateKind = await dependencies.inspectFile(certificatePath);
    keyKind = await dependencies.inspectFile(keyPath);
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    return degradedCertificateOutcome([`Optional selfhost certificate inspection failed: ${errorMessage(error)}`]);
  }
  if (certificateKind === "file" && keyKind === "file") {
    return {
      planned: false,
      degraded: false,
      evidence: ["Optional selfhost certificate and key are present."],
      nextActions: [],
    };
  }
  if (certificateKind === "other" || keyKind === "other") {
    return degradedCertificateOutcome(["Optional selfhost certificate or key path exists but is not a regular file."]);
  }

  const evidence: string[] = ["Optional selfhost certificate generation is required."];
  let planned = false;
  try {
    let mkcertProbe = await context.runner.run({command: "mkcert", args: ["--version"]}, {cwd: context.paths.root});
    if (!isSuccessfulCommand(mkcertProbe)) {
      const managers = await discoverPackageManagers(context, dependencies.platform);
      const proposal = selectMkcertInstallationProposal(dependencies.platform, managers);
      if (proposal === null) {
        return degradedCertificateOutcome([...evidence, "mkcert is unavailable and no reviewed installer was discovered."]);
      }
      const installDisposition = await context.actions.run({
        id: MKCERT_INSTALL_ACTION,
        scope: "system",
        summary: proposal.explanation,
        execute: () => runRequiredCommand(context, proposal.command, "mkcert installation failed"),
      });
      if (installDisposition === "declined") {
        return degradedCertificateOutcome([...evidence, `Declined action: ${MKCERT_INSTALL_ACTION}`]);
      }
      if (installDisposition === "planned") {
        planned = true;
        evidence.push(`Planned action: ${MKCERT_INSTALL_ACTION}`);
      } else {
        evidence.push(`Executed action: ${MKCERT_INSTALL_ACTION}`);
        mkcertProbe = await context.runner.run({command: "mkcert", args: ["--version"]}, {cwd: context.paths.root});
        if (!isSuccessfulCommand(mkcertProbe)) {
          return degradedCertificateOutcome([...evidence, "mkcert remains unavailable after installation."]);
        }
      }
    } else {
      evidence.push("mkcert is available.");
    }

    const trustDisposition = await context.actions.run({
      id: MKCERT_TRUST_ACTION,
      scope: "system",
      summary: "Install the mkcert local certificate authority into the system trust stores.",
      execute: () => runRequiredCommand(context, {command: "mkcert", args: ["-install"]}, "mkcert trust installation failed"),
    });
    if (trustDisposition === "declined") {
      return degradedCertificateOutcome([...evidence, `Declined action: ${MKCERT_TRUST_ACTION}`]);
    }
    if (trustDisposition === "planned") {
      planned = true;
      evidence.push(`Planned action: ${MKCERT_TRUST_ACTION}`);
    } else {
      evidence.push(`Executed action: ${MKCERT_TRUST_ACTION}`);
    }

    const generationDisposition = await context.actions.run({
      id: CERTIFICATE_GENERATE_ACTION,
      scope: "user",
      summary: "Generate the ignored localhost certificate and private key for selfhost.",
      execute: async () => {
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
    });
    if (generationDisposition === "declined") {
      return degradedCertificateOutcome([...evidence, `Declined action: ${CERTIFICATE_GENERATE_ACTION}`]);
    }
    if (generationDisposition === "planned") {
      planned = true;
      evidence.push(`Planned action: ${CERTIFICATE_GENERATE_ACTION}`);
    } else {
      evidence.push(`Executed action: ${CERTIFICATE_GENERATE_ACTION}`);
      const [generatedCertificate, generatedKey] = await Promise.all([
        dependencies.inspectFile(certificatePath),
        dependencies.inspectFile(keyPath),
      ]);
      if (generatedCertificate !== "file" || generatedKey !== "file") {
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

function deduplicate(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

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

function runtimeManualAction(adapter: ContainerRuntimeAdapter): string {
  return `Start or restart ${adapter.displayName}, then rerun setup.`;
}

function manualInstallAction(engine: ContainerEngine): string {
  return engine === "rancher"
    ? "Install Rancher Desktop from https://rancherdesktop.io/, then rerun setup."
    : "Install Podman Desktop from https://podman-desktop.io/downloads, then rerun setup.";
}

async function checkRuntime(
  context: SetupContext,
  adapter: ContainerRuntimeAdapter,
): Promise<Readonly<{ok: true; inventory: string}> | Readonly<{ok: false; error: string; installable: boolean; manualStart: boolean}>> {
  try {
    await runSharedPreflight(adapter, adaptCommandRunner(context.runner), context.logger);
    if (adapter.engine === "podman") {
      const info = await context.runner.run({command: "podman", args: ["info", "--format", "json"]}, {cwd: context.paths.root});
      if (!isSuccessfulCommand(info)) {
        const detail = info.stderr.trim() || info.stdout.trim() || info.spawnError || `exit code ${info.code}`;
        return {
          ok: false,
          error: `podman info --format json failed: ${detail}`,
          installable: false,
          manualStart: true,
        };
      }
    }

    const inventory = await context.runner.run(
      {command: adapter.primaryCli, args: ["ps", "--format", "{{.Names}}\t{{.Ports}}"]},
      {cwd: context.paths.root},
    );
    return {ok: true, inventory: isSuccessfulCommand(inventory) ? inventory.stdout : ""};
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    const message = errorMessage(error);
    const lower = message.toLowerCase();
    const dockerConflict = lower.includes("docker desktop");
    const composeMissing = lower.includes("compose provider is not available");
    const cliMissing = lower.includes("required tool") || lower.includes("podman is not available");
    const backendUnavailable =
      lower.includes("docker-compatible cli is not available") || lower.includes("cannot connect") || lower.includes("daemon");
    return {
      ok: false,
      error: message,
      installable: !dockerConflict && (cliMissing || composeMissing),
      manualStart: !dockerConflict && backendUnavailable && !cliMissing,
    };
  }
}

async function prepareRuntime(
  context: SetupContext,
  dependencies: InfrastructureSetupDependencies,
  adapter: ContainerRuntimeAdapter,
): Promise<RuntimeOutcome> {
  const initial = await checkRuntime(context, adapter);
  if (initial.ok) {
    return {
      blocked: false,
      planned: false,
      evidence: [`${adapter.displayName} runtime postcondition is satisfied.`],
      nextActions: [],
      inventory: initial.inventory,
    };
  }

  if (!initial.installable) {
    return {
      blocked: true,
      planned: false,
      evidence: [`${adapter.displayName} runtime postcondition failed: ${initial.error}`],
      nextActions: [
        initial.manualStart ? runtimeManualAction(adapter) : "Resolve the reported container runtime conflict, then rerun setup.",
      ],
      inventory: "",
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
      evidence: [`${adapter.displayName} runtime postcondition failed: ${initial.error}`],
      nextActions: [manualInstallAction(adapter.engine)],
      inventory: "",
    };
  }

  const disposition = await context.actions.run({
    id: CONTAINER_INSTALL_ACTION,
    scope: "system",
    summary: proposal.explanation,
    execute: async () => {
      const result = await context.runner.run(proposal.command, {
        cwd: context.paths.root,
        output: "inherit",
      });
      if (!isSuccessfulCommand(result)) {
        throw new Error(
          `Container runtime installation failed: ${result.stderr.trim() || result.stdout.trim() || result.spawnError || `exit code ${result.code}`}`,
        );
      }
    },
  });
  if (disposition === "declined") {
    return {
      blocked: true,
      planned: false,
      evidence: [initial.error, `Declined action: ${CONTAINER_INSTALL_ACTION}`],
      nextActions: [manualInstallAction(adapter.engine)],
      inventory: "",
    };
  }
  if (disposition === "planned") {
    return {
      blocked: false,
      planned: true,
      evidence: [initial.error, `Planned action: ${CONTAINER_INSTALL_ACTION}`],
      nextActions: [],
      inventory: "",
    };
  }

  const final = await checkRuntime(context, adapter);
  if (!final.ok) {
    return {
      blocked: true,
      planned: false,
      evidence: [
        `Executed action: ${CONTAINER_INSTALL_ACTION}`,
        `${adapter.displayName} runtime postcondition still failed: ${final.error}`,
      ],
      nextActions: [final.manualStart || !final.installable ? runtimeManualAction(adapter) : manualInstallAction(adapter.engine)],
      inventory: "",
    };
  }
  return {
    blocked: false,
    planned: false,
    evidence: [`Executed action: ${CONTAINER_INSTALL_ACTION}`, `${adapter.displayName} runtime postcondition is satisfied.`],
    nextActions: [],
    inventory: final.inventory,
  };
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

async function runInfrastructureSetup(context: SetupContext, dependencies: InfrastructureSetupDependencies): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const evidence: string[] = [];

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

    let planned = false;
    if (currentConfig?.containerEngine !== selection.engine) {
      const disposition = await context.actions.run({
        id: ENGINE_PERSIST_ACTION,
        scope: "repository",
        summary: `Persist ${adapter.displayName} as the non-secret local container engine selection.`,
        execute: async () => {
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
      });
      if (disposition === "declined") {
        return phaseResult(context, startedAt, {
          id: "infrastructure",
          status: "failed",
          summary: "Persisting the required container engine selection was declined.",
          evidence: [...evidence, `Declined action: ${ENGINE_PERSIST_ACTION}`],
          nextActions: [`Allow required action '${ENGINE_PERSIST_ACTION}', then rerun setup.`],
        });
      }
      if (disposition === "planned") {
        planned = true;
        evidence.push(`Planned action: ${ENGINE_PERSIST_ACTION}`);
      } else {
        evidence.push(`Executed action: ${ENGINE_PERSIST_ACTION}`);
      }
    } else {
      evidence.push("The persisted container engine selection is already current.");
    }

    const runtime = await prepareRuntime(context, dependencies, adapter);
    evidence.push(...runtime.evidence);
    planned ||= runtime.planned;

    const ports = await inspectInfrastructurePorts(context, dependencies, adapter, runtime.inventory);
    evidence.push(...ports.evidence);

    const files = await inspectRuntimeFiles(dependencies, context.paths.root);
    evidence.push(...files.evidence);

    const certificates = await prepareCertificates(context, dependencies);
    evidence.push(...certificates.evidence);
    planned ||= certificates.planned;
    const degraded = ports.degraded || certificates.degraded;
    const blocked = runtime.blocked || ports.blocked || files.blocked;
    const nextActions = deduplicate([
      ...runtime.nextActions,
      ...ports.nextActions,
      ...(files.blocked ? ["Restore the required tracked local infrastructure files, then rerun setup."] : []),
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

const defaultDependencies: InfrastructureSetupDependencies = {
  platform: process.platform,
  environment: process.env,
  interactive: process.stdin.isTTY === true,
  readConfig: readToolingConfig,
  writeConfig: writeToolingConfig,
  inspectPorts: inspectRequiredPorts,
  inspectFile: inspectRegularFile,
  createDirectory: (path) => mkdir(path, {recursive: true}).then(() => undefined),
};

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
