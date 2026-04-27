import {describe, expect, it, vi} from "vitest";

import {validateBootstrap, WORKER_PROTOCOL_VERSION} from "../../host/workerEnvelope";
import {expose, getEventPort} from "../exposeWorker";

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
});
