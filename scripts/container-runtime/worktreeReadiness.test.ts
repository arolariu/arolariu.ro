// @vitest-environment node
import {Effect} from "effect";
import {unlink} from "node:fs/promises";
import {join} from "node:path";
import {describe, expect, it, vi} from "vitest";

import {leaseFixture} from "../platform/__fixtures__/worktreeLease.testing.ts";
import {worktreeIO} from "../platform/WorktreeHost.ts";
import {beginWorktreeLaunch, recordWorktreeOwnership, stopWorktreeLaunch, worktreeProcessReceipt} from "./worktreeAspire.ts";
import {
  claimWorktreeLaunch,
  publishWorktreeJson,
  readWorktreeJson,
  readWorktreeLaunch,
  withWorktreeLock,
  WorktreePlatform,
  worktreeDescriptorFor,
} from "./worktreeLease.ts";
import {validateWorktreeHandoff, type WorktreeReadinessSource} from "./worktreeReadiness.ts";

const sensitive = "https://user:fake-secret@example.invalid/?token=fake-token";
const supervisor = {pid: 100, started: "638500000000000000", image: "offline-supervisor.exe"};
type HealthArgs = Parameters<WorktreeReadinessSource["observe"]>;
type SmokeArgs = Parameters<WorktreeReadinessSource["smoke"]>;

async function readinessFixture() {
  const fixture = await leaseFixture();
  let checkout = fixture.checkout;
  let engine = "a".repeat(64);
  let live: typeof supervisor | null = supervisor;
  let dispatchVerified = true;
  const remove = vi.fn(async () => {});
  const run = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
    Effect.runPromise(
      effect.pipe(
        Effect.provideService(WorktreePlatform, {
          ...fixture.platform,
          checkout: Effect.sync(() => checkout),
          engine: Effect.sync(() => engine),
          processIdentity: () => Effect.sync(() => live),
          containers: {verifyCompleteDispatch: async () => dispatchVerified, inspect: async () => null, removeExact: remove},
        }),
      ),
    );

  try {
    const lease = await run(claimWorktreeLaunch(fixture.checkout));
    const stage = await run(beginWorktreeLaunch(lease));
    const receipt = worktreeProcessReceipt(lease, supervisor);
    await publishWorktreeJson(join(stage.directory, "process.json"), {...receipt, boundPorts: lease.ports});
    await run(recordWorktreeOwnership(lease, {phase: "owned", processIdentity: supervisor, boundPorts: lease.ports}));

    const website = worktreeDescriptorFor(lease).websiteOrigin;
    const dashboard = `https://127.0.0.1:${lease.ports.dashboardHttps}`;
    const api = `https://127.0.0.1:${lease.ports.api}`;
    const exp = `http://127.0.0.1:${lease.ports.exp}`;
    const identity = `http://127.0.0.1:${lease.ports.localIdentity}`;
    const socket = (acquisition: HealthArgs[1] | SmokeArgs[2], url: string, pid: number) => ({
      ...receipt,
      acquisition,
      redirected: false,
      remoteAddress: "127.0.0.1",
      remotePort: Number(new URL(url).port),
      listener: {...supervisor, pid},
      tls: url.startsWith("https:") ? {verified: true, exactSan: new URL(url).hostname, leafSha256: "e".repeat(64)} : null,
    });
    const connection = (acquisition: HealthArgs[1] | SmokeArgs[2], url: string, pid: number) => ({
      ...socket(acquisition, url, pid),
      kind: "http-response",
      url,
      responseUrl: url,
      status: 200,
    });
    const listening = (acquisition: HealthArgs[1], port: number, pid: number) => ({
      ...receipt,
      acquisition,
      address: "127.0.0.1",
      port,
      listener: {...supervisor, pid},
    });
    const health = (acquisition: HealthArgs[1]) => ({
      ...receipt,
      acquisition,
      survivedLauncherExit: true,
      bootstrapExitCode: 0,
      resources: {exp: "healthy", "local-identities": "healthy", api: "healthy", website: "healthy"},
      listeners: {
        website: listening(acquisition, lease.ports.website, 101),
        dashboard: listening(acquisition, lease.ports.dashboardHttps, 100),
        api: listening(acquisition, lease.ports.api, 102),
        exp: listening(acquisition, lease.ports.exp, 103),
        identity: listening(acquisition, lease.ports.localIdentity, 104),
      },
      endpoints: {
        website: connection(acquisition, `${website}/api/health/`, 101),
        dashboard: {...socket(acquisition, dashboard, 100), kind: "direct-https-handshake", authority: dashboard},
        api: connection(acquisition, `${api}/health`, 102),
        exp: connection(acquisition, `${exp}/api/ready`, 103),
        identity: connection(acquisition, `${identity}/health`, 104),
      },
    });
    const smoke = async (...[name, , acquisition]: SmokeArgs) => ({
      ...receipt,
      acquisition,
      name,
      passed: true,
      assertions:
        name === "website-auth-route"
          ? {"ordinary-auth-rendered": true}
          : {"expected-persona-catalog": true, "expected-openapi-metadata": true},
      endpoints:
        name === "website-auth-route"
          ? {website: connection(acquisition, `${website}/auth/sign-in/`, 101)}
          : {
              api: connection(acquisition, `${api}/swagger/v1/swagger.json`, 102),
              identity: connection(acquisition, `${identity}/personas`, 104),
            },
    });
    const source = {observe: vi.fn(async (...[, acquisition]: HealthArgs) => health(acquisition)), smoke: vi.fn(smoke)};
    return {
      lease,
      stage,
      run,
      source,
      website,
      dashboard,
      health,
      remove,
      checkout: fixture.checkout,
      validate: (checkedSource: WorktreeReadinessSource | undefined = source, timeoutMs?: number) =>
        run(validateWorktreeHandoff(fixture.checkout, lease.runId, checkedSource, timeoutMs)),
      dispose: fixture.dispose,
      invalidate: async (kind: string) => {
        switch (kind) {
          case "supervisor exit":
            live = null;
            break;
          case "PID reuse":
            live = {...supervisor, started: "638500000000000001"};
            break;
          case "checkout HEAD":
            checkout = {...checkout, head: "2".repeat(40)};
            break;
          case "engine pin":
            engine = "b".repeat(64);
            break;
          case "dispatch":
            dispatchVerified = false;
            break;
          case "stop request":
            await publishWorktreeJson(join(stage.directory, "stop.json"), receipt);
            break;
          case "lease retirement":
            await run(
              withWorktreeLock(
                fixture.directory,
                worktreeIO(() => unlink(join(fixture.directory, lease.scopeId, "lease.json"))),
              ),
            );
            break;
          default:
            throw new Error("Unsupported test case");
        }
      },
    };
  } catch (error) {
    await fixture.dispose();
    throw error;
  }
}

function expectBlocked(result: unknown, stage: string): void {
  expect(result).toEqual({status: "blocked", stage, reason: expect.any(String)});
  expect(JSON.stringify(result)).not.toMatch(/https?:|fake-secret|fake-token|stopCommand|safeLogPath/);
}

describe("offline worktree handoff", () => {
  it("returns verified URLs and a run-guarded stop command only after readiness and both named smokes pass", async () => {
    const fixture = await readinessFixture();
    try {
      const {source, lease, stage} = fixture;
      const result = await fixture.validate();

      expect(source.observe).toHaveBeenCalledTimes(2);
      expect(source.smoke.mock.calls.map(([name]) => name)).toEqual(["website-auth-route", "seeded-identity-api-metadata"]);
      const healthAcquisitions = source.observe.mock.calls.map(([, acquisition]) => acquisition);
      const smokeAcquisitions = source.smoke.mock.calls.map(([, , acquisition]) => acquisition);
      expect(healthAcquisitions.map(({phase}) => phase)).toEqual(["initial-health", "final-health"]);
      expect(smokeAcquisitions.map(({phase}) => phase)).toEqual(["website-auth-route", "seeded-identity-api-metadata"]);
      expect(new Set([...healthAcquisitions, ...smokeAcquisitions]).size).toBe(4);
      expect(source.observe.mock.invocationCallOrder[0]).toBeLessThan(source.smoke.mock.invocationCallOrder[0] ?? 0);
      expect(source.smoke.mock.invocationCallOrder[1]).toBeLessThan(source.observe.mock.invocationCallOrder[1] ?? 0);
      expect(result).toEqual({
        status: "ready",
        runId: lease.runId,
        websiteUrl: fixture.website,
        dashboardUrl: fixture.dashboard,
        smoke: ["website-auth-route", "seeded-identity-api-metadata"],
        stopCommand: `node scripts/cli.ts dev worktree stop --engine podman --expected-run ${lease.runId}`,
      });
      expect(await fixture.run(readWorktreeJson(join(stage.directory, "stop.json")))).toBeUndefined();
      expect(fixture.remove).not.toHaveBeenCalled();
    } finally {
      await fixture.dispose();
    }
  });

  it.each([
    "sibling run",
    "sibling endpoint",
    "foreign listener",
    "lookalike hostname",
    "different port",
    "different connected port",
    "redirect",
    "TLS bypass",
    "wildcard SAN",
    "HTTP lookalike",
    "missing endpoint",
    "bootstrap still running",
    "unsupported lifetime",
    "missing AppHost notification",
  ])("does not mark a healthy response ready with %s evidence", async (kind) => {
    const fixture = await readinessFixture();
    try {
      const observe: WorktreeReadinessSource["observe"] = async (_target, acquisition) => {
        const observed = fixture.health(acquisition);
        const endpoint = observed.endpoints.website;
        const evidence: Record<string, unknown> = {...observed};
        switch (kind) {
          case "sibling run":
            evidence["runId"] = "b".repeat(32);
            break;
          case "sibling endpoint":
            endpoint.scopeId = "b".repeat(32);
            break;
          case "foreign listener":
            endpoint.listener.pid += 1;
            break;
          case "lookalike hostname":
            endpoint.url = endpoint.responseUrl = endpoint.url.replace(".localhost", ".localhost.example.invalid");
            break;
          case "different port":
            endpoint.url = endpoint.responseUrl = endpoint.url.replace(`:${fixture.lease.ports.website}`, `:${fixture.lease.ports.api}`);
            break;
          case "different connected port":
            endpoint.remotePort = fixture.lease.ports.api;
            break;
          case "redirect":
            endpoint.redirected = true;
            break;
          case "TLS bypass":
            if (endpoint.tls) endpoint.tls.verified = false;
            break;
          case "wildcard SAN":
            if (endpoint.tls) endpoint.tls.exactSan = "*.localhost";
            break;
          case "HTTP lookalike":
            endpoint.remoteAddress = "::1";
            break;
          case "missing endpoint":
            evidence["endpoints"] = {website: endpoint};
            break;
          case "bootstrap still running":
            evidence["bootstrapExitCode"] = null;
            break;
          case "unsupported lifetime":
            evidence["survivedLauncherExit"] = false;
            break;
          case "missing AppHost notification":
            evidence["resources"] = {website: "healthy"};
            break;
        }
        return evidence;
      };
      const result = await fixture.validate({...fixture.source, observe});

      expectBlocked(result, "readiness");
      expect(fixture.source.smoke).not.toHaveBeenCalled();
    } finally {
      await fixture.dispose();
    }
  });

  it.each(["same receipt", "retagged envelope", "retagged listener envelope"])(
    "rejects a replayed initial receipt at final re-observation with unchanged ownership (%s)",
    async (kind) => {
      const fixture = await readinessFixture();
      try {
        let cached: ReturnType<typeof fixture.health> | undefined;
        const observe = vi.fn(async (...[, acquisition]: HealthArgs) => {
          const observed = fixture.health(acquisition);
          if (acquisition.phase === "initial-health") return (cached = observed);
          if (!cached) throw new Error("No initial receipt to replay");
          if (kind === "retagged envelope") return {...cached, acquisition};
          if (kind === "retagged listener envelope") return {...observed, listeners: cached.listeners};
          return cached;
        });

        expectBlocked(await fixture.validate({...fixture.source, observe}), "revalidation");
        expect(observe).toHaveBeenCalledTimes(2);
        expect(fixture.source.smoke).toHaveBeenCalledTimes(2);
      } finally {
        await fixture.dispose();
      }
    },
  );

  it("rejects the same phase receipt from an earlier attempt", async () => {
    const fixture = await readinessFixture();
    try {
      let initial: ReturnType<typeof fixture.health> | undefined;
      const observe = vi.fn(async (...[, acquisition]: HealthArgs) => {
        const observed = fixture.health(acquisition);
        if (acquisition.phase === "final-health") return observed;
        return (initial ??= observed);
      });
      const checkedSource = {...fixture.source, observe};

      expect(await fixture.validate(checkedSource)).toMatchObject({status: "ready"});
      expectBlocked(await fixture.validate(checkedSource), "readiness");
      expect(observe).toHaveBeenCalledTimes(3);
      expect(fixture.source.smoke).toHaveBeenCalledTimes(2);
    } finally {
      await fixture.dispose();
    }
  });

  it.each(["redirect", "wrong response target", "wrong HTTPS authority", "HTTP success only"])(
    "rejects dashboard handshake evidence with %s",
    async (kind) => {
      const fixture = await readinessFixture();
      try {
        const observe: WorktreeReadinessSource["observe"] = async (_target, acquisition) => {
          const observed = fixture.health(acquisition);
          const handshake = observed.endpoints.dashboard;
          const dashboard = {
            ...handshake,
            redirected: kind === "redirect",
            authority: kind === "wrong HTTPS authority" ? `${fixture.dashboard}/?token=fake-token` : handshake.authority,
            ...(kind === "wrong response target" && {responseUrl: sensitive}),
            ...(kind === "HTTP success only" && {kind: "http-response", status: 200}),
          };
          return {...observed, endpoints: {...observed.endpoints, dashboard}};
        };

        expectBlocked(await fixture.validate({...fixture.source, observe}), "readiness");
        expect(fixture.source.smoke).not.toHaveBeenCalled();
      } finally {
        await fixture.dispose();
      }
    },
  );

  it.each(["wrong leased port", "wrong loopback address", "wrong run", "wrong scope", "recycled process"])(
    "rejects independent listener evidence with %s",
    async (kind) => {
      const fixture = await readinessFixture();
      try {
        const observe: WorktreeReadinessSource["observe"] = async (_target, acquisition) => {
          const observed = fixture.health(acquisition);
          const owned = observed.listeners.website;
          const website = {
            ...owned,
            port: kind === "wrong leased port" ? fixture.lease.ports.api : owned.port,
            address: kind === "wrong loopback address" ? "::1" : owned.address,
            runId: kind === "wrong run" ? "b".repeat(32) : owned.runId,
            scopeId: kind === "wrong scope" ? "b".repeat(32) : owned.scopeId,
            listener: kind === "recycled process" ? {...owned.listener, started: "638500000000000001"} : owned.listener,
          };
          return {...observed, listeners: {...observed.listeners, website}};
        };

        expectBlocked(await fixture.validate({...fixture.source, observe}), "readiness");
        expect(fixture.source.smoke).not.toHaveBeenCalled();
      } finally {
        await fixture.dispose();
      }
    },
  );

  it("rejects smoke receipt evidence from another named acquisition", async () => {
    const fixture = await readinessFixture();
    try {
      let previous: SmokeArgs[2] | undefined;
      const smoke: WorktreeReadinessSource["smoke"] = async (...args) => {
        const receipt = await fixture.source.smoke(...args);
        if (!previous) {
          previous = receipt.acquisition;
          return receipt;
        }
        return {...receipt, acquisition: previous};
      };

      expectBlocked(await fixture.validate({...fixture.source, smoke}), "smoke");
      expect(fixture.source.smoke).toHaveBeenCalledTimes(2);
    } finally {
      await fixture.dispose();
    }
  });

  it.each(["failed", "rejected", "arbitrary command", "arbitrary URL", "different listener", "missing metadata smoke", "generic HTTP 200"])(
    "returns no handoff or injected text after %s smoke evidence",
    async (kind) => {
      const fixture = await readinessFixture();
      try {
        const smoke: WorktreeReadinessSource["smoke"] = async (...args) => {
          if (kind === "rejected") throw new Error(sensitive);
          const [name] = args;
          const receipt = await fixture.source.smoke(...args);
          const endpoints =
            kind === "different listener" && receipt.endpoints.website
              ? {
                  website: {
                    ...receipt.endpoints.website,
                    listener: {...supervisor, pid: 999},
                  },
                }
              : receipt.endpoints;
          return {
            ...receipt,
            endpoints,
            assertions: kind === "generic HTTP 200" ? {} : receipt.assertions,
            passed: kind !== "failed" && !(kind === "missing metadata smoke" && name === "seeded-identity-api-metadata"),
            name: kind === "arbitrary command" ? "powershell -Command whoami" : kind === "arbitrary URL" ? sensitive : name,
            reason: sensitive,
            safeLogPath: sensitive,
          };
        };

        expectBlocked(await fixture.validate({...fixture.source, smoke}), "smoke");
        expect(fixture.source.observe).toHaveBeenCalledTimes(1);
      } finally {
        await fixture.dispose();
      }
    },
  );

  it.each([
    "supervisor exit",
    "PID reuse",
    "checkout HEAD",
    "engine pin",
    "dispatch",
    "stop request",
    "lease retirement",
    "endpoint replacement",
    "TLS replacement",
  ])("does not hand off after late %s", async (kind) => {
    const fixture = await readinessFixture();
    try {
      const {observe, smoke} = fixture.source;
      observe
        .mockImplementationOnce(async (_target, acquisition) => fixture.health(acquisition))
        .mockImplementationOnce(async (_target, acquisition) => {
          const observed = fixture.health(acquisition);
          if (kind === "endpoint replacement") {
            observed.endpoints.api.listener.pid += 1;
            observed.listeners.api.listener.pid += 1;
          } else if (kind === "TLS replacement") {
            if (observed.endpoints.api.tls) observed.endpoints.api.tls.leafSha256 = "b".repeat(64);
          } else await fixture.invalidate(kind);
          return observed;
        });

      expectBlocked(await fixture.validate(), "revalidation");
      expect(smoke).toHaveBeenCalledTimes(2);
    } finally {
      await fixture.dispose();
    }
  });

  it("does not invoke a second smoke against a run invalidated by the first", async () => {
    const fixture = await readinessFixture();
    try {
      const smoke: WorktreeReadinessSource["smoke"] = async (...args) => {
        const evidence = await fixture.source.smoke(...args);
        await fixture.invalidate("supervisor exit");
        return evidence;
      };

      expectBlocked(await fixture.validate({...fixture.source, smoke}), "revalidation");
      expect(fixture.source.smoke).toHaveBeenCalledOnce();
      expect(fixture.source.observe).toHaveBeenCalledOnce();
    } finally {
      await fixture.dispose();
    }
  });

  it("does not use an old handoff's guarded stop on the current run", async () => {
    const fixture = await readinessFixture();
    try {
      const {lease, run, checkout, stage} = fixture;
      const result = await run(stopWorktreeLaunch(lease, "b".repeat(32)));

      expect(result).toEqual({status: "blocked", reason: "The expected scoped run is not current."});
      expect(await run(readWorktreeLaunch(checkout))).toMatchObject({phase: "owned", runId: lease.runId});
      expect(await run(readWorktreeJson(join(stage.directory, "stop.json")))).toBeUndefined();
      expect(fixture.remove).not.toHaveBeenCalled();
    } finally {
      await fixture.dispose();
    }
  });

  it("blocks without a verified run or evidence provider, and times out a hung smoke", async () => {
    const fixture = await readinessFixture();
    try {
      const {source, run, lease} = fixture;
      const checkout = await run(Effect.flatMap(WorktreePlatform, (platform) => platform.checkout));
      if (!checkout) throw new Error("Missing synthetic checkout");
      expectBlocked(await run(validateWorktreeHandoff(checkout, lease.runId)), "evidence");
      expectBlocked(await run(validateWorktreeHandoff(checkout, "b".repeat(32), source)), "ownership");
      expect(source.observe).not.toHaveBeenCalled();
      const abort = vi.fn();
      const smoke: WorktreeReadinessSource["smoke"] = (_name, _target, _acquisition, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              abort();
              reject(new Error(sensitive));
            },
            {once: true},
          );
        });

      expectBlocked(await fixture.validate({...source, smoke}, 1_000), "timeout");
      expect(abort).toHaveBeenCalledOnce();
      expect(source.observe).toHaveBeenCalledTimes(1);
    } finally {
      await fixture.dispose();
    }
  });
});
