// @vitest-environment node
/**
 * @fileoverview Real-engine tests for the Node runtime capability adapters.
 * @module scripts/adapters/node/node-capabilities.test
 *
 * @remarks
 * Importing `runtime-capability.contract.ts` runs the shared contract once against the in-memory
 * fixtures; this module runs it a second time against the real Node adapters. Everything below the
 * contract invocation is behavior only a real engine can prove: platform error wrapping, symlink
 * resolution, atomic-rename residue, retry/timeout/streaming policy, environment snapshots,
 * process-host facts, and real child-process spawning.
 */

import type {AddressInfo} from "node:net";
import {createServer, type Server, type ServerResponse} from "node:http";
import {mkdir, mkdtemp, readdir, rm, stat, symlink, realpath as nodeRealpath, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

const {mockedAccess} = vi.hoisted(() => ({mockedAccess: vi.fn()}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  mockedAccess.mockImplementation(actual.access);
  return {...actual, access: mockedAccess};
});

import {FileSystemError, HttpError, type RuntimeEnvironment} from "../../core/runtime/runtime-capability.ts";
import {LifoCleanupRegistry} from "../../core/runtime/cleanup.ts";
import {runRuntimeCapabilityContract} from "../../testing/contracts/runtime-capability.contract.ts";
import {createNodeCommandHost} from "./node-command-host.ts";
import {nodeFileSystem} from "./node-filesystem.ts";
import {nodeHttpClient} from "./node-http-client.ts";
import {defaultNodeRuntimeCapabilityLoaders} from "./node-lazy-capabilities.ts";
import {nodeClock, nodeTaskScheduler, snapshotNodeEnvironment} from "./node-platform.ts";
import {nodeProcessHost, registerProcessTerminationHandlers} from "./node-process-host.ts";
import {createNodeProcessRunner, nodeProcessRunner} from "./node-process-runner.ts";

const REAL_SPAWN_TIMEOUT_MS = 45_000;
const temporaryRoots: string[] = [];
let server: Server;
let baseUrl: URL;
let requestCounts: Map<string, number>;

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "arolariu-node-capabilities-test-"));
  temporaryRoots.push(root);
  return root;
}

/** Streams 1 KiB chunks every 5ms and never ends, so a short timeout always fires mid-body. */
function streamForever(response: ServerResponse): void {
  response.writeHead(200, {"content-type": "application/octet-stream"});
  let cancelled = false;
  response.on("close", () => {
    cancelled = true;
  });
  const writeChunk = (): void => {
    if (cancelled || response.writableEnded) {
      return;
    }
    response.write("x".repeat(1_024));
    setTimeout(writeChunk, 5);
  };
  writeChunk();
}

beforeAll(async () => {
  requestCounts = new Map();
  server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const count = (requestCounts.get(url.pathname) ?? 0) + 1;
    requestCounts.set(url.pathname, count);
    switch (url.pathname) {
      case "/ok": {
        response.writeHead(200, {"content-type": "text/plain", "x-count": String(count)});
        response.end("hello");
        return;
      }
      case "/retry-then-success": {
        response.writeHead(count < 3 ? 503 : 200, {"content-type": "text/plain"});
        response.end(count < 3 ? "unavailable" : "recovered");
        return;
      }
      case "/always-unavailable": {
        response.writeHead(503, {"content-type": "text/plain"});
        response.end("unavailable");
        return;
      }
      case "/slow": {
        setTimeout(() => {
          response.writeHead(200, {"content-type": "text/plain"});
          response.end("slow");
        }, 2_000);
        return;
      }
      case "/large": {
        streamForever(response);
        return;
      }
      default: {
        response.writeHead(404);
        response.end();
      }
    }
  });
  await new Promise<void>((resolvePromise) => {
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  baseUrl = new URL(`http://127.0.0.1:${String((server.address() as AddressInfo).port)}`);
});

afterAll(async () => {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
  });
});

beforeEach(async () => {
  // Vitest's global `mockReset: true` clears every mock's implementation before each test, so the
  // real `access` delegate must be re-armed here rather than once inside the `vi.mock` factory.
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  mockedAccess.mockImplementation(actual.access);
});

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

runRuntimeCapabilityContract({
  label: "Node adapters",
  createFileSystem: async () => ({files: nodeFileSystem, root: await createTempRoot()}),
  createSuccessfulHttpClient: async () => ({http: nodeHttpClient, url: new URL("/ok", baseUrl)}),
  createFailingHttpClient: async () => ({http: nodeHttpClient, url: new URL("http://127.0.0.1:1")}),
  createClock: () => ({clock: nodeClock, advance: () => Promise.resolve()}),
  createTaskScheduler: () => nodeTaskScheduler,
  createCleanupRegistry: () => new LifoCleanupRegistry(),
});

describe("nodeFileSystem real-engine behavior", () => {
  it("wraps a non-ENOENT access failure into a code-preserving FileSystemError", async () => {
    const path = resolve(await createTempRoot(), "file.txt");
    await writeFile(path, "value", "utf8");
    mockedAccess.mockRejectedValueOnce(Object.assign(new Error("EACCES: permission denied"), {code: "EACCES"}));
    await expect(nodeFileSystem.exists(path)).rejects.toMatchObject({code: "EACCES", operation: "exists", path});
    await expect(nodeFileSystem.assertAccessible(path, {read: true})).resolves.toBeUndefined();
  });

  it("resolves a canonical symlink path and removes a temporary sibling after a failed atomic rename", async () => {
    const root = await createTempRoot();
    const targetDirectory = resolve(root, "target");
    await mkdir(targetDirectory);
    const destinationDirectory = resolve(root, "config.json");
    await mkdir(destinationDirectory);
    await expect(nodeFileSystem.writeTextAtomic(destinationDirectory, "value", {mode: 0o600})).rejects.toBeInstanceOf(FileSystemError);
    expect((await readdir(dirname(destinationDirectory))).every((name) => !name.includes(".tmp"))).toBe(true);
    try {
      await symlink(targetDirectory, resolve(root, "link"), "junction");
    } catch {
      // Directory junctions/symlinks are unavailable in this sandbox; skip the assertion instead
      // of failing on an environment limitation unrelated to the adapter itself.
      return;
    }
    await expect(nodeFileSystem.realPath(resolve(root, "link"))).resolves.toBe(await nodeRealpath(targetDirectory));
  });

  it.runIf(process.platform !== "win32")("sets POSIX permission bits", async () => {
    const path = resolve(await createTempRoot(), "file.txt");
    await writeFile(path, "value", "utf8");
    await nodeFileSystem.setMode(path, 0o600);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });
});

describe("nodeHttpClient real-engine policy", {timeout: REAL_SPAWN_TIMEOUT_MS}, () => {
  it.each([
    [
      "a caller abort",
      (): Readonly<{url: URL; signal?: AbortSignal; timeoutMs?: number}> => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 50);
        return {url: new URL("/slow", baseUrl), signal: controller.signal};
      },
    ],
    ["its own timeout", () => ({url: new URL("/slow", baseUrl), timeoutMs: 50})],
  ] as const)("rejects a slow request on %s instead of waiting for the full delay", async (_label, buildRequest) => {
    const startedAt = Date.now();
    await expect(nodeHttpClient.request(buildRequest())).rejects.toBeInstanceOf(HttpError);
    expect(Date.now() - startedAt).toBeLessThan(1_500);
  });

  it("bounds response bytes and surfaces a bounded HttpError when the timeout elapses mid-body", async () => {
    const startedAt = Date.now();
    await expect(
      nodeHttpClient.request({url: new URL("/large", baseUrl), maximumResponseBytes: 2_048, timeoutMs: 5_000}),
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      nodeHttpClient.request({url: new URL("/large", baseUrl), timeoutMs: 50, maximumResponseBytes: 10 * 1_024 * 1_024}),
    ).rejects.toBeInstanceOf(HttpError);
    expect(Date.now() - startedAt).toBeLessThan(3_000);
  });

  it("retries an idempotent GET only for an explicitly listed status, and never a POST", async () => {
    const retried = await nodeHttpClient.request({
      url: new URL("/retry-then-success", baseUrl),
      method: "GET",
      retry: {attempts: 3, delayMs: 5, statuses: [503]},
    });
    const posted = await nodeHttpClient.request({
      url: new URL("/always-unavailable", baseUrl),
      method: "POST",
      retry: {attempts: 3, delayMs: 5, statuses: [503]},
    });
    expect(retried).toMatchObject({status: 200, text: "recovered"});
    expect(requestCounts.get("/retry-then-success")).toBe(3);
    expect(posted.status).toBe(503);
    expect(requestCounts.get("/always-unavailable")).toBe(1);
  });

  it("returns a bounded HttpError, not a raw DOMException, when the caller aborts during retry backoff", async () => {
    const before = requestCounts.get("/always-unavailable") ?? 0;
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    await expect(
      nodeHttpClient.request({
        url: new URL("/always-unavailable", baseUrl),
        method: "GET",
        retry: {attempts: 5, delayMs: 500, statuses: [503]},
        signal: controller.signal,
      }),
    ).rejects.toBeInstanceOf(HttpError);
    // The caller abort must land during the backoff wait after the first attempt, not after every
    // attempt has already run its course.
    expect((requestCounts.get("/always-unavailable") ?? 0) - before).toBeLessThan(5);
  });

  it("bounds every retry attempt and backoff delay together by one overall timeoutMs budget", async () => {
    const before = requestCounts.get("/always-unavailable") ?? 0;
    const startedAt = Date.now();
    await expect(
      nodeHttpClient.request({
        url: new URL("/always-unavailable", baseUrl),
        method: "GET",
        timeoutMs: 50,
        retry: {attempts: 10, delayMs: 200, statuses: [503]},
      }),
    ).rejects.toBeInstanceOf(HttpError);
    // A per-attempt (rather than one overall) timeout would let every one of the 10 configured
    // attempts (plus its 200ms backoff) run to completion, taking well over a second.
    expect(Date.now() - startedAt).toBeLessThan(300);
    expect((requestCounts.get("/always-unavailable") ?? 0) - before).toBeLessThan(3);
  });
});

describe("nodeClock and snapshotNodeEnvironment", () => {
  it("resolves after the requested delay and captures an immutable environment snapshot", async () => {
    const startedAt = performance.now();
    await nodeClock.delay(20);
    process.env["RUNTIME_SNAPSHOT_TEST"] = "before";
    const snapshot = snapshotNodeEnvironment();
    process.env["RUNTIME_SNAPSHOT_TEST"] = "after";
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(10);
    expect(snapshot).toMatchObject({
      platform: process.platform,
      architecture: process.arch,
      executablePath: process.execPath,
      cwd: process.cwd(),
    });
    expect(snapshot.variables["RUNTIME_SNAPSHOT_TEST"]).toBe("before");
    delete process.env["RUNTIME_SNAPSHOT_TEST"];
  });
});

describe("nodeProcessHost", () => {
  it("exposes an immutable argv snapshot, recognizes only the started module, and assigns the exit code", () => {
    const entrypoint = process.argv[1];
    const previousExitCode = process.exitCode;
    try {
      nodeProcessHost.setExitCode(2);
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }
    expect(nodeProcessHost.argv).toEqual(process.argv.slice(2));
    expect(Object.isFrozen(nodeProcessHost.argv)).toBe(true);
    expect(entrypoint).toBeDefined();
    expect(nodeProcessHost.isDirectEntry(pathToFileURL(entrypoint ?? "").href)).toBe(true);
    expect(nodeProcessHost.isDirectEntry(pathToFileURL(resolve(dirname(entrypoint ?? ""), "not-the-entry.ts")).href)).toBe(false);
  });

  it("registers exactly one SIGINT and one SIGTERM handler and removes both on unregister", () => {
    const interruptsBefore = process.listeners("SIGINT");
    const terminationsBefore = process.listeners("SIGTERM");
    const observed: string[] = [];
    const registration = registerProcessTerminationHandlers({
      onInterrupt: () => observed.push("interrupt"),
      onTerminate: () => observed.push("terminate"),
    });
    const addedInterrupts = process.listeners("SIGINT").filter((listener) => !interruptsBefore.includes(listener));
    const addedTerminations = process.listeners("SIGTERM").filter((listener) => !terminationsBefore.includes(listener));
    [...addedInterrupts, ...addedTerminations].forEach((listener) => {
      listener("SIGINT");
    });
    registration.unregister();
    expect(addedInterrupts).toHaveLength(1);
    expect(addedTerminations).toHaveLength(1);
    expect(observed).toEqual(["interrupt", "terminate"]);
    expect(process.listeners("SIGINT")).toEqual(interruptsBefore);
    expect(process.listeners("SIGTERM")).toEqual(terminationsBefore);
  });

  it("tolerates a second unregister without removing another listener", () => {
    const interruptsBefore = process.listeners("SIGINT");
    const foreign = (): void => undefined;
    const registration = registerProcessTerminationHandlers({onInterrupt: () => undefined, onTerminate: () => undefined});
    registration.unregister();
    process.on("SIGINT", foreign);
    registration.unregister();
    try {
      expect(process.listeners("SIGINT")).toEqual([...interruptsBefore, foreign]);
    } finally {
      process.off("SIGINT", foreign);
    }
  });
});

describe("createNodeProcessRunner / nodeProcessRunner", {timeout: REAL_SPAWN_TIMEOUT_MS}, () => {
  it("spawns a child observing exactly the supplied environment snapshot, not ambient process.env", async () => {
    const environment: RuntimeEnvironment = {
      variables: {AROLARIU_RUNTIME_NODE_TEST: "from-snapshot"},
      cwd: process.cwd(),
      executablePath: process.execPath,
      platform: process.platform,
      architecture: process.arch,
      stdinIsTTY: false,
      stdoutIsTTY: false,
      isCI: false,
    };
    const outcome = await createNodeProcessRunner(environment).run({
      command: process.execPath,
      args: ["-e", "process.stdout.write(String(process.env.AROLARIU_RUNTIME_NODE_TEST))"],
    });
    expect(outcome).toMatchObject({kind: "succeeded", exitCode: 0, stdout: "from-snapshot"});
  });

  it("nodeProcessRunner snapshots a fresh environment for each standalone run(), scope(), and expectSuccess()", async () => {
    const previous = process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"];
    process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"] = "facade-value";
    const request = {
      command: process.execPath,
      args: ["-e", "process.stdout.write(String(process.env.AROLARIU_RUNTIME_NODE_FACADE_TEST))"],
    };
    try {
      expect(await nodeProcessRunner.run(request)).toMatchObject({kind: "succeeded", exitCode: 0, stdout: "facade-value"});
      expect(await nodeProcessRunner.scope({timeoutMs: 30_000}).expectSuccess(request)).toMatchObject({stdout: "facade-value"});
    } finally {
      if (previous === undefined) {
        delete process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"];
      } else {
        process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"] = previous;
      }
    }
  });

  it("resolves every production capability loader through its own literal dynamic import", async () => {
    const environment = snapshotNodeEnvironment();
    const host = createNodeCommandHost("sample");

    expect(await defaultNodeRuntimeCapabilityLoaders.loadFileSystem()).toBe(nodeFileSystem);
    expect(await defaultNodeRuntimeCapabilityLoaders.loadHttpClient()).toBe(nodeHttpClient);
    expect(typeof (await defaultNodeRuntimeCapabilityLoaders.loadProcessRunner(environment)).run).toBe("function");
    expect(typeof (await defaultNodeRuntimeCapabilityLoaders.loadPromptProvider()).confirm).toBe("function");
    expect(host.argv).toEqual(nodeProcessHost.argv);
    expect(typeof host.createParsePresenter().fork).toBe("function");
    expect(typeof (await host.loadRuntimeFactory(false)).createRoot).toBe("function");
  });
});
