/**
 * @fileoverview Isolated aggregate inspection provider that runs the broad `envinfo` and
 * `systeminformation` collection inside a dedicated worker process and validates its single JSON
 * document at the parent boundary.
 * @module scripts/inspection/aggregate
 *
 * @remarks
 * This module never imports `envinfo` or `systeminformation`; the worker (`./aggregate-worker.ts`)
 * is the only production boundary that touches those packages. The parent spawns the worker through
 * the shared {@link CommandRunner}, applies a bounded timeout, and treats the worker's stdout as one
 * untrusted JSON document. That document is never cast or returned directly: every outcome and fact
 * is runtime-validated and reconstructed into a fresh, exact copy so an accidental worker-only raw
 * field cannot cross the parent boundary. Spawn/timeout/nonzero failures and malformed documents map
 * to bounded `unavailable`/`invalid` outcomes that never carry stdout, stderr, spawn-error, or source
 * detail. A valid schema-v1 document always yields an outer `available` outcome, preserving each
 * component's usable result even when the other nested outcome is `unavailable` or `invalid`.
 */

import {resolve} from "node:path";
import type {CommandRunner} from "../common/process.ts";
import type {HostContainerFacts, HostCpuFacts, HostFacts, HostFilesystemFact, HostLoadFacts, HostMemoryFacts, HostNetworkFacts, HostOsFacts, HostPortOwnerFact, HostProcessFacts} from "./host.ts";
import type {PackageFact, ToolFact, ToolingFacts} from "./tooling.ts";
import type {InspectionOutcome, InspectionProvider} from "./types.ts";

/** Deterministic aggregate facts: the tooling and host component outcomes, preserved independently. */
export interface AggregateFacts {
  readonly tooling: InspectionOutcome<ToolingFacts>;
  readonly host: InspectionOutcome<HostFacts>;
}

/** The single normalized JSON document the aggregate worker emits on stdout. */
export interface AggregateWorkerDocument {
  readonly schemaVersion: 1;
  readonly tooling: InspectionOutcome<ToolingFacts>;
  readonly host: InspectionOutcome<HostFacts>;
}

/** Bounded parent timeout applied to the aggregate worker invocation. */
export const AGGREGATE_TIMEOUT_MS = 60_000;

/** Dependencies required to create the isolated aggregate inspection provider. */
interface AggregateProviderInput {
  /** Repository root to inspect. */
  readonly root: string;
  /** Shared command runner used to invoke the isolated worker process. */
  readonly runner: CommandRunner;
  /** Monotonic time source used to measure `durationMs`. */
  readonly now: () => number;
}

/** Bounded generic evidence emitted when the worker never started. */
const WORKER_SPAWN_REASON = "The aggregate inspection worker could not be started.";

/** Bounded generic evidence emitted when the worker exceeded the parent timeout. */
const WORKER_TIMEOUT_REASON = "The aggregate inspection worker timed out.";

/** Bounded generic evidence emitted when the worker exited unsuccessfully. */
const WORKER_EXIT_REASON = "The aggregate inspection worker exited unsuccessfully.";

/** Reports a malformed worker document, outcome, or fact model. Never echoes source values. */
class AggregateDocumentError extends Error {}

type UnknownRecord = Readonly<Record<string, unknown>>;

/** Upper bound on any copied string, applied before control-character rejection. */
const MAX_STRING_LENGTH = 8_192;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function requireRecord(value: unknown, context: string): UnknownRecord {
  if (!isRecord(value)) {
    throw new AggregateDocumentError(`The aggregate ${context} is missing or malformed.`);
  }
  return value;
}

function requireArray(value: unknown, context: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new AggregateDocumentError(`The aggregate ${context} is missing or malformed.`);
  }
  return value;
}

function requireBoundedString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.length > MAX_STRING_LENGTH || hasControlCharacter(value)) {
    throw new AggregateDocumentError(`The aggregate ${context} is not a bounded, control-character-free string.`);
  }
  return value;
}

function optionalBoundedString(value: unknown, context: string): string | undefined {
  return value === undefined ? undefined : requireBoundedString(value, context);
}

function requireBoolean(value: unknown, context: string): boolean {
  if (typeof value !== "boolean") {
    throw new AggregateDocumentError(`The aggregate ${context} is not a boolean.`);
  }
  return value;
}

function requireFiniteNonNegative(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AggregateDocumentError(`The aggregate ${context} is not a finite, non-negative number.`);
  }
  return value;
}

function requireNonNegativeInteger(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new AggregateDocumentError(`The aggregate ${context} is not a non-negative integer.`);
  }
  return value;
}

function optionalNonNegativeInteger(value: unknown, context: string): number | undefined {
  return value === undefined ? undefined : requireNonNegativeInteger(value, context);
}

function optionalBoolean(value: unknown, context: string): boolean | undefined {
  return value === undefined ? undefined : requireBoolean(value, context);
}

function optionalFiniteNonNegative(value: unknown, context: string): number | undefined {
  return value === undefined ? undefined : requireFiniteNonNegative(value, context);
}

// ============================================================================
// Tooling fact reconstruction
// ============================================================================

function reconstructToolingSystem(value: unknown): ToolingFacts["system"] {
  const record = requireRecord(value, "tooling system");
  const system: {os?: string; cpu?: string; memory?: string; shellVersion?: string} = {};
  const os = optionalBoundedString(record["os"], "tooling system os");
  if (os !== undefined) {
    system.os = os;
  }
  const cpu = optionalBoundedString(record["cpu"], "tooling system cpu");
  if (cpu !== undefined) {
    system.cpu = cpu;
  }
  const memory = optionalBoundedString(record["memory"], "tooling system memory");
  if (memory !== undefined) {
    system.memory = memory;
  }
  const shellVersion = optionalBoundedString(record["shellVersion"], "tooling system shellVersion");
  if (shellVersion !== undefined) {
    system.shellVersion = shellVersion;
  }
  return system;
}

function reconstructToolFact(value: unknown): ToolFact {
  const record = requireRecord(value, "tool");
  const category = requireBoundedString(record["category"], "tool category");
  const name = requireBoundedString(record["name"], "tool name");
  const found = requireBoolean(record["found"], "tool found");
  const version = optionalBoundedString(record["version"], "tool version");
  return version === undefined ? {category, name, found} : {category, name, found, version};
}

function reconstructPackageFact(value: unknown): PackageFact {
  const record = requireRecord(value, "package");
  const scope = record["scope"];
  if (scope !== "local" && scope !== "global") {
    throw new AggregateDocumentError("The aggregate package scope is not 'local' or 'global'.");
  }
  const name = requireBoundedString(record["name"], "package name");
  const installed = optionalBoundedString(record["installed"], "package installed");
  const wanted = optionalBoundedString(record["wanted"], "package wanted");
  return {
    scope,
    name,
    ...(installed === undefined ? {} : {installed}),
    ...(wanted === undefined ? {} : {wanted}),
  };
}

function reconstructToolingFacts(value: unknown): ToolingFacts {
  const record = requireRecord(value, "tooling facts");
  return {
    system: reconstructToolingSystem(record["system"]),
    tools: requireArray(record["tools"], "tooling tools").map(reconstructToolFact),
    packages: requireArray(record["packages"], "tooling packages").map(reconstructPackageFact),
  };
}

// ============================================================================
// Host fact reconstruction
// ============================================================================

function reconstructHostOs(value: unknown): HostOsFacts {
  const record = requireRecord(value, "host os");
  return {
    platform: requireBoundedString(record["platform"], "host os platform"),
    distro: requireBoundedString(record["distro"], "host os distro"),
    release: requireBoundedString(record["release"], "host os release"),
    arch: requireBoundedString(record["arch"], "host os arch"),
  };
}

function reconstructHostCpu(value: unknown): HostCpuFacts {
  const record = requireRecord(value, "host cpu");
  return {
    brand: requireBoundedString(record["brand"], "host cpu brand"),
    cores: requireNonNegativeInteger(record["cores"], "host cpu cores"),
    physicalCores: requireNonNegativeInteger(record["physicalCores"], "host cpu physicalCores"),
    virtualization: requireBoolean(record["virtualization"], "host cpu virtualization"),
  };
}

function reconstructHostMemory(value: unknown): HostMemoryFacts {
  const record = requireRecord(value, "host memory");
  return {
    totalBytes: requireFiniteNonNegative(record["totalBytes"], "host memory totalBytes"),
    usedBytes: requireFiniteNonNegative(record["usedBytes"], "host memory usedBytes"),
    availableBytes: requireFiniteNonNegative(record["availableBytes"], "host memory availableBytes"),
  };
}

function reconstructHostLoad(value: unknown): HostLoadFacts {
  const record = requireRecord(value, "host load");
  return {currentPercent: requireFiniteNonNegative(record["currentPercent"], "host load currentPercent")};
}

function reconstructHostFilesystem(value: unknown): HostFilesystemFact {
  const record = requireRecord(value, "host filesystem");
  return {
    sizeBytes: requireFiniteNonNegative(record["sizeBytes"], "host filesystem sizeBytes"),
    usedBytes: requireFiniteNonNegative(record["usedBytes"], "host filesystem usedBytes"),
    availableBytes: requireFiniteNonNegative(record["availableBytes"], "host filesystem availableBytes"),
    usedPercent: requireFiniteNonNegative(record["usedPercent"], "host filesystem usedPercent"),
    repositoryVolume: requireBoolean(record["repositoryVolume"], "host filesystem repositoryVolume"),
  };
}

function reconstructHostProcesses(value: unknown): HostProcessFacts {
  const record = requireRecord(value, "host processes");
  return {
    total: requireNonNegativeInteger(record["total"], "host processes total"),
    running: requireNonNegativeInteger(record["running"], "host processes running"),
    blocked: requireNonNegativeInteger(record["blocked"], "host processes blocked"),
  };
}

function reconstructHostPortOwner(value: unknown): HostPortOwnerFact {
  const record = requireRecord(value, "host port owner");
  const port = requireNonNegativeInteger(record["port"], "host port owner port");
  const pid = optionalNonNegativeInteger(record["pid"], "host port owner pid");
  const processName = optionalBoundedString(record["processName"], "host port owner processName");
  const repositoryOwned = requireBoolean(record["repositoryOwned"], "host port owner repositoryOwned");
  return {
    port,
    ...(pid === undefined ? {} : {pid}),
    ...(processName === undefined ? {} : {processName}),
    repositoryOwned,
  };
}

function reconstructHostContainers(value: unknown): HostContainerFacts {
  const record = requireRecord(value, "host containers");
  return {
    available: requireBoolean(record["available"], "host containers available"),
    running: requireNonNegativeInteger(record["running"], "host containers running"),
    stopped: requireNonNegativeInteger(record["stopped"], "host containers stopped"),
    images: requireNonNegativeInteger(record["images"], "host containers images"),
    repositoryContainers: requireArray(record["repositoryContainers"], "host containers repositoryContainers").map((name) =>
      requireBoundedString(name, "host containers repositoryContainers entry"),
    ),
  };
}

function reconstructHostNetwork(value: unknown): HostNetworkFacts {
  const record = requireRecord(value, "host network");
  const defaultInterfaceOperational = optionalBoolean(record["defaultInterfaceOperational"], "host network defaultInterfaceOperational");
  const latencyMs = optionalFiniteNonNegative(record["latencyMs"], "host network latencyMs");
  return {
    ...(defaultInterfaceOperational === undefined ? {} : {defaultInterfaceOperational}),
    ...(latencyMs === undefined ? {} : {latencyMs}),
  };
}

function reconstructHostFacts(value: unknown): HostFacts {
  const record = requireRecord(value, "host facts");
  return {
    os: reconstructHostOs(record["os"]),
    cpu: reconstructHostCpu(record["cpu"]),
    memory: reconstructHostMemory(record["memory"]),
    load: reconstructHostLoad(record["load"]),
    filesystems: requireArray(record["filesystems"], "host filesystems").map(reconstructHostFilesystem),
    processes: reconstructHostProcesses(record["processes"]),
    portOwners: requireArray(record["portOwners"], "host portOwners").map(reconstructHostPortOwner),
    containers: reconstructHostContainers(record["containers"]),
    network: reconstructHostNetwork(record["network"]),
  };
}

// ============================================================================
// Outcome and document reconstruction
// ============================================================================

/**
 * Reconstructs one untrusted {@link InspectionOutcome} into a fresh, exact copy of exactly one of
 * its three variants, discarding every unknown field and rejecting malformed required fields.
 *
 * @param value - Untrusted outcome value from the worker document.
 * @param context - Component label used only in bounded error messages.
 * @param reconstructValue - Reconstructs the `available` variant's fresh fact value.
 * @returns A fresh outcome copy.
 * @throws {@link AggregateDocumentError} when the outcome shape, kind, or duration is malformed.
 */
function reconstructOutcome<T>(value: unknown, context: string, reconstructValue: (value: unknown) => T): InspectionOutcome<T> {
  const record = requireRecord(value, `${context} outcome`);
  const durationMs = requireFiniteNonNegative(record["durationMs"], `${context} outcome durationMs`);
  const kind = record["kind"];

  if (kind === "available") {
    return {kind: "available", value: reconstructValue(record["value"]), durationMs};
  }
  if (kind === "unavailable") {
    return {kind: "unavailable", reason: requireBoundedString(record["reason"], `${context} outcome reason`), durationMs};
  }
  if (kind === "invalid") {
    const issues = requireArray(record["issues"], `${context} outcome issues`).map((issue) =>
      requireBoundedString(issue, `${context} outcome issue`),
    );
    return {kind: "invalid", issues, durationMs};
  }

  throw new AggregateDocumentError(`The aggregate ${context} outcome has an unknown 'kind'.`);
}

/**
 * Runtime-validates and reconstructs the untrusted worker document into fresh {@link AggregateFacts}.
 *
 * @param value - Already-parsed, untrusted worker JSON document.
 * @returns Fresh aggregate facts with independently reconstructed tooling and host outcomes.
 * @throws {@link AggregateDocumentError} when the schema version, an outcome, or a fact model is
 * malformed. The error never contains a source value.
 */
function reconstructAggregateFacts(value: unknown): AggregateFacts {
  const record = requireRecord(value, "worker document");
  if (record["schemaVersion"] !== 1) {
    throw new AggregateDocumentError("The aggregate worker document has an unsupported schema version.");
  }
  return {
    tooling: reconstructOutcome(record["tooling"], "tooling", reconstructToolingFacts),
    host: reconstructOutcome(record["host"], "host", reconstructHostFacts),
  };
}

/**
 * Creates the isolated aggregate inspection provider.
 *
 * @remarks
 * Each invocation resolves the repository root, runs `aggregate-worker.ts` as a native Node child
 * process with captured output and a {@link AGGREGATE_TIMEOUT_MS} timeout, and maps the result:
 * a spawn failure, timeout, or nonzero exit becomes a bounded outer `unavailable` outcome with no
 * stdout/stderr/spawn-error detail; empty, malformed, multiple-document, wrong-schema, or malformed
 * nested outcome/fact output becomes outer `invalid`; and a validated schema-v1 document becomes
 * outer `available` whose value preserves both reconstructed component outcomes even when one is
 * `unavailable` or `invalid`.
 *
 * @param input - Repository root, shared command runner, and monotonic time source.
 * @returns An {@link InspectionProvider} for {@link AggregateFacts}.
 */
export function createAggregateProvider(input: Readonly<AggregateProviderInput>): InspectionProvider<AggregateFacts> {
  return async (): Promise<InspectionOutcome<AggregateFacts>> => {
    const startedAt = input.now();
    const resolvedRoot = resolve(input.root);
    const resolvedWorkerPath = resolve(resolvedRoot, "scripts", "inspection", "aggregate-worker.ts");

    const result = await input.runner.run(
      {command: process.execPath, args: [resolvedWorkerPath, resolvedRoot]},
      {cwd: resolvedRoot, output: "capture", timeoutMs: AGGREGATE_TIMEOUT_MS},
    );

    const durationMs = Math.max(0, input.now() - startedAt);

    if (result.spawnError !== undefined) {
      return {kind: "unavailable", reason: WORKER_SPAWN_REASON, durationMs};
    }
    if (result.timedOut) {
      return {kind: "unavailable", reason: WORKER_TIMEOUT_REASON, durationMs};
    }
    if (result.code !== 0) {
      return {kind: "unavailable", reason: WORKER_EXIT_REASON, durationMs};
    }

    let parsedDocument: unknown;
    try {
      parsedDocument = JSON.parse(result.stdout.trim());
    } catch {
      return {kind: "invalid", issues: ["The aggregate worker did not emit a single valid JSON document."], durationMs};
    }

    try {
      const facts = reconstructAggregateFacts(parsedDocument);
      return {kind: "available", value: facts, durationMs};
    } catch (error: unknown) {
      const message = error instanceof AggregateDocumentError ? error.message : "The aggregate worker document did not match the expected schema.";
      return {kind: "invalid", issues: [message], durationMs};
    }
  };
}
