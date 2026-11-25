// @vitest-environment node
import {Effect} from "effect";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {makeNodeLayer} from "../platform/layers.ts";
import {fixtureEngine, launchWorktreeFixture, startWorktreeFixture} from "./worktreeAspire.fixture.ts";
import {
  beginWorktreeLaunch,
  inspectWorktreeLaunch,
  recordWorktreeOwnership,
  stopWorktreeLaunch,
  worktreeProcessReceipt,
} from "./worktreeAspire.ts";
import {leaseFixture} from "./worktreeLease.testing.ts";
import {
  claimWorktreeLaunch,
  claimWorktreeLease,
  listenWorktreePort,
  publishWorktreeJson,
  readWorktreeJson,
  readWorktreeLaunch,
  type WorktreeLaunchPlatform,
  WorktreePlatform,
  type WorktreeLease,
} from "./worktreeLease.ts";
import {windowsWorktreeProcessIdentity, windowsWorktreeRegistry} from "./worktreePlatform.ts";
import {observeWorktreeCheckout} from "./worktreePreflight.ts";

const processIdentity = {pid: 12345, started: "639312345678900000", image: "C:\\runtime\\node.exe"};
const container = {id: "b".repeat(64)};

describe("worktree Aspire ownership", () => {
  it.each(["recycled PID", "mismatched Podman ID"])("does not stop a %s", async (mismatch) => {
    const fixture = await leaseFixture();
    const operations: string[] = [];
    let afterRecord = false;
    try {
      const platform: WorktreeLaunchPlatform = {
        ...fixture.platform,
        processIdentity: async () =>
          afterRecord && mismatch === "recycled PID" ? {...processIdentity, started: "639312345678900001"} : processIdentity,
        containers: {
          inspect: async () => ({id: "c".repeat(64), scopeId: "foreign", runId: "foreign"}),
          removeExact: async () => {
            operations.push("remove");
          },
        },
      };
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const lease = yield* claimWorktreeLaunch(fixture.checkout);
          const stage = yield* beginWorktreeLaunch(lease);
          yield* Effect.promise(() =>
            publishWorktreeJson(join(stage.directory, "process.json"), worktreeProcessReceipt(lease, processIdentity)),
          );
          const owned = yield* recordWorktreeOwnership(lease, {
            processIdentity,
            ...(mismatch === "recycled PID" ? {} : {containers: [container]}),
            phase: "partial",
          });
          afterRecord = true;
          const stopped = yield* stopWorktreeLaunch(owned);
          const request = yield* Effect.promise(() => readWorktreeJson(join(stage.directory, "stop.json")));
          return {stopped, request};
        }).pipe(Effect.provideService(WorktreePlatform, platform)),
      );
      expect(result.stopped.status).toBe("blocked");
      expect(result.request).toBeUndefined();
      expect(operations).toEqual([]);
    } finally {
      await fixture.dispose();
    }
  });

  it("cleans up only owned resources after partial launch", async () => {
    const fixture = await leaseFixture();
    const removed: string[] = [];
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const lease = yield* claimWorktreeLaunch(fixture.checkout);
          yield* beginWorktreeLaunch(lease);
          const platform: WorktreeLaunchPlatform = {
            ...fixture.platform,
            containers: {
              inspect: async (engine, id) => {
                expect(engine).toBe(lease.engineId);
                expect(id).toBe(container.id);
                return removed.includes(id) ? null : {id, scopeId: lease.scopeId, runId: lease.runId};
              },
              removeExact: async (engine, owned) => {
                expect(engine).toBe(lease.engineId);
                expect(owned).toEqual({id: container.id, scopeId: lease.scopeId, runId: lease.runId});
                removed.push(owned.id);
              },
            },
          };
          const owned = yield* recordWorktreeOwnership(lease, {containers: [container], phase: "partial"});
          return yield* stopWorktreeLaunch(owned).pipe(Effect.provideService(WorktreePlatform, platform));
        }).pipe(Effect.provideService(WorktreePlatform, fixture.platform)),
      );
      expect(result.status).toBe("stopped");
      expect(removed).toEqual([container.id]);
    } finally {
      await fixture.dispose();
    }
  });

  it("stop and restart retain the same scope volumes", async () => {
    const fixture = await leaseFixture();
    try {
      const {first, second, stopped} = await Effect.runPromise(
        Effect.gen(function* () {
          const first = yield* claimWorktreeLaunch(fixture.checkout);
          const stopped = yield* stopWorktreeLaunch(first);
          const second = yield* claimWorktreeLaunch(fixture.checkout);
          return {first, second, stopped};
        }).pipe(Effect.provideService(WorktreePlatform, fixture.platform)),
      );
      expect(stopped).toMatchObject({status: "stopped", preservedVolumes: first.volumes});
      expect(second.scopeId).toBe(first.scopeId);
      expect(second.volumes).toEqual(first.volumes);
      expect(second.runId).not.toBe(first.runId);
    } finally {
      await fixture.dispose();
    }
  });

  it("blocks a pending outcome, an engine change, a different checkout, and an old run handle", async () => {
    const fixture = await leaseFixture();
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>, platform = fixture.platform) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      expect(await run(stopWorktreeLaunch(lease), {...fixture.platform, engine: Effect.succeed("f".repeat(64))})).toMatchObject({
        status: "blocked",
      });
      expect(await run(stopWorktreeLaunch({...lease, root: join(lease.root, "other")}))).toMatchObject({status: "blocked"});
      expect(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "stopped"});
      const next = await run(claimWorktreeLaunch(fixture.checkout));
      expect(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "blocked"});
      await run(beginWorktreeLaunch(next));
      expect(await run(stopWorktreeLaunch(next))).toMatchObject({status: "blocked"});
      expect(await run(readWorktreeLaunch(fixture.checkout))).toMatchObject({runId: next.runId, phase: "pending"});
    } finally {
      await fixture.dispose();
    }
  });

  it.runIf(process.platform === "win32")(
    "smokes verified bind conflict, loopback ownership and cooperative fixture shutdown",
    async () => {
      const fixture = await leaseFixture();
      const platform = {...fixture.platform, processIdentity: windowsWorktreeProcessIdentity};
      const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
        Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
      let live: WorktreeLease | undefined;
      let shutdown = false;
      try {
        const attempt = await run(claimWorktreeLease(fixture.checkout, "fixture"));
        // Bind the last port to force a partial startup with exact prior listeners to close.
        const unrelated = await listenWorktreePort(attempt.ports.redis);
        try {
          expect(await run(launchWorktreeFixture(attempt))).toBe("collision");
          expect(await run(readWorktreeLaunch(fixture.checkout))).toBeNull();
          const rebound = await listenWorktreePort(attempt.ports.dashboardHttps);
          await rebound.close();
          await expect(listenWorktreePort(attempt.ports.redis)).rejects.toMatchObject({code: "EADDRINUSE"});
        } finally {
          await unrelated.close();
        }
        live = await run(startWorktreeFixture(fixture.checkout));
        expect(live).toMatchObject({mode: "fixture", phase: "owned", volumes: attempt.volumes});
        expect(live.runId).not.toBe(attempt.runId);
        expect(await run(inspectWorktreeLaunch(live))).toBe("owned");
        await expect(listenWorktreePort(live.ports.website)).rejects.toMatchObject({code: "EADDRINUSE"});
        expect(await run(stopWorktreeLaunch(live))).toMatchObject({status: "stopped", preservedVolumes: attempt.volumes});
        shutdown = true;
        expect(await run(readWorktreeLaunch(fixture.checkout))).toBeNull();
        const rebound = await listenWorktreePort(live.ports.website);
        await rebound.close();
      } finally {
        if (live && !shutdown) shutdown = (await run(stopWorktreeLaunch(live))).status === "stopped";
        const remaining = await run(readWorktreeLaunch(fixture.checkout));
        // Retain control receipts if an attempted child could be running; its own TTL is the fallback.
        if (!remaining || shutdown) await fixture.dispose();
      }
    },
    30_000,
  );
});

const controllerAction = process.env["AROLARIU_WORKTREE_TTL_CONTROLLER"];

it.runIf(process.platform === "win32" && (controllerAction === "launch" || controllerAction === "observe" || controllerAction === "stop"))(
  "controller-only TTL fixture",
  async () => {
    const options = {mode: "silent", verbose: false, color: false, context: "ttl-fixture"} as const;
    const currentCheckout = observeWorktreeCheckout().pipe(Effect.provide(makeNodeLayer(options)));
    const checkout = await Effect.runPromise(currentCheckout);
    if (!checkout) throw new Error("Controller must run in the canonical Windows linked checkout");
    const platform: WorktreeLaunchPlatform = {
      registry: (create) => windowsWorktreeRegistry(create, "fixture"),
      checkout: currentCheckout,
      engine: Effect.succeed(fixtureEngine),
      candidatePort: () => 0,
      processIdentity: windowsWorktreeProcessIdentity,
    };
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
    const read = () => run(readWorktreeLaunch(checkout));
    let lease = await read();
    const launcher = controllerAction === "launch" ? await windowsWorktreeProcessIdentity(process.pid) : null;
    if (controllerAction === "launch") {
      expect(lease).toBeNull();
      expect(launcher).not.toBeNull();
      lease = await run(startWorktreeFixture(checkout));
    }
    if (lease?.mode !== "fixture" || !lease.processIdentity) throw new Error("No exact fixture lease");
    const {
      runId,
      scopeId,
      processIdentity: {pid, started},
      ports: {website},
    } = lease;
    if (controllerAction === "stop") {
      expect(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "stopped", runId});
      expect(await read()).toBeNull();
      const rebound = await listenWorktreePort(website);
      await rebound.close();
      console.log(JSON.stringify({fixture: "stopped", runId, scopeId, pid, started, port: website}));
    } else {
      expect(await run(inspectWorktreeLaunch(lease))).toBe("owned");
      console.log(
        JSON.stringify({
          fixture: "owned",
          action: controllerAction,
          runId,
          scopeId,
          pid,
          started,
          port: website,
          ...(launcher ? {launcherPid: launcher.pid, launcherStarted: launcher.started} : {}),
        }),
      );
    }
  },
  30_000,
);
