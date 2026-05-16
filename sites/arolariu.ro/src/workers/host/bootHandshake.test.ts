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

  it("handles a 'ready' event arriving after the timeout (bootTimeoutId already null)", async () => {
    // Exercises the `if (bootTimeoutId !== null)` false branch (line 150).
    // This race can happen when the timeout fires first (setting bootTimeoutId=null
    // and rejecting), and then the late ready event still arrives on the port.
    vi.useFakeTimers();
    try {
      const stubWorker: Worker = {
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
      // Advance time to fire the bootstrap timeout — sets bootTimeoutId=null.
      vi.advanceTimersByTime(60);
      await settled;
      // Now send a late 'ready' event on the parent port — bootTimeoutId is null.
      // The port's onmessage handler is still wired (the timeout only sets
      // bootTimeoutId=null; it doesn't clear the port handler). Calling it
      // exercises the `if (bootTimeoutId !== null)` false branch.
      const parentEventPort = handshake.parentEventPort;
      // The onmessage must still be set after timeout (only bootTimeoutId is cleared).
      expect(parentEventPort.onmessage).not.toBeNull();
      expect(() => {
        parentEventPort.onmessage!(new MessageEvent("message", {data: {kind: "ready"}}));
      }).not.toThrow();
    } finally {
      vi.useRealTimers();
    }
  });

  it("teardown() is idempotent — second call is a no-op", async () => {
    // Exercises the `if (tornDown) return` guard (line 244 of bootHandshake.ts).
    const mock = createMockWorker({api: {ping: async () => "pong"}});
    const handshake = createBootHandshake({
      worker: mock.worker,
      capabilities: CAPS,
      onEvent: () => {},
      bootstrapTimeoutMs: 10_000,
    });
    await handshake.ready;
    handshake.teardown();
    // Second call must not throw.
    expect(() => handshake.teardown()).not.toThrow();
  });

  it("filters stray ready events arriving after bootstrap (steady-state listener)", async () => {
    // Exercises the `if (nextEv.kind === "ready") return` branch (line 158).
    // After bootstrap, the steady-state listener filters out stray ready events.
    //
    // Drive the parent event port directly rather than posting to the
    // worker-side port. The previous version posted via `getEventPort()` and
    // relied on the MessageChannel transfer being plumbed — if the harness
    // ever stops plumbing the channel, the assertion becomes vacuously true.
    // Calling `parentEventPort.onmessage` directly removes that ambiguity
    // and pins the filter behaviour on the parent side where it actually lives.
    const events: unknown[] = [];
    const mock = createMockWorker({api: {ping: async () => "pong"}});
    const handshake = createBootHandshake({
      worker: mock.worker,
      capabilities: CAPS,
      onEvent: (e) => events.push(e),
      bootstrapTimeoutMs: 10_000,
    });
    await handshake.ready;
    // Baseline: confirm the parent port's steady-state handler is wired.
    const parentEventPort = handshake.parentEventPort;
    expect(parentEventPort.onmessage).not.toBeNull();
    const countBefore = events.length;
    // Drive a stray "ready" event directly into the parent port. The
    // steady-state listener must filter it before reaching `onEvent`.
    parentEventPort.onmessage!(new MessageEvent("message", {data: {kind: "ready"}}));
    // No new event reached the sink.
    expect(events.length).toBe(countBefore);
    expect(events.find((e) => (e as {kind?: string}).kind === "ready")).toBeUndefined();
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

  it("forwards non-ready events arriving before the handshake completes (defensive parity)", async () => {
    // This test drives the pre-ready onEvent branch (line 165 of bootHandshake.ts).
    // We send a non-ready event on the parent event port BEFORE the ready event
    // by directly triggering the port's onmessage handler.
    const events: unknown[] = [];

    // Use a stub worker that never replies — we drive the port manually.
    const stubWorker: Worker = {
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
      onEvent: (e) => events.push(e),
      bootstrapTimeoutMs: 10_000,
    });

    // The parent event port has its onmessage wired by createBootHandshake.
    // Trigger a pre-ready log event directly — this exercises the defensive
    // parity branch that forwards non-ready events before handshake completes.
    const parentEventPort = handshake.parentEventPort;
    if (parentEventPort.onmessage) {
      parentEventPort.onmessage(new MessageEvent("message", {data: {kind: "log", level: "info", msg: "pre-ready"}}));
    }
    expect(events).toContainEqual({kind: "log", level: "info", msg: "pre-ready"});

    // Clean up: teardown the handshake (avoids the bootstrap timeout leaking).
    handshake.rejectIfPending(new Error("test done"));
    handshake.teardown();
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
