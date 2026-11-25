/**
 * @fileoverview Private worktree registry and loopback port allocation.
 * @module scripts/container-runtime/worktreeLease
 */

import {Context, Data, Effect} from "effect";
import {createHash, randomBytes} from "node:crypto";
import {link, lstat, mkdir, open, readdir, realpath, rename, unlink, writeFile} from "node:fs/promises";
import {createServer} from "node:net";
import {join, normalize} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";

import type {WorktreeCheckout} from "./worktreePreflight.ts";

/** Both persisted authority records use this schema, within the existing protected registry route. */
export const worktreeLaunchVersion = 2;

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
  readonly registry: (create: boolean) => Promise<string | null>;
  readonly checkout: Effect.Effect<WorktreeCheckout | undefined>;
  readonly engine: Effect.Effect<string | undefined>;
  readonly candidatePort: () => number;
  readonly processIdentity: (pid: number) => Promise<WorktreeProcessIdentity | null>;
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

/** Checks unredirected canonical path equality (Windows file names are case-insensitive here). */
export function sameWorktreePath(left: string, right: string): boolean {
  const normalized = (path: string) => (process.platform === "win32" ? normalize(path).toLowerCase() : normalize(path));
  return normalized(left) === normalized(right);
}

function scopeFor(checkout: Pick<WorktreeCheckout, "root" | "commonGitDir">): string {
  const parts = [checkout.root, checkout.commonGitDir].map((path) => {
    const value = normalize(path);
    return process.platform === "win32" ? value.toLowerCase() : value;
  });
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
  const {scopeId, runId, root, commonGitDir, engineId, phase, mode, ports, volumes, processIdentity, resourceOwnership} = value;
  if (
    value["version"] !== worktreeLaunchVersion
    || scopeId !== scope
    || typeof root !== "string"
    || typeof commonGitDir !== "string"
    || scopeFor({root, commonGitDir}) !== scope
    || typeof runId !== "string"
    || !scopePattern.test(runId)
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
  const {root, scopeId, runId, ports, volumes, mode} = lease;
  return {
    version: worktreeLaunchVersion,
    root,
    scopeId,
    runId,
    mode,
    ports,
    volumes,
    loopbackHost: "127.0.0.1",
    // A proposal until an owned native launch verifies browser DNS/TLS.
    websiteOrigin: `https://wt-${scopeId}.localhost:${ports.website}`,
  } as const;
}

async function verifyWorktreeDescriptor(directory: string, lease: WorktreeLease): Promise<void> {
  const staged = await worktreeDirectory(join(directory, lease.runId));
  if (lease.phase === "reserved") {
    // A crash can leave an exclusive stage before the pending lease is published.
    if (staged) throw new Error("Reserved run already has a stage");
    return;
  }
  if (!staged) throw new Error("Missing worktree stage");
  const descriptor = await readWorktreeJson(join(directory, lease.runId, "descriptor.json"));
  const {ports, volumes, ...header} = worktreeDescriptorFor(lease);
  if (
    !worktreeRecord(descriptor)
    || Object.keys(descriptor).length !== Object.keys(header).length + 2
    || Object.entries(header).some(([key, value]) => descriptor[key] !== value)
  )
    throw new Error("Invalid worktree descriptor");
  const stagedPorts = descriptor["ports"];
  const stagedVolumes = descriptor["volumes"];
  if (
    !isWorktreePorts(stagedPorts)
    || worktreePortNames.some((name) => stagedPorts[name] !== ports[name])
    || !worktreeRecord(stagedVolumes)
    || Object.keys(stagedVolumes).length !== Object.keys(volumes).length
    || Object.entries(volumes).some(([key, value]) => stagedVolumes[key] !== value)
  )
    throw new Error("Worktree descriptor does not match its lease");
}

/** Tests for a specific filesystem error without suppressing other failures. */
export function worktreeFileError(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

/** Verifies a registry directory without traversing a reparse point. */
export async function worktreeDirectory(path: string): Promise<boolean> {
  try {
    const stat = await lstat(path);
    if (!stat.isDirectory() || stat.isSymbolicLink() || !sameWorktreePath(await realpath(path), path))
      throw new Error("Redirected directory");
    return true;
  } catch (error) {
    if (worktreeFileError(error, "ENOENT")) return false;
    throw error;
  }
}

/** Reads a bounded, private, single-link record; absent is distinct from invalid. */
export async function readWorktreeJson(path: string): Promise<unknown> {
  let stat;
  try {
    stat = await lstat(path);
    // Exclusive publications briefly have two links. Do not accept persistent hard links.
    if (stat.nlink === 2) {
      await sleep(20);
      stat = await lstat(path);
    }
  } catch (error) {
    if (worktreeFileError(error, "ENOENT")) return undefined;
    throw error;
  }
  if (!stat.isFile() || stat.nlink !== 1 || stat.size > maxFileSize || !sameWorktreePath(await realpath(path), path)) {
    throw new Error("Invalid registry file");
  }
  const file = await open(path, "r");
  try {
    const bytes = Buffer.alloc(maxFileSize + 1);
    const {bytesRead} = await file.read({buffer: bytes, length: bytes.length});
    if (bytesRead === 0 || bytesRead > maxFileSize || bytesRead !== (await file.stat()).size) throw new Error("Invalid registry file size");
    return JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(bytes.subarray(0, bytesRead)));
  } finally {
    await file.close();
  }
}

/** Publishes a record without overwrite or exposing partially written bytes to a reader. */
export async function publishWorktreeJson(path: string, value: unknown): Promise<void> {
  const temp = `${path}.${randomBytes(16).toString("hex")}.tmp`;
  await writeFile(temp, JSON.stringify(value), {flag: "wx", mode: 0o600});
  try {
    // NTFS hard-link creation is atomic and fails if the destination already exists.
    await link(temp, path);
  } finally {
    await unlink(temp);
  }
}

/** Serializes registry mutations. A lock abandoned by a crash is never stolen. */
export async function withWorktreeLock<A>(registry: string, action: () => Promise<A>): Promise<A> {
  if (!(await worktreeDirectory(registry))) throw new Error("Missing registry");
  const path = join(registry, "mutation.lock");
  const mutex = await open(path, "wx", 0o600);
  try {
    return await action();
  } finally {
    await mutex.close();
    await unlink(path);
  }
}

/** Re-reads authoritative state, never trusting a lease passed by a caller as authority. */
export async function readWorktreeLease(registry: string, scope: string): Promise<WorktreeLease | null> {
  if (!scopePattern.test(scope)) throw new Error("Invalid scope");
  const directory = join(registry, scope);
  if (!(await worktreeDirectory(directory))) return null;
  const value = await readWorktreeJson(join(directory, "lease.json"));
  if (value === undefined) return null;
  const lease = decodeLease(value, scope);
  await verifyWorktreeDescriptor(directory, lease);
  return lease;
}

/** Read-only callers avoid reporting snapshots while any mutation is unresolved. */
export async function readStableWorktreeLease(registry: string, scope: string): Promise<WorktreeLease | null> {
  const verifyUnlocked = async () => {
    try {
      await lstat(join(registry, "mutation.lock"));
      throw new Error("Registry is locked");
    } catch (error) {
      if (!worktreeFileError(error, "ENOENT")) throw error;
    }
  };
  if (!(await worktreeDirectory(registry))) throw new Error("Missing registry");
  await verifyUnlocked();
  const lease = await readWorktreeLease(registry, scope);
  await verifyUnlocked();
  return lease;
}

/** Updates the current lease atomically, while the registry mutation lock is held. */
export async function writeWorktreeLease(registry: string, lease: WorktreeLease): Promise<void> {
  const data = {...lease, version: worktreeLaunchVersion};
  decodeLease(data, lease.scopeId);
  const directory = join(registry, lease.scopeId);
  if (!(await worktreeDirectory(directory))) throw new Error("Missing scope");
  const path = join(directory, "lease.json");
  const temp = join(directory, `${randomBytes(16).toString("hex")}.tmp`);
  await writeFile(temp, JSON.stringify(data), {flag: "wx", mode: 0o600});
  try {
    await rename(temp, path);
  } catch (error) {
    await unlink(temp);
    throw error;
  }
}

/** Opens a TCP reservation on IPv4 loopback only; never identifies or stops another listener. */
export async function listenWorktreePort(port: number): Promise<{readonly port: number; readonly close: () => Promise<void>}> {
  const server = createServer((socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({host: "127.0.0.1", port, exclusive: true}, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Expected loopback port");
  }
  return {
    port: address.port,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

async function reservePorts(registry: string, candidate: () => number, publish: (ports: WorktreePorts) => Promise<void>): Promise<void> {
  const names = await readdir(registry);
  if (names.length > maxRegistryScopes + 1) throw new Error("Registry capacity exceeded");
  const unavailable = new Set<number>();
  for (const name of names.filter((entry) => scopePattern.test(entry))) {
    const lease = await readWorktreeLease(registry, name);
    if (lease === null) continue;
    for (const port of Object.values(lease.ports)) {
      if (unavailable.has(port)) throw new Error("Existing scope allocations collide");
      unavailable.add(port);
    }
  }
  const sockets: Awaited<ReturnType<typeof listenWorktreePort>>[] = [];
  const allocation: Partial<WorktreePorts> = {};
  let trials = 0;
  try {
    for (const name of worktreePortNames) {
      for (;;) {
        if (++trials > maxAttempts) throw new Error("No scoped ports available");
        let socket;
        try {
          socket = await listenWorktreePort(candidate());
        } catch (error) {
          if (worktreeFileError(error, "EADDRINUSE") || worktreeFileError(error, "EACCES")) continue;
          throw error;
        }
        if (socket.port < 1024 || unavailable.has(socket.port)) {
          await socket.close();
          continue;
        }
        sockets.push(socket);
        unavailable.add(socket.port);
        Object.assign(allocation, {[name]: socket.port});
        break;
      }
    }
    if (!isWorktreePorts(allocation)) throw new Error("Incomplete port allocation");
    await publish(allocation);
  } finally {
    await Promise.all(sockets.map(({close}) => close()));
  }
}

/** Runs a bounded registry operation without surfacing paths or raw OS messages. */
export function worktreeOperation<A>(message: string, tryOperation: () => Promise<A>): Effect.Effect<A, WorktreeLaunchError> {
  return Effect.tryPromise({try: tryOperation, catch: () => new WorktreeLaunchError({message})});
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
      async () => {
        const registry = await platform.registry(true);
        if (registry === null) throw new Error("Missing registry");
        return withWorktreeLock(registry, async () => {
          if ((await readWorktreeLease(registry, scopeId)) !== null) throw new Error("Scope already claimed");
          const directory = join(registry, scopeId);
          let lease: WorktreeLease | undefined;
          await reservePorts(registry, platform.candidatePort, async (ports) => {
            if (!(await worktreeDirectory(directory))) await mkdir(directory, {mode: 0o700});
            lease = {
              scopeId,
              runId: randomBytes(16).toString("hex"),
              root: checkout.root,
              commonGitDir: checkout.commonGitDir,
              engineId,
              phase: "reserved",
              mode,
              ports,
              volumes: volumesFor(scopeId),
            };
            await writeWorktreeLease(registry, lease);
          });
          if (!lease) throw new Error("No lease");
          return lease;
        });
      },
    ).pipe(Effect.uninterruptible);
  });
}

/** Reads the current linked checkout's lease without creating any state. */
export function readWorktreeLaunch(expected: WorktreeCheckout): Effect.Effect<WorktreeLease | null, WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    const platform = yield* WorktreePlatform;
    const {scopeId} = yield* resolveWorktreeScope(expected);
    return yield* worktreeOperation("The protected worktree registry could not be read.", async () => {
      const registry = await platform.registry(false);
      if (registry === null) return null;
      return readStableWorktreeLease(registry, scopeId);
    });
  });
}
