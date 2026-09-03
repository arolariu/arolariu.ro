// @vitest-environment node
/**
 * @fileoverview Contract tests for the isolated aggregate inspection worker and its parent provider.
 * @module scripts/inspection/aggregate.test
 */

import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it, vi} from "vitest";

import type {ProcessEnvironment, ProcessOutcome, ProcessOutput, ProcessRequest, ProcessRunner} from "../common/runner.ts";
import {createNodeProcessRunner, snapshotNodeEnvironment} from "../common/runtime.node.ts";
import {DefaultTaskScheduler, type Clock, type RuntimeEnvironment} from "../common/runtime.ts";
import {buildCommandHost} from "../testing/builders/command-host.builder.ts";
import {AGGREGATE_TIMEOUT_MS, createAggregateProvider, type AggregateWorkerDocument} from "./aggregate.ts";
import {aggregateWorkerCommand, createAggregateWorkerCommand} from "./aggregate-worker.ts";
import type {HostFacts} from "./host.ts";
import type {ToolingFacts} from "./tooling.ts";
import type {InspectionOutcome} from "./types.ts";

// ============================================================================
// Fixtures
// ============================================================================

/** A stable, non-existent absolute repository root reused across the parent-boundary tests. */
const REPOSITORY_ROOT = resolve(tmpdir(), "arolariu-aggregate-fixture-root");

/** Absolute path to the worker module, used only by the CLI-argument subprocess tests. */
const WORKER_PATH = fileURLToPath(new URL("./aggregate-worker.ts", import.meta.url));

function succeeded(patch: Partial<ProcessOutput> = {}): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 1, ...patch};
}

function exited(exitCode: number, patch: Partial<ProcessOutput> = {}): ProcessOutcome {
  return {kind: "exited", exitCode, stdout: "", stderr: "", durationMs: 1, ...patch};
}

function spawnFailed(message: string, patch: Partial<ProcessOutput> = {}): ProcessOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1, ...patch};
}

function timedOut(patch: Partial<ProcessOutput> = {}): ProcessOutcome {
  return {kind: "timed-out", stdout: "", stderr: "", durationMs: 1, ...patch};
}

/** Fixed clock returning a constant instant, so every measured duration is exactly zero. */
const fixedClock: Clock = {
  monotonicNow: (): number => 0,
  isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
  delay: (): Promise<void> => Promise.resolve(),
};

/** Immutable environment whose executable path the provider must use for the worker request. */
const workerEnvironment: RuntimeEnvironment = snapshotNodeEnvironment();

interface CapturedRun {
  readonly command: Readonly<ProcessRequest>;
  readonly options: Readonly<{
    cwd?: string;
    env?: ProcessEnvironment;
    output?: string;
    timeoutMs?: number;
  }>;
}

function createFakeRunner(respond: (call: CapturedRun) => ProcessOutcome): {runner: ProcessRunner; calls: CapturedRun[]} {
  const calls: CapturedRun[] = [];
  const run = vi.fn(async (command: Readonly<ProcessRequest>, options: Readonly<CapturedRun["options"]> = {}) => {
    const call: CapturedRun = {command, options};
    calls.push(call);
    return respond(call);
  });
  const runner: ProcessRunner = {
    run,
    expectSuccess: () => {
      throw new Error("The aggregate provider never calls expectSuccess.");
    },
    scope: () => {
      throw new Error("The aggregate provider never scopes the shared runner.");
    },
  };
  return {runner, calls};
}

function validToolingFacts(): ToolingFacts {
  return {
    system: {os: "win32", shellVersion: "5.1.0"},
    tools: [{category: "Binaries", name: "Node", found: true, version: "20.0.0"}],
    packages: [{scope: "local", name: "@arolariu/website", installed: "1.0.0", wanted: "^1.0.0"}],
  };
}

function validHostFacts(): HostFacts {
  return {
    os: {platform: "win32", distro: "Windows", release: "10", arch: "x64"},
    cpu: {brand: "CPU", cores: 8, physicalCores: 4, virtualization: true},
    memory: {totalBytes: 100, usedBytes: 40, availableBytes: 60},
    load: {currentPercent: 10},
    filesystems: [{sizeBytes: 100, usedBytes: 40, availableBytes: 60, usedPercent: 40, repositoryVolume: true}],
    processes: {total: 100, running: 2, blocked: 0},
    portOwners: [{port: 3000, pid: 4242, processName: "node", repositoryOwned: true}],
    containers: {available: true, running: 1, stopped: 0, images: 2, repositoryContainers: ["mssql"]},
    network: {defaultInterfaceOperational: true, latencyMs: 5},
  };
}

function availableOutcome<T>(value: T, durationMs: number): InspectionOutcome<T> {
  return {kind: "available", value, durationMs};
}

function validWorkerDocument(): AggregateWorkerDocument {
  return {
    schemaVersion: 1,
    tooling: availableOutcome(validToolingFacts(), 3),
    host: availableOutcome(validHostFacts(), 4),
  };
}

function stdoutFor(document: unknown): string {
  return JSON.stringify(document);
}

// ============================================================================
// createAggregateProvider — command construction
// ============================================================================

describe("createAggregateProvider command construction", () => {
  it("invokes the current Node executable with the worker path, root, cwd, capture output, and the 60s timeout", async () => {
    const {runner, calls} = createFakeRunner(() => succeeded({stdout: stdoutFor(validWorkerDocument())}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("available");
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.command.command).toBe(process.execPath);
    expect(call.command.args).toEqual([resolve(REPOSITORY_ROOT, "scripts", "inspection", "aggregate-worker.ts"), resolve(REPOSITORY_ROOT)]);
    expect(call.options.cwd).toBe(resolve(REPOSITORY_ROOT));
    expect(call.options.output).toBe("capture");
    expect(call.options.timeoutMs).toBe(60_000);
    expect(AGGREGATE_TIMEOUT_MS).toBe(60_000);
  });

  it("reports a non-negative duration from the injected clock", async () => {
    let tick = 0;
    const clock: Clock = {
      monotonicNow: (): number => {
        const value = tick;
        tick += 7;
        return value;
      },
      isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
      delay: (): Promise<void> => Promise.resolve(),
    };
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(validWorkerDocument())}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock, environment: workerEnvironment})();

    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// createAggregateProvider — failure mapping
// ============================================================================

describe("createAggregateProvider failure mapping", () => {
  it("maps a spawn failure to unavailable without leaking the raw spawn error", async () => {
    const {runner} = createFakeRunner(() => spawnFailed("spawn ENOENT super-secret-raw-marker"));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).not.toContain("super-secret-raw-marker");
      expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("maps a nonzero exit to unavailable without raw stdout or stderr", async () => {
    const {runner} = createFakeRunner(() => exited(1, {stdout: "raw-stdout-secret-marker", stderr: "raw-stderr-secret-marker"}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).not.toContain("raw-stdout-secret-marker");
      expect(outcome.reason).not.toContain("raw-stderr-secret-marker");
    }
  });

  it("maps a timeout to unavailable evidence without raw output", async () => {
    const {runner} = createFakeRunner(() => timedOut({stdout: "raw-stdout-secret-marker", stderr: "raw-stderr-secret-marker"}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).toMatch(/timed out/iu);
      expect(outcome.reason).not.toContain("raw-stdout-secret-marker");
      expect(outcome.reason).not.toContain("raw-stderr-secret-marker");
    }
  });
});

// ============================================================================
// createAggregateProvider — document validation
// ============================================================================

describe("createAggregateProvider document validation", () => {
  it("maps empty stdout to invalid", async () => {
    const {runner} = createFakeRunner(() => succeeded({stdout: ""}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps malformed JSON to invalid without leaking raw output", async () => {
    const {runner} = createFakeRunner(() => succeeded({stdout: "not-json-secret-marker{{{"}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues.join("\n")).not.toContain("not-json-secret-marker");
    }
  });

  it("rejects more than one worker JSON document", async () => {
    const {runner} = createFakeRunner(() => succeeded({stdout: '{"schemaVersion":1}\n{"schemaVersion":1}\n'}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps a wrong schema version to invalid", async () => {
    const document = {...validWorkerDocument(), schemaVersion: 2};
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps a malformed nested outcome to invalid", async () => {
    const document = {schemaVersion: 1, tooling: {kind: "mystery", durationMs: 1}, host: availableOutcome(validHostFacts(), 4)};
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps a negative nested duration to invalid", async () => {
    const document = {schemaVersion: 1, tooling: {kind: "available", value: validToolingFacts(), durationMs: -1}, host: availableOutcome(validHostFacts(), 4)};
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("invalid");
  });
});

// ============================================================================
// createAggregateProvider — available reconstruction
// ============================================================================

describe("createAggregateProvider available reconstruction", () => {
  it("reconstructs fresh ToolingFacts and HostFacts copies for a fully available document", async () => {
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(validWorkerDocument())}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("available");
    if (outcome.kind === "available") {
      expect(outcome.value.tooling.kind).toBe("available");
      expect(outcome.value.host.kind).toBe("available");
      if (outcome.value.tooling.kind === "available") {
        expect(outcome.value.tooling.value).toEqual(validToolingFacts());
        expect(outcome.value.tooling.durationMs).toBe(3);
      }
      if (outcome.value.host.kind === "available") {
        expect(outcome.value.host.value).toEqual(validHostFacts());
        expect(outcome.value.host.durationMs).toBe(4);
      }
    }
  });

  it("reconstructs unavailable and invalid nested outcomes verbatim in a bounded shape", async () => {
    const document = {
      schemaVersion: 1,
      tooling: {kind: "unavailable", reason: "envinfo was unavailable (TypeError).", durationMs: 2},
      host: {kind: "invalid", issues: ["projectSystemInformation produced invalid data (SystemInformationProjectionError)."], durationMs: 6},
    };
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("available");
    if (outcome.kind === "available") {
      expect(outcome.value.tooling).toEqual({kind: "unavailable", reason: "envinfo was unavailable (TypeError).", durationMs: 2});
      expect(outcome.value.host).toEqual({
        kind: "invalid",
        issues: ["projectSystemInformation produced invalid data (SystemInformationProjectionError)."],
        durationMs: 6,
      });
    }
  });

  it("remains available for a valid schema-v1 document even when one nested component is unavailable", async () => {
    const document = {
      schemaVersion: 1,
      tooling: availableOutcome(validToolingFacts(), 3),
      host: {kind: "unavailable", reason: "systeminformation was unavailable (Error).", durationMs: 1},
    };
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("available");
    if (outcome.kind === "available") {
      expect(outcome.value.tooling.kind).toBe("available");
      expect(outcome.value.host.kind).toBe("unavailable");
    }
  });

  it("discards unknown raw secret fields at the root, outcome, and nested-fact levels", async () => {
    const tooling = validToolingFacts();
    const host = validHostFacts();
    const document = {
      schemaVersion: 1,
      injectedRootSecret: "ROOT_SECRET_LEAK",
      tooling: {
        kind: "available",
        injectedOutcomeSecret: "TOOLING_OUTCOME_SECRET_LEAK",
        value: {
          system: {...tooling.system, injectedSystemSecret: "SYSTEM_SECRET_LEAK"},
          tools: tooling.tools.map((tool) => ({...tool, injectedToolSecret: "TOOL_SECRET_LEAK"})),
          packages: tooling.packages.map((entry) => ({...entry, injectedPackageSecret: "PACKAGE_SECRET_LEAK"})),
          injectedFactsSecret: "TOOLING_FACTS_SECRET_LEAK",
        },
        durationMs: 3,
      },
      host: {
        kind: "available",
        injectedOutcomeSecret: "HOST_OUTCOME_SECRET_LEAK",
        value: {
          ...host,
          injectedHostSecret: "HOST_FACTS_SECRET_LEAK",
          os: {...host.os, injectedOsSecret: "OS_SECRET_LEAK"},
        },
        durationMs: 4,
      },
    };
    const {runner} = createFakeRunner(() => succeeded({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, clock: fixedClock, environment: workerEnvironment})();

    expect(outcome.kind).toBe("available");
    if (outcome.kind === "available") {
      const serialized = JSON.stringify(outcome.value);
      for (const secret of [
        "ROOT_SECRET_LEAK",
        "TOOLING_OUTCOME_SECRET_LEAK",
        "SYSTEM_SECRET_LEAK",
        "TOOL_SECRET_LEAK",
        "PACKAGE_SECRET_LEAK",
        "TOOLING_FACTS_SECRET_LEAK",
        "HOST_OUTCOME_SECRET_LEAK",
        "HOST_FACTS_SECRET_LEAK",
        "OS_SECRET_LEAK",
      ]) {
        expect(serialized).not.toContain(secret);
      }
      expect(outcome.value.tooling.kind).toBe("available");
      if (outcome.value.tooling.kind === "available") {
        expect(outcome.value.tooling.value).toEqual(validToolingFacts());
      }
      if (outcome.value.host.kind === "available") {
        expect(outcome.value.host.value).toEqual(validHostFacts());
      }
    }
  });
});

// ============================================================================
// Worker collection — in-process module mocks
// ============================================================================

interface HostDocumentOverrides {
  readonly getAllData?: () => Promise<unknown>;
  readonly dockerInfo?: () => Promise<unknown>;
  readonly dockerContainers?: (all?: boolean) => Promise<unknown>;
  readonly dockerImages?: (all?: boolean) => Promise<unknown>;
}

function validRawHostDocument(): Record<string, unknown> {
  return {
    os: {platform: "win32", distro: "Windows", release: "10", arch: "x64"},
    cpu: {brand: "CPU", cores: 8, physicalCores: 4, virtualization: true},
    mem: {total: 100, used: 40, available: 60},
    currentLoad: {currentLoad: 10},
    fsSize: [{size: 100, used: 40, available: 60, use: 40, mount: "C:\\"}],
    processes: {all: 100, running: 2, blocked: 0, list: []},
    networkConnections: [],
    net: [{default: true, operstate: "up"}],
    inetLatency: 5,
  };
}

function envinfoMockModule(cli: (options: unknown) => Promise<string>): Record<string, unknown> {
  return {default: {cli}};
}

/**
 * Builds the exact `systeminformation` `dockerInfo()` sentinel observed when no Docker-compatible
 * socket is reachable: the complete result record with every own value left `undefined`.
 *
 * @remarks
 * Live capture on the supported Podman host reported `ownKeys: 46, allValuesUndefined: true`, and
 * the value serializes as `{}`. The key list below is that captured own key set verbatim, so the
 * fixture cannot be satisfied by a hand-simplified empty object and any drift in the worker's
 * expected key set breaks the exact-sentinel case.
 *
 * @returns The no-engine `dockerInfo` sentinel record.
 */
function noEngineDockerInfoSentinel(): Record<string, unknown> {
  return Object.fromEntries(CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS.map((field) => [field, undefined]));
}

/** The captured own key set of the no-engine `dockerInfo()` sentinel, as observed live. */
const CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS: readonly string[] = [
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
];

/**
 * Builds the captured sentinel record with exactly one own key removed.
 *
 * @param omitted - Sentinel key to drop.
 * @returns The sentinel record without `omitted`.
 */
function sentinelWithoutKey(omitted: string): Record<string, unknown> {
  return Object.fromEntries(CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS.filter((field) => field !== omitted).map((field) => [field, undefined]));
}

function systeminformationMockModule(overrides: HostDocumentOverrides = {}): Record<string, unknown> {
  const api = {
    getAllData: overrides.getAllData ?? (async (): Promise<unknown> => validRawHostDocument()),
    dockerInfo: overrides.dockerInfo ?? (async (): Promise<unknown> => ({containersRunning: 1, containersStopped: 0, images: 2})),
    dockerContainers: overrides.dockerContainers ?? (async (): Promise<unknown> => [{name: "mssql", state: "running"}]),
    dockerImages: overrides.dockerImages ?? (async (): Promise<unknown> => [{id: "i1"}, {id: "i2"}]),
  };
  // The installed `systeminformation` module resolves with a CommonJS default interop value; the
  // mock mirrors that so the worker's `module.default ?? module` selection matches production.
  return {default: api, ...api};
}

async function loadWorkerWithMocks(mocks: {
  readonly envinfo: Record<string, unknown>;
  readonly systeminformation: Record<string, unknown>;
}): Promise<typeof import("./aggregate-worker.ts")> {
  vi.resetModules();
  vi.doMock("envinfo", () => mocks.envinfo);
  vi.doMock("systeminformation", () => mocks.systeminformation);
  return import("./aggregate-worker.ts");
}

const WORKER_ROOT = resolve(tmpdir(), "arolariu-aggregate-worker-root");

/** Deterministic timing and concurrency the in-process worker collection observes. */
const workerCapabilities = {clock: fixedClock, tasks: new DefaultTaskScheduler()} as const;

describe("collectAggregateWorkerDocument component collection", () => {
  it("collects available tooling and host facts through the mocked packages", async () => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({System: {OS: "Windows"}, Binaries: {Node: "20.0.0"}})),
      systeminformation: systeminformationMockModule(),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.schemaVersion).toBe(1);
    expect(document.tooling.kind).toBe("available");
    expect(document.host.kind).toBe("available");
    if (document.host.kind === "available") {
      expect(document.host.value.containers.available).toBe(true);
    }
  });

  it("maps invalid envinfo output to a nested invalid tooling outcome without leaking raw output", async () => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => "not-json-secret-marker"),
      systeminformation: systeminformationMockModule(),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.tooling.kind).toBe("invalid");
    if (document.tooling.kind === "invalid") {
      const joined = document.tooling.issues.join("\n");
      expect(joined).toContain("parseEnvinfoJson");
      expect(joined).not.toContain("not-json-secret-marker");
    }
  });

  it("maps an envinfo rejection to a nested unavailable tooling outcome with only name and class", async () => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => {
        throw new TypeError("secret-envinfo-message-do-not-leak");
      }),
      systeminformation: systeminformationMockModule(),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.tooling.kind).toBe("unavailable");
    if (document.tooling.kind === "unavailable") {
      expect(document.tooling.reason).toContain("envinfo");
      expect(document.tooling.reason).toContain("TypeError");
      expect(document.tooling.reason).not.toContain("secret-envinfo-message-do-not-leak");
    }
  });

  it("maps invalid host data to a nested invalid host outcome without leaking raw output", async () => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule({getAllData: async (): Promise<unknown> => ({injectedHostSecret: "host-secret-do-not-leak"})}),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("invalid");
    if (document.host.kind === "invalid") {
      const joined = document.host.issues.join("\n");
      expect(joined).toContain("projectSystemInformation");
      expect(joined).not.toContain("host-secret-do-not-leak");
    }
  });

  it("maps a base host collection rejection to a nested unavailable host outcome", async () => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule({
        getAllData: async (): Promise<unknown> => {
          throw new Error("secret-host-message-do-not-leak");
        },
      }),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("unavailable");
    if (document.host.kind === "unavailable") {
      expect(document.host.reason).not.toContain("secret-host-message-do-not-leak");
    }
  });

  it("keeps fulfilled host data when a single Docker call rejects", async () => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule({
        dockerInfo: async (): Promise<unknown> => {
          throw new Error("docker-secret-do-not-leak");
        },
      }),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("available");
    if (document.host.kind === "available") {
      expect(document.host.value.containers.available).toBe(true);
    }
  });

  it("reports containers unavailable when every Docker call rejects but base host data is valid", async () => {
    const reject = async (): Promise<unknown> => {
      throw new Error("docker-secret-do-not-leak");
    };
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule({dockerInfo: reject, dockerContainers: reject, dockerImages: reject}),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("available");
    if (document.host.kind === "available") {
      expect(document.host.value.containers.available).toBe(false);
    }
  });

  it("keeps every non-Docker host fact when an unreachable engine fulfils dockerInfo with the no-engine sentinel", async () => {
    // `systeminformation` fulfils (never rejects) when no Docker-compatible socket is reachable,
    // which is the normal state on the supported Podman host. Live capture there:
    //   dockerInfo isRecord: true / ownKeys: 46 / allValuesUndefined: true
    //   dockerContainers isArray: true length: 0 / dockerImages isArray: true length: 0
    // The sentinel is a fully-keyed record whose own values are every one `undefined`, so it
    // serializes as `{}` and cannot be recognized by an own-key count. Fulfilled list results are
    // forwarded unchanged: an empty list is genuine evidence of zero containers/images.
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule({
        dockerInfo: async (): Promise<unknown> => noEngineDockerInfoSentinel(),
        dockerContainers: async (): Promise<unknown> => [],
        dockerImages: async (): Promise<unknown> => [],
      }),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("available");
    if (document.host.kind === "available") {
      expect(document.host.value.memory).toEqual({totalBytes: 100, usedBytes: 40, availableBytes: 60});
      expect(document.host.value.filesystems.length).toBeGreaterThan(0);
      expect(document.host.value.os.platform).toBe("win32");
      expect(document.host.value.processes.total).toBe(100);
      // The forwarded empty lists remain the only Docker evidence, so the counts are derived from
      // them rather than from an omitted `dockerInfo`.
      expect(document.host.value.containers).toEqual({available: true, running: 0, stopped: 0, images: 0, repositoryContainers: []});
    }
  });

  it.each([
    {label: "a primitive dockerInfo", overrides: {dockerInfo: async (): Promise<unknown> => "not-a-record"}},
    {label: "an empty plain dockerInfo object carrying no sentinel keys", overrides: {dockerInfo: async (): Promise<unknown> => ({})}},
    {
      label: "an all-undefined dockerInfo record holding only one sentinel key",
      overrides: {dockerInfo: async (): Promise<unknown> => ({containersRunning: undefined})},
    },
    {
      label: "an all-undefined dockerInfo record holding an unrelated key",
      overrides: {dockerInfo: async (): Promise<unknown> => ({unexpected: undefined})},
    },
    {
      label: "the exact sentinel key set plus one extra undefined key",
      overrides: {dockerInfo: async (): Promise<unknown> => ({...noEngineDockerInfoSentinel(), unexpectedDrift: undefined})},
    },
    {
      label: "the exact sentinel key set minus one key",
      overrides: {dockerInfo: async (): Promise<unknown> => sentinelWithoutKey("serverVersion")},
    },
    {
      label: "a partially populated dockerInfo record",
      overrides: {dockerInfo: async (): Promise<unknown> => ({...noEngineDockerInfoSentinel(), containersRunning: 1})},
    },
    {
      label: "a wrong-shape dockerInfo count",
      overrides: {dockerInfo: async (): Promise<unknown> => ({containersRunning: "1", containersStopped: 0, images: 2})},
    },
    {
      label: "an out-of-range dockerInfo count",
      overrides: {dockerInfo: async (): Promise<unknown> => ({containersRunning: -3, containersStopped: 0, images: 2})},
    },
    {
      label: "the exact sentinel key set with one expected key swapped for an unknown key",
      overrides: {dockerInfo: async (): Promise<unknown> => ({...sentinelWithoutKey("serverVersion"), unknownServerVersion: undefined})},
    },
    {
      label: "a fulfilled-undefined dockerInfo result",
      overrides: {dockerInfo: async (): Promise<unknown> => undefined},
    },
    {
      label: "a fulfilled-undefined dockerContainers result",
      overrides: {dockerContainers: async (): Promise<unknown> => undefined},
    },
    {
      label: "a fulfilled-undefined dockerImages result",
      overrides: {dockerImages: async (): Promise<unknown> => undefined},
    },
    {label: "a non-array dockerContainers result", overrides: {dockerContainers: async (): Promise<unknown> => ({length: 0})}},
    {label: "a non-array dockerImages result", overrides: {dockerImages: async (): Promise<unknown> => "not-an-array"}},
  ])("still invalidates the host projection for $label", async ({overrides}) => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule(overrides),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("invalid");
    if (document.host.kind === "invalid") {
      expect(document.host.issues.join("\n")).toContain("projectSystemInformation");
    }
  });

  it("recognizes the no-engine sentinel regardless of own-key insertion order", async () => {
    // Own-key order carries no meaning in the captured result, so the detector compares the key
    // set order-independently. This fixture rotates the captured order by half and reverses it, a
    // permutation that shares neither prefix nor suffix with the original.
    const rotated = [...CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS.slice(23), ...CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS.slice(0, 23)].reverse();
    const permuted = Object.fromEntries(rotated.map((field) => [field, undefined]));
    expect(Object.keys(permuted)).toHaveLength(CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS.length);
    expect(Object.keys(permuted)).not.toEqual([...CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS]);
    expect([...Object.keys(permuted)].toSorted()).toEqual([...CAPTURED_NO_ENGINE_DOCKER_INFO_KEYS].toSorted());

    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule({dockerInfo: async (): Promise<unknown> => permuted}),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("available");
    if (document.host.kind === "available") {
      expect(document.host.value.memory).toEqual({totalBytes: 100, usedBytes: 40, availableBytes: 60});
      expect(document.host.value.filesystems.length).toBeGreaterThan(0);
      expect(document.host.value.processes.total).toBe(100);
    }
  });

  it("keeps host facts available when every Docker call rejects, proving rejection still omits the property", async () => {
    const reject = async (): Promise<unknown> => {
      throw new Error("docker-secret-do-not-leak");
    };
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule({dockerInfo: reject, dockerContainers: reject, dockerImages: reject}),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    expect(document.host.kind).toBe("available");
    if (document.host.kind === "available") {
      expect(document.host.value.containers).toEqual({available: false, running: 0, stopped: 0, images: 0, repositoryContainers: []});
      expect(document.host.value.memory).toEqual({totalBytes: 100, usedBytes: 40, availableBytes: 60});
    }
  });

  it("never includes supplied error messages, stacks, or paths in nested worker errors", async () => {
    const secret = "C:\\secret\\path\\leak.txt do-not-leak-marker";
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => {
        const error = new TypeError(secret);
        error.stack = `stack trace ${secret}`;
        throw error;
      }),
      systeminformation: systeminformationMockModule({
        getAllData: async (): Promise<unknown> => {
          throw new RangeError(secret);
        },
      }),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT, workerCapabilities);

    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain("do-not-leak-marker");
    expect(serialized).not.toContain("secret\\path");
    expect(document.tooling.kind).toBe("unavailable");
    expect(document.host.kind).toBe("unavailable");
  });
});

// ============================================================================
// Worker CLI argument validation — subprocess, no host collection
// ============================================================================

describe("aggregate worker CLI argument validation", () => {
  it(
    "emits one normalized failure document and no stderr when the root argument is missing",
    async () => {
      const result = await createNodeProcessRunner(snapshotNodeEnvironment()).run(
        {command: process.execPath, args: [WORKER_PATH]},
        {output: "capture"},
      );

      expect(result.kind).toBe("succeeded");
      expect(result.stderr.trim()).toBe("");
      const parsed = JSON.parse(result.stdout.trim()) as AggregateWorkerDocument;
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.tooling.kind).toBe("unavailable");
      expect(parsed.host.kind).toBe("unavailable");
      expect(parsed.tooling.durationMs).toBe(0);
      expect(parsed.host.durationMs).toBe(0);
    },
    30_000,
  );

  it(
    "emits one normalized failure document and no stderr when extra arguments are supplied",
    async () => {
      const result = await createNodeProcessRunner(snapshotNodeEnvironment()).run(
        {command: process.execPath, args: [WORKER_PATH, "root-a", "root-b"]},
        {output: "capture"},
      );

      expect(result.kind).toBe("succeeded");
      expect(result.stderr.trim()).toBe("");
      const parsed = JSON.parse(result.stdout.trim()) as AggregateWorkerDocument;
      expect(parsed.schemaVersion).toBe(1);
      expect(parsed.tooling.kind).toBe("unavailable");
      expect(parsed.host.kind).toBe("unavailable");
      expect(parsed.tooling.durationMs).toBe(0);
      expect(parsed.host.durationMs).toBe(0);
    },
    30_000,
  );
});

// ============================================================================
// Worker command object — in-process, no host collection
// ============================================================================

describe("createAggregateWorkerCommand", () => {
  it("normalizes zero roots into the bounded schema-v1 unavailable document with a completed exit code", async () => {
    const command = createAggregateWorkerCommand({host: buildCommandHost()});

    const execution = await command.run([]);

    expect(execution.status).toBe("completed");
    expect(execution.exitCode).toBe(0);
    if (execution.status === "completed") {
      expect(execution.value.schemaVersion).toBe(1);
      expect(execution.value.tooling).toEqual({kind: "unavailable", reason: expect.stringContaining("invalid arguments"), durationMs: 0});
      expect(execution.value.host).toEqual({kind: "unavailable", reason: expect.stringContaining("invalid arguments"), durationMs: 0});
    }
  });

  it("normalizes several roots without emitting a Commander usage diagnostic", async () => {
    const command = createAggregateWorkerCommand({host: buildCommandHost()});

    const execution = await command.run(["root-a", "root-b"]);

    expect(execution.status).toBe("completed");
    expect(execution.exitCode).toBe(0);
  });

  it("normalizes one blank root without invoking any package collection", async () => {
    const command = createAggregateWorkerCommand({host: buildCommandHost()});

    const execution = await command.invoke({repositoryRoots: ["   "]});

    expect(execution.status).toBe("completed");
    if (execution.status === "completed") {
      expect(execution.value.tooling.kind).toBe("unavailable");
      expect(execution.value.host.kind).toBe("unavailable");
    }
  });

  it("exports one production singleton command for direct entry", () => {
    expect(typeof aggregateWorkerCommand.runIfMain).toBe("function");
    expect(aggregateWorkerCommand).not.toBe(createAggregateWorkerCommand());
  });
});

// ============================================================================
// Live package-API shape — real envinfo, no host collection
// ============================================================================

describe("envinfo package interop shape", () => {
  it("exposes envinfo.cli as a function on the installed package default interop value", async () => {
    vi.resetModules();
    const envinfoModule = await vi.importActual<Record<string, unknown>>("envinfo");
    const envinfo = (envinfoModule["default"] ?? envinfoModule) as {cli?: unknown};

    expect(typeof envinfo.cli).toBe("function");
  });
});
