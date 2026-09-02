// @vitest-environment node
/**
 * @fileoverview Tests for the sole Node.js-backed runtime capability adapter.
 * @module scripts/common/runtime.node.test
 */

import type {AddressInfo} from "node:net";
import {createServer, type Server} from "node:http";
import {mkdir, mkdtemp, readdir, readFile, realpath as nodeRealpath, rm, stat, symlink, writeFile} from "node:fs/promises";
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

import {FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE, FileSystemError, HttpError, CommandCancellation, type RuntimeEnvironment} from "./runtime.ts";
import type {CommandContext} from "./commander.ts";
import {createRepositoryPaths} from "./repository-paths.ts";
import {createRepositoryInspectionSessionStub} from "./runtime.testing.ts";
import {
  createNodeCommandRuntimeFactory,
  createNodeProcessRunner,
  createNodeRuntimeScope,
  nodeClock,
  nodeFileSystem,
  nodeHttpClient,
  nodeLoggerRuntimeHost,
  nodeProcessHost,
  nodeProcessRunner,
  nodeTaskScheduler,
  snapshotNodeEnvironment,
} from "./runtime.node.ts";

const REAL_SPAWN_TIMEOUT_MS = 45_000;

const temporaryRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "arolariu-runtime-node-test-"));
  temporaryRoots.push(root);
  return root;
}

beforeEach(async () => {
  // Vitest's global `mockReset: true` clears every mock's implementation before each test, so the
  // real `access` delegate must be re-armed here rather than once inside the `vi.mock` factory.
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  mockedAccess.mockImplementation(actual.access);
});

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("nodeFileSystem", () => {
  describe("readText", () => {
    it("reads a file's full UTF-8 contents", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.txt");
      await writeFile(path, "hello world", "utf8");

      await expect(nodeFileSystem.readText(path)).resolves.toBe("hello world");
    });

    it("rejects with the original ENOENT code for a missing file", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "missing.txt");

      await expect(nodeFileSystem.readText(path)).rejects.toMatchObject({code: "ENOENT"});
    });
  });

  describe("readBytes", () => {
    it("reads a file's full contents when unbounded", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.bin");
      await writeFile(path, Buffer.from([1, 2, 3, 4]));

      const bytes = await nodeFileSystem.readBytes(path);

      expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
    });

    it("reads a file within a bounded limit", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.bin");
      await writeFile(path, "abcde", "utf8");

      const bytes = await nodeFileSystem.readBytes(path, {maximumBytes: 10});

      expect(Buffer.from(bytes).toString("utf8")).toBe("abcde");
    });

    it("rejects a file exceeding the bounded limit with a preserved MAX_BYTES_EXCEEDED code", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.bin");
      await writeFile(path, "this text is more than ten bytes long", "utf8");

      await expect(nodeFileSystem.readBytes(path, {maximumBytes: 10})).rejects.toMatchObject({
        code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
      });
      await expect(nodeFileSystem.readBytes(path, {maximumBytes: 10})).rejects.toBeInstanceOf(FileSystemError);
    });

    it("rejects a negative or non-integer maximumBytes without opening the file", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.bin");
      await writeFile(path, "abc", "utf8");

      await expect(nodeFileSystem.readBytes(path, {maximumBytes: -1})).rejects.toBeInstanceOf(RangeError);
      await expect(nodeFileSystem.readBytes(path, {maximumBytes: 1.5})).rejects.toBeInstanceOf(RangeError);
    });
  });

  describe("exists", () => {
    it("returns true for an existing file", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.txt");
      await writeFile(path, "value", "utf8");

      await expect(nodeFileSystem.exists(path)).resolves.toBe(true);
    });

    it("returns false for a missing path", async () => {
      const root = await createTempRoot();

      await expect(nodeFileSystem.exists(resolve(root, "missing.txt"))).resolves.toBe(false);
    });

    it("wraps a non-ENOENT access failure into a code-preserving FileSystemError", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.txt");
      await writeFile(path, "value", "utf8");

      const permissionError = Object.assign(new Error("EACCES: permission denied"), {code: "EACCES"});
      mockedAccess.mockRejectedValueOnce(permissionError);

      await expect(nodeFileSystem.exists(path)).rejects.toMatchObject({
        code: "EACCES",
        operation: "exists",
        path,
      });
    });
  });

  describe("assertAccessible", () => {
    it("resolves for an existing, accessible file", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.txt");
      await writeFile(path, "value", "utf8");

      await expect(nodeFileSystem.assertAccessible(path, {read: true})).resolves.toBeUndefined();
    });

    it("throws a code-preserving FileSystemError for a missing path", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "missing.txt");

      await expect(nodeFileSystem.assertAccessible(path, {read: true})).rejects.toMatchObject({
        code: "ENOENT",
        operation: "assertAccessible",
        path,
      });
      await expect(nodeFileSystem.assertAccessible(path)).rejects.toBeInstanceOf(FileSystemError);
    });
  });

  describe("realPath", () => {
    it("resolves a canonical path through a directory junction/symlink", async () => {
      const root = await createTempRoot();
      const targetDirectory = resolve(root, "target");
      await mkdir(targetDirectory);
      const linkDirectory = resolve(root, "link");

      try {
        await symlink(targetDirectory, linkDirectory, "junction");
      } catch {
        // Directory junctions/symlinks are unavailable in this sandbox; skip the assertion
        // instead of failing on an environment limitation unrelated to the adapter itself.
        return;
      }

      const resolved = await nodeFileSystem.realPath(linkDirectory);
      expect(resolved).toBe(await nodeRealpath(targetDirectory));
    });

    it("throws a code-preserving FileSystemError for a missing path", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "missing");

      await expect(nodeFileSystem.realPath(path)).rejects.toMatchObject({code: "ENOENT", operation: "realPath"});
    });
  });

  describe("inspect", () => {
    it("classifies a file, a directory, and a missing path", async () => {
      const root = await createTempRoot();
      const filePath = resolve(root, "file.txt");
      await writeFile(filePath, "value", "utf8");
      const directoryPath = resolve(root, "nested");
      await mkdir(directoryPath);

      await expect(nodeFileSystem.inspect(filePath)).resolves.toMatchObject({kind: "file", size: 5});
      await expect(nodeFileSystem.inspect(directoryPath)).resolves.toMatchObject({kind: "directory"});
      await expect(nodeFileSystem.inspect(resolve(root, "missing"))).resolves.toEqual({kind: "missing", size: 0});
    });
  });

  describe("readDirectory", () => {
    it("lists immediate file and directory entries", async () => {
      const root = await createTempRoot();
      await writeFile(resolve(root, "a.txt"), "a", "utf8");
      await mkdir(resolve(root, "nested"));

      const entries = await nodeFileSystem.readDirectory(root);

      expect([...entries].sort((left, right) => left.name.localeCompare(right.name))).toEqual([
        {name: "a.txt", kind: "file"},
        {name: "nested", kind: "directory"},
      ]);
    });
  });

  describe("glob", () => {
    it("resolves matching paths and honors onlyFiles", async () => {
      const root = await createTempRoot();
      await writeFile(resolve(root, "a.ts"), "a", "utf8");
      await writeFile(resolve(root, "b.ts"), "b", "utf8");
      await mkdir(resolve(root, "nested.ts"));

      const allMatches = await nodeFileSystem.glob("*.ts", {cwd: root});
      const fileMatches = await nodeFileSystem.glob("*.ts", {cwd: root, onlyFiles: true});

      expect(allMatches.map((match) => match.length > 0)).toHaveLength(3);
      expect(fileMatches.toSorted()).toEqual([resolve(root, "a.ts"), resolve(root, "b.ts")]);
    });
  });

  describe("createDirectory", () => {
    it("recursively creates missing parent directories", async () => {
      const root = await createTempRoot();
      const nested = resolve(root, "a", "b", "c");

      await nodeFileSystem.createDirectory(nested, {recursive: true});

      await expect(stat(nested).then((value) => value.isDirectory())).resolves.toBe(true);
    });
  });

  describe("writeText / writeBytes", () => {
    it("writes text and rejects an exclusive write onto an existing file", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.txt");

      await nodeFileSystem.writeText(path, "value", {exclusive: true});
      await expect(readFile(path, "utf8")).resolves.toBe("value");
      await expect(nodeFileSystem.writeText(path, "value-2", {exclusive: true})).rejects.toMatchObject({code: "EEXIST"});
    });

    it("writes raw bytes", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.bin");

      await nodeFileSystem.writeBytes(path, Uint8Array.from([1, 2, 3]));

      await expect(readFile(path)).resolves.toEqual(Buffer.from([1, 2, 3]));
    });
  });

  describe("writeTextAtomic", () => {
    it("writes through an exclusive temporary sibling and leaves no residue", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "config.json");

      await nodeFileSystem.writeTextAtomic(path, "value", {mode: 0o600});

      await expect(readFile(path, "utf8")).resolves.toBe("value");
      await expect(readdir(root)).resolves.toEqual(["config.json"]);
    });

    it("removes a temporary sibling after a failed atomic rename", async () => {
      const root = await createTempRoot();
      const destinationDirectory = resolve(root, "config.json");
      await mkdir(destinationDirectory);

      await expect(nodeFileSystem.writeTextAtomic(destinationDirectory, "value", {mode: 0o600})).rejects.toBeInstanceOf(FileSystemError);

      const siblings = await readdir(dirname(destinationDirectory));
      expect(siblings.every((name) => !name.includes(".tmp"))).toBe(true);
    });
  });

  describe("copy / move / remove", () => {
    it("recursively copies a directory tree", async () => {
      const root = await createTempRoot();
      const source = resolve(root, "source");
      await mkdir(source);
      await writeFile(resolve(source, "file.txt"), "value", "utf8");
      const destination = resolve(root, "destination");

      await nodeFileSystem.copy(source, destination, {recursive: true});

      await expect(readFile(resolve(destination, "file.txt"), "utf8")).resolves.toBe("value");
    });

    it("moves a file to a new path", async () => {
      const root = await createTempRoot();
      const source = resolve(root, "source.txt");
      await writeFile(source, "value", "utf8");
      const destination = resolve(root, "destination.txt");

      await nodeFileSystem.move(source, destination);

      await expect(readFile(destination, "utf8")).resolves.toBe("value");
      await expect(nodeFileSystem.exists(source)).resolves.toBe(false);
    });

    it("recursively removes a directory tree", async () => {
      const root = await createTempRoot();
      const target = resolve(root, "target");
      await mkdir(target);
      await writeFile(resolve(target, "file.txt"), "value", "utf8");

      await nodeFileSystem.remove(target, {recursive: true, force: true});

      await expect(nodeFileSystem.exists(target)).resolves.toBe(false);
    });
  });

  describe("createTemporaryDirectory", () => {
    it("returns a handle whose remove() targets exactly the directory it created", async () => {
      const prefix = resolve(tmpdir(), "arolariu-runtime-node-handle-");
      const first = await nodeFileSystem.createTemporaryDirectory(prefix);
      const second = await nodeFileSystem.createTemporaryDirectory(prefix);

      await first.remove();

      await expect(nodeFileSystem.exists(first.path)).resolves.toBe(false);
      await expect(nodeFileSystem.exists(second.path)).resolves.toBe(true);

      await second.remove();
    });
  });

  describe("setMode", () => {
    it.runIf(process.platform !== "win32")("sets POSIX permission bits", async () => {
      const root = await createTempRoot();
      const path = resolve(root, "file.txt");
      await writeFile(path, "value", "utf8");

      await nodeFileSystem.setMode(path, 0o600);

      const metadata = await stat(path);
      expect(metadata.mode & 0o777).toBe(0o600);
    });

    it("throws a code-preserving FileSystemError for a missing path", async () => {
      const root = await createTempRoot();

      await expect(nodeFileSystem.setMode(resolve(root, "missing.txt"), 0o600)).rejects.toMatchObject({
        code: "ENOENT",
        operation: "setMode",
      });
    });
  });
});

describe("nodeHttpClient", {timeout: REAL_SPAWN_TIMEOUT_MS}, () => {
  let server: Server;
  let baseUrl: URL;
  let requestCounts: Map<string, number>;

  beforeAll(async () => {
    requestCounts = new Map();
    server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const count = (requestCounts.get(url.pathname) ?? 0) + 1;
      requestCounts.set(url.pathname, count);

      if (url.pathname === "/ok") {
        response.writeHead(200, {"content-type": "text/plain", "x-count": String(count)});
        response.end("hello");
        return;
      }

      if (url.pathname === "/retry-then-success") {
        if (count < 3) {
          response.writeHead(503, {"content-type": "text/plain"});
          response.end("unavailable");
          return;
        }
        response.writeHead(200, {"content-type": "text/plain"});
        response.end("recovered");
        return;
      }

      if (url.pathname === "/always-unavailable") {
        response.writeHead(503, {"content-type": "text/plain"});
        response.end("unavailable");
        return;
      }

      if (url.pathname === "/slow") {
        setTimeout(() => {
          response.writeHead(200, {"content-type": "text/plain"});
          response.end("slow");
        }, 2_000);
        return;
      }

      if (url.pathname === "/large") {
        response.writeHead(200, {"content-type": "application/octet-stream"});
        let cancelled = false;
        response.on("close", () => {
          cancelled = true;
        });
        const chunk = "x".repeat(1_024);
        const writeChunk = (): void => {
          if (cancelled || response.writableEnded) {
            return;
          }
          response.write(chunk);
          setTimeout(writeChunk, 5);
        };
        writeChunk();
        return;
      }

      response.writeHead(404);
      response.end();
    });

    await new Promise<void>((resolvePromise) => {
      server.listen(0, "127.0.0.1", resolvePromise);
    });
    const address = server.address() as AddressInfo;
    baseUrl = new URL(`http://127.0.0.1:${String(address.port)}`);
  });

  afterAll(async () => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((error) => (error ? rejectPromise(error) : resolvePromise()));
    });
  });

  it("returns status, headers, and decoded text for a successful response", async () => {
    const response = await nodeHttpClient.request({url: new URL("/ok", baseUrl)});

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
    expect(response.text).toBe("hello");
    expect(response.headers["content-type"]).toBe("text/plain");
  });

  it("links the caller signal so an aborted request rejects instead of waiting for the full delay", async () => {
    const controller = new AbortController();
    const startedAt = Date.now();
    setTimeout(() => controller.abort(), 50);

    await expect(nodeHttpClient.request({url: new URL("/slow", baseUrl), signal: controller.signal})).rejects.toBeInstanceOf(HttpError);
    expect(Date.now() - startedAt).toBeLessThan(1_500);
  });

  it("cancels a request once its own timeout elapses", async () => {
    const startedAt = Date.now();

    await expect(nodeHttpClient.request({url: new URL("/slow", baseUrl), timeoutMs: 50})).rejects.toBeInstanceOf(HttpError);
    expect(Date.now() - startedAt).toBeLessThan(1_500);
  });

  it("bounds response bytes before decoding, rejecting once the limit is exceeded", async () => {
    await expect(
      nodeHttpClient.request({url: new URL("/large", baseUrl), maximumResponseBytes: 2_048, timeoutMs: 5_000}),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("returns a bounded HttpError, not a raw DOMException, when the timeout elapses while streaming a slow response body", async () => {
    const startedAt = Date.now();

    // `/large` writes headers immediately, then streams chunks every 5ms without ever ending, so
    // a short timeout always fires mid-stream (after headers, during the body read) rather than
    // during the initial `fetch()` call.
    await expect(
      nodeHttpClient.request({url: new URL("/large", baseUrl), timeoutMs: 50, maximumResponseBytes: 10 * 1_024 * 1_024}),
    ).rejects.toBeInstanceOf(HttpError);
    expect(Date.now() - startedAt).toBeLessThan(1_500);
  });

  it("retries an idempotent GET only for an explicitly listed status until it succeeds", async () => {
    const response = await nodeHttpClient.request({
      url: new URL("/retry-then-success", baseUrl),
      method: "GET",
      retry: {attempts: 3, delayMs: 5, statuses: [503]},
    });

    expect(response.status).toBe(200);
    expect(response.text).toBe("recovered");
    expect(requestCounts.get("/retry-then-success")).toBe(3);
  });

  it("never retries a non-idempotent POST even with an explicit retry policy", async () => {
    const response = await nodeHttpClient.request({
      url: new URL("/always-unavailable", baseUrl),
      method: "POST",
      retry: {attempts: 3, delayMs: 5, statuses: [503]},
    });

    expect(response.status).toBe(503);
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

  it("rejects with a bounded HttpError for an unreachable host", async () => {
    await expect(nodeHttpClient.request({url: new URL("http://127.0.0.1:1"), timeoutMs: 2_000})).rejects.toBeInstanceOf(HttpError);
  });
});

describe("nodeClock", () => {
  it("reports a non-decreasing monotonic time and an ISO timestamp", () => {
    const first = nodeClock.monotonicNow();
    const second = nodeClock.monotonicNow();

    expect(second).toBeGreaterThanOrEqual(first);
    expect(nodeClock.isoTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("resolves after the requested delay", async () => {
    const startedAt = performance.now();
    await nodeClock.delay(20);
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(10);
  });

  it("rejects immediately for an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const startedAt = performance.now();

    await expect(nodeClock.delay(5_000, controller.signal)).rejects.toBeDefined();
    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});

describe("nodeTaskScheduler", () => {
  it("runs tasks in parallel and resolves results in input order", async () => {
    const results = await nodeTaskScheduler.parallel([
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ]);

    expect(results).toEqual([1, 2, 3]);
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
    const runner = createNodeProcessRunner(environment);

    const outcome = await runner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write(String(process.env.AROLARIU_RUNTIME_NODE_TEST))"],
    });

    expect(outcome).toMatchObject({kind: "succeeded", exitCode: 0, stdout: "from-snapshot"});
  });

  it("nodeProcessRunner snapshots a fresh environment for each standalone run()", async () => {
    const previous = process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"];
    process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"] = "facade-value";

    try {
      const outcome = await nodeProcessRunner.run({
        command: process.execPath,
        args: ["-e", "process.stdout.write(String(process.env.AROLARIU_RUNTIME_NODE_FACADE_TEST))"],
      });

      expect(outcome).toMatchObject({kind: "succeeded", exitCode: 0, stdout: "facade-value"});
    } finally {
      if (previous === undefined) {
        delete process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"];
      } else {
        process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"] = previous;
      }
    }
  });
});

describe("snapshotNodeEnvironment", () => {
  it("captures the current process environment, platform, and architecture", () => {
    const snapshot = snapshotNodeEnvironment();

    expect(snapshot.platform).toBe(process.platform);
    expect(snapshot.architecture).toBe(process.arch);
    expect(snapshot.executablePath).toBe(process.execPath);
    expect(snapshot.cwd).toBe(process.cwd());
  });

  it("does not mutate the captured environment when process.env changes", () => {
    process.env["RUNTIME_SNAPSHOT_TEST"] = "before";
    const snapshot = snapshotNodeEnvironment();
    process.env["RUNTIME_SNAPSHOT_TEST"] = "after";

    expect(snapshot.variables["RUNTIME_SNAPSHOT_TEST"]).toBe("before");

    delete process.env["RUNTIME_SNAPSHOT_TEST"];
  });
});

describe("nodeProcessHost", () => {
  it("exposes an immutable argv snapshot excluding the executable and script path", () => {
    expect(nodeProcessHost.argv).toEqual(process.argv.slice(2));
    expect(Object.isFrozen(nodeProcessHost.argv)).toBe(true);
  });

  it("recognizes only the module the process was started with", () => {
    const entrypoint = process.argv[1];
    expect(entrypoint).toBeDefined();
    expect(nodeProcessHost.isDirectEntry(pathToFileURL(entrypoint ?? "").href)).toBe(true);
    expect(nodeProcessHost.isDirectEntry(pathToFileURL(resolve(dirname(entrypoint ?? ""), "not-the-entry.ts")).href)).toBe(false);
  });

  it("assigns the requested process exit code", () => {
    const previousExitCode = process.exitCode;
    try {
      nodeProcessHost.setExitCode(2);
      expect(process.exitCode).toBe(2);
    } finally {
      process.exitCode = previousExitCode;
    }
  });
});

describe("nodeLoggerRuntimeHost", () => {
  it("snapshots the terminal and color policy from the runtime environment", () => {
    const environment = snapshotNodeEnvironment();

    expect(nodeLoggerRuntimeHost.stdoutIsTTY).toBe(environment.stdoutIsTTY);
    expect(nodeLoggerRuntimeHost.noColor).toBe(Object.hasOwn(environment.variables, "NO_COLOR"));
  });

  it("schedules and cancels a native interval behind the scheduled-interval handle", () => {
    vi.useFakeTimers();
    try {
      let ticks = 0;
      const interval = nodeLoggerRuntimeHost.scheduleInterval(() => {
        ticks += 1;
      }, 80);
      interval.unref();
      vi.advanceTimersByTime(160);
      interval.cancel();
      vi.advanceTimersByTime(160);

      expect(ticks).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("createNodeRuntimeScope", () => {
  it("assembles a root scope from the Node primitives and a fresh environment snapshot", async () => {
    const runtime = await createNodeRuntimeScope({
      commandName: "sample",
      verbose: false,
      presentation: "human",
      registerProcessSignals: false,
    });

    expect(runtime.files).toBe(nodeFileSystem);
    expect(runtime.http).toBe(nodeHttpClient);
    expect(runtime.clock).toBe(nodeClock);
    expect(runtime.tasks).toBe(nodeTaskScheduler);
    expect(runtime.environment.platform).toBe(process.platform);
    expect(runtime.signal.aborted).toBe(false);

    await runtime.cleanup.drain();
  });

  it("fails fast only when an unwired inspection session is actually requested", async () => {
    const runtime = await createNodeRuntimeScope({
      commandName: "sample",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
    });

    expect(() =>
      runtime.inspection.getRepositorySession({profile: "quick", paths: createRepositoryPaths(process.cwd())}),
    ).toThrow(/inspection capability is not wired/u);

    await runtime.cleanup.drain();
  });

  it("uses an injected inspection runtime when one is supplied", async () => {
    const session = createRepositoryInspectionSessionStub();
    const runtime = await createNodeRuntimeScope({
      commandName: "sample",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
      inspection: {getRepositorySession: () => session},
    });

    expect(runtime.inspection.getRepositorySession({profile: "quick", paths: createRepositoryPaths(process.cwd())})).toBe(session);

    await runtime.cleanup.drain();
  });

  it.each<readonly [NodeJS.Signals, 130 | 143]>([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ])("registers %s, aborts the scope, and unregisters it during cleanup", async (signalName, exitCode) => {
    const listenersBefore = process.listeners(signalName);
    const runtime = await createNodeRuntimeScope({
      commandName: "sample",
      verbose: false,
      presentation: "human",
      registerProcessSignals: true,
    });

    const added = process.listeners(signalName).filter((listener) => !listenersBefore.includes(listener));
    expect(added).toHaveLength(1);
    added.forEach((listener) => {
      listener(signalName);
    });

    expect(runtime.signal.aborted).toBe(true);
    const reason: unknown = runtime.signal.reason;
    expect(reason).toBeInstanceOf(CommandCancellation);
    expect(reason instanceof CommandCancellation ? reason.exitCode : 0).toBe(exitCode);

    await runtime.cleanup.drain();

    expect(process.listeners(signalName)).toEqual(listenersBefore);
  });

  it("registers no operating-system signal handler when the scope does not own them", async () => {
    const interruptListenersBefore = process.listeners("SIGINT").length;
    const terminateListenersBefore = process.listeners("SIGTERM").length;

    const runtime = await createNodeRuntimeScope({
      commandName: "sample",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
    });

    expect(process.listeners("SIGINT")).toHaveLength(interruptListenersBefore);
    expect(process.listeners("SIGTERM")).toHaveLength(terminateListenersBefore);

    await runtime.cleanup.drain();
  });

  it("links an already-aborted caller signal into the created scope", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Cancelled before start.", 143));

    const runtime = await createNodeRuntimeScope({
      commandName: "sample",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
      signal: controller.signal,
    });

    expect(runtime.signal.aborted).toBe(true);

    await runtime.cleanup.drain();
  });

  it("shares immutable parent capabilities with a child scope while isolating its own state", async () => {
    const parentRuntime = await createNodeRuntimeScope({
      commandName: "status",
      verbose: false,
      presentation: "human",
      registerProcessSignals: false,
    });
    const parent: CommandContext = {runtime: parentRuntime, presentation: "human"};

    const childRuntime = await createNodeRuntimeScope({
      commandName: "doctor",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
      parent,
    });

    expect(childRuntime.environment).toBe(parentRuntime.environment);
    expect(childRuntime.prompts).toBe(parentRuntime.prompts);
    expect(childRuntime.inspection).toBe(parentRuntime.inspection);
    expect(childRuntime.logger).not.toBe(parentRuntime.logger);
    expect(childRuntime.runner).not.toBe(parentRuntime.runner);
    expect(childRuntime.cleanup).not.toBe(parentRuntime.cleanup);
    expect(childRuntime.signal).not.toBe(parentRuntime.signal);

    parentRuntime.logger.redact("parent-secret");
    expect(childRuntime.logger.sanitize("parent-secret")).toBe("[REDACTED]");

    await childRuntime.cleanup.drain();
    await parentRuntime.cleanup.drain();
  });

  it("propagates cancellation from parent to child but never from child to parent", async () => {
    const parentController = new AbortController();
    const parentRuntime = await createNodeRuntimeScope({
      commandName: "status",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
      signal: parentController.signal,
    });
    const parent: CommandContext = {runtime: parentRuntime, presentation: "silent"};

    const childController = new AbortController();
    const firstChild = await createNodeRuntimeScope({
      commandName: "doctor",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
      parent,
      signal: childController.signal,
    });

    childController.abort();
    expect(firstChild.signal.aborted).toBe(true);
    expect(parentRuntime.signal.aborted).toBe(false);

    const secondChild = await createNodeRuntimeScope({
      commandName: "generate",
      verbose: false,
      presentation: "silent",
      registerProcessSignals: false,
      parent,
    });

    parentController.abort();
    expect(secondChild.signal.aborted).toBe(true);

    await firstChild.cleanup.drain();
    await secondChild.cleanup.drain();
    await parentRuntime.cleanup.drain();
  });
});

describe("createNodeCommandRuntimeFactory", () => {
  it("exposes the Node process host and a non-verbose human parse logger", () => {
    const factory = createNodeCommandRuntimeFactory("sample", true);

    expect(factory.processHost).toBe(nodeProcessHost);

    const debug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const parseLogger = factory.createParseLogger();
    parseLogger.debug("suppressed regardless of command verbosity");
    parseLogger.json({ignored: true});
    parseLogger.info("visible");

    expect(debug).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith("[arolariu::sample] ℹ️ visible");
  });

  it("creates root and child scopes carrying the command name and verbosity", async () => {
    const factory = createNodeCommandRuntimeFactory("sample", true);
    const rootRuntime = await factory.createRoot({presentation: "human", registerProcessSignals: false});
    const childRuntime = await factory.createChild(
      {runtime: rootRuntime, presentation: "human"},
      {presentation: "silent", registerProcessSignals: false},
    );

    expect(rootRuntime.environment.platform).toBe(process.platform);
    expect(childRuntime.environment).toBe(rootRuntime.environment);
    expect(childRuntime.signal).not.toBe(rootRuntime.signal);

    await childRuntime.cleanup.drain();
    await rootRuntime.cleanup.drain();
  });
});
