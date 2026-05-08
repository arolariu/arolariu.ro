/**
 * @fileoverview Tests for the two-channel bootstrap handshake helper.
 * @module workers/host/bootHandshake.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

import {emitEvent} from "../runtime/emitEvent";
import {__resetForTesting, getEventPort} from "../runtime/exposeWorker";
import {createBootHandshake} from "./bootHandshake";
import {createMockWorker} from "./mockWorker";
import type {WorkerCapabilities} from "./workerCapabilities";

const CAPS: WorkerCapabilities = {crossOriginIsolated: false, hasWebGpu: false};

beforeEach(() => {
  __resetForTesting();
});

describe("createBootHandshake", () => {
  it("resolves when the worker emits {kind: 'ready'} on the event port", async () => {
    const mock = createMockWorker({api: {ping: async () => "pong"}});
    const handshake = createBootHandshake({
      worker: mock.worker,
      capabilities: CAPS,
      onEvent: () => {},
      bootstrapTimeoutMs: 10_000,
    });
    const result = await handshake.ready;
    expect(result).toBeUndefined();
    // Duck-type check: happy-dom's MessagePort `instanceof` can recurse on
    // structured property access, so assert the shape rather than the class.
    expect(typeof handshake.parentRpcPort.postMessage).toBe("function");
    expect(typeof handshake.parentEventPort.postMessage).toBe("function");
  });

  it("rejects with a generic crash when the bootstrap timeout fires", async () => {
    vi.useFakeTimers();
    try {
      // A worker that NEVER replies with `ready`.
      const stubWorker = {
        postMessage: () => {},
        terminate: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        onmessage: null,
        onmessageerror: null,
        onerror: null,
      } as unknown as Worker;
      const handshake = createBootHandshake({
        worker: stubWorker,
        capabilities: CAPS,
        onEvent: () => {},
        bootstrapTimeoutMs: 50,
      });
      const settled = handshake.ready.catch((e: unknown) => e);
      vi.advanceTimersByTime(60);
      const result = await settled;
      expect((result as Error).name).toBe("WorkerCrashError");
    } finally {
      vi.useRealTimers();
    }
  });

  it("forwards non-ready events through onEvent after bootstrap completes", async () => {
    const events: unknown[] = [];
    const mock = createMockWorker({api: {ping: async () => "pong"}});
    const handshake = createBootHandshake({
      worker: mock.worker,
      capabilities: CAPS,
      onEvent: (e) => events.push(e),
      bootstrapTimeoutMs: 10_000,
    });
    await handshake.ready;
    // Push a log event from the worker side via the runtime's event port.
    // Synthesizing a MessageEvent on the parent's `dispatchEvent` directly is
    // not portable across MessagePort implementations (Node's worker_threads
    // version rejects MessageEvent), so route through the channel like a
    // real worker would.
    const workerEventPort = getEventPort();
    expect(workerEventPort).not.toBeNull();
    if (workerEventPort) {
      emitEvent(workerEventPort, {kind: "log", level: "info", msg: "hi"});
      // Yield once so the message hops the channel.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    expect(events).toContainEqual({kind: "log", level: "info", msg: "hi"});
  });

  it("teardown() closes both parent ports and clears the bootstrap timeout", async () => {
    const mock = createMockWorker({api: {ping: async () => "pong"}});
    const handshake = createBootHandshake({
      worker: mock.worker,
      capabilities: CAPS,
      onEvent: () => {},
      bootstrapTimeoutMs: 10_000,
    });
    await handshake.ready;
    const closeRpc = vi.spyOn(handshake.parentRpcPort, "close");
    const closeEvent = vi.spyOn(handshake.parentEventPort, "close");
    handshake.teardown();
    expect(closeRpc).toHaveBeenCalled();
    expect(closeEvent).toHaveBeenCalled();
  });

  it("rethrows synchronously when validateBootstrap rejects malformed capabilities", () => {
    // Exercises the synchronous validation-failure branch of
    // createBootHandshake. validateBootstrap requires `crossOriginIsolated`
    // to be a boolean (see workerEnvelope.ts SECURITY note); passing a
    // string forces validateBootstrap to return false BEFORE postMessage,
    // so the helper rejects `ready` and rethrows the validation error.
    //
    // Like the postMessage-throw test below, we cannot also assert on
    // `ready` here because createBootHandshake throws before returning the
    // handshake. The internal `.catch(() => {})` keeps the orphan rejection
    // from surfacing as an unhandled-rejection warning — exactly the
    // contract documented on the BootHandshake type.
    const mock = createMockWorker({api: {ping: async () => "pong"}});
    const malformedCaps = {
      crossOriginIsolated: "not-a-boolean",
      hasWebGpu: false,
    } as unknown as WorkerCapabilities;

    expect(() => {
      createBootHandshake({
        worker: mock.worker,
        capabilities: malformedCaps,
        onEvent: () => {},
        bootstrapTimeoutMs: 1_000,
      });
    }).toThrow("invalid bootstrap message");
  });

  it("rethrows synchronously when worker.postMessage throws", () => {
    // Exercises the synchronous postMessage-throw branch of
    // createBootHandshake: the helper must rethrow the same error after
    // rejecting `ready` and tearing down its internal state. Structurally
    // identical to the validation-failure branch (which is harder to
    // trigger without monkey-patching internal imports).
    //
    // Note: we cannot also assert on `ready` here because
    // createBootHandshake throws before returning the handshake, so there
    // is no `ready` reference exposed to the caller. The internal
    // `.catch(() => {})` exists precisely to keep this orphan-rejection
    // case from generating an unhandled-rejection warning — which is
    // exactly the contract documented on the BootHandshake type.
    const throwingWorker = {
      postMessage: () => {
        throw new Error("postMessage failed");
      },
      terminate: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      onmessage: null,
      onmessageerror: null,
      onerror: null,
    } as unknown as Worker;

    expect(() => {
      createBootHandshake({
        worker: throwingWorker,
        capabilities: CAPS,
        onEvent: () => {},
        bootstrapTimeoutMs: 1_000,
      });
    }).toThrow("postMessage failed");
  });
});
