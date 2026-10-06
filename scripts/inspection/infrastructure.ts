/**
 * @fileoverview Shared read-only local container runtime, port, certificate, and manifest inspection.
 * @module scripts/inspection/infrastructure
 *
 * @remarks
 * Every command this module issues runs through an opaque named probe from
 * {@link "./probes.ts"}'s `probes.infrastructure` registry; no command is ever hand-built here.
 * Required local port occupancy prefers already-aggregated `systeminformation` host facts (see
 * {@link "./aggregate.ts"}) and falls back to an explicit platform-specific probe only when the
 * aggregate outcome is not `"available"`. Raw stdout/stderr, native errors, process command lines,
 * usernames, home paths, IP endpoints, environment values, certificate secrets, and arbitrary
 * (non-repository) container metadata never cross this module's public boundary: every issue,
 * container, and port projection is a small, deterministic, bounded fact.
 */

import {resolve} from "node:path";

import {Effect, Schema} from "effect";

import type {RepositoryPaths} from "../common/repository-paths.ts";
import {requiredLocalPorts} from "../container-runtime/preflight.ts";
import type {ContainerEngine} from "../container-runtime/types.ts";
import {Environment} from "../platform/Environment.ts";
import type {ReadOnlyFiles} from "../platform/Files.ts";
import type {Process} from "../platform/Process.ts";
import type {AggregateFacts} from "./aggregate.ts";
import {inspectPath} from "./files.ts";
import type {HostPortOwnerFact} from "./host.ts";
import {probes, type InspectionProbeRunner, type ProbeOutcome} from "./probes.ts";
import {timed} from "./session.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";

/** Environment variables passed to every infrastructure probe. */
type ProbeEnvironment = Readonly<Record<string, string | undefined>>;

/** Read-only availability and ownership evidence for one required local TCP port. */
export interface PortFact {
  readonly port: number;
  readonly available: boolean;
  readonly pid?: number;
  readonly processName?: string;
  readonly repositoryOwned?: boolean;
  readonly error?: string;
}

/** Deterministic, redacted local container-runtime, port, certificate, and manifest facts. */
export interface InfrastructureFacts {
  readonly selectedEngine?: ContainerEngine;
  readonly cliAvailable: boolean;
  readonly backendAvailable: boolean;
  readonly composeAvailable: boolean;
  readonly dockerConflict: boolean;
  readonly socketContextIssues: readonly string[];
  readonly ports: readonly PortFact[];
  readonly certificateIssues: readonly string[];
  readonly manifestIssues: readonly string[];
  readonly containers: readonly Readonly<{
    name: string;
    state: string;
    /** Human-readable container status string, set when available (e.g. `"Up 3 hours (unhealthy)"`). */
    status?: string;
    publishedPorts: readonly number[];
    repositoryOwned: boolean;
  }>[];
}

type ContainerFact = InfrastructureFacts["containers"][number];

/** Dependencies required to create the shared infrastructure inspection provider. */
interface InfrastructureProviderInput {
  readonly paths: RepositoryPaths;
  readonly probes: InspectionProbeRunner;
  /** Resolves the aggregate host facts (memoized by the owning session). */
  readonly aggregate: Effect.Effect<InspectionOutcome<AggregateFacts>>;
  readonly requestedEngine?: ContainerEngine;
  /**
   * Optional lazy engine accessor invoked each time the provider runs.
   *
   * @remarks
   * When present, takes precedence over the static {@link requestedEngine} capture. This enables
   * a single shared inspection session to observe an engine selected after session construction
   * (from environment, persisted config, or an interactive prompt) without creating a second
   * session, duplicating the provider, or mutating the runtime environment snapshot.
   */
  readonly resolveEngine?: () => ContainerEngine | undefined;
}

/** Reports an environmental failure that prevents any reliable infrastructure observation. */
class InfrastructureInspectionFailure extends Schema.TaggedError<InfrastructureInspectionFailure>()("InfrastructureInspectionFailure", {
  message: Schema.String,
}) {}

/** Approved repository container names; matches `commands/doctor/modules/infrastructure.ts`'s known-container list. */
const KNOWN_LOCAL_CONTAINER_NAMES: ReadonlySet<string> = new Set([
  "traefik",
  "mssql",
  "cosmosdb",
  "azurite",
  "redis",
  "healthchecks",
  "exp-arolariu-ro",
  "api-arolariu-ro",
  "website-arolariu-ro",
]);

/** Repository-relative segments for every manifest required by local Aspire/selfhost runtimes. */
const REQUIRED_MANIFEST_RELATIVE_SEGMENTS: readonly (readonly string[])[] = [
  ["tooling", "AppHost", "AppHost.csproj"],
  ["infra", "Local", "Management", "docker-compose.yml"],
  ["infra", "Local", "Storage", "docker-compose.yml"],
  ["infra", "Local", "Backend", "docker-compose.yml"],
  ["infra", "Local", "Frontend", "docker-compose.yml"],
];

/** Repository-relative segments for the optional selfhost TLS certificate and key. */
const CERTIFICATE_RELATIVE_SEGMENTS = ["infra", "Local", "Management", "certs", "local-cert.pem"] as const;
const KEY_RELATIVE_SEGMENTS = ["infra", "Local", "Management", "certs", "local-key.pem"] as const;

/**
 * Substrings identifying a Docker Desktop Compose delegation, reused verbatim from doctor policy.
 */
const DOCKER_DESKTOP_COMPOSE_INDICATORS = [
  "\\docker\\",
  "/docker/",
  "/docker.app/",
  "docker desktop",
  "docker-compose.exe",
  "docker-compose",
] as const;

/** Substring identifying a Docker Desktop backend/engine banner, reused verbatim from doctor policy. */
const DOCKER_DESKTOP_BACKEND_INDICATOR = "docker desktop";

const SUPPORTED_PORT_OWNER_PLATFORMS: ReadonlySet<NodeJS.Platform> = new Set(["win32", "darwin", "linux"]);

/** Environment variable name never forwarded to a spawned diagnostic command. */
const SQL_PASSWORD_ENVIRONMENT_KEY = "MSSQL_SA_PASSWORD";

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isSuccessfulCommand(outcome: Readonly<ProbeOutcome>): boolean {
  return outcome.kind === "succeeded";
}

/**
 * Tolerates the one benign macOS nonzero-exit shape produced by the shared multi-port `lsof` loop:
 * the last requested port having no listener leaves the whole invocation's exit code nonzero even
 * though earlier ports may have produced valid, already-flushed stdout.
 *
 * @param platform - Target platform the probe executed for.
 * @param outcome - Captured probe outcome.
 * @returns Whether the outcome's stdout should be parsed as port-ownership evidence.
 */
function isAcceptablePortProbeResult(platform: NodeJS.Platform, outcome: Readonly<ProbeOutcome>): boolean {
  if (isSuccessfulCommand(outcome)) {
    return true;
  }
  return platform === "darwin" && outcome.kind === "exited" && outcome.exitCode === 1 && outcome.stderr.trim() === "";
}

/**
 * Strips known secret environment values before any diagnostic command inherits the caller's
 * environment, matching `commands/setup/phases/infrastructure.ts`'s established credential isolation.
 *
 * @param environment - Caller-supplied environment snapshot.
 * @returns A copy with the local SQL password variable removed.
 */
function credentialIsolatedEnvironment(environment: ProbeEnvironment): ProbeEnvironment {
  const isolated: Record<string, string | undefined> = {};
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase() !== SQL_PASSWORD_ENVIRONMENT_KEY) {
      isolated[key] = environment[key];
    }
  }
  isolated[SQL_PASSWORD_ENVIRONMENT_KEY] = undefined;
  return isolated;
}

function combinedOutput(outcome: Readonly<ProbeOutcome>): string {
  return `${outcome.stdout}\n${outcome.stderr}`.toLowerCase();
}

// ============================================================================
// Ports
// ============================================================================

interface ParsedPortOwner {
  readonly port: number;
  readonly pid?: number;
  readonly processName?: string;
}

function projectPortsFromAggregate(portOwners: readonly HostPortOwnerFact[]): readonly PortFact[] {
  return requiredLocalPorts.map((port) => {
    const owner = portOwners.find((candidate) => candidate.port === port);
    if (owner === undefined) {
      return {port, available: true};
    }
    return {
      port,
      available: false,
      ...(owner.pid === undefined ? {} : {pid: owner.pid}),
      ...(owner.processName === undefined ? {} : {processName: owner.processName}),
      repositoryOwned: owner.repositoryOwned,
    };
  });
}

/**
 * Parses the Windows read-only port-owner probe's `LocalAddress, LocalPort, OwningProcess` JSON.
 *
 * @remarks
 * The registered Windows probe script never reports a process name, so every parsed owner carries
 * only a port and an optional PID.
 *
 * @param stdout - Captured probe stdout.
 * @returns Parsed port owners; empty when stdout is empty or malformed.
 */
function parseWindowsPortOwners(stdout: string): readonly ParsedPortOwner[] {
  const trimmed = stdout.trim();
  if (trimmed === "") {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed];
  const owners: ParsedPortOwner[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) {
      continue;
    }
    const port = Number(entry["LocalPort"]);
    if (!Number.isSafeInteger(port)) {
      continue;
    }
    const pid = Number(entry["OwningProcess"]);
    owners.push({port, ...(Number.isSafeInteger(pid) && pid > 0 ? {pid} : {})});
  }
  return owners;
}

/**
 * Parses the macOS read-only port-owner probe's `lsof -Fpcn` field-prefixed output.
 *
 * @param stdout - Captured probe stdout.
 * @returns Parsed port owners; empty when stdout carries no recognizable listener.
 */
function parseMacPortOwners(stdout: string): readonly ParsedPortOwner[] {
  const owners: ParsedPortOwner[] = [];
  let pid: number | undefined;
  let processName: string | undefined;

  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.startsWith("p")) {
      const parsedPid = Number(line.slice(1));
      pid = Number.isSafeInteger(parsedPid) ? parsedPid : undefined;
      processName = undefined;
    } else if (line.startsWith("c")) {
      processName = line.slice(1);
    } else if (line.startsWith("n")) {
      const match = /:(\d+)$/u.exec(line);
      const port = match?.[1] === undefined ? undefined : Number(match[1]);
      if (port !== undefined && Number.isSafeInteger(port)) {
        owners.push({port, ...(pid === undefined ? {} : {pid}), ...(processName === undefined ? {} : {processName})});
      }
    }
  }

  return owners;
}

/**
 * Parses the Linux read-only port-owner probe's `ss -ltnp` output.
 *
 * @param stdout - Captured probe stdout.
 * @returns Parsed port owners; empty when stdout carries no recognizable `LISTEN` line.
 */
function parseLinuxPortOwners(stdout: string): readonly ParsedPortOwner[] {
  const owners: ParsedPortOwner[] = [];
  for (const rawLine of stdout.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || !line.toUpperCase().startsWith("LISTEN")) {
      continue;
    }
    const portMatch = /:(\d+)\s/u.exec(line);
    const port = portMatch?.[1] === undefined ? undefined : Number(portMatch[1]);
    if (port === undefined || !Number.isSafeInteger(port)) {
      continue;
    }
    const userMatch = /users:\(\("([^"]+)",pid=(\d+)/u.exec(line);
    const processName = userMatch?.[1];
    const pid = userMatch?.[2] === undefined ? undefined : Number(userMatch[2]);
    owners.push({
      port,
      ...(pid !== undefined && Number.isSafeInteger(pid) ? {pid} : {}),
      ...(processName === undefined ? {} : {processName}),
    });
  }
  return owners;
}

/**
 * Inspects required local port occupancy through the platform-specific fallback probe.
 *
 * @remarks
 * Used only when the aggregate host facts are not `"available"`. Repository ownership cannot be
 * established from this fallback evidence (no process command line/path is ever collected here),
 * so every returned fact leaves `repositoryOwned` unset rather than guessing.
 *
 * @param input - Repository paths, probe runner, isolated environment, and target platform.
 * @returns One {@link PortFact} per required local port.
 */
function inspectPortsViaProbe(
  input: Readonly<{paths: RepositoryPaths; probes: InspectionProbeRunner; env: ProbeEnvironment; platform: NodeJS.Platform}>,
): Effect.Effect<readonly PortFact[], never, Process> {
  return Effect.gen(function* () {
    const ports = [...requiredLocalPorts];

    if (!SUPPORTED_PORT_OWNER_PLATFORMS.has(input.platform)) {
      return ports.map((port) => ({port, available: false, error: "Port ownership inspection is not supported on this platform."}));
    }

    const result = yield* input.probes.run(probes.infrastructure.portOwners(ports, input.platform), {
      cwd: input.paths.root,
      env: input.env,
    });

    if (!isAcceptablePortProbeResult(input.platform, result)) {
      return ports.map((port) => ({port, available: false, error: "Port ownership could not be determined for the required local ports."}));
    }

    const owners =
      input.platform === "win32"
        ? parseWindowsPortOwners(result.stdout)
        : input.platform === "darwin"
          ? parseMacPortOwners(result.stdout)
          : parseLinuxPortOwners(result.stdout);

    return ports.map((port) => {
      const owner = owners.find((candidate) => candidate.port === port);
      if (owner === undefined) {
        return {port, available: true};
      }
      return {
        port,
        available: false,
        ...(owner.pid === undefined ? {} : {pid: owner.pid}),
        ...(owner.processName === undefined ? {} : {processName: owner.processName}),
      };
    });
  });
}

/**
 * Inspects required local port occupancy, preferring already-aggregated host facts.
 *
 * @param input - Aggregate outcome accessor, repository paths, probe runner, isolated environment,
 * and target platform.
 * @returns One {@link PortFact} per required local port.
 */
function inspectPorts(
  input: Readonly<{
    aggregate: Effect.Effect<InspectionOutcome<AggregateFacts>>;
    paths: RepositoryPaths;
    probes: InspectionProbeRunner;
    env: ProbeEnvironment;
    platform: NodeJS.Platform;
  }>,
): Effect.Effect<readonly PortFact[], never, Process> {
  return Effect.flatMap(input.aggregate, (aggregateOutcome) =>
    aggregateOutcome.kind === "available" && aggregateOutcome.value.host.kind === "available"
      ? Effect.succeed(projectPortsFromAggregate(aggregateOutcome.value.host.value.portOwners))
      : inspectPortsViaProbe(input),
  );
}

// ============================================================================
// Certificates and manifests
// ============================================================================

type FileKind = "file" | "missing" | "directory" | "other";

function inspectFileKind(path: string): Effect.Effect<FileKind, InfrastructureInspectionFailure, ReadOnlyFiles> {
  return inspectPath(path).pipe(
    Effect.map((info) => info.kind),
    Effect.mapError(() => new InfrastructureInspectionFailure({message: "A required local infrastructure path could not be inspected."})),
  );
}

/**
 * Inspects the optional selfhost TLS certificate and key file state.
 *
 * @param paths - Canonical repository paths.
 * @returns Bounded issue strings; empty when both files are present regular files. Both paths are
 * inspected concurrently.
 */
function inspectCertificates(paths: RepositoryPaths): Effect.Effect<readonly string[], InfrastructureInspectionFailure, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const certificatePath = resolve(paths.root, ...CERTIFICATE_RELATIVE_SEGMENTS);
    const keyPath = resolve(paths.root, ...KEY_RELATIVE_SEGMENTS);
    const [certificateKind, keyKind] = yield* Effect.all([inspectFileKind(certificatePath), inspectFileKind(keyPath)], {
      concurrency: "unbounded",
    });

    const certificateRelative = CERTIFICATE_RELATIVE_SEGMENTS.join("/");
    const keyRelative = KEY_RELATIVE_SEGMENTS.join("/");
    const issues: string[] = [];

    if (certificateKind === "missing") {
      issues.push(`Missing selfhost certificate file: ${certificateRelative}`);
    } else if (certificateKind !== "file") {
      issues.push(`Selfhost certificate path is not a file: ${certificateRelative} (${certificateKind}).`);
    }
    if (keyKind === "missing") {
      issues.push(`Missing selfhost certificate key: ${keyRelative}`);
    } else if (keyKind !== "file") {
      issues.push(`Selfhost certificate key path is not a file: ${keyRelative} (${keyKind}).`);
    }
    return issues;
  });
}

/**
 * Inspects the presence of every required local Aspire/selfhost runtime manifest.
 *
 * @param paths - Canonical repository paths.
 * @returns Bounded issue strings; empty when every required manifest is present. Every manifest is
 * inspected concurrently.
 */
function inspectManifests(paths: RepositoryPaths): Effect.Effect<readonly string[], InfrastructureInspectionFailure, ReadOnlyFiles> {
  return Effect.map(
    Effect.forEach(
      REQUIRED_MANIFEST_RELATIVE_SEGMENTS,
      (segments) =>
        Effect.map(inspectFileKind(resolve(paths.root, ...segments)), (kind) => ({
          relative: segments.join("/"),
          missing: kind === "missing",
        })),
      {concurrency: "unbounded"},
    ),
    (results) => results.filter((result) => result.missing).map((result) => `Missing required manifest: ${result.relative}`),
  );
}

// ============================================================================
// Containers
// ============================================================================

interface ParsedContainerRecord {
  readonly names: readonly string[];
  readonly state: string;
  readonly status?: string;
  readonly hostPorts: readonly number[];
}

/**
 * Normalizes Docker's single comma-joined `Names` string or Podman's `Names` string array.
 *
 * @param value - Raw `Names` field from one parsed `ps -a --format {{json .}}` JSON line.
 * @returns The normalized name list, or `null` when the field is neither a string nor an array.
 */
function normalizeContainerNames(value: unknown): readonly string[] | null {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "");
  }
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return null;
}

/**
 * Extracts distinct host ports from Docker's single human-readable `Ports` string.
 *
 * @param ports - Raw Docker `Ports` string.
 * @returns Distinct host ports found in the string.
 */
function parseDockerPortsString(ports: string): readonly number[] {
  const found = new Set<number>();
  for (const match of ports.matchAll(/:(\d+)->\d+\/(?:tcp|udp)/gu)) {
    const port = Number(match[1]);
    if (Number.isSafeInteger(port)) {
      found.add(port);
    }
  }
  return [...found];
}

/**
 * Extracts distinct host ports from Podman's `Ports` array of port-mapping objects.
 *
 * @param ports - Raw Podman `Ports` array.
 * @returns Distinct host ports found across the array's `host_port` fields.
 */
function parsePodmanPortsArray(ports: readonly unknown[]): readonly number[] {
  const found = new Set<number>();
  for (const entry of ports) {
    if (!isRecord(entry)) {
      continue;
    }
    const hostPort = Number(entry["host_port"]);
    if (Number.isSafeInteger(hostPort)) {
      found.add(hostPort);
    }
  }
  return [...found];
}

function parseContainerListLine(line: string): ParsedContainerRecord | null {
  const trimmed = line.trim();
  if (trimmed === "") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return null;
    }

    const state = parsed["State"];
    if (typeof state !== "string") {
      return null;
    }

    const names = normalizeContainerNames(parsed["Names"]);
    if (names === null) {
      return null;
    }

    const rawPorts = parsed["Ports"];
    const hostPorts =
      typeof rawPorts === "string" ? parseDockerPortsString(rawPorts) : Array.isArray(rawPorts) ? parsePodmanPortsArray(rawPorts) : [];

    const rawStatus = parsed["Status"];
    const status = typeof rawStatus === "string" && rawStatus.trim() !== "" ? rawStatus.trim() : undefined;

    return {names, state, ...(status !== undefined ? {status} : {}), hostPorts};
  } catch {
    return null;
  }
}

function parseContainerList(stdout: string): readonly ParsedContainerRecord[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => parseContainerListLine(line))
    .filter((record): record is ParsedContainerRecord => record !== null);
}

/**
 * Projects a validated `docker ps`/`podman ps` listing into bounded, approved container facts.
 *
 * @remarks
 * Only records whose name matches {@link KNOWN_LOCAL_CONTAINER_NAMES} are ever included: an
 * unrelated host container's name, state, or ports must never cross this module's boundary. The
 * first record observed for a given known name wins, keeping the projection deterministic even if
 * the same name were ever repeated in the listing.
 *
 * @param stdout - Captured `probes.infrastructure.containerList` stdout.
 * @returns Approved container facts, sorted by name.
 */
function projectContainers(stdout: string): readonly ContainerFact[] {
  const byName = new Map<string, {state: string; status?: string; publishedPorts: readonly number[]}>();
  for (const record of parseContainerList(stdout)) {
    const knownName = record.names.find((name) => KNOWN_LOCAL_CONTAINER_NAMES.has(name));
    if (knownName === undefined || byName.has(knownName)) {
      continue;
    }
    byName.set(knownName, {
      state: record.state,
      ...(record.status !== undefined ? {status: record.status} : {}),
      publishedPorts: [...new Set(record.hostPorts)].toSorted((left, right) => left - right),
    });
  }

  return [...byName.entries()]
    .map(([name, detail]) => ({
      name,
      state: detail.state,
      ...(detail.status !== undefined ? {status: detail.status} : {}),
      publishedPorts: detail.publishedPorts,
      repositoryOwned: true,
    }))
    .toSorted((left, right) => compareText(left.name, right.name));
}

// ============================================================================
// Docker Desktop conflict classification
// ============================================================================

/**
 * Classifies whether Docker Desktop appears to be the active backend instead of the selected
 * engine, from already-captured Compose/backend-info evidence.
 *
 * @param engine - Selected local container engine.
 * @param composeResult - Already-captured `probes.infrastructure.composeVersion` result.
 * @param runtimeInfoResult - For the rancher engine, the already-captured
 * `probes.infrastructure.runtimeInfo` (`docker info`) result; `undefined` for every other engine,
 * since the podman path is classified from `composeResult` alone and never invokes this probe.
 * @returns Whether Docker Desktop delegation/backend evidence was found.
 */
function classifyDockerConflict(
  engine: ContainerEngine,
  composeResult: Readonly<ProbeOutcome>,
  runtimeInfoResult: Readonly<ProbeOutcome> | undefined,
): boolean {
  if (engine === "podman") {
    if (!isSuccessfulCommand(composeResult)) {
      return false;
    }
    const output = combinedOutput(composeResult);
    const usesPodmanCompose = output.includes("podman-compose");
    return !usesPodmanCompose && DOCKER_DESKTOP_COMPOSE_INDICATORS.some((indicator) => output.includes(indicator));
  }

  if (runtimeInfoResult === undefined || !isSuccessfulCommand(runtimeInfoResult)) {
    return false;
  }
  return combinedOutput(runtimeInfoResult).includes(DOCKER_DESKTOP_BACKEND_INDICATOR);
}

// ============================================================================
// Provider
// ============================================================================

/**
 * Creates one read-only provider for normalized local container-runtime, port, certificate, and
 * manifest facts, shared by future setup and doctor policy modules.
 *
 * @param input - Canonical repository paths, opaque probe runner, aggregate host facts, and the
 * already-resolved container engine; files are read through `ReadOnlyFiles` and the platform and
 * variables through `Environment`.
 * @returns An inspection provider whose `available` outcome always carries a complete
 * {@link InfrastructureFacts} document; `unavailable` is reserved for environmental failures that
 * prevent any reliable observation (for example an unreadable certificate/manifest path).
 */
export function createInfrastructureProvider(input: Readonly<InfrastructureProviderInput>): InspectionProvider<InfrastructureFacts> {
  return timed(
    Effect.gen(function* () {
      const environment = yield* Environment;
      const {platform} = environment;
      const isolatedEnvironment = credentialIsolatedEnvironment(environment.variables);

      // Every observation below starts concurrently, exactly as the previous `Promise.all` did.
      const {ports, certificateIssues, manifestIssues} = yield* Effect.all(
        {
          ports: inspectPorts({
            aggregate: input.aggregate,
            paths: input.paths,
            probes: input.probes,
            env: isolatedEnvironment,
            platform,
          }),
          certificateIssues: inspectCertificates(input.paths),
          manifestIssues: inspectManifests(input.paths),
        },
        {concurrency: "unbounded"},
      );

      const engine = input.resolveEngine?.() ?? input.requestedEngine;
      if (engine === undefined) {
        const value: InfrastructureFacts = {
          cliAvailable: false,
          backendAvailable: false,
          composeAvailable: false,
          dockerConflict: false,
          socketContextIssues: [],
          ports,
          certificateIssues,
          manifestIssues,
          containers: [],
        };
        return {kind: "available", value, durationMs: 0} satisfies InspectionOutcome<InfrastructureFacts>;
      }

      const probeOptions = {cwd: input.paths.root, env: isolatedEnvironment};
      const cliResult = yield* input.probes.run(probes.infrastructure.runtimeVersion(engine), probeOptions);
      const cliAvailable = isSuccessfulCommand(cliResult);

      if (!cliAvailable) {
        const value: InfrastructureFacts = {
          selectedEngine: engine,
          cliAvailable: false,
          backendAvailable: false,
          composeAvailable: false,
          dockerConflict: false,
          socketContextIssues: [],
          ports,
          certificateIssues,
          manifestIssues,
          containers: [],
        };
        return {kind: "available", value, durationMs: 0} satisfies InspectionOutcome<InfrastructureFacts>;
      }

      const [composeResult, contextResult, containerListResult, runtimeInfoResult] = yield* Effect.all(
        [
          input.probes.run(probes.infrastructure.composeVersion(engine), probeOptions),
          input.probes.run(probes.infrastructure.runtimeContext(engine), probeOptions),
          input.probes.run(probes.infrastructure.containerList(engine), probeOptions),
          engine === "rancher" ? input.probes.run(probes.infrastructure.runtimeInfo(engine), probeOptions) : Effect.succeed(undefined),
        ],
        {concurrency: "unbounded"},
      );

      const composeAvailable = isSuccessfulCommand(composeResult);
      const backendAvailable = isSuccessfulCommand(containerListResult);
      const containers = backendAvailable ? projectContainers(containerListResult.stdout) : [];
      const socketContextIssues = isSuccessfulCommand(contextResult)
        ? []
        : ["The active container runtime context or connection state could not be determined."];
      const dockerConflict = classifyDockerConflict(engine, composeResult, runtimeInfoResult);

      const value: InfrastructureFacts = {
        selectedEngine: engine,
        cliAvailable,
        backendAvailable,
        composeAvailable,
        dockerConflict,
        socketContextIssues,
        ports,
        certificateIssues,
        manifestIssues,
        containers,
      };
      return {kind: "available", value, durationMs: 0} satisfies InspectionOutcome<InfrastructureFacts>;
    }).pipe(
      Effect.catchTag("InfrastructureInspectionFailure", (failure) =>
        Effect.succeed<InspectionOutcome<InfrastructureFacts>>({kind: "unavailable", reason: failure.message, durationMs: 0}),
      ),
    ),
  );
}
