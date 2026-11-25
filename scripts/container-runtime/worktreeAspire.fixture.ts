/**
 * @fileoverview Internal TTL-only loopback fixture, not a public start or an AppHost launcher.
 * @module scripts/container-runtime/worktreeAspire.fixture
 */

import {Effect} from "effect";
import {spawn} from "node:child_process";
import {realpath} from "node:fs/promises";
import {basename, dirname, join, resolve} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";

import {
  beginWorktreeLaunch,
  matchesWorktreeReceipt,
  recordWorktreeOwnership,
  retireWorktreeFixtureCollision,
  sameWorktreePorts,
  worktreeProcessReceipt,
} from "./worktreeAspire.ts";
import {
  claimWorktreeLease,
  isWorktreeProcessIdentity,
  listenWorktreePort,
  publishWorktreeJson,
  readWorktreeJson,
  readWorktreeLease,
  sameWorktreePath,
  WorktreeLaunchError,
  type WorktreeLease,
  worktreeDirectory,
  worktreeFileError,
  worktreeOperation,
  WorktreePlatform,
  worktreeRecord,
} from "./worktreeLease.ts";
import {windowsWorktreeProcessIdentity, windowsWorktreeRegistry} from "./worktreePlatform.ts";
import type {WorktreeCheckout} from "./worktreePreflight.ts";

/** Synthetic fixture engine marker; the fixture never reads or contacts Podman. */
export const fixtureEngine = "a".repeat(64);
const ttlMs = 90_000;
const modulePath = join(import.meta.dirname, "worktreeAspire.fixture.ts");
const checkoutRoot = resolve(import.meta.dirname, "../..");

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
    const proof = yield* worktreeOperation("The loopback fixture did not publish exact bind evidence.", async () => {
      if (!sameWorktreePath(await realpath(modulePath), modulePath) || !sameWorktreePath(lease.root, await realpath(checkoutRoot)))
        throw new Error("Unsupported fixture");
      const child = spawn(await realpath(process.execPath), [modulePath], {
        cwd: stage.directory,
        detached: true,
        stdio: "ignore",
        windowsHide: true,
        env: {SystemRoot: "C:\\Windows", WINDIR: "C:\\Windows"},
      });
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      const deadline = performance.now() + 8_000;
      do {
        await sleep(100);
        const observed = await readWorktreeJson(join(stage.directory, "process.json"));
        if (observed === undefined) continue;
        if (!worktreeRecord(observed)) throw new Error("Invalid supervisor receipt");
        const identity = observed["processIdentity"];
        if (
          !isWorktreeProcessIdentity(identity)
          || identity.pid !== child.pid
          || !sameWorktreePath(identity.image, await realpath(process.execPath))
          || !matchesWorktreeReceipt(observed, lease, identity)
        )
          throw new Error("Unexpected supervisor");
        if (sameWorktreePorts(lease.ports, observed["boundPorts"])) return {identity, boundPorts: observed["boundPorts"]};
        if (observed["outcome"] !== "bind-conflict") throw new Error("Unknown partial fixture state");
        // Retry only when the exact child reports collision and has exited; no probing the new occupant.
        do {
          await sleep(100);
          const exit = await readWorktreeJson(join(stage.directory, "exit.json"));
          if (matchesWorktreeReceipt(exit, lease, identity) && (await platform.processIdentity(identity.pid)) === null) return {identity};
        } while (performance.now() < deadline);
      } while (performance.now() < deadline);
      throw new Error("Fixture timeout");
    });
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

async function permittedRegistry(registry: string): Promise<boolean> {
  const workDirectory = resolve(checkoutRoot, ".superpowers");
  if (sameWorktreePath(dirname(registry), workDirectory) && /^task-3-registry-[a-z0-9]+$/iu.test(basename(registry))) {
    return (await worktreeDirectory(workDirectory)) && (await worktreeDirectory(registry));
  }
  const known = await windowsWorktreeRegistry(false, "fixture");
  return known !== null && sameWorktreePath(known, registry);
}

async function supervise(): Promise<void> {
  const directory = process.cwd();
  const scopePath = dirname(directory);
  const registry = dirname(scopePath);
  if (process.argv.length !== 2 || !(await permittedRegistry(registry)) || !(await worktreeDirectory(directory)))
    throw new Error("Not an owned fixture stage");
  const lease = await readWorktreeLease(registry, basename(scopePath));
  if (
    lease?.mode !== "fixture"
    || lease.phase !== "pending"
    || lease.engineId !== fixtureEngine
    || lease.runId !== basename(directory)
    || !sameWorktreePath(await realpath(checkoutRoot), lease.root)
  )
    throw new Error("Not the pending fixture attempt");
  const identity = await windowsWorktreeProcessIdentity(process.pid);
  if (!identity || !sameWorktreePath(identity.image, await realpath(process.execPath))) throw new Error("No process creation evidence");
  const receipt = worktreeProcessReceipt(lease, identity);
  const sockets: Awaited<ReturnType<typeof listenWorktreePort>>[] = [];
  let outcome: "bound" | "bind-conflict" = "bound";
  let reason: "ttl" | "stop" | "bind-conflict" = "ttl";
  const deadline = performance.now() + ttlMs;
  try {
    for (const port of Object.values(lease.ports)) {
      try {
        sockets.push(await listenWorktreePort(port));
      } catch (error) {
        if (!worktreeFileError(error, "EADDRINUSE") && !worktreeFileError(error, "EACCES")) throw error;
        outcome = "bind-conflict";
        reason = "bind-conflict";
        break;
      }
    }
    await publishWorktreeJson(join(directory, "process.json"), {
      ...receipt,
      outcome,
      ...(outcome === "bound" ? {boundPorts: lease.ports} : {}),
    });
    if (outcome === "bound") {
      while (performance.now() < deadline) {
        await sleep(100);
        if (matchesWorktreeReceipt(await readWorktreeJson(join(directory, "stop.json")), lease, identity)) {
          reason = "stop";
          break;
        }
      }
    }
  } finally {
    await Promise.all(sockets.map(({close}) => close()));
  }
  await publishWorktreeJson(join(directory, "exit.json"), {...receipt, reason});
}

if (import.meta.main) {
  // Last-resort exit of this exact synthetic child only, even if a local filesystem call hangs.
  const expiry = setTimeout(() => process.exit(1), ttlMs + 5_000);
  try {
    await supervise();
  } catch {
    process.exitCode = 1;
  } finally {
    clearTimeout(expiry);
  }
}
