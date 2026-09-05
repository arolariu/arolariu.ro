// @vitest-environment node
/**
 * @fileoverview Shared runtime-capability contract: every filesystem, HTTP, clock, task-scheduler,
 * cleanup, and cancellation behavior a runtime capability implementation must exhibit, independent
 * of the engine that eventually performs the work.
 * @module scripts/testing/contracts/runtime-capability.contract
 *
 * @remarks
 * The contract only asserts behavior an in-memory fixture and a real Node adapter must both
 * satisfy. This module runs itself once at module scope against the in-memory fixtures, and
 * `scripts/adapters/node/node-capabilities.test.ts` runs it a second time against the real Node
 * adapters. Engine-specific behavior — retry policy, streaming bounds, overall timeout budget —
 * stays in that Node suite, because no in-memory fixture can honestly prove it.
 */

import {describe, expect, it} from "vitest";

import {CommandCancellation, commandCancellationFromSignal, linkAbortSignals} from "../../core/runtime/cancellation.ts";
import {LifoCleanupRegistry, type CleanupRegistry} from "../../core/runtime/cleanup.ts";
import {
  asGetOnlyHttpClient,
  asReadOnlyFileSystem,
  FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
  FileSystemError,
  HttpError,
  type Clock,
  type FileSystem,
  type HttpClient,
} from "../../core/runtime/runtime-capability.ts";
import {DefaultTaskScheduler, type TaskScheduler} from "../../core/runtime/task-scheduler.ts";
import {buildControlledClock} from "../builders/clock.builder.ts";
import {createMemoryFileSystem} from "../fixtures/memory-filesystem.fixture.ts";
import {buildQueuedHttpClient, createHttpResponse} from "../fixtures/network.fixture.ts";

/** One isolated filesystem plus an existing absolute root it exclusively owns. */
interface RuntimeCapabilityFileSystemScope {
  readonly files: FileSystem;
  readonly root: string;
}

/** One HTTP client plus the absolute URL the contract sends its request to. */
interface RuntimeCapabilityHttpScope {
  readonly http: HttpClient;
  readonly url: URL;
}

/** One clock plus the subject-controlled way to let a pending delay elapse. */
interface RuntimeCapabilityClockScope {
  readonly clock: Clock;
  readonly advance: (milliseconds: number) => Promise<void>;
}

/** Everything one contract subject supplies so the shared behavior can be proven against it. */
export interface RuntimeCapabilityContractDefinition {
  /** Label used in the suite name. */
  readonly label: string;
  /** Creates one isolated filesystem scope. */
  readonly createFileSystem: () => Promise<RuntimeCapabilityFileSystemScope>;
  /** Creates an HTTP scope whose URL answers `200` with the body `"hello"`. */
  readonly createSuccessfulHttpClient: () => Promise<RuntimeCapabilityHttpScope>;
  /** Creates an HTTP scope whose URL always fails the request. */
  readonly createFailingHttpClient: () => Promise<RuntimeCapabilityHttpScope>;
  /** Creates a clock scope, a task scheduler, and a cleanup registry. */
  readonly createClock: () => RuntimeCapabilityClockScope;
  readonly createTaskScheduler: () => TaskScheduler;
  readonly createCleanupRegistry: () => CleanupRegistry;
}

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const READ_ONLY_MEMBERS = ["assertAccessible", "exists", "glob", "inspect", "readBytes", "readDirectory", "readText", "realPath"];
const normalizePath = (path: string): string => path.replaceAll("\\", "/");

function deferred<T>(): Readonly<{promise: Promise<T>; resolve: (value: T) => void}> {
  let resolveFn: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolveFn = resolvePromise;
  });
  return {promise, resolve: resolveFn};
}

/** Every filesystem behavior both an in-memory fixture and the real adapter must exhibit. */
const fileSystemCases: Readonly<Record<string, (scope: RuntimeCapabilityFileSystemScope) => Promise<void>>> = {
  "normalizes relative segments and reports ENOENT for a missing read": async ({files, root}) => {
    await files.writeText(`${root}/nested/../plain.txt`, "value");
    await expect(files.readText(`${root}/plain.txt`)).resolves.toBe("value");
    await expect(files.readText(`${root}/missing.txt`)).rejects.toMatchObject({code: "ENOENT"});
  },
  "reads raw bytes unbounded, within a bound, and rejects an invalid or oversized bound": async ({files, root}) => {
    await files.writeBytes(`${root}/file.bin`, Uint8Array.from([1, 2, 3, 4]));
    await expect(files.readBytes(`${root}/file.bin`).then((bytes) => [...bytes])).resolves.toEqual([1, 2, 3, 4]);
    await expect(files.readBytes(`${root}/file.bin`, {maximumBytes: 10}).then((bytes) => [...bytes])).resolves.toEqual([1, 2, 3, 4]);
    await files.writeText(`${root}/large.txt`, "this text is more than ten bytes long");
    await expect(files.readBytes(`${root}/large.txt`, {maximumBytes: 10})).rejects.toBeInstanceOf(FileSystemError);
    await expect(files.readBytes(`${root}/large.txt`, {maximumBytes: 10})).rejects.toMatchObject({
      code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
    });
    await expect(files.readBytes(`${root}/file.bin`, {maximumBytes: -1})).rejects.toBeInstanceOf(RangeError);
    await expect(files.readBytes(`${root}/file.bin`, {maximumBytes: 1.5})).rejects.toBeInstanceOf(RangeError);
  },
  "classifies a file, a directory, and a missing path": async ({files, root}) => {
    await files.writeText(`${root}/file.txt`, "value");
    await files.createDirectory(`${root}/nested`, {recursive: true});
    await expect(files.exists(`${root}/file.txt`)).resolves.toBe(true);
    await expect(files.exists(`${root}/missing.txt`)).resolves.toBe(false);
    await expect(files.inspect(`${root}/file.txt`)).resolves.toMatchObject({kind: "file", size: 5});
    await expect(files.inspect(`${root}/nested`)).resolves.toMatchObject({kind: "directory"});
    await expect(files.inspect(`${root}/missing.txt`)).resolves.toMatchObject({kind: "missing", size: 0});
  },
  "throws a code-preserving FileSystemError for an inaccessible or unresolvable path": async ({files, root}) => {
    await expect(files.assertAccessible(`${root}/missing.txt`, {read: true})).rejects.toBeInstanceOf(FileSystemError);
    await expect(files.assertAccessible(`${root}/missing.txt`, {read: true})).rejects.toMatchObject({
      code: "ENOENT",
      operation: "assertAccessible",
    });
    await expect(files.realPath(`${root}/missing.txt`)).rejects.toMatchObject({code: "ENOENT", operation: "realPath"});
    await expect(files.setMode(`${root}/missing.txt`, 0o600)).rejects.toMatchObject({code: "ENOENT", operation: "setMode"});
  },
  "lists immediate directory entries and resolves glob patterns honoring onlyFiles": async ({files, root}) => {
    await files.writeText(`${root}/a.ts`, "a");
    await files.writeText(`${root}/b.ts`, "b");
    await files.createDirectory(`${root}/nested.ts`, {recursive: true});
    await files.writeText(`${root}/nested.ts/c.ts`, "c");
    expect((await files.readDirectory(root)).toSorted((left, right) => left.name.localeCompare(right.name))).toEqual([
      {name: "a.ts", kind: "file"},
      {name: "b.ts", kind: "file"},
      {name: "nested.ts", kind: "directory"},
    ]);
    expect(await files.glob("*.ts", {cwd: root})).toHaveLength(3);
    expect((await files.glob("*.ts", {cwd: root, onlyFiles: true})).map(normalizePath).toSorted()).toEqual([
      `${normalizePath(root)}/a.ts`,
      `${normalizePath(root)}/b.ts`,
    ]);
  },
  "rejects an exclusive write onto an existing file and writes atomically without residue": async ({files, root}) => {
    await files.writeText(`${root}/file.txt`, "value", {exclusive: true});
    await expect(files.writeText(`${root}/file.txt`, "other", {exclusive: true})).rejects.toMatchObject({code: "EEXIST"});
    await files.remove(`${root}/file.txt`);
    await files.writeTextAtomic(`${root}/config.json`, "value", {mode: 0o600});
    await expect(files.readText(`${root}/config.json`)).resolves.toBe("value");
    await expect(files.readDirectory(root)).resolves.toEqual([{name: "config.json", kind: "file"}]);
  },
  "copies, moves, and removes a directory tree": async ({files, root}) => {
    await files.createDirectory(`${root}/source`, {recursive: true});
    await files.writeText(`${root}/source/file.txt`, "value");
    await files.copy(`${root}/source`, `${root}/copied`, {recursive: true});
    await files.move(`${root}/source/file.txt`, `${root}/moved.txt`);
    await expect(files.readText(`${root}/copied/file.txt`)).resolves.toBe("value");
    await expect(files.readText(`${root}/moved.txt`)).resolves.toBe("value");
    await expect(files.exists(`${root}/source/file.txt`)).resolves.toBe(false);
    await files.remove(`${root}/copied`, {recursive: true, force: true});
    await expect(files.exists(`${root}/copied`)).resolves.toBe(false);
  },
  "hands out isolated temporary directories whose removal targets only their own handle": async ({files}) => {
    const first = await files.createTemporaryDirectory("arolariu-runtime-contract-");
    const second = await files.createTemporaryDirectory("arolariu-runtime-contract-");
    await files.writeText(`${first.path}/marker.txt`, "first");
    await files.writeText(`${second.path}/marker.txt`, "second");
    await first.remove();
    expect(second.path).not.toBe(first.path);
    await expect(files.exists(first.path)).resolves.toBe(false);
    await expect(files.readText(`${second.path}/marker.txt`)).resolves.toBe("second");
    await second.remove();
  },
  "narrows to a read-only view that exposes no mutating member": async ({files, root}) => {
    await files.writeText(`${root}/file.txt`, "value");
    const readOnly = asReadOnlyFileSystem(files);
    await expect(readOnly.readText(`${root}/file.txt`)).resolves.toBe("value");
    expect(Object.keys(readOnly).toSorted()).toEqual(READ_ONLY_MEMBERS);
  },
};

/**
 * Runs the shared runtime-capability contract against one set of capability implementations.
 *
 * @param definition - The subject label and the factories that build each capability under test.
 */
export function runRuntimeCapabilityContract(definition: Readonly<RuntimeCapabilityContractDefinition>): void {
  describe(`runtime capability contract: ${definition.label}`, () => {
    it.each(Object.entries(fileSystemCases))("filesystem %s", async (_label, assert) => {
      await assert(await definition.createFileSystem());
    });
    it("resolves a successful request, its GET-only view, and a bounded failure", async () => {
      const success = await definition.createSuccessfulHttpClient();
      const response = await success.http.request({url: success.url});
      const narrowed = await asGetOnlyHttpClient(success.http).get({url: success.url});
      const failing = await definition.createFailingHttpClient();
      const failure = await failing.http.request({url: failing.url, timeoutMs: 2_000}).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(response).toMatchObject({status: 200, ok: true, text: "hello"});
      expect(response.headers["content-type"]).toBe("text/plain");
      expect(narrowed).toMatchObject({status: 200, text: "hello"});
      expect(Object.keys(asGetOnlyHttpClient(success.http))).toEqual(["get"]);
      expect(failure).toBeInstanceOf(HttpError);
      expect(failure instanceof HttpError ? failure.request.url.href : "").toBe(failing.url.href);
    });
    it("reports monotonic time, an ISO-8601 timestamp, an elapsing delay, and a cancelled delay", async () => {
      const {clock, advance} = definition.createClock();
      const pending = clock.delay(20);
      await advance(20);
      const aborted = new AbortController();
      aborted.abort();
      expect(clock.monotonicNow()).toBeLessThanOrEqual(clock.monotonicNow());
      expect(clock.isoTimestamp()).toMatch(ISO_TIMESTAMP_PATTERN);
      await expect(pending).resolves.toBeUndefined();
      await expect(clock.delay(5_000, aborted.signal)).rejects.toBeDefined();
    });
    it("resolves parallel results in input order regardless of completion order", async () => {
      const tasks = definition.createTaskScheduler();
      const slow = deferred<string>();
      const fast = deferred<string>();
      const pending = tasks.parallel([() => slow.promise, () => fast.promise]);
      fast.resolve("second");
      slow.resolve("first");
      await expect(pending).resolves.toEqual(["first", "second"]);
      await expect(tasks.parallel([])).resolves.toEqual([]);
      await expect(tasks.parallel([() => Promise.reject(new Error("boom")), () => Promise.resolve(1)])).rejects.toThrow("boom");
    });
    it("rejects a parallel batch that is cancelled before it starts or while it is in flight", async () => {
      const tasks = definition.createTaskScheduler();
      const aborted = new AbortController();
      aborted.abort();
      const started: number[] = [];
      await expect(tasks.parallel([() => Promise.resolve(started.push(1))], aborted.signal)).rejects.toBeInstanceOf(CommandCancellation);
      expect(started).toEqual([]);
      const midFlight = new AbortController();
      const never = deferred<number>();
      const pending = tasks.parallel([() => never.promise], midFlight.signal);
      midFlight.abort();
      await expect(pending).rejects.toBeInstanceOf(CommandCancellation);
      never.resolve(0);
    });
    it("resolves every settled outcome in input order without cancelling siblings", async () => {
      const tasks = definition.createTaskScheduler();
      const failure = new Error("second failed");
      let thirdRan = false;
      const settled = await tasks.allSettled<number>([
        () => Promise.resolve(1),
        () => Promise.reject(failure),
        async () => {
          thirdRan = true;
          return 3;
        },
      ]);
      const aborted = new AbortController();
      aborted.abort();
      expect(settled).toEqual([
        {status: "fulfilled", value: 1},
        {status: "rejected", reason: failure},
        {status: "fulfilled", value: 3},
      ]);
      expect(thirdRan).toBe(true);
      await expect(tasks.allSettled([() => Promise.resolve(1)], aborted.signal)).rejects.toBeInstanceOf(CommandCancellation);
    });
    it("runs sequential tasks strictly one after another and never starts a cancelled batch", async () => {
      const tasks = definition.createTaskScheduler();
      const order: string[] = [];
      const results = await tasks.sequential([
        async () => {
          order.push("first-start");
          await Promise.resolve();
          order.push("first-end");
          return 1;
        },
        async () => {
          order.push("second-start");
          return 2;
        },
      ]);
      const aborted = new AbortController();
      aborted.abort();
      expect(results).toEqual([1, 2]);
      expect(order).toEqual(["first-start", "first-end", "second-start"]);
      await expect(tasks.sequential([() => Promise.resolve(order.push("never"))], aborted.signal)).rejects.toBeInstanceOf(
        CommandCancellation,
      );
      expect(order).toHaveLength(3);
    });
    it("bounds mapBounded concurrency, preserves output order, and validates its bound", async () => {
      const tasks = definition.createTaskScheduler();
      const gates = [deferred<void>(), deferred<void>(), deferred<void>(), deferred<void>()];
      let inFlight = 0;
      let peak = 0;
      let started = false;
      const pending = tasks.mapBounded([0, 1, 2, 3], 2, async (value: number) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await gates[value]?.promise;
        inFlight -= 1;
        return value * 10;
      });
      gates.forEach((gate) => {
        gate.resolve();
      });
      const aborted = new AbortController();
      aborted.abort();
      await expect(pending).resolves.toEqual([0, 10, 20, 30]);
      expect(peak).toBeLessThanOrEqual(2);
      await expect(tasks.mapBounded([1], 0, async (value: number) => value)).rejects.toBeInstanceOf(RangeError);
      await expect(
        tasks.mapBounded(
          [1],
          1,
          async (value: number) => {
            started = true;
            return value;
          },
          aborted.signal,
        ),
      ).rejects.toBeInstanceOf(CommandCancellation);
      expect(started).toBe(false);
    });
    it("drains cleanup in LIFO order exactly once, skipping unregistered entries and recording failures", async () => {
      const cleanup = definition.createCleanupRegistry();
      const order: string[] = [];
      const unregister = cleanup.register("skipped", () => {
        order.push("skipped");
      });
      cleanup.register("first", () => {
        order.push("first");
      });
      cleanup.register("failing", () => {
        order.push("failing");
        throw new Error("cleanup failed");
      });
      cleanup.register("last", () => {
        order.push("last");
      });
      unregister();
      const failures = await cleanup.drain();
      await expect(cleanup.drain()).resolves.toEqual([]);
      expect(order).toEqual(["last", "failing", "first"]);
      expect(failures).toEqual([{label: "failing", message: "cleanup failed", cause: expect.any(Error)}]);
    });
    it("links parent signals, stops propagating once disposed, and maps cancellation reasons", () => {
      const first = new AbortController();
      const second = new AbortController();
      const link = linkAbortSignals(first.signal, second.signal, undefined);
      expect(link.signal.aborted).toBe(false);
      const reason = new CommandCancellation("Command terminated by SIGTERM.", 143);
      second.abort(reason);
      link.dispose();
      const preAborted = new AbortController();
      preAborted.abort(reason);
      const later = new AbortController();
      const disposed = linkAbortSignals(later.signal);
      disposed.dispose();
      later.abort();
      const untyped = new AbortController();
      untyped.abort(new Error("stopped"));
      const derived = commandCancellationFromSignal(untyped.signal);
      expect(link.signal.reason).toBe(reason);
      expect(linkAbortSignals(preAborted.signal).signal.aborted).toBe(true);
      expect(disposed.signal.aborted).toBe(false);
      expect(commandCancellationFromSignal(preAborted.signal)).toBe(reason);
      expect(derived).toBeInstanceOf(CommandCancellation);
      expect(derived).toMatchObject({message: "stopped", exitCode: 130});
      expect(commandCancellationFromSignal(untyped.signal, {message: "custom", exitCode: 143}).exitCode).toBe(143);
    });
  });
}

const MEMORY_CONTRACT_ROOT = "/contract-root";
const MEMORY_SUCCESS_URL = new URL("https://contract.test/ok");
const MEMORY_FAILURE_URL = new URL("https://contract.test/unreachable");

runRuntimeCapabilityContract({
  label: "in-memory fixtures",
  createFileSystem: async () => {
    const files = createMemoryFileSystem();
    await files.createDirectory(MEMORY_CONTRACT_ROOT, {recursive: true});
    return {files, root: MEMORY_CONTRACT_ROOT};
  },
  createSuccessfulHttpClient: async () => ({
    http: buildQueuedHttpClient([
      createHttpResponse(200, "hello", {"content-type": "text/plain"}),
      createHttpResponse(200, "hello", {"content-type": "text/plain"}),
    ]),
    url: MEMORY_SUCCESS_URL,
  }),
  createFailingHttpClient: async () => ({
    http: buildQueuedHttpClient([new HttpError("HTTP request failed: unreachable", {url: MEMORY_FAILURE_URL, method: "GET"})]),
    url: MEMORY_FAILURE_URL,
  }),
  createClock: () => {
    const clock = buildControlledClock();
    return {clock, advance: (milliseconds: number) => clock.advance(milliseconds)};
  },
  createTaskScheduler: () => new DefaultTaskScheduler(),
  createCleanupRegistry: () => new LifoCleanupRegistry(),
});
