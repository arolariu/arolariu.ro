/**
 * @fileoverview Isolated worker command that performs the broad `envinfo` and `systeminformation`
 * collection, projects and redacts it in-process, and emits exactly one normalized JSON document.
 * @module scripts/inspection/aggregate-worker
 *
 * @remarks
 * Invoked as a native Node child process by {@link "./aggregate.ts"}. This worker is the only
 * production boundary that imports and invokes `envinfo` and `systeminformation`. All broad
 * third-party raw data stays in local variables here: it is projected and redacted through the
 * repository-owned projections before anything is emitted, and is never logged, written, returned
 * from the exported collection API, or attached to an error. Package/import/call rejections and
 * invalid projected data become bounded nested outcomes whose text contains only the literal
 * package/projection name and a sanitized error class (for example `TypeError`) — never an error
 * message, stack, path, payload, or command output. The worker emits its single
 * {@link AggregateWorkerDocument} through the command host's JSON presentation and produces no
 * progress, console, package, or raw-error output; an invalid argument list or a top-level
 * collection failure still completes with one normalized schema-v1 document and exit code `0`.
 *
 * Timing and concurrency arrive through the injected runtime: durations come from
 * {@link Clock.monotonicNow} and every concurrent package call runs through the injected
 * {@link TaskScheduler}, so the worker owns no ambient timer or `Promise` combinator.
 */

import {resolve} from "node:path";

import {toJsonValue, type CommandExecutionContext} from "../core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "../core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "../core/command/command-specification.ts";
import type {Clock, TaskScheduler} from "../common/runtime.ts";
import {requiredLocalPorts} from "../container-runtime/preflight.ts";
import type {AggregateWorkerDocument} from "./aggregate.ts";
import {projectSystemInformation, type HostFacts} from "./host.ts";
import {parseEnvinfoJson, type ToolingFacts} from "./tooling.ts";
import type {InspectionOutcome} from "./types.ts";

/** Timing and concurrency capabilities the worker's collection helpers require. */
export interface AggregateWorkerCapabilities {
  /** Monotonic time source used to measure every nested outcome's `durationMs`. */
  readonly clock: Clock;
  /** Deterministic task orchestration used instead of raw `Promise` combinators. */
  readonly tasks: TaskScheduler;
}

/** The single fixed input the aggregate worker accepts. */
export interface AggregateWorkerInput {
  /**
   * Repository roots supplied positionally.
   *
   * @remarks
   * Decoding never rejects a zero-length or multi-entry list: business execution normalizes every
   * invalid shape into the bounded schema-v1 unavailable document instead of a usage diagnostic.
   */
  readonly repositoryRoots: readonly string[];
}

/** Exact approved selfhost container names correlated by the host projection. */
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

/** Minimal, untrusted host-collection surface the worker invokes; every result is treated as `unknown`. */
interface HostCollectionApi {
  readonly getAllData: () => Promise<unknown>;
  readonly dockerInfo: () => Promise<unknown>;
  readonly dockerContainers: (all: boolean) => Promise<unknown>;
  readonly dockerImages: (all: boolean) => Promise<unknown>;
}

/** One labeled component outcome produced by the worker's parallel collection. */
type AggregateComponentResult =
  | {readonly component: "tooling"; readonly outcome: InspectionOutcome<ToolingFacts>}
  | {readonly component: "host"; readonly outcome: InspectionOutcome<HostFacts>};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extracts a sanitized error class name for bounded diagnostics.
 *
 * @param error - Caught value of unknown shape.
 * @returns The error's class name when it is a simple alphanumeric identifier, otherwise `"Error"`.
 * Never returns a message, stack, or any supplied value.
 */
function errorClassName(error: unknown): string {
  if (error instanceof Error && /^[A-Za-z][A-Za-z0-9]*$/u.test(error.name)) {
    return error.name;
  }
  return "Error";
}

function unavailableReason(component: string, error: unknown): string {
  return `${component} was unavailable (${errorClassName(error)}).`;
}

function invalidIssue(component: string, error: unknown): string {
  return `${component} produced invalid data (${errorClassName(error)}).`;
}

function elapsedSince(startedAt: number, clock: Readonly<Clock>): number {
  return Math.max(0, clock.monotonicNow() - startedAt);
}

/**
 * Collects and projects the tooling inventory through `envinfo`.
 *
 * @param clock - Monotonic time source used to measure the nested outcome's duration.
 * @returns A nested tooling outcome: `available` for a successful projection, `invalid` for
 * fulfilled-but-unprojectable output, or `unavailable` for an import/call rejection.
 */
async function collectTooling(clock: Readonly<Clock>): Promise<InspectionOutcome<ToolingFacts>> {
  const startedAt = clock.monotonicNow();

  let serialized: string;
  try {
    const {default: envinfo} = await import("envinfo");
    serialized = await envinfo.cli({all: true, json: true, console: false, duplicates: true, fullTree: true});
  } catch (error: unknown) {
    return {kind: "unavailable", reason: unavailableReason("envinfo", error), durationMs: elapsedSince(startedAt, clock)};
  }

  try {
    const facts = parseEnvinfoJson(serialized);
    return {kind: "available", value: facts, durationMs: elapsedSince(startedAt, clock)};
  } catch (error: unknown) {
    return {kind: "invalid", issues: [invalidIssue("parseEnvinfoJson", error)], durationMs: elapsedSince(startedAt, clock)};
  }
}

/**
 * Imports the untrusted host-collection surface, selecting the CommonJS/ESM default interop value.
 *
 * @returns The host-collection API surface. The result is treated as untrusted; call rejections are
 * handled by the caller.
 */
async function importHostCollectionApi(): Promise<HostCollectionApi> {
  const module: unknown = await import("systeminformation");
  const candidate = isRecord(module) && isRecord(module["default"]) ? module["default"] : module;
  return candidate as HostCollectionApi;
}

/**
 * Own enumerable string keys of the `systeminformation` `dockerInfo()` result record.
 *
 * @remarks
 * Captured live on the supported Podman host, where the call fulfils with this complete key set and
 * every value left `undefined`:
 *
 * ```text
 * dockerInfo isRecord: true
 * dockerInfo ownKeys: 46 allValuesUndefined: true
 * ```
 *
 * The set is compared exactly (order-independent, no missing or extra own key) so that any drift in
 * the `systeminformation` result shape stops matching the sentinel and is projected as `invalid`
 * evidence instead of being silently suppressed.
 */
const NO_ENGINE_DOCKER_INFO_KEYS: ReadonlySet<string> = new Set([
  "architecture",
  "bridgeNfIp6tables",
  "bridgeNfIptables",
  "cgroupDriver",
  "clusterAdvertise",
  "clusterStore",
  "containers",
  "containersPaused",
  "containersRunning",
  "containersStopped",
  "cpuCfsPeriod",
  "cpuCfsQuota",
  "cpuSet",
  "cpuShares",
  "debug",
  "defaultRuntime",
  "dockerRootDir",
  "driver",
  "experimentalBuild",
  "httpProxy",
  "httpsProxy",
  "id",
  "images",
  "initBinary",
  "ipv4Forwarding",
  "isolation",
  "kernelMemory",
  "kernelVersion",
  "labels",
  "liveRestoreEnabled",
  "loggingDriver",
  "memTotal",
  "memoryLimit",
  "nEventsListener",
  "name",
  "ncpu",
  "nfd",
  "ngoroutines",
  "noProxy",
  "oomKillDisable",
  "operatingSystem",
  "osType",
  "productLicense",
  "serverVersion",
  "swapLimit",
  "systemTime",
]);

/**
 * Detects the `systeminformation` "no reachable Docker engine" `dockerInfo` sentinel.
 *
 * @remarks
 * `systeminformation` does not reject when no Docker-compatible socket is reachable: `dockerInfo()`
 * fulfils with its complete result record and leaves every value `undefined`. Because it serializes
 * as `{}`, neither `JSON.stringify` inspection nor an own-key count can distinguish it. Composing
 * it presented an unreachable engine as a malformed Docker record, and the resulting projection
 * throw invalidated the *entire* host outcome — discarding the memory, filesystem, process, and
 * port facts that have nothing to do with Docker.
 *
 * The match is deliberately exact rather than a general "all values are undefined" heuristic: the
 * own key set must equal {@link NO_ENGINE_DOCKER_INFO_KEYS} with no missing or extra key, and every
 * value must be `undefined`. A partial record such as `{containersRunning: undefined}`, an
 * unrelated record such as `{unexpected: undefined}`, and any provider drift that adds or removes a
 * key therefore remain real evidence and still reach `projectSystemInformation`, which rejects them
 * through its existing validators.
 *
 * @param value - Fulfilled `dockerInfo` value of unknown shape.
 * @returns `true` only for a record whose own key set is exactly the captured sentinel key set and
 * whose every own value is `undefined`.
 */
function isNoEngineDockerInfoSentinel(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length !== NO_ENGINE_DOCKER_INFO_KEYS.size) {
    return false;
  }

  return keys.every((key) => NO_ENGINE_DOCKER_INFO_KEYS.has(key) && value[key] === undefined);
}

/**
 * Collects and projects the host inventory through `systeminformation`, degrading Docker gracefully.
 *
 * @remarks
 * The base host collection and each Docker call run through the injected
 * {@link TaskScheduler.allSettled} so a missing Docker daemon never discards fulfilled base host
 * data.
 *
 * The composition contract is **presence-based**, and the host projection reads it with
 * `Object.hasOwn` rather than an `!== undefined` test:
 *
 * - a **rejected** call omits its property entirely;
 * - the captured no-engine `dockerInfo` sentinel (see {@link isNoEngineDockerInfoSentinel}) omits
 *   its property, because it is an absence of evidence rather than Docker evidence;
 * - **every other fulfilled result sets its own property**, including a result whose value is
 *   itself `undefined`, so that explicitly fulfilled `undefined` still reaches the projection's
 *   `requireRecord`/`requireArray` validators and yields `invalid` instead of being read as
 *   "not observed".
 *
 * Fulfilled container and image results are never filtered — an empty list is genuine evidence of
 * zero containers or images, and a wrong-shape list must still reach `requireArray`.
 *
 * @param root - Resolved repository root used only for path-boundary correlation.
 * @param capabilities - Injected clock and task scheduler.
 * @returns A nested host outcome: `available` for a successful projection, `invalid` for
 * fulfilled-but-unprojectable data, or `unavailable` for an import/base-call rejection.
 */
async function collectHost(
  root: string,
  capabilities: Readonly<AggregateWorkerCapabilities>,
): Promise<InspectionOutcome<HostFacts>> {
  const {clock, tasks} = capabilities;
  const startedAt = clock.monotonicNow();

  let api: HostCollectionApi;
  try {
    api = await importHostCollectionApi();
  } catch (error: unknown) {
    return {kind: "unavailable", reason: unavailableReason("systeminformation", error), durationMs: elapsedSince(startedAt, clock)};
  }

  let settled: readonly PromiseSettledResult<unknown>[];
  try {
    settled = await tasks.allSettled<unknown>([
      () => api.getAllData(),
      () => api.dockerInfo(),
      () => api.dockerContainers(true),
      () => api.dockerImages(true),
    ]);
  } catch (error: unknown) {
    return {kind: "unavailable", reason: unavailableReason("systeminformation", error), durationMs: elapsedSince(startedAt, clock)};
  }

  const [baseSettled, infoSettled, containersSettled, imagesSettled] = settled;
  if (baseSettled === undefined || baseSettled.status === "rejected") {
    return {
      kind: "unavailable",
      reason: unavailableReason("systeminformation.getAllData", baseSettled?.status === "rejected" ? baseSettled.reason : undefined),
      durationMs: elapsedSince(startedAt, clock),
    };
  }

  const dockerFields: Record<string, unknown> = {};
  if (infoSettled?.status === "fulfilled" && !isNoEngineDockerInfoSentinel(infoSettled.value)) {
    dockerFields["dockerInfo"] = infoSettled.value;
  }
  if (containersSettled?.status === "fulfilled") {
    dockerFields["dockerContainers"] = containersSettled.value;
  }
  if (imagesSettled?.status === "fulfilled") {
    dockerFields["dockerImages"] = imagesSettled.value;
  }

  const baseValue = baseSettled.value;
  const composed: unknown = isRecord(baseValue) ? {...baseValue, ...dockerFields} : baseValue;

  try {
    const facts = projectSystemInformation(composed, {
      repositoryRoot: root,
      requiredPorts: [...requiredLocalPorts],
      repositoryContainerNames: SELFHOST_CONTAINER_NAMES,
    });
    return {kind: "available", value: facts, durationMs: elapsedSince(startedAt, clock)};
  } catch (error: unknown) {
    return {kind: "invalid", issues: [invalidIssue("projectSystemInformation", error)], durationMs: elapsedSince(startedAt, clock)};
  }
}

/**
 * Collects one complete aggregate worker document, projecting and redacting all raw data in-process.
 *
 * @remarks
 * This is the single root-only export the worker exposes for in-process testing of its package
 * calls. It accepts only the repository root plus injected timing/concurrency capabilities, and
 * never accepts commands, selectors, field lists, or injected package functions. Each component
 * collection catches its own failures, so this function resolves with a normalized document rather
 * than rejecting.
 *
 * @param root - Repository root to inspect. Resolved for path correlation; the working directory is
 * never changed.
 * @param capabilities - Injected clock and task scheduler.
 * @returns The normalized schema-v1 aggregate worker document.
 */
export async function collectAggregateWorkerDocument(
  root: string,
  capabilities: Readonly<AggregateWorkerCapabilities>,
): Promise<AggregateWorkerDocument> {
  const resolvedRoot = resolve(root);
  const [first, second] = await capabilities.tasks.parallel<AggregateComponentResult>([
    async () => ({component: "tooling", outcome: await collectTooling(capabilities.clock)}),
    async () => ({component: "host", outcome: await collectHost(resolvedRoot, capabilities)}),
  ]);

  // `parallel` resolves in input order; the discriminant is checked instead of asserted so the
  // document can never be assembled from a mis-ordered result pair.
  if (first?.component !== "tooling" || second?.component !== "host") {
    throw new Error("The aggregate inspection worker received component results in an unexpected order.");
  }

  return {schemaVersion: 1, tooling: first.outcome, host: second.outcome};
}

/**
 * Builds a normalized schema-v1 document whose components are both bounded `unavailable` outcomes.
 *
 * @param reason - Bounded, generic reason shared by both component outcomes.
 * @returns The normalized failure document.
 */
function normalizedFailureDocument(reason: string): AggregateWorkerDocument {
  return {
    schemaVersion: 1,
    tooling: {kind: "unavailable", reason, durationMs: 0},
    host: {kind: "unavailable", reason, durationMs: 0},
  };
}

/**
 * Validates that exactly one non-empty repository-root argument was supplied.
 *
 * @param repositoryRoots - Decoded positional roots.
 * @returns The single root argument, or `null` when it is missing, empty, or accompanied by extras.
 */
function readSingleRootArgument(repositoryRoots: readonly string[]): string | null {
  if (repositoryRoots.length !== 1) {
    return null;
  }
  const [root] = repositoryRoots;
  if (root === undefined || root.trim() === "") {
    return null;
  }
  return root;
}

/**
 * Runs the worker's business collection: normalizes the decoded argument list, collects the
 * document, and never rejects.
 *
 * @remarks
 * An invalid argument list (zero roots, several roots, or one blank root) short-circuits to a
 * normalized failure document without invoking any package collection, so the parent still receives
 * a bounded schema-v1 document and exit code `0` instead of a Commander usage diagnostic. A
 * collection failure that escapes the per-component handling is normalized the same way, so no
 * uncaught stack, path, or raw error ever reaches stderr.
 *
 * @param context - Owning command context supplying the runtime clock and task scheduler.
 * @param input - Decoded worker input.
 * @returns The normalized schema-v1 document to emit.
 */
async function runAggregateWorker(
  context: Readonly<CommandExecutionContext>,
  input: Readonly<AggregateWorkerInput>,
): Promise<AggregateWorkerDocument> {
  const root = readSingleRootArgument(input.repositoryRoots);
  if (root === null) {
    return normalizedFailureDocument("The aggregate inspection worker received invalid arguments.");
  }

  const {clock, tasks} = context.runtime;
  try {
    return await collectAggregateWorkerDocument(root, {clock, tasks});
  } catch {
    return normalizedFailureDocument("The aggregate inspection worker failed to collect an aggregate report.");
  }
}

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("../adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("inspection-aggregate-worker"));

/**
 * Creates the isolated aggregate inspection worker command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `inspection-aggregate-worker` command object.
 */
export function createAggregateWorkerCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<AggregateWorkerInput, AggregateWorkerDocument, never> {
  return defineCommand<AggregateWorkerInput, AggregateWorkerDocument>(
    {
      name: "inspection-aggregate-worker",
      description: "Emits the normalized aggregate tooling and host report for one repository root.",
      usage: "<repositoryRoot>",
      configure: (program) => {
        program.argument("[repositoryRoots...]", "Repository root to inspect; exactly one is expected.");
      },
      decode: (program) => ({repositoryRoots: [...program.args]}),
      presentation: () => "json",
      execute: runAggregateWorker,
      complete: (document) => ({exitCode: 0, value: document, json: toJsonValue(document)}),
    },
    options,
  );
}

/** Production singleton used by this module's direct entrypoint. */
export const aggregateWorkerCommand: LazyMonorepoCommand<AggregateWorkerInput, AggregateWorkerDocument, never> =
  createAggregateWorkerCommand();

await aggregateWorkerCommand.runIfMain(import.meta.url);
