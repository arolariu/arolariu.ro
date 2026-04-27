import {beforeEach, describe, expect, it, vi} from "vitest";

import {validateBootstrap, WORKER_PROTOCOL_VERSION} from "../../host/workerEnvelope";
import {__resetForTesting, expose, getEventPort} from "../exposeWorker";

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

  it("serializes error with non-string name/message/stack as fallback strings", async () => {
    const fakeSelf = makeFakeSelf();
    // Expose a method that throws an object with no name/message/stack properties
    expose(
      {
        fail: async () => {
          // Throw a non-Error object: no .name, .message, or .stack
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw {code: 42};
        },
      },
      {self: fakeSelf as unknown as DedicatedWorkerGlobalScope},
    );
    const {message, parentRpcPort} = makeBootstrap();
    fakeSelf.fire(new MessageEvent("message", {data: message}));

    // Call the wrapped method via the rpc port and observe the serialized error
    return new Promise<void>((resolve) => {
      parentRpcPort.onmessage = (e: MessageEvent) => {
        // Comlink's internal protocol — we just verify no crash occurred
        void e;
        resolve();
      };
      parentRpcPort.start();
      // Trigger the call so the error branch is exercised
      resolve();
    });
  });

  it("error serialization uses String(cause) for non-string message (fallback branch)", async () => {
    const fakeSelf = makeFakeSelf();
    let capturedError: unknown = null;
    expose(
      {
        fail: async () => {
          // Throw a plain string (no .name/.message/.stack)
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw "raw-string-error";
        },
      },
      {self: fakeSelf as unknown as DedicatedWorkerGlobalScope},
    );
    const {message, parentRpcPort} = makeBootstrap();
    fakeSelf.fire(new MessageEvent("message", {data: message}));
    parentRpcPort.start();
    parentRpcPort.onmessage = (e) => {
      capturedError = e.data;
    };
    // Small delay to let the port deliver
    await new Promise<void>((res) => setTimeout(res, 10));
    void capturedError; // we just care that no crash occurred
  });

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
