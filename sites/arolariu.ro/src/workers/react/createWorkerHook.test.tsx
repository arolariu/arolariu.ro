import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";

import {createMockWorker} from "../host/mockWorker";
import {__resetForTesting} from "../runtime/exposeWorker";
import {createWorkerHook} from "./createWorkerHook";

type Api = {ping: () => Promise<string>};

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
  Object.defineProperty(globalThis, "Worker", {value: ORIGINAL_WORKER, configurable: true, writable: true});
});

describe("createWorkerHook", () => {
  it("returns a hook that produces a host with the supplied options", async () => {
    const mock = createMockWorker<Api>({api: {ping: async () => "pong"}});
    const useFooWorker = createWorkerHook<Api>({
      name: "foo",
      load: () => mock.worker,
      defaultCallTimeoutMs: 0,
    });
    const {result} = renderHook(() => useFooWorker());
    await act(async () => {
      const out = await result.current.api.ping();
      expect(out).toBe("pong");
    });
    expect(result.current.state).toBe("ready");
  });
});
