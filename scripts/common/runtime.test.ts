// @vitest-environment node
/**
 * @fileoverview Tests for the engine-neutral runtime capability kernel.
 * @module scripts/common/runtime.test
 */

import {describe, expect, it, vi} from "vitest";
import {createRepositoryPaths, type RepositoryPaths} from "./repository-paths.ts";
import {
  asGetOnlyHttpClient,
  asReadOnlyFileSystem,
  CommandCancellation,
  commandCancellationFromSignal,
  createRepositoryInspectionRuntime,
  DefaultTaskScheduler,
  FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
  FileSystemError,
  HttpError,
  LifoCleanupRegistry,
  linkAbortSignals,
  MemoizedInspectionRuntime,
  repositoryInspectionRequestKey,
  type FileSystem,
  type HttpClient,
  type HttpResponse,
  type RepositoryInspectionRequest,
} from "./runtime.ts";
import type {RepositoryInspectionSession} from "../inspection/repository.ts";

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

function mustGet<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Expected a defined value at index ${index}.`);
  }
  return value;
}

async function flushMicrotasks(): Promise<void> {
  for (let iteration = 0; iteration < 8; iteration += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
}

function createTestRepositoryPaths(overrides: Readonly<Partial<RepositoryPaths>> = {}): RepositoryPaths {
  return {...createRepositoryPaths("C:/repo"), ...overrides};
}

function createFakeFileSystem(): FileSystem {
  return {
    readText: vi.fn(async () => ""),
    readBytes: vi.fn(async () => new Uint8Array()),
    exists: vi.fn(async () => true),
    assertAccessible: vi.fn(async () => undefined),
    realPath: vi.fn(async (path: string) => path),
    inspect: vi.fn(async () => ({kind: "file", size: 0}) as const),
    readDirectory: vi.fn(async () => []),
    glob: vi.fn(async () => []),
    createDirectory: vi.fn(async () => undefined),
    writeText: vi.fn(async () => undefined),
    writeBytes: vi.fn(async () => undefined),
    writeTextAtomic: vi.fn(async () => undefined),
    copy: vi.fn(async () => undefined),
    move: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    createTemporaryDirectory: vi.fn(async () => ({path: "/tmp/x", remove: async () => undefined})),
    setMode: vi.fn(async () => undefined),
  };
}

describe("DefaultTaskScheduler.parallel", () => {
  it("resolves results in input order regardless of completion order", async () => {
    const scheduler = new DefaultTaskScheduler();
    const deferredFirst = createDeferred<string>();
    const deferredSecond = createDeferred<string>();

    const resultPromise = scheduler.parallel([() => deferredFirst.promise, () => deferredSecond.promise]);

    deferredSecond.resolve("second");
    deferredFirst.resolve("first");

    await expect(resultPromise).resolves.toEqual(["first", "second"]);
  });

  it("rejects as soon as any task rejects", async () => {
    const scheduler = new DefaultTaskScheduler();
    const error = new Error("boom");
    const neverResolves = createDeferred<string>();

    const resultPromise = scheduler.parallel([() => neverResolves.promise, () => Promise.reject(error)]);

    await expect(resultPromise).rejects.toBe(error);
  });

  it("resolves an empty task list to an empty array", async () => {
    const scheduler = new DefaultTaskScheduler();
    await expect(scheduler.parallel([])).resolves.toEqual([]);
  });

  it("rejects immediately with CommandCancellation when the signal is already aborted", async () => {
    const scheduler = new DefaultTaskScheduler();
    const controller = new AbortController();
    controller.abort();
    let started = false;

    const resultPromise = scheduler.parallel(
      [
        async () => {
          started = true;
          return "value";
        },
      ],
      controller.signal,
    );

    await expect(resultPromise).rejects.toBeInstanceOf(CommandCancellation);
    expect(started).toBe(false);
  });

  it("rejects an in-flight batch once the signal aborts mid-flight", async () => {
    const scheduler = new DefaultTaskScheduler();
    const controller = new AbortController();
    const neverResolves = createDeferred<string>();

    const resultPromise = scheduler.parallel([() => neverResolves.promise], controller.signal);
    controller.abort();

    await expect(resultPromise).rejects.toBeInstanceOf(CommandCancellation);
  });
});

describe("DefaultTaskScheduler.allSettled", () => {
  it("resolves every outcome in input order with mixed success and failure", async () => {
    const scheduler = new DefaultTaskScheduler();
    const error = new Error("boom");

    const results = await scheduler.allSettled([
      () => Promise.resolve("a"),
      () => Promise.reject(error),
      () => Promise.resolve("c"),
    ]);

    expect(results).toEqual([
      {status: "fulfilled", value: "a"},
      {status: "rejected", reason: error},
      {status: "fulfilled", value: "c"},
    ]);
  });

  it("rejects immediately when the signal is already aborted", async () => {
    const scheduler = new DefaultTaskScheduler();
    const controller = new AbortController();
    controller.abort();

    await expect(scheduler.allSettled([() => Promise.resolve("a")], controller.signal)).rejects.toBeInstanceOf(
      CommandCancellation,
    );
  });
});

describe("DefaultTaskScheduler.sequential", () => {
  it("runs tasks strictly one after another in order", async () => {
    const scheduler = new DefaultTaskScheduler();
    const deferredFirst = createDeferred<string>();
    const startOrder: number[] = [];

    const resultPromise = scheduler.sequential([
      () => {
        startOrder.push(0);
        return deferredFirst.promise;
      },
      async () => {
        startOrder.push(1);
        return "second";
      },
    ]);

    await flushMicrotasks();
    expect(startOrder).toEqual([0]);

    deferredFirst.resolve("first");
    const results = await resultPromise;

    expect(startOrder).toEqual([0, 1]);
    expect(results).toEqual(["first", "second"]);
  });

  it("rejects immediately when the signal is already aborted, without starting any task", async () => {
    const scheduler = new DefaultTaskScheduler();
    const controller = new AbortController();
    controller.abort();
    let started = false;

    const resultPromise = scheduler.sequential(
      [
        async () => {
          started = true;
          return "value";
        },
      ],
      controller.signal,
    );

    await expect(resultPromise).rejects.toBeInstanceOf(CommandCancellation);
    expect(started).toBe(false);
  });
});

describe("DefaultTaskScheduler.mapBounded", () => {
  it("bounds concurrency and starts queued work as soon as a slot frees, preserving output order", async () => {
    const scheduler = new DefaultTaskScheduler();
    const deferreds = [createDeferred<number>(), createDeferred<number>(), createDeferred<number>(), createDeferred<number>()];
    const startOrder: number[] = [];

    const resultPromise = scheduler.mapBounded([0, 1, 2, 3], 2, async (_value, index) => {
      startOrder.push(index);
      return mustGet(deferreds, index).promise;
    });

    await flushMicrotasks();
    expect(startOrder).toEqual([0, 1]);

    mustGet(deferreds, 0).resolve(100);
    await flushMicrotasks();
    expect(startOrder).toEqual([0, 1, 2]);

    mustGet(deferreds, 2).resolve(300);
    await flushMicrotasks();
    expect(startOrder).toEqual([0, 1, 2, 3]);

    mustGet(deferreds, 1).resolve(200);
    mustGet(deferreds, 3).resolve(400);

    await expect(resultPromise).resolves.toEqual([100, 200, 300, 400]);
  });

  it("never runs more concurrently than the given bound", async () => {
    const scheduler = new DefaultTaskScheduler();
    let active = 0;
    let maxActive = 0;
    const deferreds = Array.from({length: 6}, () => createDeferred<number>());

    const resultPromise = scheduler.mapBounded([0, 1, 2, 3, 4, 5], 3, async (_value, index) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const output = await mustGet(deferreds, index).promise;
      active -= 1;
      return output;
    });

    await flushMicrotasks();
    for (const deferred of deferreds) {
      deferred.resolve(1);
      // eslint-disable-next-line no-await-in-loop
      await flushMicrotasks();
    }

    await resultPromise;
    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it("throws a RangeError for a non-positive concurrency", async () => {
    const scheduler = new DefaultTaskScheduler();
    await expect(scheduler.mapBounded([1], 0, async (value) => value)).rejects.toBeInstanceOf(RangeError);
  });

  it("rejects immediately when the signal is already aborted, without starting any task", async () => {
    const scheduler = new DefaultTaskScheduler();
    const controller = new AbortController();
    controller.abort();
    let started = false;

    const resultPromise = scheduler.mapBounded(
      [1],
      1,
      async (value) => {
        started = true;
        return value;
      },
      controller.signal,
    );

    await expect(resultPromise).rejects.toBeInstanceOf(CommandCancellation);
    expect(started).toBe(false);
  });
});

describe("LifoCleanupRegistry", () => {
  it("runs cleanup in LIFO order and aggregates failures", async () => {
    const events: string[] = [];
    const cleanup = new LifoCleanupRegistry();
    cleanup.register("first", () => {
      events.push("first");
    });
    cleanup.register("second", () => {
      events.push("second");
      throw new Error("cleanup failed");
    });

    const failures = await cleanup.drain();

    expect(events).toEqual(["second", "first"]);
    expect(failures).toEqual([expect.objectContaining({label: "second", message: "cleanup failed"})]);
  });

  it("skips a cleanup once its registration has been unregistered", async () => {
    const events: string[] = [];
    const cleanup = new LifoCleanupRegistry();
    const unregister = cleanup.register("skipped", () => {
      events.push("skipped");
    });
    cleanup.register("kept", () => {
      events.push("kept");
    });
    unregister();

    await cleanup.drain();

    expect(events).toEqual(["kept"]);
  });

  it("resolves an empty array when nothing is registered and does not rerun after drain", async () => {
    const cleanup = new LifoCleanupRegistry();
    await expect(cleanup.drain()).resolves.toEqual([]);

    const events: string[] = [];
    cleanup.register("once", () => {
      events.push("once");
    });
    await cleanup.drain();
    await cleanup.drain();

    expect(events).toEqual(["once"]);
  });
});

describe("linkAbortSignals", () => {
  it("aborts the linked signal when either parent aborts and preserves the reason", () => {
    const parentA = new AbortController();
    const parentB = new AbortController();
    const linked = linkAbortSignals(parentA.signal, parentB.signal);

    expect(linked.signal.aborted).toBe(false);

    const reason = new Error("parent aborted");
    parentB.abort(reason);

    expect(linked.signal.aborted).toBe(true);
    expect(linked.signal.reason).toBe(reason);
  });

  it("reflects an already-aborted parent immediately", () => {
    const parent = new AbortController();
    parent.abort(new Error("already gone"));

    const linked = linkAbortSignals(parent.signal);

    expect(linked.signal.aborted).toBe(true);
  });

  it("stops propagating parent aborts once disposed", () => {
    const parent = new AbortController();
    const linked = linkAbortSignals(parent.signal);

    linked.dispose();
    parent.abort(new Error("late"));

    expect(linked.signal.aborted).toBe(false);
  });

  it("tolerates undefined parent signals", () => {
    const linked = linkAbortSignals(undefined, undefined);
    expect(linked.signal.aborted).toBe(false);
  });
});

describe("commandCancellationFromSignal", () => {
  it("preserves an already-typed CommandCancellation reason instead of wrapping it again", () => {
    const original = new CommandCancellation("stop", 143);
    const controller = new AbortController();
    controller.abort(original);

    expect(commandCancellationFromSignal(controller.signal)).toBe(original);
  });

  it("falls back to a default message and SIGINT-style exit code for an untyped reason", () => {
    const controller = new AbortController();
    controller.abort();

    const cancellation = commandCancellationFromSignal(controller.signal);

    expect(cancellation).toBeInstanceOf(CommandCancellation);
    expect(cancellation.exitCode).toBe(130);
  });
});

describe("MemoizedInspectionRuntime", () => {
  it("shares one repository inspection session for an identical request", () => {
    const created: Array<Readonly<{profile: "full" | "quick"}>> = [];
    const runtime = new MemoizedInspectionRuntime((request: Readonly<{profile: "full" | "quick"}>) => {
      const session = {profile: request.profile};
      created.push(session);
      return session;
    });
    const inspectionRequest = {profile: "quick"} as const;

    const first = runtime.getRepositorySession(inspectionRequest);
    const second = runtime.getRepositorySession(inspectionRequest);

    expect(second).toBe(first);
    expect(created).toHaveLength(1);
  });

  it("rejects a differing request that maps to an already-used key", () => {
    const runtime = new MemoizedInspectionRuntime<{profile: string; extra: string}, {profile: string}>(
      (request) => ({profile: request.profile}),
      (request) => request.profile,
    );

    runtime.getRepositorySession({profile: "quick", extra: "first"});

    expect(() => runtime.getRepositorySession({profile: "quick", extra: "second"})).toThrow();
  });
});

describe("createRepositoryInspectionRuntime", () => {
  it("shares one session per root/profile/engine and rejects a conflicting paths object", () => {
    let createCount = 0;
    const runtime = createRepositoryInspectionRuntime((request: Readonly<RepositoryInspectionRequest>) => {
      createCount += 1;
      return {profile: request.profile} as unknown as RepositoryInspectionSession;
    });

    const paths = createTestRepositoryPaths();
    const request: RepositoryInspectionRequest = {profile: "quick", paths, requestedEngine: "rancher"};

    const first = runtime.getRepositorySession(request);
    const second = runtime.getRepositorySession({profile: "quick", paths, requestedEngine: "rancher"});

    expect(second).toBe(first);
    expect(createCount).toBe(1);

    const conflicting: RepositoryInspectionRequest = {
      profile: "quick",
      paths: createTestRepositoryPaths({websiteEnvironment: "C:/other/.env"}),
      requestedEngine: "rancher",
    };

    expect(() => runtime.getRepositorySession(conflicting)).toThrow();
  });

  it("derives an identical key for structurally equal requests regardless of object identity", () => {
    const requestA: RepositoryInspectionRequest = {
      profile: "full",
      paths: createTestRepositoryPaths(),
      requestedEngine: "podman",
    };
    const requestB: RepositoryInspectionRequest = {
      profile: "full",
      paths: createTestRepositoryPaths(),
      requestedEngine: "podman",
    };

    expect(repositoryInspectionRequestKey(requestA)).toBe(repositoryInspectionRequestKey(requestB));
  });
});

describe("asReadOnlyFileSystem", () => {
  it("delegates read operations and omits every mutating member", async () => {
    const fileSystem = createFakeFileSystem();
    const readOnly = asReadOnlyFileSystem(fileSystem);

    await readOnly.readText("/file.txt");

    expect(fileSystem.readText).toHaveBeenCalledWith("/file.txt");
    expect("writeText" in readOnly).toBe(false);
    expect("remove" in readOnly).toBe(false);
    expect("createTemporaryDirectory" in readOnly).toBe(false);
  });
});

describe("asGetOnlyHttpClient", () => {
  it("always issues a GET request with no body", async () => {
    const response: HttpResponse = {status: 200, ok: true, headers: {}, bytes: new Uint8Array(), text: ""};
    const httpClient: HttpClient = {request: vi.fn(async () => response)};
    const getOnly = asGetOnlyHttpClient(httpClient);
    const url = new URL("https://example.com/resource");

    const result = await getOnly.get({url});

    expect(httpClient.request).toHaveBeenCalledWith({url, method: "GET"});
    expect(result).toBe(response);
  });
});

describe("FileSystemError", () => {
  it("carries the operation, path, code, and cause", () => {
    const cause = new Error("underlying");
    const error = new FileSystemError("readBytes", "/big-file", "File exceeds the maximum byte bound.", {
      code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
      cause,
    });

    expect(error.name).toBe("FileSystemError");
    expect(error.operation).toBe("readBytes");
    expect(error.path).toBe("/big-file");
    expect(error.code).toBe(FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE);
    expect(error.cause).toBe(cause);
  });

  it("omits code and cause entirely when not provided", () => {
    const error = new FileSystemError("exists", "/missing", "Path does not exist.");

    expect(error.code).toBeUndefined();
    expect("code" in error && error.code !== undefined).toBe(false);
    expect(error.cause).toBeUndefined();
  });
});

describe("HttpError", () => {
  it("carries the request url/method and optional status", () => {
    const url = new URL("https://example.com/api");
    const error = new HttpError("Request failed.", {url, method: "POST"}, {status: 503});

    expect(error.name).toBe("HttpError");
    expect(error.request).toEqual({url, method: "POST"});
    expect(error.status).toBe(503);
  });

  it("omits status when not provided", () => {
    const url = new URL("https://example.com/api");
    const error = new HttpError("Request failed.", {url, method: "GET"});

    expect(error.status).toBeUndefined();
  });
});

describe("CommandCancellation", () => {
  it("carries the given message and exit code", () => {
    const error = new CommandCancellation("Interrupted.", 130);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("CommandCancellation");
    expect(error.message).toBe("Interrupted.");
    expect(error.exitCode).toBe(130);
  });
});
