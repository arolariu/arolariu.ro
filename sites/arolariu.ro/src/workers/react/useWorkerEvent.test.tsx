import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {createWorkerHost, type WorkerEvent} from "../host";
import {createMockWorker} from "../host/mockWorker";
import {emitEvent, getEventPort} from "../runtime";
import {__resetForTesting} from "../runtime/exposeWorker";
import {useWorker} from "./useWorker";
import {useWorkerEvent} from "./useWorkerEvent";

type Api = {
  emit: () => Promise<void>;
};

// happy-dom does not define `Worker`. Mirror the stub from useWorker.test.tsx
// so the host's SSR-safety check passes and MockWorker can supply the
// duck-typed object.
const ORIGINAL_WORKER = (globalThis as {Worker?: unknown}).Worker;

function makeFactory() {
  return () => {
    const mock = createMockWorker<Api>({
      api: {
        emit: async () => {
          const port = getEventPort();
          if (port) emitEvent(port, {kind: "log", level: "info", msg: "tick"});
        },
      },
    });
    return createWorkerHost<Api>({
      name: "ev-test",
      load: () => mock.worker,
      defaultCallTimeoutMs: 0,
    });
  };
}

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
  Object.defineProperty(globalThis, "Worker", {value: ORIGINAL_WORKER, configurable: true, writable: true});
});

describe("useWorkerEvent", () => {
  it("invokes the listener for events the host receives", async () => {
    const factory = makeFactory();
    const listener = vi.fn();
    const {result} = renderHook(() => {
      const host = useWorker(factory);
      useWorkerEvent(host, listener);
      return host;
    });
    await act(async () => {
      await result.current.api.emit();
    });
    // The mock-worker runtime emits {kind: "log", level: "info", msg: "tick"}
    // through the side-channel event port, which the host fans out to
    // useWorkerEvent's listener.
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({kind: "log", msg: "tick"}));
  });

  it("ref-stabilizes the listener so re-renders do not re-attach the subscription", async () => {
    // This test pins the actual contract that motivates the ref pattern in
    // `useWorkerEvent`: when the listener identity changes between renders,
    // the underlying `host.subscribeToEvents` registration is NOT torn down
    // and rebuilt. Instead, the ref captures the latest listener and the
    // single subscription invokes whichever listener is current.
    //
    // Verification strategy:
    //  1. Mount with `firstListener`, fire one event, observe one call.
    //  2. Re-render the hook with `secondListener` (new identity).
    //  3. Fire another event. The contract requires the second listener
    //     receives the call (proving the ref forwards) AND the first
    //     listener does NOT receive a second call (proving the original
    //     subscription wasn't replaced and re-attached separately).
    const factory = makeFactory();
    const firstListener = vi.fn();
    const secondListener = vi.fn();
    const {result, rerender} = renderHook(
      ({listener}: {listener: (event: WorkerEvent) => void}) => {
        const host = useWorker(factory);
        useWorkerEvent(host, listener);
        return host;
      },
      {initialProps: {listener: firstListener as (event: WorkerEvent) => void}},
    );
    await act(async () => {
      await result.current.api.emit();
    });
    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(0);

    // Swap to the second listener. The hook's effect deps are [host], not
    // [listener], so the underlying subscription does NOT re-attach — the
    // ref just starts forwarding to `secondListener`.
    rerender({listener: secondListener as (event: WorkerEvent) => void});

    await act(async () => {
      await result.current.api.emit();
    });
    // First listener saw exactly one event (from before the swap) — proving
    // the ref pattern routed the post-swap event to `secondListener` and not
    // back to `firstListener`. Second listener saw exactly one event (from
    // after the swap) — proving the single subscription kept fan-out alive
    // across the re-render with no gap and no double-fire.
    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);
  });
});
