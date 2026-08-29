/**
 * @fileoverview Local container runtime and infrastructure preparation.
 * @module scripts.setup.infrastructure
 */

import {mkdir, stat} from "node:fs/promises";
import {createServer} from "node:net";
import {dirname, resolve} from "node:path";

import {defaultCommandRunner, type CommandResult, type CommandRunner, type CommandRunOptions} from "./common/process.ts";
import type {ToolingConfigReadResult, ToolingConfigV1} from "./common/tooling-config.ts";
import {mergeToolingConfig, readToolingConfig, writeToolingConfig} from "./common/tooling-config.ts";
import {getContainerAdapter, type ContainerRuntimeAdapter} from "./container-runtime/adapters.ts";
import {assertNoDockerDesktopBackend, requiredLocalPorts, runSharedPreflight} from "./container-runtime/preflight.ts";
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

type FileKind = "file" | "missing" | "directory" | "other";

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
const MKCERT_MANUAL_URL = "https://github.com/FiloSottile/mkcert#installation";
const MKCERT_MANUAL_ACTION = `Install mkcert from ${MKCERT_MANUAL_URL}, then rerun setup.`;
const SQL_PASSWORD_ENVIRONMENT_KEY = "MSSQL_SA_PASSWORD";

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

type ListenerFamily = "IPv4" | "IPv6";

interface ListenerRecord {
  readonly localAddress: string;
  readonly family: ListenerFamily;
  readonly pid: number;
  readonly processName: string;
  readonly commandLine: string;
}

type BindProbeResult = Readonly<{status: "available"}> | Readonly<{status: "occupied"}> | Readonly<{status: "error"; error: string}>;

interface PortInspectionDependencies {
  readonly platform: NodeJS.Platform;
  readonly listenerRunner: CommandRunner;
  readonly probePort: (port: number) => Promise<BindProbeResult>;
  readonly lookupListeners?: (port: number) => Promise<readonly ListenerRecord[]>;
}

function isListenerRecord(value: unknown): value is ListenerRecord {
  return (
    typeof value === "object"
    && value !== null
    && "localAddress" in value
    && typeof value.localAddress === "string"
    && "family" in value
    && (value.family === "IPv4" || value.family === "IPv6")
    && "pid" in value
    && typeof value.pid === "number"
    && Number.isSafeInteger(value.pid)
    && value.pid > 0
    && "processName" in value
    && typeof value.processName === "string"
    && "commandLine" in value
    && typeof value.commandLine === "string"
  );
}

function commandFailure(result: Readonly<CommandResult>, fallback: string): string {
  return result.stderr.trim() || result.stdout.trim() || result.spawnError || fallback;
}

async function lookupWindowsListeners(port: number, runner: CommandRunner): Promise<readonly ListenerRecord[]> {
  const script = [
    `$connections = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction Stop);`,
    "$records = foreach ($connection in $connections) {",
    '$owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction Stop;',
    "[pscustomobject]@{",
    "localAddress = [string]$connection.LocalAddress;",
    "family = $(if ([string]$connection.LocalAddress -like '*:*') { 'IPv6' } else { 'IPv4' });",
    "pid = [int]$connection.OwningProcess;",
    "processName = [string]$owner.Name;",
    "commandLine = $(if ($owner.CommandLine) { [string]$owner.CommandLine } else { [string]$owner.Name })",
    "}",
    "};",
    "ConvertTo-Json -InputObject @($records) -Compress",
  ].join(" ");
  const result = await runner.run(
    {
      command: "powershell",
      args: ["-NoProfile", "-NonInteractive", "-Command", script],
    },
    {env: credentialIsolatedEnvironment()},
  );
  if (!isSuccessfulCommand(result)) {
    throw new Error(commandFailure(result, `PowerShell exited with code ${result.code}.`));
  }

  const value: unknown = JSON.parse(result.stdout);
  if (!Array.isArray(value) || !value.every(isListenerRecord)) {
    throw new Error("PowerShell returned invalid listener ownership evidence.");
  }
  return value;
}

function lsofAddress(value: string, port: number): string | null {
  const endpoint = value
    .replace(/^TCP\s+/u, "")
    .replace(/\s+\(LISTEN\)$/u, "")
    .trim();
  const suffix = `:${port}`;
  if (!endpoint.endsWith(suffix)) {
    return null;
  }
  const address = endpoint.slice(0, -suffix.length);
  return address.startsWith("[") && address.endsWith("]") ? address.slice(1, -1) : address;
}

async function lookupLsofFamily(port: number, family: ListenerFamily, runner: CommandRunner): Promise<readonly ListenerRecord[]> {
  const result = await runner.run(
    {
      command: "lsof",
      args: ["-nP", "-a", `-i${family === "IPv4" ? "4" : "6"}TCP:${port}`, "-sTCP:LISTEN", "-Fpcn"],
    },
    {env: credentialIsolatedEnvironment()},
  );
  if (!isSuccessfulCommand(result)) {
    if (
      result.code === 1
      && result.stdout.trim() === ""
      && result.stderr.trim() === ""
      && result.spawnError === undefined
      && !result.timedOut
      && result.signal === undefined
    ) {
      return [];
    }
    throw new Error(commandFailure(result, `lsof exited with code ${result.code}.`));
  }

  const records: ListenerRecord[] = [];
  let pid: number | undefined;
  let processName = "";
  for (const line of result.stdout.split(/\r?\n/u)) {
    const field = line[0];
    const value = line.slice(1);
    if (field === "p") {
      const parsedPid = Number(value);
      pid = Number.isSafeInteger(parsedPid) && parsedPid > 0 ? parsedPid : undefined;
      processName = "";
    } else if (field === "c") {
      processName = value;
    } else if (field === "n" && pid !== undefined) {
      const localAddress = lsofAddress(value, port);
      if (localAddress !== null) {
        records.push({localAddress, family, pid, processName, commandLine: ""});
      }
    }
  }
  return records;
}

async function lookupPosixListeners(port: number, runner: CommandRunner): Promise<readonly ListenerRecord[]> {
  const records = (await Promise.all([lookupLsofFamily(port, "IPv4", runner), lookupLsofFamily(port, "IPv6", runner)])).flat();
  const commandLines = new Map<number, string>();
  for (const pid of new Set(records.map((record) => record.pid))) {
    const result = await runner.run(
      {
        command: "ps",
        args: ["-p", String(pid), "-o", "command="],
      },
      {env: credentialIsolatedEnvironment()},
    );
    if (!isSuccessfulCommand(result) || result.stdout.trim() === "") {
      throw new Error(commandFailure(result, `ps exited with code ${result.code}.`));
    }
    commandLines.set(pid, result.stdout.trim());
  }
  return records.map((record) => ({
    ...record,
    commandLine: commandLines.get(record.pid) ?? record.processName,
  }));
}

async function lookupListeners(port: number, platform: NodeJS.Platform, runner: CommandRunner): Promise<readonly ListenerRecord[]> {
  if (platform === "win32") {
    return lookupWindowsListeners(port, runner);
  }
  return lookupPosixListeners(port, runner);
}

function normalizedListenerAddress(address: string): string {
  const normalized = address.trim().toLowerCase();
  const unwrapped = normalized.startsWith("[") && normalized.endsWith("]") ? normalized.slice(1, -1) : normalized;
  const zoneIndex = unwrapped.indexOf("%");
  return zoneIndex === -1 ? unwrapped : unwrapped.slice(0, zoneIndex);
}

function canBlockIpv4Loopback(record: ListenerRecord): boolean {
  const address = normalizedListenerAddress(record.localAddress);
  if (record.family === "IPv4") {
    return address === "127.0.0.1" || address === "0.0.0.0" || address === "*";
  }
  return address === "::" || address === "*" || address === "::ffff:127.0.0.1";
}

function correlateListenerOwner(records: readonly ListenerRecord[]): Omit<PortState, "port" | "available"> {
  const relevant = records.filter(canBlockIpv4Loopback);
  if (relevant.length === 0) {
    return {error: "Listener ownership failed: no listener record matched 127.0.0.1 or a wildcard address."};
  }

  const pids = [...new Set(relevant.map((record) => record.pid))].toSorted((left, right) => left - right);
  if (pids.length !== 1) {
    return {error: `Listener ownership is ambiguous: multiple PIDs (${pids.join(", ")}) can block 127.0.0.1.`};
  }

  const owner =
    relevant.find((record) => record.family === "IPv4" && normalizedListenerAddress(record.localAddress) === "127.0.0.1") ?? relevant[0];
  if (owner === undefined) {
    return {error: "Listener ownership failed: no listener owner remained after address correlation."};
  }
  return {
    pid: owner.pid,
    processName: owner.commandLine.trim() === "" ? owner.processName : owner.commandLine,
  };
}

async function probePort(port: number): Promise<BindProbeResult> {
  return new Promise<BindProbeResult>((resolveProbe) => {
    const server = createServer();
    const settle = (state: BindProbeResult): void => {
      server.removeAllListeners();
      resolveProbe(state);
    };
    server.unref();
    server.once("error", (error: NodeJS.ErrnoException) => {
      settle(
        error.code === "EADDRINUSE" ? {status: "occupied"} : {status: "error", error: `Port availability probe failed: ${error.message}`},
      );
    });
    server.once("listening", () => {
      server.close((error) => {
        settle(error === undefined ? {status: "available"} : {status: "error", error: `Port probe cleanup failed: ${error.message}`});
      });
    });
    server.listen({host: "127.0.0.1", port, exclusive: true});
  });
}

async function inspectPort(port: number, dependencies: PortInspectionDependencies): Promise<PortState> {
  const invalid = invalidPortState(port);
  if (invalid !== null) {
    return invalid;
  }

  let probe: BindProbeResult;
  try {
    probe = await dependencies.probePort(port);
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    return {port, available: false, error: `Port availability probe failed: ${errorMessage(error)}`};
  }
  if (probe.status === "available") {
    return {port, available: true};
  }
  if (probe.status === "error") {
    return {port, available: false, error: probe.error};
  }

  try {
    const records =
      dependencies.lookupListeners === undefined
        ? await lookupListeners(port, dependencies.platform, dependencies.listenerRunner)
        : await dependencies.lookupListeners(port);
    return {port, available: false, ...correlateListenerOwner(records)};
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    return {
      port,
      available: false,
      error: `Listener lookup failed: ${errorMessage(error)}`,
    };
  }
}

function phaseResult(context: SetupContext, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: Math.max(0, context.now() - startedAt),
  };
}

async function inspectRegularFile(path: string): Promise<FileKind> {
  try {
    const pathStat = await stat(path);
    return pathStat.isFile() ? "file" : pathStat.isDirectory() ? "directory" : "other";
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
 * @param overrides - Optional external bind/listener boundaries for deterministic inspection.
 * @returns Availability and listener ownership evidence in input order.
 */
export async function inspectRequiredPorts(
  ports: readonly number[] = requiredLocalPorts,
  overrides: Readonly<Partial<PortInspectionDependencies>> = {},
): Promise<readonly PortState[]> {
  const dependencies: PortInspectionDependencies = {
    platform: overrides.platform ?? process.platform,
    listenerRunner: overrides.listenerRunner ?? defaultCommandRunner,
    probePort: overrides.probePort ?? probePort,
    ...(overrides.lookupListeners === undefined ? {} : {lookupListeners: overrides.lookupListeners}),
  };
  const states: PortState[] = [];
  for (const port of ports) {
    states.push(await inspectPort(port, dependencies));
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

function commandContainsRepositoryRoot(processName: string, root: string, platform: NodeJS.Platform): boolean {
  let command = processName.replaceAll("\\", "/");
  let normalizedRoot = root.replaceAll("\\", "/").replace(/\/+$/u, "");
  if (platform === "win32") {
    command = command.toLowerCase();
    normalizedRoot = normalizedRoot.toLowerCase();
  }
  if (normalizedRoot.length <= 1) {
    return false;
  }

  let index = command.indexOf(normalizedRoot);
  while (index !== -1) {
    const before = command[index - 1];
    const after = command[index + normalizedRoot.length];
    const hasArgumentBoundaryBefore = before === undefined || before === '"' || before === "'" || before === "=" || /\s/u.test(before);
    const hasPathBoundaryAfter =
      after === undefined || after === "/" || after === '"' || after === "'" || after === "," || /\s/u.test(after);
    if (hasArgumentBoundaryBefore && hasPathBoundaryAfter) {
      return true;
    }
    index = command.indexOf(normalizedRoot, index + normalizedRoot.length);
  }
  return false;
}

function repositoryProcessOwnsPort(port: number, processName: string, root: string, platform: NodeJS.Platform): boolean {
  const command = processName.replaceAll("\\", "/").toLowerCase();
  if (commandContainsRepositoryRoot(processName, root, platform)) {
    return true;
  }
  if ([3000, 3002, 4173].includes(port)) {
    return /\bnode(?:\.exe)?\b/u.test(command) && /(?:^|[^a-z0-9_])(?:arolariu|nx|next|vite|svelte)(?:$|[^a-z0-9_])/u.test(command);
  }
  if (port === 5000) {
    return /\bdotnet(?:\.exe)?\b/u.test(command) && /(?:^|[^a-z0-9_])(?:apphost|api|arolariu)(?:$|[^a-z0-9_])/u.test(command);
  }
  if (port === 5002) {
    return (
      /\b(?:python(?:3(?:\.\d+)?)?|py)(?:\.exe)?\b/u.test(command)
      && /(?:^|[^a-z0-9_])(?:uvicorn|main:app|exp|arolariu)(?:$|[^a-z0-9_])/u.test(command)
    );
  }
  return false;
}

function isRepositoryContainer(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  if (SELFHOST_CONTAINER_NAMES.has(normalized)) {
    return true;
  }
  const tokens = new Set(normalized.split(/[^a-z0-9]+/u).filter((token) => token !== ""));
  const hasMarker = tokens.has("aspire") || tokens.has("dcp");
  return hasMarker && ASPIRE_RESOURCE_TOKENS.some((token) => tokens.has(token));
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
      || (state.processName !== undefined
        && repositoryProcessOwnsPort(state.port, state.processName, context.paths.root, dependencies.platform));
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

function degradedCertificateOutcome(evidence: readonly string[], nextActions: readonly string[] = []): CertificateOutcome {
  return {planned: false, degraded: true, evidence, nextActions};
}

async function prepareCertificates(context: SetupContext, dependencies: InfrastructureSetupDependencies): Promise<CertificateOutcome> {
  const certificatePath = resolve(context.paths.root, "infra", "Local", "Management", "certs", "local-cert.pem");
  const keyPath = resolve(context.paths.root, "infra", "Local", "Management", "certs", "local-key.pem");
  let certificateKind: FileKind;
  let keyKind: FileKind;
  try {
    certificateKind = await dependencies.inspectFile(certificatePath);
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    return degradedCertificateOutcome(
      [`Unable to inspect optional selfhost certificate path ${certificatePath}: ${errorMessage(error)}`],
      ["Check access and permissions for the optional certificate and key paths, then rerun setup."],
    );
  }
  try {
    keyKind = await dependencies.inspectFile(keyPath);
  } catch (error) {
    if (isInterrupted(error)) {
      throw error;
    }
    return degradedCertificateOutcome(
      [`Unable to inspect optional selfhost certificate path ${keyPath}: ${errorMessage(error)}`],
      ["Check access and permissions for the optional certificate and key paths, then rerun setup."],
    );
  }
  if (certificateKind === "file" && keyKind === "file") {
    return {
      planned: false,
      degraded: false,
      evidence: ["Optional selfhost certificate and key are present."],
      nextActions: [],
    };
  }
  if (certificateKind === "directory" || certificateKind === "other" || keyKind === "directory" || keyKind === "other") {
    const invalidPaths = [
      ...(certificateKind === "directory" || certificateKind === "other" ? [{path: certificatePath, kind: certificateKind}] : []),
      ...(keyKind === "directory" || keyKind === "other" ? [{path: keyPath, kind: keyKind}] : []),
    ];
    const suffix = invalidPaths.length === 1 ? "" : "s";
    return degradedCertificateOutcome(
      [`Optional selfhost certificate paths have invalid kinds: ${invalidPaths.map(({path, kind}) => `${path} (${kind})`).join(", ")}.`],
      [
        `Replace or remove the invalid optional certificate path${suffix} ${invalidPaths.map(({path}) => path).join(", ")}, then rerun setup.`,
      ],
    );
  }

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
      const installDisposition = await context.actions.run({
        id: MKCERT_INSTALL_ACTION,
        scope: "system",
        summary: proposal.explanation,
        execute: () => runRequiredCommand(context, proposal.command, "mkcert installation failed"),
      });
      if (installDisposition === "declined") {
        return degradedCertificateOutcome(
          [...evidence, `Declined action: ${MKCERT_INSTALL_ACTION}`],
          [`Allow action '${MKCERT_INSTALL_ACTION}' or install mkcert manually from ${MKCERT_MANUAL_URL}, then rerun setup.`],
        );
      }
      if (installDisposition === "planned") {
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

    const trustDisposition = await context.actions.run({
      id: MKCERT_TRUST_ACTION,
      scope: "system",
      summary: "Install the mkcert local certificate authority into the system trust stores.",
      execute: () => runRequiredCommand(context, {command: "mkcert", args: ["-install"]}, "mkcert trust installation failed"),
    });
    if (trustDisposition === "declined") {
      return degradedCertificateOutcome(
        [...evidence, `Declined action: ${MKCERT_TRUST_ACTION}`],
        [`Allow action '${MKCERT_TRUST_ACTION}', then rerun setup.`],
      );
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
      return degradedCertificateOutcome(
        [...evidence, `Declined action: ${CERTIFICATE_GENERATE_ACTION}`],
        [`Allow action '${CERTIFICATE_GENERATE_ACTION}', then rerun setup.`],
      );
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

  if (adapter.engine === "podman") {
    try {
      await assertNoDockerDesktopBackend(adaptCommandRunner(context.runner));
    } catch (error) {
      if (isInterrupted(error)) {
        throw error;
      }
      return {
        blocked: true,
        planned: false,
        evidence: [`${adapter.displayName} runtime postcondition failed: ${errorMessage(error)}`],
        nextActions: ["Resolve the reported container runtime conflict, then rerun setup."],
        inventory: "",
      };
    }
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

    const runtime = await prepareRuntime(phaseContext, dependencies, adapter);
    evidence.push(...runtime.evidence);
    planned ||= runtime.planned;

    const ports = await inspectInfrastructurePorts(phaseContext, dependencies, adapter, runtime.inventory);
    evidence.push(...ports.evidence);

    const files = await inspectRuntimeFiles(dependencies, context.paths.root);
    evidence.push(...files.evidence);

    const certificates = await prepareCertificates(phaseContext, dependencies);
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
