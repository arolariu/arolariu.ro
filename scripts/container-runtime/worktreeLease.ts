/**
 * @fileoverview Private worktree registry and loopback port allocation.
 * @module scripts/container-runtime/worktreeLease
 */

import {Context, Data, Effect, Result} from "effect";
import {createHash, randomBytes} from "node:crypto";
import {join} from "node:path";

import {
  acquireRegistryLock,
  closeWorktreePorts,
  listRegistryDirectory,
  makeRegistryDirectory,
  publishRegistryText,
  readRegistryText,
  registryEntryExists,
  replaceRegistryText,
  reserveWorktreeLoopbackPort,
  worktreeDirectory,
  worktreeFileError,
  worktreeIO,
  worktreePathKey,
  type WorktreePortReservation,
} from "../platform/WorktreeHost.ts";
import type {ContainerEngine} from "./types.ts";
import type {WorktreeCheckout} from "./worktreePreflight.ts";

/** Both persisted authority records use this schema, within the existing protected registry route. */
export const worktreeLaunchVersion = 4;

/** Named host-side ports; these are reservations, not an observation of service health. */
export const worktreePortNames = [
  "dashboardHttps",
  "dashboardHttp",
  "dashboardOtlpGrpc",
  "dashboardOtlpHttp",
  "resourceService",
  "website",
  "api",
  "exp",
  "cv",
  "docs",
  "status",
  "localIdentity",
  "sql",
  "cosmos",
  "cosmosDataExplorer",
  "cosmosReadiness",
  "azuriteBlob",
  "azuriteQueue",
  "azuriteTable",
  "redis",
] as const;

/** Named scoped host ports. */
export type WorktreePorts = Readonly<Record<(typeof worktreePortNames)[number], number>>;
/** Names only: claiming a lease does not create or adopt these volumes. */
export type WorktreeVolumes = Readonly<Record<"sql" | "cosmos" | "azurite" | "redis", string>>;

/** An OS process observation, never a standalone authorization to terminate a process. */
export interface WorktreeProcessIdentity {
  readonly pid: number;
  readonly started: string;
  readonly image: string;
}

/** A container observed on the pinned engine, by full ID along with exact ownership labels. */
export interface WorktreeContainerIdentity {
  readonly id: string;
  readonly scopeId: string;
  readonly runId: string;
}

/** Persisted ownership of one attempt. A partial or pending record is not readiness. */
export interface WorktreeLease {
  readonly scopeId: string;
  readonly runId: string;
  readonly root: string;
  readonly commonGitDir: string;
  readonly branch: string;
  readonly head: string;
  readonly engine: ContainerEngine;
  readonly engineId: string;
  readonly phase: "reserved" | "pending" | "partial" | "owned";
  readonly mode: "aspire" | "fixture";
  readonly ports: WorktreePorts;
  readonly volumes: WorktreeVolumes;
  readonly processIdentity?: WorktreeProcessIdentity;
  readonly resourceOwnership?: readonly {readonly id: string}[];
}

/** Local-only capabilities. Container management is disabled until an exact-ID adapter is supplied. */
export interface WorktreeLaunchPlatform {
  readonly registry: (create: boolean) => Effect.Effect<string | null, unknown>;
  readonly checkout: Effect.Effect<WorktreeCheckout | undefined>;
  readonly engineKind?: ContainerEngine;
  readonly engine: Effect.Effect<string | undefined>;
  readonly candidatePort: () => number;
  readonly processIdentity: (pid: number) => Effect.Effect<WorktreeProcessIdentity | null, unknown>;
  readonly containers?: {
    // Must positively prove dispatch ended and the complete run inventory on the pinned engine.
    // A list of caller-supplied IDs, or failing to find a container, is not dispatch evidence.
    readonly verifyCompleteDispatch: (
      run: Pick<WorktreeLease, "engineId" | "scopeId" | "runId">,
      supervisor: WorktreeProcessIdentity,
      journal: readonly {readonly id: string}[],
    ) => Promise<boolean>;
    readonly inspect: (engineId: string, id: string) => Promise<WorktreeContainerIdentity | null>;
    // Implementations must pin the same engine and verify identity/labels again at the operation.
    // No volume or name-based operation is part of this interface.
    readonly removeExact: (engineId: string, owned: WorktreeContainerIdentity) => Promise<void>;
  };
}

/** Injectable OS and pinned-engine boundary for scoped lifecycle operations. */
export class WorktreePlatform extends Context.Service<WorktreePlatform, WorktreeLaunchPlatform>()("arolariu/scripts/WorktreePlatform") {}

/** Safe error projection (no raw paths, command lines, or OS output). */
export class WorktreeLaunchError extends Data.TaggedError("WorktreeLaunchError")<{
  readonly message: string;
}> {}

const scopePattern = /^[a-f0-9]{32}$/u;
const idPattern = /^[a-f0-9]{64}$/u;
const maxRegistryScopes = 512;
const maxFileSize = 64 * 1024;
const maxAttempts = 128;

/** A generated run ID, usable as a refusal guard but never as launch or stop authority. */
export function isWorktreeRunId(value: string): boolean {
  return scopePattern.test(value);
}

/** Checks unredirected canonical path equality (Windows file names are case-insensitive here). */
export function sameWorktreePath(left: string, right: string): boolean {
  return worktreePathKey(left) === worktreePathKey(right);
}

function scopeFor(checkout: Pick<WorktreeCheckout, "root" | "commonGitDir">): string {
  const parts = [checkout.root, checkout.commonGitDir].map(worktreePathKey);
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

function volumesFor(scope: string): WorktreeVolumes {
  const prefix = `arolariu-wt-${scope}`;
  return {
    sql: `${prefix}-sql-16.0.4305.5`,
    cosmos: `${prefix}-cosmos-en20261008`,
    azurite: `${prefix}-azurite-3.35.0`,
    redis: `${prefix}-redis-8.6.3`,
  };
}

/** Narrows a JSON object read from a private registry file. */
export function worktreeRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrows a bounded immutable process identity. */
export function isWorktreeProcessIdentity(value: unknown): value is WorktreeProcessIdentity {
  return (
    worktreeRecord(value)
    && typeof value["pid"] === "number"
    && Number.isSafeInteger(value["pid"])
    && value["pid"] > 0
    && value["pid"] <= 0xffff_ffff
    && typeof value["started"] === "string"
    && /^\d{15,20}$/u.test(value["started"])
    && typeof value["image"] === "string"
    && value["image"].length > 0
    && value["image"].length < 1024
  );
}

/** Matches PID, immutable OS creation ticks and executable. */
export function sameWorktreeProcess(expected: WorktreeProcessIdentity, observed: WorktreeProcessIdentity | null): boolean {
  return (
    observed !== null
    && expected.pid === observed.pid
    && expected.started === observed.started
    && sameWorktreePath(expected.image, observed.image)
  );
}

/** Checks a full named non-overlapping IPv4 loopback port allocation. */
export function isWorktreePorts(value: unknown): value is WorktreePorts {
  return (
    worktreeRecord(value)
    && Object.keys(value).length === worktreePortNames.length
    && worktreePortNames.every(
      (name) => typeof value[name] === "number" && Number.isInteger(value[name]) && value[name] >= 1024 && value[name] <= 65535,
    )
    && new Set(Object.values(value)).size === worktreePortNames.length
  );
}

/** Validates the bounded list of full IDs, not names or abbreviated IDs. */
export function isWorktreeResourceOwnership(value: unknown): value is NonNullable<WorktreeLease["resourceOwnership"]> {
  return (
    Array.isArray(value)
    && value.length <= 16
    && value.every((entry: unknown) => worktreeRecord(entry) && typeof entry["id"] === "string" && idPattern.test(entry["id"]))
    && new Set(value.map(({id}: {id: string}) => id)).size === value.length
  );
}

function decodeLease(value: unknown, scope: string): WorktreeLease {
  if (!worktreeRecord(value)) throw new Error("Invalid lease");
  const {
    scopeId,
    runId,
    root,
    commonGitDir,
    branch,
    head,
    engine,
    engineId,
    phase,
    mode,
    ports,
    volumes,
    processIdentity,
    resourceOwnership,
  } = value;
  if (
    value["version"] !== worktreeLaunchVersion
    || scopeId !== scope
    || typeof root !== "string"
    || typeof commonGitDir !== "string"
    || scopeFor({root, commonGitDir}) !== scope
    || typeof branch !== "string"
    || branch.length === 0
    || branch.length > 1024
    || /\p{Cc}/u.test(branch)
    || typeof head !== "string"
    || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(head)
    || typeof runId !== "string"
    || !isWorktreeRunId(runId)
    || (engine !== "podman" && engine !== "rancher")
    || typeof engineId !== "string"
    || !idPattern.test(engineId)
    || (phase !== "reserved" && phase !== "pending" && phase !== "partial" && phase !== "owned")
    || (mode !== "aspire" && mode !== "fixture")
    || !isWorktreePorts(ports)
    || (processIdentity !== undefined && !isWorktreeProcessIdentity(processIdentity))
    || (resourceOwnership !== undefined && !isWorktreeResourceOwnership(resourceOwnership))
    || ((phase === "owned" || phase === "partial") && processIdentity === undefined)
    || ((phase === "reserved" || phase === "pending") && (processIdentity !== undefined || resourceOwnership !== undefined))
    || (mode === "fixture" && resourceOwnership !== undefined)
    || !worktreeRecord(volumes)
    || Object.entries(volumesFor(scope)).some(([name, expected]) => volumes[name] !== expected)
    || Object.keys(volumes).length !== 4
  )
    throw new Error("Invalid lease");
  return {
    scopeId,
    runId,
    root,
    commonGitDir,
    branch,
    head,
    engine,
    engineId,
    phase,
    mode,
    ports,
    volumes: volumesFor(scope),
    ...(processIdentity === undefined ? {} : {processIdentity}),
    ...(resourceOwnership === undefined ? {} : {resourceOwnership}),
  };
}

/** Projects a descriptor from the current lease, never a caller-supplied set of names or ports. */
export function worktreeDescriptorFor(lease: WorktreeLease) {
  const {root, scopeId, runId, branch, head, engine, ports, volumes, mode} = lease;
  return {
    version: worktreeLaunchVersion,
    root,
    scopeId,
    runId,
    branch,
    head,
    engine,
    mode,
    ports,
    volumes,
    loopbackHost: "127.0.0.1",
    // A proposal until an owned native launch verifies browser DNS/TLS.
    websiteOrigin: `https://wt-${scopeId}.localhost:${ports.website}`,
  } as const;
}

const verifyWorktreeDescriptor = Effect.fnUntraced(function* (directory: string, lease: WorktreeLease) {
  const staged = yield* worktreeIO(() => worktreeDirectory(join(directory, lease.runId)));
  if (lease.phase === "reserved") {
    // A crash can leave an exclusive stage before the pending lease is published.
    if (staged) return yield* Effect.fail(new Error("Reserved run already has a stage"));
    return;
  }
  if (!staged) return yield* Effect.fail(new Error("Missing worktree stage"));
  const descriptor = yield* readWorktreeRecord(join(directory, lease.runId, "descriptor.json"), parseWorktreeAuthorityJson);
  const {ports, volumes, ...header} = worktreeDescriptorFor(lease);
  if (
    !worktreeRecord(descriptor)
    || Object.keys(descriptor).length !== Object.keys(header).length + 2
    || Object.entries(header).some(([key, value]) => descriptor[key] !== value)
  )
    return yield* Effect.fail(new Error("Invalid worktree descriptor"));
  const stagedPorts = descriptor["ports"];
  const stagedVolumes = descriptor["volumes"];
  if (
    !isWorktreePorts(stagedPorts)
    || worktreePortNames.some((name) => stagedPorts[name] !== ports[name])
    || !worktreeRecord(stagedVolumes)
    || Object.keys(stagedVolumes).length !== Object.keys(volumes).length
    || Object.entries(volumes).some(([key, value]) => stagedVolumes[key] !== value)
  )
    return yield* Effect.fail(new Error("Worktree descriptor does not match its lease"));
});

/** Reads a bounded, private, single-link record; absent is distinct from invalid. */
export function readWorktreeJson(path: string): Effect.Effect<unknown, unknown> {
  return readWorktreeRecord(path, JSON.parse);
}

/** Checks member names before whole-record parsing can collapse them. Input is bounded by the registry file read. */
function parseWorktreeAuthorityJson(text: string): unknown {
  const objects: (Set<string> | null)[] = [];
  // Consume whole strings (including escapes). A colon after JSON whitespace identifies an object member name.
  const tokens = /"(?:[^"\\]|\\[\s\S])*"([ \t\r\n]*:)?|[{}[\]"]/gu;
  for (const [token, separator] of text.matchAll(tokens)) {
    if (token === "{") objects.push(new Set());
    else if (token === "[") objects.push(null);
    else if (token === "}" || token === "]") objects.pop();
    else if (token === '"') throw new SyntaxError("Invalid registry JSON string");
    else {
      const names = objects.at(-1);
      if (!names || separator === undefined) continue;
      const name = JSON.parse(token.slice(0, -separator.length)) as string;
      if (names.has(name)) throw new SyntaxError("Duplicate property in worktree authority record");
      names.add(name);
    }
  }
  // Native parsing still owns grammar, structure validation, and value decoding.
  return JSON.parse(text);
}

function readWorktreeRecord(path: string, parse: (text: string) => unknown): Effect.Effect<unknown, unknown> {
  return readRegistryText(path, maxFileSize).pipe(
    Effect.flatMap((text) => (text === undefined ? Effect.succeed(undefined) : Effect.try(() => parse(text)))),
  );
}

/** Publishes a record without overwrite or exposing partially written bytes to a reader. */
export async function publishWorktreeJson(path: string, value: unknown): Promise<void> {
  await publishRegistryText(path, JSON.stringify(value));
}

/** Serializes registry mutations. A lock abandoned by a crash is never stolen. */
export function withWorktreeLock<A>(registry: string, action: Effect.Effect<A, unknown>): Effect.Effect<A, unknown> {
  const acquire = worktreeIO(async () => {
    if (!(await worktreeDirectory(registry))) throw new Error("Missing registry");
    return acquireRegistryLock(join(registry, "mutation.lock"));
  });
  return Effect.acquireUseRelease(
    acquire,
    () => action,
    (release) => worktreeIO(release),
  );
}

/** Re-reads authoritative state, never trusting a lease passed by a caller as authority. */
export function readWorktreeLease(registry: string, scope: string): Effect.Effect<WorktreeLease | null, unknown> {
  return Effect.gen(function* () {
    if (!scopePattern.test(scope)) return yield* Effect.fail(new Error("Invalid scope"));
    const directory = join(registry, scope);
    if (!(yield* worktreeIO(() => worktreeDirectory(directory)))) return null;
    const value = yield* readWorktreeRecord(join(directory, "lease.json"), parseWorktreeAuthorityJson);
    if (value === undefined) return null;
    const lease = yield* Effect.try(() => decodeLease(value, scope));
    yield* verifyWorktreeDescriptor(directory, lease);
    return lease;
  });
}

/** Read-only callers avoid reporting snapshots while any mutation is unresolved. */
export function readStableWorktreeLease(registry: string, scope: string): Effect.Effect<WorktreeLease | null, unknown> {
  const verifyUnlocked = worktreeIO(async () => {
    if (await registryEntryExists(join(registry, "mutation.lock"))) throw new Error("Registry is locked");
  });
  return Effect.gen(function* () {
    if (!(yield* worktreeIO(() => worktreeDirectory(registry)))) return yield* Effect.fail(new Error("Missing registry"));
    yield* verifyUnlocked;
    const lease = yield* readWorktreeLease(registry, scope);
    yield* verifyUnlocked;
    return lease;
  });
}

/** Updates the current lease atomically, while the registry mutation lock is held. */
export async function writeWorktreeLease(registry: string, lease: WorktreeLease): Promise<void> {
  const data = {...lease, version: worktreeLaunchVersion};
  decodeLease(data, lease.scopeId);
  const directory = join(registry, lease.scopeId);
  if (!(await worktreeDirectory(directory))) throw new Error("Missing scope");
  const temp = join(directory, `${randomBytes(16).toString("hex")}.tmp`);
  await replaceRegistryText(join(directory, "lease.json"), temp, JSON.stringify(data));
}

const reservePorts = Effect.fnUntraced(function* (
  registry: string,
  scope: string,
  mode: WorktreeLease["mode"],
  candidate: () => number,
  publish: (ports: WorktreePorts, hasBlobBinding: boolean) => Promise<void>,
) {
  const names = yield* worktreeIO(() => listRegistryDirectory(registry));
  if (names.length > maxRegistryScopes + 1) return yield* Effect.fail(new Error("Registry capacity exceeded"));
  const unavailable = new Set<number>();
  const activeBlobPorts = new Map<number, string>();
  const boundBlobPorts = new Map<number, string>();
  let stableBlob: number | undefined;
  for (const name of names.filter((entry) => scopePattern.test(entry))) {
    const directory = join(registry, name);
    if (!(yield* worktreeIO(() => worktreeDirectory(directory)))) return yield* Effect.fail(new Error("Missing scope directory"));
    const binding = yield* readWorktreeRecord(join(directory, "blob-port.json"), parseWorktreeAuthorityJson);
    if (binding !== undefined) {
      const port = worktreeRecord(binding) && binding["scopeId"] === name ? binding["port"] : undefined;
      if (
        typeof port !== "number"
        || !Number.isInteger(port)
        || port < 1024
        || port > 65535
        || !worktreeRecord(binding)
        || Object.keys(binding).length !== 2
        || boundBlobPorts.has(port)
      )
        return yield* Effect.fail(new Error("Invalid or colliding persistent blob port"));
      boundBlobPorts.set(port, name);
      if (name === scope && mode === "aspire") stableBlob = port;
    }
    const lease = yield* readWorktreeLease(registry, name);
    if (lease === null) continue;
    if (lease.mode === "aspire") activeBlobPorts.set(lease.ports.azuriteBlob, name);
    if (lease.mode === "aspire" && binding !== undefined && boundBlobPorts.get(lease.ports.azuriteBlob) !== name) {
      return yield* Effect.fail(new Error("Lease differs from its persistent blob binding"));
    }
    for (const port of Object.values(lease.ports)) {
      if (unavailable.has(port)) return yield* Effect.fail(new Error("Existing scope allocations collide"));
      unavailable.add(port);
    }
  }
  for (const [port, owner] of boundBlobPorts) {
    if (unavailable.has(port) && activeBlobPorts.get(port) !== owner) {
      return yield* Effect.fail(new Error("Persistent blob port overlaps an active lease"));
    }
  }
  for (const port of boundBlobPorts.keys()) unavailable.add(port);
  const sockets: WorktreePortReservation[] = [];
  const allocation: Partial<WorktreePorts> = {};
  let trials = 0;
  yield* Effect.acquireUseRelease(
    Effect.succeed(sockets),
    () =>
      Effect.gen(function* () {
        for (const name of worktreePortNames) {
          if (name === "azuriteBlob" && stableBlob !== undefined) {
            // Persisted scan addresses retain this port. A busy binding cannot be silently renumbered.
            sockets.push(yield* worktreeIO(() => reserveWorktreeLoopbackPort(stableBlob)));
            Object.assign(allocation, {[name]: stableBlob});
            continue;
          }
          for (;;) {
            if (++trials > maxAttempts) return yield* Effect.fail(new Error("No scoped ports available"));
            const opened = yield* Effect.result(worktreeIO(() => reserveWorktreeLoopbackPort(candidate())));
            if (Result.isFailure(opened)) {
              if (worktreeFileError(opened.failure, "EADDRINUSE") || worktreeFileError(opened.failure, "EACCES")) continue;
              return yield* Effect.fail(opened.failure);
            }
            const socket = opened.success;
            if (socket.port < 1024 || unavailable.has(socket.port)) {
              yield* worktreeIO(socket.close);
              continue;
            }
            sockets.push(socket);
            unavailable.add(socket.port);
            Object.assign(allocation, {[name]: socket.port});
            break;
          }
        }
        if (!isWorktreePorts(allocation)) return yield* Effect.fail(new Error("Incomplete port allocation"));
        yield* worktreeIO(() => publish(allocation, stableBlob !== undefined));
      }),
    closeWorktreePorts,
  );
});

/** Runs a bounded registry operation without surfacing paths or raw OS messages. */
export function worktreeOperation<A>(message: string, operation: Effect.Effect<A, unknown>): Effect.Effect<A, WorktreeLaunchError> {
  return operation.pipe(Effect.mapError(() => new WorktreeLaunchError({message})));
}

/** Resolves current scope from fresh canonical checkout evidence, not from an input path or PID. */
export function resolveWorktreeScope(
  expected: Pick<WorktreeCheckout, "root" | "commonGitDir">,
): Effect.Effect<{readonly checkout: WorktreeCheckout; readonly scopeId: string}, WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    const platform = yield* WorktreePlatform;
    const checkout = yield* platform.checkout;
    if (
      checkout === undefined
      || !sameWorktreePath(expected.root, checkout.root)
      || !sameWorktreePath(expected.commonGitDir, checkout.commonGitDir)
    )
      return yield* new WorktreeLaunchError({message: "The current canonical linked checkout does not match."});
    return {checkout, scopeId: scopeFor(checkout)};
  });
}

/** Atomically allocates one scoped lease, with no process or provider ownership claim. */
export function claimWorktreeLaunch(expected: WorktreeCheckout): Effect.Effect<WorktreeLease, WorktreeLaunchError, WorktreePlatform> {
  return claimWorktreeLease(expected, "aspire");
}

/** Shared allocator for the internal synthetic supervisor and future Aspire launcher. */
export function claimWorktreeLease(
  expected: WorktreeCheckout,
  mode: WorktreeLease["mode"],
): Effect.Effect<WorktreeLease, WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    const platform = yield* WorktreePlatform;
    const {checkout, scopeId} = yield* resolveWorktreeScope(expected);
    if (checkout.head !== expected.head || checkout.branch !== expected.branch) {
      return yield* new WorktreeLaunchError({message: "Checkout changed after preflight."});
    }
    const engineId = yield* platform.engine;
    if (!engineId || !idPattern.test(engineId)) return yield* new WorktreeLaunchError({message: "No pinned local engine was verified."});
    return yield* worktreeOperation(
      "Could not reserve this scope; a claim, registry lock, or invalid record may already exist.",
      Effect.gen(function* () {
        const registry = yield* platform.registry(true);
        if (registry === null) return yield* Effect.fail(new Error("Missing registry"));
        return yield* withWorktreeLock(
          registry,
          Effect.gen(function* () {
            if ((yield* readWorktreeLease(registry, scopeId)) !== null) return yield* Effect.fail(new Error("Scope already claimed"));
            const directory = join(registry, scopeId);
            let lease: WorktreeLease | undefined;
            yield* reservePorts(registry, scopeId, mode, platform.candidatePort, async (ports, hasBlobBinding) => {
              if (!(await worktreeDirectory(directory))) await makeRegistryDirectory(directory);
              if (mode === "aspire" && !hasBlobBinding) {
                await publishWorktreeJson(join(directory, "blob-port.json"), {scopeId, port: ports.azuriteBlob});
              }
              lease = {
                scopeId,
                runId: randomBytes(16).toString("hex"),
                root: checkout.root,
                commonGitDir: checkout.commonGitDir,
                branch: checkout.branch,
                head: checkout.head,
                engine: platform.engineKind ?? "podman",
                engineId,
                phase: "reserved",
                mode,
                ports,
                volumes: volumesFor(scopeId),
              };
              await writeWorktreeLease(registry, lease);
            });
            if (!lease) return yield* Effect.fail(new Error("No lease"));
            return lease;
          }),
        );
      }),
    ).pipe(Effect.uninterruptible);
  });
}

/** Reads the current linked checkout's lease without creating any state. */
export function readWorktreeLaunch(expected: WorktreeCheckout): Effect.Effect<WorktreeLease | null, WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    const platform = yield* WorktreePlatform;
    const {scopeId} = yield* resolveWorktreeScope(expected);
    return yield* worktreeOperation(
      "The protected worktree registry could not be read.",
      Effect.gen(function* () {
        const registry = yield* platform.registry(false);
        if (registry === null) return null;
        return yield* readStableWorktreeLease(registry, scopeId);
      }),
    );
  });
}
