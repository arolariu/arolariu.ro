import {beforeEach, describe, expect, it, vi} from "vitest";

import {validateBootstrap, WORKER_PROTOCOL_VERSION} from "../host/workerEnvelope";
import {__resetForTesting, expose, getEventPort} from "./exposeWorker";

/**
 * Build a minimal `self`-like object for the test, with `addEventListener`
 * support so `expose()` can attach its bootstrap listener.
 */
function makeFakeSelf(): {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  fire: (event: MessageEvent) => void;
} {
  let handler: ((event: MessageEvent) => void) | null = null;
  return {
    addEventListener: vi.fn((event: string, h: (e: MessageEvent) => void) => {
      if (event === "message") handler = h;
    }),
    removeEventListener: vi.fn(() => {
      handler = null;
    }),
    fire: (event) => {
      handler?.(event);
    },
  };
}

function makeBootstrap(): {
  message: unknown;
  parentRpcPort: MessagePort;
  parentEventPort: MessagePort;
} {
  // Worker gets port2; parent keeps port1. postMessage on port2 delivers to port1.
  const rpcChannel = new MessageChannel();
  const eventChannel = new MessageChannel();
  return {
    parentRpcPort: rpcChannel.port1,
    parentEventPort: eventChannel.port1,
    message: {
      kind: "bootstrap",
      version: WORKER_PROTOCOL_VERSION,
      rpcPort: rpcChannel.port2,
      eventPort: eventChannel.port2,
      capabilities: {crossOriginIsolated: false, hasWebGpu: false},
    },
  };
}

describe("expose", () => {
  beforeEach(() => {
    __resetForTesting();
  });

  it("attaches a single message listener on self", () => {
    const fakeSelf = makeFakeSelf();
    expose({greet: async (n: string) => `hi, ${n}`}, {self: fakeSelf as unknown as DedicatedWorkerGlobalScope});
    expect(fakeSelf.addEventListener).toHaveBeenCalledOnce();
    expect(fakeSelf.addEventListener.mock.calls[0]?.[0]).toBe("message");
  });

  it("ignores messages that fail validateBootstrap", () => {
    const fakeSelf = makeFakeSelf();
    expose({greet: async () => "hi"}, {self: fakeSelf as unknown as DedicatedWorkerGlobalScope});
    fakeSelf.fire(new MessageEvent("message", {data: {kind: "not-bootstrap"}}));
    expect(getEventPort()).toBeNull();
  });

  it("stores the eventPort and emits {kind: 'ready'} after a valid bootstrap", () => {
    const fakeSelf = makeFakeSelf();
    expose({greet: async () => "hi"}, {self: fakeSelf as unknown as DedicatedWorkerGlobalScope});
    const {message, parentEventPort} = makeBootstrap();
    const received: unknown[] = [];
    parentEventPort.onmessage = (e) => received.push(e.data);
    parentEventPort.start();
    // Fire bootstrap — the worker side processes it and posts ready over its event port.
    fakeSelf.fire(new MessageEvent("message", {data: message}));
    expect(getEventPort()).not.toBeNull();
    // Wait a tick so the ready event crosses the channel.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(received).toEqual([{kind: "ready"}]);
        resolve();
      }, 10);
    });
  });

  it("removes the bootstrap listener after handshake completes", () => {
    const fakeSelf = makeFakeSelf();
    expose({greet: async () => "hi"}, {self: fakeSelf as unknown as DedicatedWorkerGlobalScope});
    const {message} = makeBootstrap();
    fakeSelf.fire(new MessageEvent("message", {data: message}));
    expect(fakeSelf.removeEventListener).toHaveBeenCalledOnce();
  });

  it("getEventPort returns null before bootstrap completes", () => {
    const fakeSelf = makeFakeSelf();
    expose({greet: async () => "hi"}, {self: fakeSelf as unknown as DedicatedWorkerGlobalScope});
    expect(getEventPort()).toBeNull();
  });

  it("passes non-function API values through unwrapped (else branch)", () => {
    const fakeSelf = makeFakeSelf();
    // Include a non-function value — expose() should pass it through as-is
    expose(
      {greet: async () => "hi", version: "1.0.0" as unknown as () => Promise<unknown>},
      {self: fakeSelf as unknown as DedicatedWorkerGlobalScope},
    );
    const {message} = makeBootstrap();
    // Just verify bootstrap proceeds without error when non-function values are present
    expect(() => fakeSelf.fire(new MessageEvent("message", {data: message}))).not.toThrow();
    expect(getEventPort()).not.toBeNull();
  });

  // V & W: removed two error-serialization tests that captured messages on
  // the parent RPC port but never actually drove a Comlink RPC call, so
  // their `parentRpcPort.onmessage` capture and any `capturedError`
  // observation would never be exercised — the tests would pass even if
  // Comlink-side serialization were broken. The error-normalization path is
  // exercised end-to-end via `MockWorker` in `createWorkerHost.test.ts`
  // (see "error serialization fallback: non-Error thrown values produce
  // String(cause) as message").

  it("uses globalThis as default scope when options.self is not provided", () => {
    // Calling expose() with no options exercises the `options.self ?? globalThis` branch.
    // We spy on globalThis.addEventListener to verify it's called.
    const addSpy = vi.spyOn(globalThis, "addEventListener").mockImplementation(() => {});
    try {
      expose({greet: async () => "hi"});
      expect(addSpy).toHaveBeenCalledWith("message", expect.any(Function));
    } finally {
      addSpy.mockRestore();
    }
  });
});
