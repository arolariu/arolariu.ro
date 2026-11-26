/**
 * @fileoverview Internal TTL-only loopback fixture, not a public start or an AppHost launcher.
 * @module scripts/platform/__fixtures__/worktreeAspire.fixture
 */

import {NodeRuntime} from "@effect/platform-node";
import {Clock, Effect, Exit, Result} from "effect";
import {spawn} from "node:child_process";
import {realpath} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join, resolve} from "node:path";

import {
  beginWorktreeLaunch,
  matchesWorktreeReceipt,
  recordWorktreeOwnership,
  retireWorktreeFixtureCollision,
  sameWorktreePorts,
  worktreeProcessReceipt,
} from "../../container-runtime/worktreeAspire.ts";
import {
  claimWorktreeLease,
  isWorktreeProcessIdentity,
  publishWorktreeJson,
  readWorktreeJson,
  readWorktreeLease,
  sameWorktreePath,
  WorktreeLaunchError,
  type WorktreeLease,
  worktreeOperation,
  WorktreePlatform,
  worktreeRecord,
} from "../../container-runtime/worktreeLease.ts";
import type {WorktreeCheckout} from "../../container-runtime/worktreePreflight.ts";
import {
  closeWorktreePorts,
  listenWorktreePort,
  worktreeDirectory,
  worktreeFileError,
  worktreeIO,
  type WorktreePortReservation,
} from "../WorktreeHost.ts";
import {windowsWorktreeFixtureRegistry, windowsWorktreeProcessIdentity} from "./worktreeWindows.fixture.ts";

/** Synthetic fixture engine marker; the fixture never reads or contacts Podman. */
export const fixtureEngine = "a".repeat(64);
const ttlMs = 90_000;
const modulePath = join(import.meta.dirname, "worktreeAspire.fixture.ts");
const checkoutRoot = resolve(import.meta.dirname, "../../..");

/** Launches only the fixed synthetic supervisor, handing it no executable, command, PID or arbitrary path. */
export function launchWorktreeFixture(
  lease: WorktreeLease,
): Effect.Effect<WorktreeLease | "collision", WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    const platform = yield* WorktreePlatform;
    if (process.platform !== "win32" || lease.mode !== "fixture" || lease.engineId !== fixtureEngine) {
      return yield* new WorktreeLaunchError({message: "Unsupported fixture lease."});
    }
    const stage = yield* beginWorktreeLaunch(lease);
    const proof = yield* worktreeOperation(
      "The loopback fixture did not publish exact bind evidence.",
      Effect.gen(function* () {
        // Only the synthetic child outlives this call, with its own TTL. No production launcher can use this.
        const {pid, image} = yield* worktreeIO(async () => {
          if (!sameWorktreePath(await realpath(modulePath), modulePath) || !sameWorktreePath(lease.root, await realpath(checkoutRoot)))
            throw new Error("Unsupported fixture");
          const image = await realpath(process.execPath);
          const child = spawn(image, [modulePath], {
            cwd: stage.directory,
            detached: true,
            stdio: "ignore",
            windowsHide: true,
            env: {SystemRoot: "C:\\Windows", WINDIR: "C:\\Windows", TEMP: await realpath(tmpdir())},
          });
          await new Promise<void>((resolve, reject) => {
            child.once("spawn", resolve);
            child.once("error", reject);
          });
          child.unref();
          return {pid: child.pid, image};
        });
        const deadline = (yield* Clock.monotonicTimeNanos) + 8_000_000_000n;
        do {
          yield* Effect.sleep("100 millis");
          const observed = yield* readWorktreeJson(join(stage.directory, "process.json"));
          if (observed === undefined) continue;
          if (!worktreeRecord(observed)) return yield* Effect.fail(new Error("Invalid supervisor receipt"));
          const identity = observed["processIdentity"];
          if (
            !isWorktreeProcessIdentity(identity)
            || identity.pid !== pid
            || !sameWorktreePath(identity.image, image)
            || !matchesWorktreeReceipt(observed, lease, identity)
          )
            return yield* Effect.fail(new Error("Unexpected supervisor"));
          if (sameWorktreePorts(lease.ports, observed["boundPorts"])) return {identity, boundPorts: observed["boundPorts"]};
          if (observed["outcome"] !== "bind-conflict") return yield* Effect.fail(new Error("Unknown partial fixture state"));
          // Retry only when the exact child reports collision and has exited; no probing the new occupant.
          do {
            yield* Effect.sleep("100 millis");
            const exit = yield* readWorktreeJson(join(stage.directory, "exit.json"));
            if (matchesWorktreeReceipt(exit, lease, identity) && (yield* platform.processIdentity(identity.pid)) === null)
              return {identity};
          } while ((yield* Clock.monotonicTimeNanos) < deadline);
        } while ((yield* Clock.monotonicTimeNanos) < deadline);
        return yield* Effect.fail(new Error("Fixture timeout"));
      }),
    );
    if (proof.boundPorts === undefined) {
      yield* retireWorktreeFixtureCollision(lease, proof.identity);
      return "collision" as const;
    }
    return yield* recordWorktreeOwnership(lease, {phase: "owned", processIdentity: proof.identity, boundPorts: proof.boundPorts});
  });
}

/** Bounded launcher used by fixture tests and the later controller, never routed from the public CLI. */
export function startWorktreeFixture(checkout: WorktreeCheckout): Effect.Effect<WorktreeLease, WorktreeLaunchError, WorktreePlatform> {
  return Effect.gen(function* () {
    for (let attempt = 0; attempt < 3; attempt++) {
      const lease = yield* claimWorktreeLease(checkout, "fixture");
      const result = yield* launchWorktreeFixture(lease);
      if (result !== "collision") return result;
    }
    return yield* new WorktreeLaunchError({message: "Three confirmed loopback bind collisions."});
  });
}

const permittedRegistry = Effect.fnUntraced(function* (registry: string) {
  const temp = yield* worktreeIO(() => realpath(tmpdir()));
  if (sameWorktreePath(dirname(registry), temp) && /^arolariu-task-3-registry-[a-z0-9]{6}$/iu.test(basename(registry))) {
    return yield* worktreeIO(() => worktreeDirectory(registry));
  }
  const known = yield* windowsWorktreeFixtureRegistry(false);
  return known !== null && sameWorktreePath(known, registry);
});

const supervise = Effect.gen(function* () {
  const directory = process.cwd();
  const scopePath = dirname(directory);
  const registry = dirname(scopePath);
  if (process.argv.length !== 2 || !(yield* permittedRegistry(registry)) || !(yield* worktreeIO(() => worktreeDirectory(directory))))
    return yield* Effect.fail(new Error("Not an owned fixture stage"));
  const lease = yield* readWorktreeLease(registry, basename(scopePath));
  if (
    lease?.mode !== "fixture"
    || lease.phase !== "pending"
    || lease.engineId !== fixtureEngine
    || lease.runId !== basename(directory)
    || !sameWorktreePath(yield* worktreeIO(() => realpath(checkoutRoot)), lease.root)
  )
    return yield* Effect.fail(new Error("Not the pending fixture attempt"));
  const identity = yield* windowsWorktreeProcessIdentity(process.pid);
  if (!identity || !sameWorktreePath(identity.image, yield* worktreeIO(() => realpath(process.execPath)))) {
    return yield* Effect.fail(new Error("No process creation evidence"));
  }
  const receipt = worktreeProcessReceipt(lease, identity);
  const sockets: WorktreePortReservation[] = [];
  let outcome: "bound" | "bind-conflict" = "bound";
  let reason: "ttl" | "stop" | "bind-conflict" = "ttl";
  const deadline = (yield* Clock.monotonicTimeNanos) + BigInt(ttlMs) * 1_000_000n;
  yield* Effect.acquireUseRelease(
    Effect.succeed(sockets),
    () =>
      Effect.gen(function* () {
        for (const port of Object.values(lease.ports)) {
          const opened = yield* Effect.result(
            worktreeIO(() => listenWorktreePort(port)).pipe(
              Effect.tap((socket) =>
                Effect.sync(() => {
                  sockets.push(socket);
                }),
              ),
              Effect.uninterruptible,
            ),
          );
          if (Result.isFailure(opened)) {
            if (!worktreeFileError(opened.failure, "EADDRINUSE") && !worktreeFileError(opened.failure, "EACCES")) {
              return yield* Effect.fail(opened.failure);
            }
            outcome = "bind-conflict";
            reason = "bind-conflict";
            break;
          }
        }
        yield* worktreeIO(() =>
          publishWorktreeJson(join(directory, "process.json"), {
            ...receipt,
            outcome,
            ...(outcome === "bound" ? {boundPorts: lease.ports} : {}),
          }),
        );
        if (outcome === "bound") {
          while ((yield* Clock.monotonicTimeNanos) < deadline) {
            yield* Effect.sleep("100 millis");
            if (matchesWorktreeReceipt(yield* readWorktreeJson(join(directory, "stop.json")), lease, identity)) {
              reason = "stop";
              break;
            }
          }
        }
      }),
    closeWorktreePorts,
  );
  yield* worktreeIO(() => publishWorktreeJson(join(directory, "exit.json"), {...receipt, reason}));
});

if (import.meta.main) {
  // Last-resort exit of this exact synthetic child only, even if a local filesystem call hangs.
  const expiry = setTimeout(() => process.exit(1), ttlMs + 5_000);
  NodeRuntime.runMain(supervise, {
    disableErrorReporting: true,
    teardown: (exit, onExit) => {
      clearTimeout(expiry);
      onExit(Exit.isSuccess(exit) ? 0 : 1);
    },
  });
}
