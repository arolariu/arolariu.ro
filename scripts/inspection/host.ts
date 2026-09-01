/**
 * @fileoverview Pure, deterministic projection of an untrusted `systeminformation` aggregate result
 * into a small, redacted host fact model.
 * @module scripts/inspection/host
 *
 * @remarks
 * This module never imports or invokes `systeminformation`; collection and worker isolation are
 * owned elsewhere. It receives the already-collected aggregate value, treats it as untrusted, and
 * projects only the normalized facts local development needs. Hostnames, usernames, serials, UUIDs,
 * IP/MAC addresses, command lines, arguments, process/mount/Docker-root paths, proxy values,
 * arbitrary container names, and raw source objects are never allowed to survive into the returned
 * {@link HostFacts}, and are never echoed in a thrown error. Process command lines, paths, and
 * arguments and filesystem mount strings are read internally only, to correlate repository
 * ownership and select the repository volume.
 */

/** Normalized operating-system identity. */
export interface HostOsFacts {
  readonly platform: string;
  readonly distro: string;
  readonly release: string;
  readonly arch: string;
}

/** Normalized CPU capability facts. */
export interface HostCpuFacts {
  readonly brand: string;
  readonly cores: number;
  readonly physicalCores: number;
  readonly virtualization: boolean;
}

/** Normalized memory facts, in bytes. */
export interface HostMemoryFacts {
  readonly totalBytes: number;
  readonly usedBytes: number;
  readonly availableBytes: number;
}

/** Normalized current-load facts. */
export interface HostLoadFacts {
  readonly currentPercent: number;
}

/** Normalized, redacted filesystem facts for one mount. */
export interface HostFilesystemFact {
  readonly sizeBytes: number;
  readonly usedBytes: number;
  readonly availableBytes: number;
  readonly usedPercent: number;
  /** True only for the single most-specific mount that contains the repository root. */
  readonly repositoryVolume: boolean;
}

/** Normalized process-count facts. */
export interface HostProcessFacts {
  readonly total: number;
  readonly running: number;
  readonly blocked: number;
}

/** One listening owner of a required development port. */
export interface HostPortOwnerFact {
  readonly port: number;
  /** Owning process id, when a valid one was reported. */
  readonly pid?: number;
  /** Bounded, semantic process name, when one was available. Never a command line or path. */
  readonly processName?: string;
  /** Whether the owning process is anchored inside the repository root. */
  readonly repositoryOwned: boolean;
}

/** Normalized container-runtime facts. */
export interface HostContainerFacts {
  readonly available: boolean;
  readonly running: number;
  readonly stopped: number;
  readonly images: number;
  /** Approved repository container names present on the host, sorted and de-duplicated. */
  readonly repositoryContainers: readonly string[];
}

/** Normalized network facts, without interface identity or address data. */
export interface HostNetworkFacts {
  /** Operational state of the `net` entry whose `default` field is true; omitted when none exists. */
  readonly defaultInterfaceOperational?: boolean;
  /** Non-negative internet latency, when finitely reported. */
  readonly latencyMs?: number;
}

/** Deterministic, redacted projection of a `systeminformation` aggregate result. */
export interface HostFacts {
  readonly os: HostOsFacts;
  readonly cpu: HostCpuFacts;
  readonly memory: HostMemoryFacts;
  readonly load: HostLoadFacts;
  readonly filesystems: readonly HostFilesystemFact[];
  readonly processes: HostProcessFacts;
  readonly portOwners: readonly HostPortOwnerFact[];
  readonly containers: HostContainerFacts;
  readonly network: HostNetworkFacts;
}

/** Trusted, repository-owned inputs the projection needs but never returns verbatim. */
export interface SystemInformationProjectionInput {
  /** Absolute repository root, used only for path-boundary comparisons; never returned. */
  readonly repositoryRoot: string;
  /** Required TCP ports to correlate to listening owners. */
  readonly requiredPorts: readonly number[];
  /** Exact approved container names that may appear in {@link HostContainerFacts.repositoryContainers}. */
  readonly repositoryContainerNames: ReadonlySet<string>;
}

/** Reports a malformed required host structure or invalid input. Never echoes source values. */
class SystemInformationProjectionError extends Error {}

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Upper bound on a projected process name. */
const MAX_PROCESS_NAME_LENGTH = 128;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function requireString(record: UnknownRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new SystemInformationProjectionError(`Host ${context} is missing a valid '${key}'.`);
  }
  return value;
}

function requireBoolean(record: UnknownRecord, key: string, context: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new SystemInformationProjectionError(`Host ${context} is missing a valid '${key}'.`);
  }
  return value;
}

function requireFiniteNonNegative(record: UnknownRecord, key: string, context: string): number {
  const value = record[key];
  if (!isFiniteNonNegative(value)) {
    throw new SystemInformationProjectionError(`Host ${context} has an invalid '${key}'.`);
  }
  return value;
}

function requireNonNegativeInteger(record: UnknownRecord, key: string, context: string): number {
  const value = record[key];
  if (!isNonNegativeInteger(value)) {
    throw new SystemInformationProjectionError(`Host ${context} has an invalid '${key}'.`);
  }
  return value;
}

function requireRecord(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new SystemInformationProjectionError(`Host ${context} is missing or malformed.`);
  }
  return value;
}

function requireArray(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new SystemInformationProjectionError(`Host ${context} is missing or malformed.`);
  }
  return value;
}

// ============================================================================
// Path-boundary comparison (internal use only; no path string is ever returned)
// ============================================================================

function isWindowsStyle(path: string): boolean {
  return /^[A-Za-z]:/.test(path.replace(/\\/g, "/")) || path.includes("\\");
}

function toComparablePath(path: string, caseInsensitive: boolean): string {
  let normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.length > 1) {
    normalized = normalized.replace(/\/$/, "");
  }
  return caseInsensitive ? normalized.toLowerCase() : normalized;
}

/**
 * Determines whether `root` lies within `parent` along a path boundary, using case-insensitive
 * comparison for Windows-style paths.
 *
 * @param parent - Candidate containing path (for example a mount point).
 * @param root - Repository root path.
 * @returns True when `root` equals `parent` or is nested beneath it.
 */
function pathBoundaryContains(parent: string, root: string): boolean {
  const caseInsensitive = isWindowsStyle(parent) || isWindowsStyle(root);
  const normalizedParent = toComparablePath(parent, caseInsensitive);
  const normalizedRoot = toComparablePath(root, caseInsensitive);
  if (normalizedParent === "") {
    return false;
  }
  if (normalizedParent === normalizedRoot) {
    return true;
  }
  const prefix = normalizedParent.endsWith("/") ? normalizedParent : `${normalizedParent}/`;
  return normalizedRoot.startsWith(prefix);
}

const PATH_BOUNDARY_CHARACTERS: ReadonlySet<string> = new Set(["/", " ", "\t", '"', "'"]);

/**
 * Determines whether `haystack` references `root` as a path-bounded token, using case-insensitive
 * comparison for Windows-style paths. Used internally to classify repository ownership from a
 * process path, command line, or arguments string.
 *
 * @param haystack - Process path, command, or params string.
 * @param root - Repository root path.
 * @returns True when the normalized root occurs in the haystack bounded by separators or ends.
 */
function referencesRepositoryRoot(haystack: string, root: string): boolean {
  const caseInsensitive = isWindowsStyle(haystack) || isWindowsStyle(root);
  const normalizedHaystack = toComparablePath(haystack, caseInsensitive);
  const normalizedRoot = toComparablePath(root, caseInsensitive);
  if (normalizedRoot === "") {
    return false;
  }
  let searchFrom = 0;
  for (;;) {
    const matchIndex = normalizedHaystack.indexOf(normalizedRoot, searchFrom);
    if (matchIndex < 0) {
      return false;
    }
    const before = matchIndex === 0 ? undefined : normalizedHaystack[matchIndex - 1];
    const afterIndex = matchIndex + normalizedRoot.length;
    const after = afterIndex >= normalizedHaystack.length ? undefined : normalizedHaystack[afterIndex];
    const beforeOk = before === undefined || PATH_BOUNDARY_CHARACTERS.has(before);
    const afterOk = after === undefined || PATH_BOUNDARY_CHARACTERS.has(after);
    if (beforeOk && afterOk) {
      return true;
    }
    searchFrom = matchIndex + 1;
  }
}

// ============================================================================
// Section projections
// ============================================================================

function projectOs(value: unknown): HostOsFacts {
  const os = requireRecord(value, "os");
  return {
    platform: requireString(os, "platform", "os"),
    distro: requireString(os, "distro", "os"),
    release: requireString(os, "release", "os"),
    arch: requireString(os, "arch", "os"),
  };
}

function projectCpu(value: unknown): HostCpuFacts {
  const cpu = requireRecord(value, "cpu");
  return {
    brand: requireString(cpu, "brand", "cpu"),
    cores: requireNonNegativeInteger(cpu, "cores", "cpu"),
    physicalCores: requireNonNegativeInteger(cpu, "physicalCores", "cpu"),
    virtualization: requireBoolean(cpu, "virtualization", "cpu"),
  };
}

function projectMemory(value: unknown): HostMemoryFacts {
  const mem = requireRecord(value, "mem");
  return {
    totalBytes: requireFiniteNonNegative(mem, "total", "mem"),
    usedBytes: requireFiniteNonNegative(mem, "used", "mem"),
    availableBytes: requireFiniteNonNegative(mem, "available", "mem"),
  };
}

function projectLoad(value: unknown): HostLoadFacts {
  const load = requireRecord(value, "currentLoad");
  return {currentPercent: requireFiniteNonNegative(load, "currentLoad", "currentLoad")};
}

function projectProcesses(value: unknown): HostProcessFacts {
  const processes = requireRecord(value, "processes");
  return {
    total: requireNonNegativeInteger(processes, "all", "processes"),
    running: requireNonNegativeInteger(processes, "running", "processes"),
    blocked: requireNonNegativeInteger(processes, "blocked", "processes"),
  };
}

function projectFilesystems(value: unknown, repositoryRoot: string): readonly HostFilesystemFact[] {
  const entries = requireArray(value, "fsSize");

  const numericEntries = entries.map((entry, index) => {
    const record = requireRecord(entry, `fsSize[${index}]`);
    const mount = record["mount"];
    return {
      sizeBytes: requireFiniteNonNegative(record, "size", `fsSize[${index}]`),
      usedBytes: requireFiniteNonNegative(record, "used", `fsSize[${index}]`),
      availableBytes: requireFiniteNonNegative(record, "available", `fsSize[${index}]`),
      usePercent: requireFiniteNonNegative(record, "use", `fsSize[${index}]`),
      mount: typeof mount === "string" ? mount : undefined,
    };
  });

  let repositoryVolumeIndex = -1;
  let repositoryVolumeMountLength = -1;
  numericEntries.forEach((entry, index) => {
    if (entry.mount === undefined || !pathBoundaryContains(entry.mount, repositoryRoot)) {
      return;
    }
    const mountLength = toComparablePath(entry.mount, isWindowsStyle(entry.mount)).length;
    if (mountLength > repositoryVolumeMountLength) {
      repositoryVolumeMountLength = mountLength;
      repositoryVolumeIndex = index;
    }
  });

  return numericEntries.map((entry, index) => ({
    sizeBytes: entry.sizeBytes,
    usedBytes: entry.usedBytes,
    availableBytes: entry.availableBytes,
    usedPercent: entry.usePercent,
    repositoryVolume: index === repositoryVolumeIndex,
  }));
}

/**
 * Sanitizes a raw semantic name into a bounded, control-character-free basename.
 *
 * @param raw - Raw process/connection name.
 * @returns The bounded basename, or `undefined` when nothing safe remains.
 */
function boundedProcessName(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const withoutControl = [...raw].filter((character) => character.charCodeAt(0) >= 0x20 && character.charCodeAt(0) !== 0x7f).join("");
  const segments = withoutControl.split(/[\\/]/);
  const basename = (segments[segments.length - 1] ?? "").trim();
  if (basename === "") {
    return undefined;
  }
  return basename.slice(0, MAX_PROCESS_NAME_LENGTH);
}

interface ProcessListEntry {
  readonly name?: string;
  readonly anchors: readonly string[];
}

/**
 * Indexes the optional process list by PID, retaining only a semantic name and the path/command/
 * params anchors used internally for repository-ownership classification.
 *
 * @param processesValue - Raw `processes` record.
 * @returns A PID-to-entry map; empty when no usable list is present.
 */
function indexProcessList(processesValue: unknown): ReadonlyMap<number, ProcessListEntry> {
  const index = new Map<number, ProcessListEntry>();
  if (!isRecord(processesValue)) {
    return index;
  }
  const list = processesValue["list"];
  if (!Array.isArray(list)) {
    return index;
  }
  for (const entry of list) {
    if (!isRecord(entry)) {
      continue;
    }
    const pid = entry["pid"];
    if (!isNonNegativeInteger(pid)) {
      continue;
    }
    const anchors: string[] = [];
    for (const key of ["path", "command", "params"] as const) {
      const anchor = entry[key];
      if (typeof anchor === "string" && anchor !== "") {
        anchors.push(anchor);
      }
    }
    const name = entry["name"];
    index.set(pid, {...(typeof name === "string" ? {name} : {}), anchors});
  }
  return index;
}

function isListeningTcp(connection: UnknownRecord): boolean {
  const protocol = connection["protocol"];
  const state = connection["state"];
  const isTcp = typeof protocol === "string" && protocol.toLowerCase().startsWith("tcp");
  const isListening = typeof state === "string" && state.toLowerCase().includes("listen");
  return isTcp && isListening;
}

function parsePort(value: unknown): number | undefined {
  if (isNonNegativeInteger(value)) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return undefined;
}

function projectRequiredPorts(
  connectionsValue: unknown,
  requiredPorts: ReadonlySet<number>,
  processIndex: ReadonlyMap<number, ProcessListEntry>,
  repositoryRoot: string,
): readonly HostPortOwnerFact[] {
  const connections = requireArray(connectionsValue, "networkConnections");
  const owners: HostPortOwnerFact[] = [];
  const seen = new Set<string>();

  for (const connection of connections) {
    if (!isRecord(connection) || !isListeningTcp(connection)) {
      continue;
    }
    const port = parsePort(connection["localPort"]);
    if (port === undefined || !requiredPorts.has(port)) {
      continue;
    }

    const pidValue = connection["pid"];
    const pid = isNonNegativeInteger(pidValue) && pidValue > 0 ? pidValue : undefined;
    const listEntry = pid === undefined ? undefined : processIndex.get(pid);
    const processName = boundedProcessName(listEntry?.name ?? connection["process"]);
    const repositoryOwned = listEntry?.anchors.some((anchor) => referencesRepositoryRoot(anchor, repositoryRoot)) ?? false;

    const key = `${port}\u0000${pid ?? ""}\u0000${processName ?? ""}\u0000${String(repositoryOwned)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    owners.push({
      port,
      ...(pid === undefined ? {} : {pid}),
      ...(processName === undefined ? {} : {processName}),
      repositoryOwned,
    });
  }

  return owners.toSorted(
    (left, right) =>
      left.port - right.port ||
      (left.pid ?? Number.MAX_SAFE_INTEGER) - (right.pid ?? Number.MAX_SAFE_INTEGER) ||
      compareText(left.processName ?? "", right.processName ?? ""),
  );
}

function projectNetwork(netValue: unknown, latencyValue: unknown): HostNetworkFacts {
  let defaultInterfaceOperational: boolean | undefined;
  if (Array.isArray(netValue)) {
    for (const entry of netValue) {
      if (isRecord(entry) && entry["default"] === true) {
        const operstate = entry["operstate"];
        defaultInterfaceOperational = typeof operstate === "string" && operstate.toLowerCase() === "up";
        break;
      }
    }
  }

  const latencyOk = typeof latencyValue === "number" && Number.isFinite(latencyValue) && latencyValue >= 0;
  return {
    ...(defaultInterfaceOperational === undefined ? {} : {defaultInterfaceOperational}),
    ...(latencyOk ? {latencyMs: latencyValue} : {}),
  };
}

function countContainersByState(containers: readonly unknown[], predicate: (state: string) => boolean): number {
  let count = 0;
  for (const container of containers) {
    if (isRecord(container)) {
      const state = container["state"];
      if (typeof state === "string" && predicate(state.toLowerCase())) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * One optional Docker observation composed into the aggregate document.
 *
 * @remarks
 * `present` records whether the aggregate document carried an **own property** for the field, which
 * is deliberately independent of the value. The worker omits the property for a rejected
 * `systeminformation` call and for the known no-engine `dockerInfo` sentinel, and includes it for
 * every other fulfilled result — including a result that is itself `undefined`. Distinguishing
 * presence from value is what lets an explicitly fulfilled `undefined` reach {@link requireRecord}
 * or {@link requireArray} and be rejected instead of being silently read as "not observed".
 */
interface DockerObservation {
  /** Whether the aggregate document carried an own property for this field. */
  readonly present: boolean;
  /** The observed value; meaningful only when `present` is `true`. */
  readonly value: unknown;
}

/**
 * Reads one optional Docker field from the aggregate document by own-property presence.
 *
 * @param document - The untrusted aggregate document.
 * @param key - Docker field name.
 * @returns The presence-tagged observation.
 */
function dockerObservation(document: UnknownRecord, key: string): DockerObservation {
  return {present: Object.hasOwn(document, key), value: document[key]};
}

function projectContainers(
  info: Readonly<DockerObservation>,
  containerList: Readonly<DockerObservation>,
  imageList: Readonly<DockerObservation>,
  approvedNames: ReadonlySet<string>,
): HostContainerFacts {
  const available = info.present || containerList.present || imageList.present;
  if (!available) {
    return {available: false, running: 0, stopped: 0, images: 0, repositoryContainers: []};
  }

  const containers = containerList.present ? requireArray(containerList.value, "dockerContainers") : [];
  const images = imageList.present ? requireArray(imageList.value, "dockerImages") : [];

  let running: number;
  let stopped: number;
  let imageCount: number;

  if (info.present) {
    const dockerInfo = requireRecord(info.value, "dockerInfo");
    running = requireNonNegativeInteger(dockerInfo, "containersRunning", "dockerInfo");
    stopped = requireNonNegativeInteger(dockerInfo, "containersStopped", "dockerInfo");
    imageCount = requireNonNegativeInteger(dockerInfo, "images", "dockerInfo");
  } else {
    running = countContainersByState(containers, (state) => state === "running");
    stopped = countContainersByState(containers, (state) => state !== "running" && state !== "paused");
    imageCount = images.length;
  }

  const repositoryContainers = new Set<string>();
  for (const container of containers) {
    if (isRecord(container)) {
      const name = container["name"];
      if (typeof name === "string" && approvedNames.has(name)) {
        repositoryContainers.add(name);
      }
    }
  }

  return {
    available: true,
    running,
    stopped,
    images: imageCount,
    repositoryContainers: [...repositoryContainers].toSorted(compareText),
  };
}

/**
 * Validates and normalizes the required-port input into a de-duplicated set.
 *
 * @param requiredPorts - Raw required ports.
 * @returns A set of unique valid ports.
 * @throws {@link SystemInformationProjectionError} when a port is not an integer in `1..65535`.
 */
function validateRequiredPorts(requiredPorts: readonly number[]): ReadonlySet<number> {
  const ports = new Set<number>();
  for (const port of requiredPorts) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new SystemInformationProjectionError("A required port is not an integer in the range 1..65535.");
    }
    ports.add(port);
  }
  return ports;
}

/**
 * Projects an untrusted `systeminformation` aggregate value into deterministic {@link HostFacts}.
 *
 * @param value - The raw aggregate result (a `getAllData()` document, optionally augmented with
 * `dockerInfo`, `dockerContainers`, and `dockerImages`). Treated as untrusted.
 * @param input - Trusted repository root, required ports, and approved container names.
 * @returns Deterministic, redacted host facts.
 * @throws {@link SystemInformationProjectionError} when a required structure, number, or the input
 * is malformed. The error never contains a source value.
 */
export function projectSystemInformation(value: unknown, input: Readonly<SystemInformationProjectionInput>): HostFacts {
  if (typeof input.repositoryRoot !== "string" || input.repositoryRoot.trim() === "") {
    throw new SystemInformationProjectionError("The repository root must be a non-empty string.");
  }
  for (const name of input.repositoryContainerNames) {
    if (typeof name !== "string") {
      throw new SystemInformationProjectionError("An approved container name is not a string.");
    }
  }

  const requiredPorts = validateRequiredPorts(input.requiredPorts);
  const approvedNames = input.repositoryContainerNames;
  const root = input.repositoryRoot;

  const document = requireRecord(value, "aggregate document");
  const processIndex = indexProcessList(document["processes"]);

  return {
    os: projectOs(document["os"]),
    cpu: projectCpu(document["cpu"]),
    memory: projectMemory(document["mem"]),
    load: projectLoad(document["currentLoad"]),
    filesystems: projectFilesystems(document["fsSize"], root),
    processes: projectProcesses(document["processes"]),
    portOwners: projectRequiredPorts(document["networkConnections"], requiredPorts, processIndex, root),
    containers: projectContainers(
      dockerObservation(document, "dockerInfo"),
      dockerObservation(document, "dockerContainers"),
      dockerObservation(document, "dockerImages"),
      approvedNames,
    ),
    network: projectNetwork(document["net"], document["inetLatency"]),
  };
}
