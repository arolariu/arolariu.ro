/**
 * @fileoverview Scoped worktree lifecycle. Stop is cooperative; no PID-only OS signal is sent.
 * @module scripts/container-runtime/worktreeAspire
 */

import {Clock, Effect} from "effect";
import {join} from "node:path";

import {makeRegistryDirectory, unlinkRegistryEntry, worktreeDirectory, worktreeIO} from "../platform/WorktreeHost.ts";
import {
  isWorktreePorts,
  isWorktreeProcessIdentity,
  isWorktreeResourceOwnership,
  publishWorktreeJson,
  readStableWorktreeLease,
  readWorktreeJson,
  readWorktreeLease,
  resolveWorktreeScope,
  sameWorktreePath,
  sameWorktreeProcess,
  withWorktreeLock,
  WorktreeLaunchError,
  worktreeDescriptorFor,
  type WorktreeContainerIdentity,
  type WorktreeLaunchPlatform,
  type WorktreeLease,
  worktreePortNames,
  worktreeOperation,
  WorktreePlatform,
  type WorktreePorts,
  type WorktreeProcessIdentity,
  worktreeRecord,
  type WorktreeVolumes,
  writeWorktreeLease,
} from "./worktreeLease.ts";
import type {WorktreeCheckout} from "./worktreePreflight.ts";

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

type CurrentOperation<T> = (current: WorktreeLease, registry: string, platform: WorktreeLaunchPlatform) => Effect.Effect<T, unknown>;

function withCurrent<T>(
  lease: WorktreeLease,
  message: string,
  action: CurrentOperation<T>,
): Effect.Effect<T, WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    const {scopeId} = yield* resolveWorktreeScope(lease);
    const platform = yield* WorktreePlatform;
    const engineId = yield* platform.engine;
    return yield* worktreeOperation(
      message,
      Effect.gen(function* () {
        const registry = yield* platform.registry(false);
        if (registry === null) return yield* Effect.fail(new Error("Registry unavailable"));
        return yield* withWorktreeLock(
          registry,
          Effect.gen(function* () {
            const current = yield* readWorktreeLease(registry, scopeId);
            if (
              !current
              || current.runId !== lease.runId
              || current.mode !== lease.mode
              || current.engine !== (platform.engineKind ?? "podman")
              || current.engineId !== engineId
            ) {
              return yield* Effect.fail(new Error("Lease or engine changed"));
            }
            return yield* action(current, registry, platform);
          }),
        );
      }),
    ).pipe(Effect.uninterruptible);
  });
}

function runDirectory(registry: string, lease: WorktreeLease): string {
  return join(registry, lease.scopeId, lease.runId);
}

/** Stages only new files under the owned scope, and fences the lease before any spawn. */
export function beginWorktreeLaunch(lease: WorktreeLease): Effect.Effect<WorktreeStage, WorktreeLaunchError, WorktreePlatform> {
  return withCurrent(
    lease,
    "Could not stage this run in its protected scope.",
    Effect.fnUntraced(function* (current, registry, platform) {
      const checkout = yield* platform.checkout;
      if (checkout?.branch !== current.branch || checkout.head !== current.head) {
        return yield* Effect.fail(new Error("Run revision changed before staging"));
      }
      return yield* worktreeIO(async () => {
        if (current.phase !== "reserved") throw new Error("Run already attempted");
        const directory = runDirectory(registry, current);
        const build = join(directory, "build");
        const runtime = join(directory, "runtime");
        const descriptor = join(directory, "descriptor.json");
        await makeRegistryDirectory(directory); // Exclusive; do not adopt a pre-existing run directory.
        await makeRegistryDirectory(build);
        await makeRegistryDirectory(runtime);
        await publishWorktreeJson(descriptor, worktreeDescriptorFor(current));
        await writeWorktreeLease(registry, {...current, phase: "pending"});
        return {directory, descriptor, build, runtime};
      });
    }),
  );
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

/** Records proven ownership for cleanup even after checkout drift. Handoff checks the revision separately. */
export function recordWorktreeOwnership(
  lease: WorktreeLease,
  proof: WorktreeOwnershipProof,
): Effect.Effect<WorktreeLease, WorktreeLaunchError, WorktreePlatform> {
  return withCurrent(
    lease,
    "Could not prove ownership of this run.",
    Effect.fnUntraced(function* (current, registry, platform) {
      const directory = runDirectory(registry, current);
      if (current.phase !== "pending" || !(yield* worktreeIO(() => worktreeDirectory(directory)))) {
        return yield* Effect.fail(new Error("Run not pending"));
      }
      const {phase, processIdentity, containers} = proof;
      const receipt = yield* readWorktreeJson(join(directory, "process.json"));
      if (
        !isWorktreeProcessIdentity(processIdentity)
        || !matchesWorktreeReceipt(receipt, current, processIdentity)
        || !sameWorktreeProcess(processIdentity, yield* platform.processIdentity(processIdentity.pid))
        || (phase === "owned"
          && (!sameWorktreePorts(current.ports, proof.boundPorts)
            || !worktreeRecord(receipt)
            || !sameWorktreePorts(current.ports, receipt["boundPorts"])))
        || (containers !== undefined && !isWorktreeResourceOwnership(containers))
      )
        return yield* Effect.fail(new Error("Unproven ownership"));
      if (current.mode === "aspire") yield* worktreeIO(() => verifyAspireDispatch(platform, current, processIdentity, containers ?? []));
      const next: WorktreeLease = {
        ...current,
        phase,
        processIdentity,
        ...(containers === undefined ? {} : {resourceOwnership: containers}),
      };
      yield* worktreeIO(() => writeWorktreeLease(registry, next));
      return next;
    }),
  );
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
const stopSupervisor = Effect.fnUntraced(function* (
  current: WorktreeLease,
  directory: string,
  platform: WorktreeLaunchPlatform,
  resumingCleanup = false,
) {
  const expected = current.processIdentity;
  if (!expected) return yield* Effect.fail(new Error("Missing supervisor"));
  const ready = yield* readWorktreeJson(join(directory, "process.json"));
  if (!matchesWorktreeReceipt(ready, current, expected)) return yield* Effect.fail(new Error("No supervisor receipt"));
  if (current.phase === "owned" && (!worktreeRecord(ready) || !sameWorktreePorts(current.ports, ready["boundPorts"]))) {
    return yield* Effect.fail(new Error("Unproven binding"));
  }
  const observed = yield* platform.processIdentity(expected.pid);
  const exitPath = join(directory, "exit.json");
  const acknowledged = readWorktreeJson(exitPath).pipe(
    Effect.map(
      (exit) =>
        matchesWorktreeReceipt(exit, current, expected)
        && worktreeRecord(exit)
        && (exit["reason"] === "stop" || (current.mode === "fixture" && exit["reason"] === "ttl")),
    ),
  );
  if (observed === null && (yield* acknowledged)) return false;
  if (resumingCleanup || !sameWorktreeProcess(expected, observed))
    return yield* Effect.fail(new Error("Process shutdown could not be verified"));
  const path = join(directory, "stop.json");
  const request = yield* readWorktreeJson(path);
  if (request === undefined) yield* worktreeIO(() => publishWorktreeJson(path, worktreeProcessReceipt(current, expected)));
  else if (!matchesWorktreeReceipt(request, current, expected)) return yield* Effect.fail(new Error("Invalid prior stop request"));
  // No signal or PID-based fallback. The exact supervisor verifies the private request and exits itself.
  const deadline = (yield* Clock.monotonicTimeNanos) + 5_000_000_000n;
  do {
    yield* Effect.sleep("100 millis");
    if (!(yield* acknowledged)) continue;
    const remaining = yield* platform.processIdentity(expected.pid);
    if (remaining === null) return true;
    if (!sameWorktreeProcess(expected, remaining)) return yield* Effect.fail(new Error("PID recycled during stop"));
  } while ((yield* Clock.monotonicTimeNanos) < deadline);
  return yield* Effect.fail(new Error("No verified shutdown"));
});

function cleanupReceiptPath(directory: string, id: string): string {
  return join(directory, `cleanup-${id}.json`);
}

const readCleanupProgress = Effect.fnUntraced(function* (
  directory: string,
  run: WorktreeLease,
  supervisor: WorktreeProcessIdentity,
  journal: NonNullable<WorktreeLease["resourceOwnership"]>,
) {
  const completed = new Set<string>();
  for (const {id} of journal) {
    const receipt = yield* readWorktreeJson(cleanupReceiptPath(directory, id));
    if (receipt === undefined) continue;
    if (
      !worktreeRecord(receipt)
      || receipt["version"] !== 1
      || receipt["containerId"] !== id
      || !matchesWorktreeReceipt(receipt, run, supervisor)
    )
      return yield* Effect.fail(new Error("Unverified cleanup receipt"));
    completed.add(id);
  }
  return completed;
});

/** Disposes a proven bind-race attempt without contacting the listener that won the race. */
export function retireWorktreeFixtureCollision(
  lease: WorktreeLease,
  expected: WorktreeProcessIdentity,
): Effect.Effect<void, WorktreeLaunchError, WorktreePlatform> {
  return withCurrent(
    lease,
    "Could not verify the fixture's bind-conflict exit.",
    Effect.fnUntraced(function* (current, registry, platform) {
      if (current.mode !== "fixture" || current.phase !== "pending" || (yield* platform.processIdentity(expected.pid)) !== null) {
        return yield* Effect.fail(new Error("Fixture exit unverified"));
      }
      const directory = runDirectory(registry, current);
      if (!(yield* worktreeIO(() => worktreeDirectory(directory)))) return yield* Effect.fail(new Error("Missing run directory"));
      const proof = yield* readWorktreeJson(join(directory, "process.json"));
      const exit = yield* readWorktreeJson(join(directory, "exit.json"));
      if (
        !matchesWorktreeReceipt(proof, current, expected)
        || !matchesWorktreeReceipt(exit, current, expected)
        || !worktreeRecord(exit)
        || exit["reason"] !== "bind-conflict"
      )
        return yield* Effect.fail(new Error("Exit was not an owned bind conflict"));
      yield* worktreeIO(() => unlinkRegistryEntry(join(registry, current.scopeId, "lease.json")));
    }),
  );
}

/** Verifies identity before stop, without claiming (or probing) graph health. */
export function inspectWorktreeLaunch(lease: WorktreeLease): Effect.Effect<"reserved" | "owned" | "blocked", never, WorktreePlatform> {
  return Effect.gen(function* () {
    const {scopeId} = yield* resolveWorktreeScope(lease);
    const platform = yield* WorktreePlatform;
    const engineId = yield* platform.engine;
    return yield* worktreeOperation(
      "Process ownership unavailable.",
      Effect.gen(function* () {
        const registry = yield* platform.registry(false);
        const current = registry === null ? null : yield* readStableWorktreeLease(registry, scopeId);
        if (
          registry === null
          || !current
          || current.runId !== lease.runId
          || current.mode !== lease.mode
          || current.engine !== (platform.engineKind ?? "podman")
          || current.engineId !== engineId
        ) {
          return "blocked" as const;
        }
        if (current.phase === "reserved") return "reserved" as const;
        const expected = current.processIdentity;
        if (current.phase !== "owned" || !expected) return "blocked" as const;
        return (yield* verifyLiveSupervisor(platform, current, expected, runDirectory(registry, current)))
          ? ("owned" as const)
          : ("blocked" as const);
      }),
    );
  }).pipe(Effect.orElseSucceed(() => "blocked" as const));
}

const verifyLiveSupervisor = Effect.fnUntraced(function* (
  platform: WorktreeLaunchPlatform,
  current: WorktreeLease,
  expected: WorktreeProcessIdentity,
  directory: string,
) {
  if (!(yield* worktreeIO(() => worktreeDirectory(directory)))) return false;
  const ready = yield* readWorktreeJson(join(directory, "process.json"));
  if (current.mode === "aspire")
    yield* worktreeIO(() => verifyAspireDispatch(platform, current, expected, current.resourceOwnership ?? []));
  return (
    matchesWorktreeReceipt(ready, current, expected)
    && worktreeRecord(ready)
    && sameWorktreePorts(current.ports, ready["boundPorts"])
    && sameWorktreeProcess(expected, yield* platform.processIdentity(expected.pid))
  );
});

/** Point-in-time ownership snapshot, not permission to launch or proof of service readiness. */
export type OwnedWorktreeAspire = WorktreeLease & {
  readonly mode: "aspire";
  readonly phase: "owned";
  readonly processIdentity: WorktreeProcessIdentity;
};

function isOwnedAspire(lease: WorktreeLease | null): lease is OwnedWorktreeAspire {
  return lease?.mode === "aspire" && lease.phase === "owned" && lease.processIdentity !== undefined;
}

function sameOwnedAspire(other: WorktreeLease | null, expected: OwnedWorktreeAspire): boolean {
  if (!isOwnedAspire(other)) return false;
  const journal = expected.resourceOwnership ?? [];
  return (
    other.scopeId === expected.scopeId
    && other.runId === expected.runId
    && other.engine === expected.engine
    && other.engineId === expected.engineId
    && sameWorktreePath(other.root, expected.root)
    && sameWorktreePath(other.commonGitDir, expected.commonGitDir)
    && other.branch === expected.branch
    && other.head === expected.head
    && sameWorktreePorts(expected.ports, other.ports)
    && sameWorktreeProcess(expected.processIdentity, other.processIdentity)
    && (other.resourceOwnership?.length ?? 0) === journal.length
    && journal.every(({id}, index) => other.resourceOwnership?.[index]?.id === id)
  );
}

/** Re-observes canonical checkout, pinned engine, lease and live supervisor for internal handoff only. */
export function observeOwnedWorktreeAspire(
  expected: WorktreeCheckout,
  runId: string,
  baseline?: OwnedWorktreeAspire,
): Effect.Effect<OwnedWorktreeAspire | null, never, WorktreePlatform> {
  return Effect.gen(function* () {
    const {scopeId, checkout} = yield* resolveWorktreeScope(expected);
    if (checkout.head !== expected.head || checkout.branch !== expected.branch) return null;
    const platform = yield* WorktreePlatform;
    const engineId = yield* platform.engine;
    return yield* worktreeOperation(
      "Worktree handoff ownership unavailable.",
      Effect.gen(function* () {
        const registry = yield* platform.registry(false);
        if (!registry) return null;
        const current = yield* readStableWorktreeLease(registry, scopeId);
        if (
          !isOwnedAspire(current)
          || current.runId !== runId
          || current.branch !== checkout.branch
          || current.head !== checkout.head
          || current.engine !== (platform.engineKind ?? "podman")
          || current.engineId !== engineId
          || (baseline && !sameOwnedAspire(current, baseline))
        )
          return null;
        const directory = runDirectory(registry, current);
        if (
          !(yield* verifyLiveSupervisor(platform, current, current.processIdentity, directory))
          || (yield* readWorktreeJson(join(directory, "stop.json"))) !== undefined
          || (yield* readWorktreeJson(join(directory, "exit.json"))) !== undefined
        )
          return null;
        return sameOwnedAspire(yield* readStableWorktreeLease(registry, scopeId), current) ? current : null;
      }),
    );
  }).pipe(Effect.orElseSucceed(() => null));
}

/** Stops only the current, pinned, proven run. Invalid or partial unknown state remains fenced. */
export function stopWorktreeLaunch(
  lease: WorktreeLease,
  expectedRunId = lease.runId,
): Effect.Effect<WorktreeStopResult, never, WorktreePlatform> {
  if (lease.runId !== expectedRunId) return Effect.succeed({status: "blocked", reason: "The expected scoped run is not current."});
  return withCurrent<WorktreeStopResult>(
    lease,
    "Ownership or shutdown could not be verified; no uncertain resource was touched.",
    Effect.fnUntraced(function* (current, registry, platform) {
      if (current.phase === "pending") return yield* Effect.fail(new Error("Launch outcome unknown"));
      if (current.phase !== "reserved") {
        const directory = runDirectory(registry, current);
        const supervisor = current.processIdentity;
        if (!supervisor || !(yield* worktreeIO(() => worktreeDirectory(directory)))) {
          return yield* Effect.fail(new Error("Missing owned supervisor"));
        }
        const journal = current.resourceOwnership ?? [];
        if (current.mode === "aspire") {
          const completed = yield* readCleanupProgress(directory, current, supervisor, journal);
          const adapter = yield* worktreeIO(() => verifyAspireDispatch(platform, current, supervisor, journal, completed));
          const stoppedNow = yield* stopSupervisor(current, directory, platform, completed.size > 0);
          for (const {id} of journal) {
            if (completed.has(id)) continue;
            // Entries without receipts were positively observed before verified shutdown.
            const exact = yield* worktreeIO(() => inspectOwnedContainer(adapter, current, id));
            if (exact) {
              yield* worktreeIO(() => adapter.removeExact(current.engineId, exact));
              if ((yield* worktreeIO(() => inspectOwnedContainer(adapter, current, id))) !== null) {
                return yield* Effect.fail(new Error("Container still present"));
              }
            } else if (!stoppedNow) {
              return yield* Effect.fail(new Error("Pending container disappeared without verified cleanup"));
            }
            // Publish under the existing run lock before touching the next container. A lost
            // publication leaves absence unexplained on retry, not a new cleanup authorization.
            yield* worktreeIO(() =>
              publishWorktreeJson(cleanupReceiptPath(directory, id), {
                version: 1,
                containerId: id,
                ...worktreeProcessReceipt(current, supervisor),
              }),
            );
          }
        } else {
          yield* stopSupervisor(current, directory, platform);
        }
      }
      yield* worktreeIO(() => unlinkRegistryEntry(join(registry, current.scopeId, "lease.json")));
      return {status: "stopped", runId: current.runId, preservedVolumes: current.volumes};
    }),
  ).pipe(Effect.catchTag("WorktreeLaunchError", ({message}) => Effect.succeed({status: "blocked", reason: message} as const)));
}
