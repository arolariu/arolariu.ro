/**
 * @fileoverview Scoped worktree lifecycle. Stop is cooperative; no PID-only OS signal is sent.
 * @module scripts/container-runtime/worktreeAspire
 */

import {Effect} from "effect";
import {mkdir, unlink} from "node:fs/promises";
import {join} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";

import {
  isWorktreePorts,
  isWorktreeProcessIdentity,
  isWorktreeResourceOwnership,
  publishWorktreeJson,
  readStableWorktreeLease,
  readWorktreeJson,
  readWorktreeLease,
  resolveWorktreeScope,
  sameWorktreeProcess,
  withWorktreeLock,
  WorktreeLaunchError,
  type WorktreeContainerIdentity,
  type WorktreeLaunchPlatform,
  type WorktreeLease,
  worktreePortNames,
  worktreeDirectory,
  worktreeOperation,
  WorktreePlatform,
  type WorktreePorts,
  type WorktreeProcessIdentity,
  worktreeRecord,
  type WorktreeVolumes,
  writeWorktreeLease,
} from "./worktreeLease.ts";

/** Shutdown never requests deleting volumes or clearing data. */
export type WorktreeStopResult =
  | {readonly status: "stopped"; readonly runId: string; readonly preservedVolumes: WorktreeVolumes}
  | {readonly status: "blocked"; readonly reason: string};

/** A protected descriptor and stage directories, created before any launch attempt. */
export interface WorktreeStage {
  readonly directory: string;
  readonly descriptor: string;
  readonly build: string;
  readonly runtime: string;
}

/** Proof supplied by an internal launch owner, not accepted from CLI flags. */
export type WorktreeOwnershipProof =
  | {
      readonly phase: "owned";
      readonly processIdentity: WorktreeProcessIdentity;
      readonly boundPorts: WorktreePorts;
      readonly containers?: WorktreeLease["resourceOwnership"];
    }
  | {
      readonly phase: "partial";
      readonly processIdentity?: WorktreeProcessIdentity;
      readonly containers?: WorktreeLease["resourceOwnership"];
    };

type CurrentOperation<T> = (current: WorktreeLease, registry: string, platform: WorktreeLaunchPlatform) => Promise<T>;

function withCurrent<T>(
  lease: WorktreeLease,
  message: string,
  action: CurrentOperation<T>,
): Effect.Effect<T, WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    const {scopeId} = yield* resolveWorktreeScope(lease);
    const platform = yield* WorktreePlatform;
    const engineId = yield* platform.engine;
    return yield* worktreeOperation(message, async () => {
      const registry = await platform.registry(false);
      if (registry === null) throw new Error("Registry unavailable");
      return withWorktreeLock(registry, async () => {
        const current = await readWorktreeLease(registry, scopeId);
        if (!current || current.runId !== lease.runId || current.mode !== lease.mode || current.engineId !== engineId) {
          throw new Error("Lease or engine changed");
        }
        return action(current, registry, platform);
      });
    }).pipe(Effect.uninterruptible);
  });
}

function runDirectory(registry: string, lease: WorktreeLease): string {
  return join(registry, lease.scopeId, lease.runId);
}

/** Stages only new files under the owned scope, and fences the lease before any spawn. */
export function beginWorktreeLaunch(lease: WorktreeLease): Effect.Effect<WorktreeStage, WorktreeLaunchError, WorktreePlatform> {
  return withCurrent(lease, "Could not stage this run in its protected scope.", async (current, registry) => {
    if (current.phase !== "reserved") throw new Error("Run already attempted");
    const directory = runDirectory(registry, current);
    const build = join(directory, "build");
    const runtime = join(directory, "runtime");
    const descriptor = join(directory, "descriptor.json");
    await mkdir(directory, {mode: 0o700}); // Exclusive; do not adopt a pre-existing run directory.
    await mkdir(build, {mode: 0o700});
    await mkdir(runtime, {mode: 0o700});
    const {root, scopeId, runId, ports, volumes, mode} = current;
    await publishWorktreeJson(descriptor, {
      version: 1,
      root,
      scopeId,
      runId,
      mode,
      ports,
      volumes,
      loopbackHost: "127.0.0.1",
      // Proposed binding only. Task 4/5 must prove browser/DNS/TLS before publishing any URL.
      websiteOrigin: `https://wt-${scopeId}.localhost:${ports.website}`,
    });
    await writeWorktreeLease(registry, {...current, phase: "pending"});
    return {directory, descriptor, build, runtime};
  });
}

/** Tests that the observed process bound the exact allocation, not just one responding port. */
export function sameWorktreePorts(expected: WorktreePorts, actual: unknown): actual is WorktreePorts {
  return isWorktreePorts(actual) && worktreePortNames.every((name) => expected[name] === actual[name]);
}

type ContainerAdapter = NonNullable<WorktreeLaunchPlatform["containers"]>;

async function inspectOwnedContainer(adapter: ContainerAdapter, run: WorktreeLease, id: string): Promise<WorktreeContainerIdentity | null> {
  const found = await adapter.inspect(run.engineId, id);
  if (found !== null && (!found || found.id !== id || found.scopeId !== run.scopeId || found.runId !== run.runId)) {
    throw new Error("Container ownership mismatch");
  }
  return found;
}

async function verifyAspireDispatch(
  platform: WorktreeLaunchPlatform,
  run: WorktreeLease,
  supervisor: WorktreeProcessIdentity,
  journal: NonNullable<WorktreeLease["resourceOwnership"]>,
  completed?: ReadonlySet<string>,
): Promise<ContainerAdapter> {
  const adapter = platform.containers;
  const {scopeId, runId, engineId} = run;
  if (!adapter || (await adapter.verifyCompleteDispatch({scopeId, runId, engineId}, supervisor, journal)) !== true) {
    throw new Error("Complete pinned dispatch not proven");
  }
  for (const {id} of journal) {
    const absent = (await inspectOwnedContainer(adapter, run, id)) === null;
    if (absent !== (completed?.has(id) === true)) throw new Error("Journal entry disagrees with verified cleanup");
  }
  return adapter;
}

/** Transitions a pending attempt only with fresh supervisor evidence and a complete pinned Aspire journal. */
export function recordWorktreeOwnership(
  lease: WorktreeLease,
  proof: WorktreeOwnershipProof,
): Effect.Effect<WorktreeLease, WorktreeLaunchError, WorktreePlatform> {
  return withCurrent(lease, "Could not prove ownership of this run.", async (current, registry, platform) => {
    const directory = runDirectory(registry, current);
    if (current.phase !== "pending" || !(await worktreeDirectory(directory))) throw new Error("Run not pending");
    const {phase, processIdentity, containers} = proof;
    const receipt = await readWorktreeJson(join(directory, "process.json"));
    if (
      !isWorktreeProcessIdentity(processIdentity)
      || !matchesWorktreeReceipt(receipt, current, processIdentity)
      || !sameWorktreeProcess(processIdentity, await platform.processIdentity(processIdentity.pid))
      || (phase === "owned"
        && (!sameWorktreePorts(current.ports, proof.boundPorts)
          || !worktreeRecord(receipt)
          || !sameWorktreePorts(current.ports, receipt["boundPorts"])))
      || (containers !== undefined && !isWorktreeResourceOwnership(containers))
    )
      throw new Error("Unproven ownership");
    if (current.mode === "aspire") await verifyAspireDispatch(platform, current, processIdentity, containers ?? []);
    const next: WorktreeLease = {
      ...current,
      phase,
      processIdentity,
      ...(containers === undefined ? {} : {resourceOwnership: containers}),
    };
    await writeWorktreeLease(registry, next);
    return next;
  });
}

/** Run-specific protocol shared by the supervisor and controller. Process alone is not authority. */
export function worktreeProcessReceipt(
  lease: Pick<WorktreeLease, "scopeId" | "runId" | "engineId">,
  process: WorktreeProcessIdentity,
): {
  readonly scopeId: string;
  readonly runId: string;
  readonly engineId: string;
  readonly processIdentity: WorktreeProcessIdentity;
} {
  return {scopeId: lease.scopeId, runId: lease.runId, engineId: lease.engineId, processIdentity: process};
}

/** Checks exact run, engine, and immutable process identity on a supervisor receipt. */
export function matchesWorktreeReceipt(
  receipt: unknown,
  lease: Pick<WorktreeLease, "scopeId" | "runId" | "engineId">,
  process: WorktreeProcessIdentity,
): boolean {
  return (
    worktreeRecord(receipt)
    && receipt["scopeId"] === lease.scopeId
    && receipt["runId"] === lease.runId
    && receipt["engineId"] === lease.engineId
    && isWorktreeProcessIdentity(receipt["processIdentity"])
    && sameWorktreeProcess(process, receipt["processIdentity"])
  );
}

// True only when this invocation observes the exact supervisor transition to stopped.
async function stopSupervisor(
  current: WorktreeLease,
  directory: string,
  platform: WorktreeLaunchPlatform,
  resumingCleanup = false,
): Promise<boolean> {
  const expected = current.processIdentity;
  if (!expected) throw new Error("Missing supervisor");
  const ready = await readWorktreeJson(join(directory, "process.json"));
  if (!matchesWorktreeReceipt(ready, current, expected)) throw new Error("No supervisor receipt");
  if (current.phase === "owned" && (!worktreeRecord(ready) || !sameWorktreePorts(current.ports, ready["boundPorts"]))) {
    throw new Error("Unproven binding");
  }
  const observed = await platform.processIdentity(expected.pid);
  const exitPath = join(directory, "exit.json");
  const acknowledged = async () => {
    const exit = await readWorktreeJson(exitPath);
    return (
      matchesWorktreeReceipt(exit, current, expected)
      && worktreeRecord(exit)
      && (exit["reason"] === "stop" || (current.mode === "fixture" && exit["reason"] === "ttl"))
    );
  };
  if (observed === null && (await acknowledged())) return false;
  if (resumingCleanup || !sameWorktreeProcess(expected, observed)) throw new Error("Process shutdown could not be verified");
  const path = join(directory, "stop.json");
  const request = await readWorktreeJson(path);
  if (request === undefined) await publishWorktreeJson(path, worktreeProcessReceipt(current, expected));
  else if (!matchesWorktreeReceipt(request, current, expected)) throw new Error("Invalid prior stop request");
  // No signal or PID-based fallback. The exact supervisor verifies the private request and exits itself.
  const deadline = performance.now() + 5_000;
  do {
    await sleep(100);
    if (!(await acknowledged())) continue;
    const remaining = await platform.processIdentity(expected.pid);
    if (remaining === null) return true;
    if (!sameWorktreeProcess(expected, remaining)) throw new Error("PID recycled during stop");
  } while (performance.now() < deadline);
  throw new Error("No verified shutdown");
}

function cleanupReceiptPath(directory: string, id: string): string {
  return join(directory, `cleanup-${id}.json`);
}

async function readCleanupProgress(
  directory: string,
  run: WorktreeLease,
  supervisor: WorktreeProcessIdentity,
  journal: NonNullable<WorktreeLease["resourceOwnership"]>,
): Promise<ReadonlySet<string>> {
  const completed = new Set<string>();
  for (const {id} of journal) {
    const receipt = await readWorktreeJson(cleanupReceiptPath(directory, id));
    if (receipt === undefined) continue;
    if (
      !worktreeRecord(receipt)
      || receipt["version"] !== 1
      || receipt["containerId"] !== id
      || !matchesWorktreeReceipt(receipt, run, supervisor)
    )
      throw new Error("Unverified cleanup receipt");
    completed.add(id);
  }
  return completed;
}

/** Disposes a proven bind-race attempt without contacting the listener that won the race. */
export function retireWorktreeFixtureCollision(
  lease: WorktreeLease,
  expected: WorktreeProcessIdentity,
): Effect.Effect<void, WorktreeLaunchError, WorktreePlatform> {
  return withCurrent(lease, "Could not verify the fixture's bind-conflict exit.", async (current, registry, platform) => {
    if (current.mode !== "fixture" || current.phase !== "pending" || (await platform.processIdentity(expected.pid)) !== null) {
      throw new Error("Fixture exit unverified");
    }
    const directory = runDirectory(registry, current);
    if (!(await worktreeDirectory(directory))) throw new Error("Missing run directory");
    const proof = await readWorktreeJson(join(directory, "process.json"));
    const exit = await readWorktreeJson(join(directory, "exit.json"));
    if (
      !matchesWorktreeReceipt(proof, current, expected)
      || !matchesWorktreeReceipt(exit, current, expected)
      || !worktreeRecord(exit)
      || exit["reason"] !== "bind-conflict"
    )
      throw new Error("Exit was not an owned bind conflict");
    await unlink(join(registry, current.scopeId, "lease.json"));
  });
}

/** Verifies identity before stop, without claiming (or probing) graph health. */
export function inspectWorktreeLaunch(lease: WorktreeLease): Effect.Effect<"reserved" | "owned" | "blocked", never, WorktreePlatform> {
  return Effect.gen(function* () {
    const {scopeId} = yield* resolveWorktreeScope(lease);
    const platform = yield* WorktreePlatform;
    const engineId = yield* platform.engine;
    return yield* worktreeOperation("Process ownership unavailable.", async () => {
      const registry = await platform.registry(false);
      const current = registry === null ? null : await readStableWorktreeLease(registry, scopeId);
      if (registry === null || !current || current.runId !== lease.runId || current.mode !== lease.mode || current.engineId !== engineId) {
        return "blocked" as const;
      }
      if (current.phase === "reserved") return "reserved" as const;
      const expected = current.processIdentity;
      if (current.phase !== "owned" || !expected) return "blocked" as const;
      const directory = runDirectory(registry, current);
      if (!(await worktreeDirectory(directory))) return "blocked" as const;
      const ready = await readWorktreeJson(join(directory, "process.json"));
      if (current.mode === "aspire") await verifyAspireDispatch(platform, current, expected, current.resourceOwnership ?? []);
      return matchesWorktreeReceipt(ready, current, expected)
        && worktreeRecord(ready)
        && sameWorktreePorts(current.ports, ready["boundPorts"])
        && sameWorktreeProcess(expected, await platform.processIdentity(expected.pid))
        ? ("owned" as const)
        : ("blocked" as const);
    });
  }).pipe(Effect.orElseSucceed(() => "blocked" as const));
}

/** Stops only the current, pinned, proven run. Invalid or partial unknown state remains fenced. */
export function stopWorktreeLaunch(lease: WorktreeLease): Effect.Effect<WorktreeStopResult, never, WorktreePlatform> {
  return withCurrent<WorktreeStopResult>(
    lease,
    "Ownership or shutdown could not be verified; no uncertain resource was touched.",
    async (current, registry, platform) => {
      if (current.phase === "pending") throw new Error("Launch outcome unknown");
      if (current.phase !== "reserved") {
        const directory = runDirectory(registry, current);
        const supervisor = current.processIdentity;
        if (!supervisor || !(await worktreeDirectory(directory))) throw new Error("Missing owned supervisor");
        const journal = current.resourceOwnership ?? [];
        if (current.mode === "aspire") {
          const completed = await readCleanupProgress(directory, current, supervisor, journal);
          const adapter = await verifyAspireDispatch(platform, current, supervisor, journal, completed);
          const stoppedNow = await stopSupervisor(current, directory, platform, completed.size > 0);
          for (const {id} of journal) {
            if (completed.has(id)) continue;
            // Entries without receipts were positively observed before verified shutdown.
            const exact = await inspectOwnedContainer(adapter, current, id);
            if (exact) {
              await adapter.removeExact(current.engineId, exact);
              if ((await inspectOwnedContainer(adapter, current, id)) !== null) throw new Error("Container still present");
            } else if (!stoppedNow) {
              throw new Error("Pending container disappeared without verified cleanup");
            }
            // Publish under the existing run lock before touching the next container. A lost
            // publication leaves absence unexplained on retry, not a new cleanup authorization.
            await publishWorktreeJson(cleanupReceiptPath(directory, id), {
              version: 1,
              containerId: id,
              ...worktreeProcessReceipt(current, supervisor),
            });
          }
        } else {
          await stopSupervisor(current, directory, platform);
        }
      }
      await unlink(join(registry, current.scopeId, "lease.json"));
      return {status: "stopped", runId: current.runId, preservedVolumes: current.volumes};
    },
  ).pipe(Effect.catchTag("WorktreeLaunchError", ({message}) => Effect.succeed({status: "blocked", reason: message} as const)));
}
