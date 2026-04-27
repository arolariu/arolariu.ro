import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {__resetForTesting} from "../../runtime/exposeWorker";
import {createWorkerHost} from "../createWorkerHost";
import {WorkerCrashError, WorkerDeadError, WorkerError, WorkerNotAvailableError} from "../workerErrors";
import {createMockWorker} from "./mockWorker";

type GreetApi = {
  greet: (name: string) => Promise<string>;
  fail: (code: string) => Promise<never>;
  echo: (msg: string) => Promise<string>;
  sleep: (ms: number, signal?: AbortSignal) => Promise<string>;
};

const greetImpl: GreetApi = {
  greet: async (name) => `hi, ${name}`,
  fail: async (code) => {
    throw new Error(`failure: ${code}`);
  },
  echo: async (msg) => msg,
  sleep: async (ms, signal) => {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve(undefined), ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(signal.reason ?? new Error("aborted"));
      });
    });
    return "done";
  },
};

// jsdom does not define `Worker`. The host's SSR-safety check treats
// `typeof globalThis.Worker === "undefined"` as a hard rejection signal.
// We install a stub constructor so the lazy-boot path can proceed; the
// MockWorker's duck-typed object is what the host actually uses at runtime.
const ORIGINAL_WORKER = (globalThis as {Worker?: unknown}).Worker;

beforeEach(() => {
  __resetForTesting();
  if (typeof (globalThis as {Worker?: unknown}).Worker === "undefined") {
    Object.defineProperty(globalThis, "Worker", {
      value: function StubWorker() {
        /* never instantiated by tests; MockWorker provides the object */
      },
      configurable: true,
      writable: true,
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, "Worker", {value: ORIGINAL_WORKER, configurable: true, writable: true});
});

describe("createWorkerHost", () => {
  describe("state transitions", () => {
    it("starts in 'idle'", () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      expect(host.state).toBe("idle");
    });

    it("transitions idle → starting → ready on first call", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      const result = await host.api.greet("world");
      expect(result).toBe("hi, world");
      expect(host.state).toBe("ready");
    });

    it("warmUp resolves once state is ready", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      await host.warmUp();
      expect(host.state).toBe("ready");
    });
  });

  describe("error handling", () => {
    it("normalizes handler-thrown errors as WorkerError", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      try {
        await host.api.fail("E_BAD");
        expect.fail("expected to throw");
      } catch (err) {
        expect(err).toBeInstanceOf(WorkerError);
        expect((err as WorkerError).method).toBe("fail");
      }
    });

    it("rejects all in-flight calls on crash with WorkerCrashError", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      await host.warmUp();
      const slow = host.api.sleep(1_000_000);
      mock.simulateCrash();
      await expect(slow).rejects.toThrowError(WorkerCrashError);
      expect(host.state).toBe("dead");
    });

    it("subsequent calls after crash reject with WorkerDeadError", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      await host.warmUp();
      mock.simulateCrash();
      await expect(host.api.greet("x")).rejects.toThrowError(WorkerDeadError);
    });
  });

  describe("restart", () => {
    it("transitions dead → ready after restart", async () => {
      let mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({
        name: "test",
        load: () => {
          mock = createMockWorker({api: greetImpl});
          return mock.worker;
        },
      });
      await host.warmUp();
      mock.simulateCrash();
      expect(host.state).toBe("dead");
      await host.restart();
      expect(host.state).toBe("ready");
    });

    it("calls succeed after restart", async () => {
      let mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({
        name: "test",
        load: () => {
          mock = createMockWorker({api: greetImpl});
          return mock.worker;
        },
      });
      await host.warmUp();
      mock.simulateCrash();
      await host.restart();
      const r = await host.api.greet("after-restart");
      expect(r).toBe("hi, after-restart");
    });
  });

  describe("dispose", () => {
    it("transitions to disposed and rejects new calls", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      await host.warmUp();
      await host.dispose();
      expect(host.state).toBe("disposed");
      await expect(host.api.greet("x")).rejects.toThrowError(WorkerDeadError);
    });

    it("is idempotent", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      await host.warmUp();
      await host.dispose();
      await expect(host.dispose()).resolves.toBeUndefined();
    });
  });

  describe("AbortSignal", () => {
    it("rejects synchronously when signal is already aborted", async () => {
      const mock = createMockWorker({api: greetImpl});
      const host = createWorkerHost<GreetApi>({name: "test", load: () => mock.worker});
      const controller = new AbortController();
      controller.abort(new Error("preempted"));
      await expect(host.api.sleep(1000, controller.signal)).rejects.toThrowError("preempted");
    });
  });

  describe("SSR safety", () => {
    it("rejects with WorkerNotAvailableError when Worker is undefined", async () => {
      const original = (globalThis as {Worker?: unknown}).Worker;
      Object.defineProperty(globalThis, "Worker", {value: undefined, configurable: true});
      try {
        const host = createWorkerHost<GreetApi>({
          name: "test",
          load: () => {
            throw new Error("should not be called");
          },
        });
        await expect(host.api.greet("x")).rejects.toThrowError(WorkerNotAvailableError);
      } finally {
        Object.defineProperty(globalThis, "Worker", {value: original, configurable: true});
      }
    });
  });
});
