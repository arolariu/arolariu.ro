// @vitest-environment node
import {Effect} from "effect";
import {mkdir, readFile, rmdir, unlink, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {fixtureEngine, launchWorktreeFixture, startWorktreeFixture} from "../platform/__fixtures__/worktreeAspire.fixture.ts";
import {leaseFixture} from "../platform/__fixtures__/worktreeLease.testing.ts";
import {windowsWorktreeFixtureRegistry, windowsWorktreeProcessIdentity} from "../platform/__fixtures__/worktreeWindows.fixture.ts";
import {makeNodeLayer} from "../platform/layers.ts";
import {listenWorktreePort} from "../platform/WorktreeHost.ts";
import {
  beginWorktreeLaunch,
  inspectWorktreeLaunch,
  recordWorktreeOwnership,
  stopWorktreeLaunch,
  worktreeProcessReceipt,
} from "./worktreeAspire.ts";
import {
  claimWorktreeLaunch,
  claimWorktreeLease,
  publishWorktreeJson,
  readWorktreeJson,
  readWorktreeLaunch,
  type WorktreeLaunchPlatform,
  worktreeLaunchVersion,
  WorktreePlatform,
  type WorktreeLease,
} from "./worktreeLease.ts";
import {observeWorktreeCheckout} from "./worktreePreflight.ts";

const processIdentity = {pid: 12345, started: "639312345678900000", image: "C:\\runtime\\node.exe"};
const container = {id: "b".repeat(64)};
const fixtureLayer = makeNodeLayer({mode: "silent", verbose: false, color: false, context: "ttl-fixture"});

describe("worktree Aspire ownership", () => {
  it("keeps an unknown container-only outcome pending even when every supplied ID is absent", async () => {
    const fixture = await leaseFixture();
    let removals = 0;
    const platform: WorktreeLaunchPlatform = {
      ...fixture.platform,
      containers: {
        verifyCompleteDispatch: async () => true,
        inspect: async () => null,
        removeExact: async () => {
          removals++;
        },
      },
    };
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      await run(beginWorktreeLaunch(lease));
      const record = await Promise.allSettled([run(recordWorktreeOwnership(lease, {phase: "partial", containers: [container]}))]);
      expect.soft(record[0]?.status).toBe("rejected");
      expect.soft(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "blocked"});
      expect.soft(await run(readWorktreeLaunch(fixture.checkout))).toMatchObject({phase: "pending", runId: lease.runId});
      // A container-only partial is not authority even in the current schema.
      const partial = JSON.stringify({...lease, version: worktreeLaunchVersion, phase: "partial", resourceOwnership: [container]});
      const path = join(fixture.directory, lease.scopeId, "lease.json");
      await writeFile(path, partial);
      expect(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "blocked"});
      expect(await readFile(path, "utf8")).toBe(partial);
      expect(removals).toBe(0);
    } finally {
      await fixture.dispose();
    }
  });

  it.each(["unproven dispatch", "absent journal entry"])("keeps a supervisor-backed attempt pending with an %s", async (failure) => {
    const fixture = await leaseFixture();
    const platform: WorktreeLaunchPlatform = {
      ...fixture.platform,
      processIdentity: () => Effect.succeed(processIdentity),
      containers: {
        verifyCompleteDispatch: async () => failure === "absent journal entry",
        inspect: async () => null,
        removeExact: async () => {
          throw new Error("Unexpected removal");
        },
      },
    };
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      const stage = await run(beginWorktreeLaunch(lease));
      await publishWorktreeJson(join(stage.directory, "process.json"), worktreeProcessReceipt(lease, processIdentity));
      await expect(run(recordWorktreeOwnership(lease, {phase: "partial", processIdentity, containers: [container]}))).rejects.toThrow(
        "Could not prove ownership",
      );
      expect(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "blocked"});
      expect(await run(readWorktreeLaunch(fixture.checkout))).toMatchObject({phase: "pending", runId: lease.runId});
      expect(await run(readWorktreeJson(join(stage.directory, "stop.json")))).toBeUndefined();
    } finally {
      await fixture.dispose();
    }
  });

  it("stages the claimed revision and all host ports, including Cosmos readiness, in lease and descriptor", async () => {
    const fixture = await leaseFixture();
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const lease = yield* claimWorktreeLaunch(fixture.checkout);
          const staged = yield* beginWorktreeLaunch(lease);
          const descriptor = yield* readWorktreeJson(staged.descriptor);
          const claimed = {
            version: worktreeLaunchVersion,
            ports: lease.ports,
            head: fixture.checkout.head,
            branch: fixture.checkout.branch,
          };
          expect(descriptor).toMatchObject(claimed);
          expect(descriptor).toMatchObject({
            ports: {cosmosDataExplorer: expect.any(Number), cosmosReadiness: expect.any(Number), azuriteTable: expect.any(Number)},
          });

          const saved = yield* readWorktreeJson(join(fixture.directory, lease.scopeId, "lease.json"));
          expect(saved).toMatchObject(claimed);
          expect(new Set(Object.values(lease.ports)).size).toBe(20);
        }).pipe(Effect.provideService(WorktreePlatform, fixture.platform)),
      );
    } finally {
      await fixture.dispose();
    }
  });

  it("refuses to stage a superseded checkout revision but can release that exact reservation", async () => {
    const fixture = await leaseFixture();
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>, platform = fixture.platform) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      const checkout = {...fixture.checkout, head: "2".repeat(40)};
      const platform = {...fixture.platform, checkout: Effect.succeed(checkout)};

      await expect(run(beginWorktreeLaunch(lease), platform)).rejects.toThrow("Could not stage this run");
      expect(await run(readWorktreeLaunch(checkout), platform)).toMatchObject({phase: "reserved", head: fixture.checkout.head});
      expect(await run(stopWorktreeLaunch(lease), platform)).toMatchObject({status: "stopped", runId: lease.runId});
    } finally {
      await fixture.dispose();
    }
  });

  it("rolls back files from a failed launch preparation and lets the same reservation retry", async () => {
    const fixture = await leaseFixture();
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, fixture.platform)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      await expect(
        run(
          beginWorktreeLaunch(lease, async (stage) => {
            const file = join(stage.runtime, "exp.json");
            await writeFile(file, "synthetic config", {flag: "wx"});
            // Fail before publishing a pending lease without leaving the file created by this attempt.
            await unlink(file);
            throw new Error("preparation failed");
          }),
        ),
      ).rejects.toThrow("Could not stage");
      expect(await run(readWorktreeLaunch(fixture.checkout))).toMatchObject({runId: lease.runId, phase: "reserved"});

      const stage = await run(
        beginWorktreeLaunch(lease, async (directory) => {
          const file = join(directory.runtime, "exp.json");
          await writeFile(file, "successful scoped config", {flag: "wx"});
          return () => unlink(file);
        }),
      );
      expect(await readFile(join(stage.runtime, "exp.json"), "utf8")).toBe("successful scoped config");
      expect(await run(readWorktreeLaunch(fixture.checkout))).toMatchObject({runId: lease.runId, phase: "pending"});
    } finally {
      await fixture.dispose();
    }
  });

  it("can record and stop a proven staged run if the checkout moves before ownership is observed", async () => {
    const fixture = await leaseFixture();
    let checkout = fixture.checkout;
    let observed: typeof processIdentity | null = processIdentity;
    const platform = {
      ...fixture.platform,
      checkout: Effect.sync(() => checkout),
      processIdentity: () => Effect.sync(() => observed),
    };
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
    try {
      const lease = await run(claimWorktreeLease(fixture.checkout, "fixture"));
      const stage = await run(beginWorktreeLaunch(lease));
      const receipt = worktreeProcessReceipt(lease, processIdentity);
      await publishWorktreeJson(join(stage.directory, "process.json"), {...receipt, boundPorts: lease.ports});
      checkout = {...checkout, head: "2".repeat(40)};
      const owned = await run(recordWorktreeOwnership(lease, {phase: "owned", processIdentity, boundPorts: lease.ports}));
      expect(owned.head).toBe(fixture.checkout.head);
      await publishWorktreeJson(join(stage.directory, "exit.json"), {...receipt, reason: "ttl"});
      observed = null;
      expect(await run(stopWorktreeLaunch(owned))).toMatchObject({status: "stopped", runId: lease.runId});
    } finally {
      await fixture.dispose();
    }
  });

  it.each([
    "v2 lease",
    "v2 descriptor",
    "mismatched descriptor revision",
    "missing descriptor",
    "missing lease port",
    "missing descriptor port",
    "colliding lease ports",
    "colliding descriptor ports",
    "wrong leased port",
    "reserved lease with a stage",
  ])("blocks a persisted %s without treating the run as absent or reusable", async (invalid) => {
    const fixture = await leaseFixture();
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, fixture.platform)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      const stage = await run(beginWorktreeLaunch(lease));
      const path = join(fixture.directory, lease.scopeId, "lease.json");
      const saved = await readFile(path, "utf8");
      const descriptor = await readFile(stage.descriptor, "utf8");
      const ports: Record<string, number> = {...lease.ports};
      const savedLease = JSON.parse(saved) as Record<string, unknown>;
      const savedDescriptor = JSON.parse(descriptor) as Record<string, unknown>;
      if (invalid === "v2 lease") await writeFile(path, JSON.stringify({...savedLease, version: 2}));
      if (invalid === "v2 descriptor") await writeFile(stage.descriptor, JSON.stringify({...savedDescriptor, version: 2}));
      if (invalid === "mismatched descriptor revision")
        await writeFile(stage.descriptor, JSON.stringify({...savedDescriptor, head: "2".repeat(40)}));
      if (invalid === "missing descriptor") await unlink(stage.descriptor);
      if (invalid === "reserved lease with a stage") await writeFile(path, JSON.stringify({...savedLease, phase: "reserved"}));
      if (invalid.startsWith("missing") && invalid.endsWith("port")) delete ports["cosmosReadiness"];
      if (invalid.startsWith("colliding")) ports["cosmosReadiness"] = lease.ports.cosmos;
      if (invalid === "wrong leased port")
        ports["cosmosReadiness"] = Array.from({length: 21}, (_, i) => 31000 + i).find((port) => !Object.values(ports).includes(port))!;
      if (invalid === "missing lease port" || invalid === "colliding lease ports")
        await writeFile(path, JSON.stringify({...savedLease, ports}));
      if (invalid === "missing descriptor port" || invalid === "colliding descriptor ports" || invalid === "wrong leased port")
        await writeFile(stage.descriptor, JSON.stringify({...savedDescriptor, ports}));
      const expected = await readFile(path, "utf8");
      const expectedDescriptor = await run(readWorktreeJson(stage.descriptor));
      await expect(run(readWorktreeLaunch(fixture.checkout))).rejects.toThrow("registry could not be read");
      expect(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "blocked"});
      await expect(run(claimWorktreeLaunch(fixture.checkout))).rejects.toThrow("Could not reserve");
      expect(await readFile(path, "utf8")).toBe(expected);
      expect(await run(readWorktreeJson(stage.descriptor))).toEqual(expectedDescriptor);
      expect(await run(readWorktreeJson(join(stage.directory, "stop.json")))).toBeUndefined();
    } finally {
      await fixture.dispose();
    }
  });

  it.each([
    ["lease", "version", "version"],
    ["descriptor", "version", "version"],
    ["lease", "cosmosReadiness", "cosmos\\u0052eadiness"],
    ["descriptor", "cosmosReadiness", "cosmos\\u0052eadiness"],
  ] as const)("blocks duplicate authority properties in %s (%s as %s)", async (record, key, alias) => {
    const fixture = await leaseFixture();
    const observations: string[] = [];
    let allowDispatch = true;
    const platform: WorktreeLaunchPlatform = {
      ...fixture.platform,
      processIdentity: () =>
        Effect.sync(() => {
          observations.push("process");
          return processIdentity;
        }),
      containers: {
        verifyCompleteDispatch: async () => {
          observations.push("dispatch");
          return allowDispatch;
        },
        inspect: async () => {
          throw new Error("No container should be inspected");
        },
        removeExact: async () => {
          throw new Error("No container should be removed");
        },
      },
    };
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>, selected = platform) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, selected)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      const stage = await run(beginWorktreeLaunch(lease));
      const processPath = join(stage.directory, "process.json");
      await publishWorktreeJson(processPath, {...worktreeProcessReceipt(lease, processIdentity), boundPorts: lease.ports});
      const owned = await run(recordWorktreeOwnership(lease, {phase: "owned", processIdentity, boundPorts: lease.ports}));
      expect(await run(inspectWorktreeLaunch(owned))).toBe("owned");
      allowDispatch = false; // Even on red, the synthetic adapter cannot enter shutdown.
      observations.length = 0;

      const leasePath = join(fixture.directory, lease.scopeId, "lease.json");
      const path = record === "lease" ? leasePath : stage.descriptor;
      const saved = await readFile(path, "utf8");
      const value = key === "version" ? worktreeLaunchVersion : lease.ports.cosmosReadiness;
      const member = `"${key}":${value}`;
      const malformed = saved.replace(member, `"${alias}" \t:\n ${value},${member}`);
      expect(malformed).not.toBe(saved);
      expect(JSON.parse(malformed)).toEqual(JSON.parse(saved)); // Last-wins normalization hides the defect.
      await writeFile(path, malformed);
      const records = [leasePath, stage.descriptor, processPath];
      const evidence = await Promise.all(records.map((file) => readFile(file)));

      const status = await Promise.allSettled([run(readWorktreeLaunch(fixture.checkout))]);
      expect.soft(status[0]?.status).toBe("rejected");
      expect(await run(inspectWorktreeLaunch(owned))).toBe("blocked");
      expect(await run(stopWorktreeLaunch(owned))).toMatchObject({status: "blocked"});
      const sibling = {...fixture.checkout, root: join(fixture.checkout.root, "synthetic-sibling")};
      await expect(
        run(claimWorktreeLaunch(sibling), {
          ...platform,
          checkout: Effect.succeed(sibling),
          candidatePort: () => {
            observations.push("allocate");
            throw new Error("Allocator must not run against a malformed sibling record");
          },
        }),
      ).rejects.toThrow("Could not reserve");
      expect.soft(observations).toEqual([]);
      expect(await Promise.all(records.map((file) => readFile(file)))).toEqual(evidence);
      expect(await run(readWorktreeJson(join(stage.directory, "stop.json")))).toBeUndefined();
    } finally {
      await fixture.dispose();
    }
  });

  it("does not retire a reserved lease with duplicate authority properties", async () => {
    const fixture = await leaseFixture();
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, fixture.platform)));
    try {
      const lease = await run(claimWorktreeLaunch(fixture.checkout));
      const path = join(fixture.directory, lease.scopeId, "lease.json");
      const saved = await readFile(path, "utf8");
      const malformed = saved.replace('"phase":"reserved"', '"phase":"reserved","phase":"reserved"');
      expect(malformed).not.toBe(saved);
      expect(JSON.parse(malformed)).toEqual(JSON.parse(saved));
      await writeFile(path, malformed);
      expect.soft(await run(stopWorktreeLaunch(lease))).toMatchObject({status: "blocked"});
      const retained = await Promise.allSettled([readFile(path, "utf8")]);
      expect(retained[0]).toEqual({status: "fulfilled", value: malformed});
    } finally {
      await fixture.dispose();
    }
  });

  it.each(["recycled PID", "mismatched Podman ID", "missing Podman ID"])("does not stop a %s", async (mismatch) => {
    const fixture = await leaseFixture();
    const operations: string[] = [];
    let afterRecord = false;
    try {
      const platform: WorktreeLaunchPlatform = {
        ...fixture.platform,
        processIdentity: () =>
          Effect.sync(() =>
            afterRecord && mismatch === "recycled PID" ? {...processIdentity, started: "639312345678900001"} : processIdentity,
          ),
        containers: {
          verifyCompleteDispatch: async () => true,
          inspect: async () => {
            if (!afterRecord) return journalEntry;
            return mismatch === "missing Podman ID" ? null : {id: "c".repeat(64), scopeId: "foreign", runId: "foreign"};
          },
          removeExact: async () => {
            operations.push("remove");
          },
        },
      };
      let journalEntry: {id: string; scopeId: string; runId: string} | null = null;
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const lease = yield* claimWorktreeLaunch(fixture.checkout);
          journalEntry = {...container, scopeId: lease.scopeId, runId: lease.runId};
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
          const request = yield* readWorktreeJson(join(stage.directory, "stop.json"));
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
    let exited = false;
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const lease = yield* claimWorktreeLaunch(fixture.checkout);
          const stage = yield* beginWorktreeLaunch(lease);
          const receipt = worktreeProcessReceipt(lease, processIdentity);
          yield* Effect.promise(() => publishWorktreeJson(join(stage.directory, "process.json"), receipt));
          const platform: WorktreeLaunchPlatform = {
            ...fixture.platform,
            processIdentity: () => Effect.sync(() => (exited ? null : processIdentity)),
            containers: {
              verifyCompleteDispatch: async (run, supervisor, journal) => {
                expect(run).toEqual({engineId: lease.engineId, scopeId: lease.scopeId, runId: lease.runId});
                expect(supervisor).toEqual(processIdentity);
                expect(journal).toEqual([container]);
                return true;
              },
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
          const owned = yield* recordWorktreeOwnership(lease, {processIdentity, containers: [container], phase: "partial"}).pipe(
            Effect.provideService(WorktreePlatform, platform),
          );
          // Model a supervisor that acknowledged a previously verified cooperative stop.
          yield* Effect.promise(async () => {
            await publishWorktreeJson(join(stage.directory, "stop.json"), receipt);
            await publishWorktreeJson(join(stage.directory, "exit.json"), {...receipt, reason: "stop"});
            exited = true;
          });
          return yield* stopWorktreeLaunch(owned).pipe(Effect.provideService(WorktreePlatform, platform));
        }).pipe(Effect.provideService(WorktreePlatform, fixture.platform)),
      );
      expect(result.status).toBe("stopped");
      expect(removed).toEqual([container.id]);
    } finally {
      await fixture.dispose();
    }
  });

  it.each(["resume", "unexplained absence", "vanished pending ID", "present completed ID", "recycled supervisor", "publication failure"])(
    "keeps two-entry cleanup scoped on retry: %s",
    async (scenario) => {
      const fixture = await leaseFixture();
      const ids = [container.id, "d".repeat(64)] as const;
      const journal = ids.map((id) => ({id}));
      const present = new Set<string>(ids);
      const removals: string[] = [];
      let failSecond = true;
      let observed: typeof processIdentity | null = processIdentity;
      let dispatchChecks = 0;
      let retryInspectionsOfPending = 0;
      const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>, platform = fixture.platform) =>
        Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
      try {
        const lease = await run(claimWorktreeLaunch(fixture.checkout));
        const stage = await run(beginWorktreeLaunch(lease));
        const receipt = worktreeProcessReceipt(lease, processIdentity);
        const progressPath = join(stage.directory, `cleanup-${ids[0]}.json`);
        await publishWorktreeJson(join(stage.directory, "process.json"), receipt);
        const platform: WorktreeLaunchPlatform = {
          ...fixture.platform,
          processIdentity: () => Effect.sync(() => observed),
          containers: {
            verifyCompleteDispatch: async (run, supervisor, supplied) => {
              dispatchChecks++;
              expect(run).toEqual({engineId: lease.engineId, scopeId: lease.scopeId, runId: lease.runId});
              expect(supervisor).toEqual(processIdentity);
              expect(supplied).toEqual(journal);
              return true;
            },
            inspect: async (engine, id) => {
              expect(engine).toBe(lease.engineId);
              expect(ids).toContain(id);
              if (scenario === "vanished pending ID" && !failSecond && id === ids[1] && ++retryInspectionsOfPending === 2) {
                present.delete(id);
              }
              return present.has(id) ? {id, scopeId: lease.scopeId, runId: lease.runId} : null;
            },
            removeExact: async (engine, owned) => {
              expect(engine).toBe(lease.engineId);
              expect(owned).toEqual({id: owned.id, scopeId: lease.scopeId, runId: lease.runId});
              expect(present.has(owned.id)).toBe(true);
              removals.push(owned.id);
              if (owned.id === ids[1] && failSecond) throw new Error("Injected second removal failure");
              present.delete(owned.id);
              if (owned.id === ids[0] && scenario === "publication failure") await mkdir(progressPath);
            },
          },
        };
        const owned = await run(recordWorktreeOwnership(lease, {phase: "partial", processIdentity, containers: journal}), platform);
        await publishWorktreeJson(join(stage.directory, "stop.json"), receipt);
        await publishWorktreeJson(join(stage.directory, "exit.json"), {...receipt, reason: "stop"});
        observed = null;

        expect(await run(stopWorktreeLaunch(owned), platform)).toMatchObject({status: "blocked"});
        expect([...present]).toEqual([ids[1]]);
        expect(removals).toEqual(scenario === "publication failure" ? [ids[0]] : [...ids]);
        expect(await run(readWorktreeLaunch(fixture.checkout), platform)).toMatchObject({resourceOwnership: journal});
        if (scenario !== "publication failure") {
          expect(await run(readWorktreeJson(progressPath))).toEqual({version: 1, containerId: ids[0], ...receipt});
        }
        expect(await run(readWorktreeJson(join(stage.directory, `cleanup-${ids[1]}.json`)))).toBeUndefined();

        failSecond = false;
        if (scenario === "unexplained absence") present.delete(ids[1]);
        if (scenario === "present completed ID") present.add(ids[0]);
        if (scenario === "recycled supervisor") observed = {...processIdentity, started: "639312345678900001"};
        if (scenario === "publication failure") {
          await rmdir(progressPath); // Remove only the test's fault injection.
          expect(await run(readWorktreeJson(progressPath))).toBeUndefined();
        }
        const retried = await run(stopWorktreeLaunch(owned), platform);
        expect(dispatchChecks).toBe(3);
        if (scenario === "resume") {
          expect(retried).toMatchObject({status: "stopped", runId: lease.runId, preservedVolumes: lease.volumes});
          expect(removals).toEqual([...ids, ids[1]]);
          expect(present.size).toBe(0);
          expect(await run(readWorktreeLaunch(fixture.checkout), platform)).toBeNull();
        } else {
          expect(retried).toMatchObject({status: "blocked"});
          expect(removals).toEqual(scenario === "publication failure" ? [ids[0]] : [...ids]);
          expect(await run(readWorktreeLaunch(fixture.checkout), platform)).toMatchObject({resourceOwnership: journal});
        }
      } finally {
        await fixture.dispose();
      }
    },
  );

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
      const platform = {
        ...fixture.platform,
        processIdentity: windowsWorktreeProcessIdentity,
      };
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
    const currentCheckout = observeWorktreeCheckout().pipe(Effect.provide(fixtureLayer));
    const checkout = await Effect.runPromise(currentCheckout);
    if (!checkout) throw new Error("Controller must run in the canonical Windows linked checkout");
    const platform: WorktreeLaunchPlatform = {
      registry: windowsWorktreeFixtureRegistry,
      checkout: currentCheckout,
      engine: Effect.succeed(fixtureEngine),
      candidatePort: () => 0,
      processIdentity: windowsWorktreeProcessIdentity,
    };
    const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
      Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
    const read = () => run(readWorktreeLaunch(checkout));
    let lease = await read();
    const launcher = controllerAction === "launch" ? await run(platform.processIdentity(process.pid)) : null;
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
