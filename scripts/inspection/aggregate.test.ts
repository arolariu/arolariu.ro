// @vitest-environment node
/**
 * @fileoverview Contract tests for the isolated aggregate inspection worker and its parent provider.
 * @module scripts/inspection/aggregate.test
 */

import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {describe, expect, it, vi} from "vitest";

import {defaultCommandRunner, type CommandResult, type CommandRunner, type CommandSpec} from "../common/process.ts";
import {AGGREGATE_TIMEOUT_MS, createAggregateProvider, type AggregateWorkerDocument} from "./aggregate.ts";
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

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false, ...patch};
}

interface CapturedRun {
  readonly command: Readonly<CommandSpec>;
  readonly options: Readonly<{
    cwd?: string;
    env?: Readonly<NodeJS.ProcessEnv>;
    output?: string;
    timeoutMs?: number;
  }>;
}

function createFakeRunner(respond: (call: CapturedRun) => CommandResult): {runner: CommandRunner; calls: CapturedRun[]} {
  const calls: CapturedRun[] = [];
  const run = vi.fn(async (command: Readonly<CommandSpec>, options: Readonly<CapturedRun["options"]> = {}) => {
    const call: CapturedRun = {command, options};
    calls.push(call);
    return respond(call);
  });
  return {runner: {run}, calls};
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
    const {runner, calls} = createFakeRunner(() => commandResult({stdout: stdoutFor(validWorkerDocument())}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

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
    const now = (): number => {
      const value = tick;
      tick += 7;
      return value;
    };
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(validWorkerDocument())}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now})();

    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// createAggregateProvider — failure mapping
// ============================================================================

describe("createAggregateProvider failure mapping", () => {
  it("maps a spawn failure to unavailable without leaking the raw spawn error", async () => {
    const {runner} = createFakeRunner(() => commandResult({spawnError: "spawn ENOENT super-secret-raw-marker"}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).not.toContain("super-secret-raw-marker");
      expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("maps a nonzero exit to unavailable without raw stdout or stderr", async () => {
    const {runner} = createFakeRunner(() => commandResult({code: 1, stdout: "raw-stdout-secret-marker", stderr: "raw-stderr-secret-marker"}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("unavailable");
    if (outcome.kind === "unavailable") {
      expect(outcome.reason).not.toContain("raw-stdout-secret-marker");
      expect(outcome.reason).not.toContain("raw-stderr-secret-marker");
    }
  });

  it("maps a timeout to unavailable evidence without raw output", async () => {
    const {runner} = createFakeRunner(() => commandResult({code: 1, timedOut: true, stdout: "raw-stdout-secret-marker", stderr: "raw-stderr-secret-marker"}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

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
    const {runner} = createFakeRunner(() => commandResult({stdout: ""}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps malformed JSON to invalid without leaking raw output", async () => {
    const {runner} = createFakeRunner(() => commandResult({stdout: "not-json-secret-marker{{{"}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues.join("\n")).not.toContain("not-json-secret-marker");
    }
  });

  it("rejects more than one worker JSON document", async () => {
    const {runner} = createFakeRunner(() => commandResult({stdout: '{"schemaVersion":1}\n{"schemaVersion":1}\n'}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps a wrong schema version to invalid", async () => {
    const document = {...validWorkerDocument(), schemaVersion: 2};
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps a malformed nested outcome to invalid", async () => {
    const document = {schemaVersion: 1, tooling: {kind: "mystery", durationMs: 1}, host: availableOutcome(validHostFacts(), 4)};
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("invalid");
  });

  it("maps a negative nested duration to invalid", async () => {
    const document = {schemaVersion: 1, tooling: {kind: "available", value: validToolingFacts(), durationMs: -1}, host: availableOutcome(validHostFacts(), 4)};
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

    expect(outcome.kind).toBe("invalid");
  });
});

// ============================================================================
// createAggregateProvider — available reconstruction
// ============================================================================

describe("createAggregateProvider available reconstruction", () => {
  it("reconstructs fresh ToolingFacts and HostFacts copies for a fully available document", async () => {
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(validWorkerDocument())}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

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
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

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
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

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
    const {runner} = createFakeRunner(() => commandResult({stdout: stdoutFor(document)}));

    const outcome = await createAggregateProvider({root: REPOSITORY_ROOT, runner, now: () => 0})();

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
 * socket is reachable: the full result record with every own value left `undefined`.
 *
 * @remarks
 * Live capture on the supported Podman host reported `ownKeys: 46, allValuesUndefined: true`, and
 * the value serializes as `{}`. The key list below is that captured field set, so the fixture
 * cannot be satisfied by a hand-simplified empty object.
 *
 * @returns The no-engine `dockerInfo` sentinel record.
 */
function noEngineDockerInfoSentinel(): Record<string, unknown> {
  const capturedFields = [
    "id",
    "containers",
    "containersRunning",
    "containersPaused",
    "containersStopped",
    "images",
    "driver",
    "memoryLimit",
    "swapLimit",
    "kernelMemory",
    "cpuCfsPeriod",
    "cpuCfsQuota",
    "cpuShares",
    "cpuSet",
    "ipv4Forwarding",
    "bridgeNfIptables",
    "bridgeNfIp6tables",
    "debug",
    "nfd",
    "oomKillDisable",
    "ngoroutines",
    "systemTime",
    "loggingDriver",
    "cgroupDriver",
    "nEventsListener",
    "kernelVersion",
    "operatingSystem",
    "osType",
    "architecture",
    "ncpu",
    "memTotal",
    "dockerRootDir",
    "httpProxy",
    "httpsProxy",
    "noProxy",
    "name",
    "labels",
    "experimentalBuild",
    "serverVersion",
    "clusterStore",
    "clusterAdvertise",
    "defaultRuntime",
    "liveRestoreEnabled",
    "isolation",
    "initBinary",
    "productLicense",
  ];

  return Object.fromEntries(capturedFields.map((field) => [field, undefined]));
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

describe("collectAggregateWorkerDocument component collection", () => {
  it("collects available tooling and host facts through the mocked packages", async () => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({System: {OS: "Windows"}, Binaries: {Node: "20.0.0"}})),
      systeminformation: systeminformationMockModule(),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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
    {label: "a non-array dockerContainers result", overrides: {dockerContainers: async (): Promise<unknown> => ({length: 0})}},
    {label: "a non-array dockerImages result", overrides: {dockerImages: async (): Promise<unknown> => "not-an-array"}},
  ])("still invalidates the host projection for $label", async ({overrides}) => {
    const worker = await loadWorkerWithMocks({
      envinfo: envinfoMockModule(async () => JSON.stringify({})),
      systeminformation: systeminformationMockModule(overrides),
    });

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

    expect(document.host.kind).toBe("invalid");
    if (document.host.kind === "invalid") {
      expect(document.host.issues.join("\n")).toContain("projectSystemInformation");
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

    const document = await worker.collectAggregateWorkerDocument(WORKER_ROOT);

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
      const result = await defaultCommandRunner.run({command: process.execPath, args: [WORKER_PATH]}, {output: "capture"});

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
      const result = await defaultCommandRunner.run(
        {command: process.execPath, args: [WORKER_PATH, "root-a", "root-b"]},
        {output: "capture"},
      );

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
