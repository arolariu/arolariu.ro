/**
 * @fileoverview Unit tests for `buildCallProxy` — the typed Proxy factory that
 * wraps every host RPC call with AbortSignal detection, in-flight tracking,
 * telemetry, worker-error rewrap, and per-call timeout.
 * @module workers/host/buildCallProxy.test
 */

import type {Remote} from "comlink";
import {describe, expect, it, vi} from "vitest";

import {buildCallProxy} from "./buildCallProxy";
import {createInFlightRegistry} from "./inFlightRegistry";
import {createTelemetryBridge} from "./telemetryBridge";
import {WorkerError, WorkerTimeoutError} from "./workerErrors";

const SILENT_LOGGER = {debug: () => {}, info: () => {}, warn: () => {}, error: () => {}};

function makeFixture(target: Record<string, (...args: unknown[]) => Promise<unknown>>) {
  const inFlight = createInFlightRegistry();
  const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
  return {
    inFlight,
    bridge,
    proxy: buildCallProxy<typeof target>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: 30_000,
      ensureReady: async () => {},
      getTarget: () => target as unknown as Remote<typeof target>,
      lifecycle: {beginCall: () => {}, endCall: () => {}},
    }),
  };
}

describe("buildCallProxy", () => {
  it("forwards arguments and resolves with the target's return value", async () => {
    const {proxy} = makeFixture({echo: async (msg: string) => `echo:${msg}`});
    await expect(proxy.echo("hi")).resolves.toBe("echo:hi");
  });

  it("synchronously rejects when an AbortSignal is already aborted at call time", async () => {
    const ac = new AbortController();
    ac.abort(new Error("pre"));
    const {proxy} = makeFixture({slow: async (_signal: AbortSignal) => "done"});
    await expect(proxy.slow(ac.signal)).rejects.toThrow("pre");
  });

  it("rejects with WorkerTimeoutError when the per-call budget elapses", async () => {
    const inFlight = createInFlightRegistry();
    const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
    type Api = {slow: () => Promise<string>};
    const target: Api = {slow: () => new Promise(() => {})};
    const proxy = buildCallProxy<Api>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: 10,
      ensureReady: async () => {},
      getTarget: () => target as unknown as Remote<Api>,
      lifecycle: {beginCall: () => {}, endCall: () => {}},
    });
    await expect(proxy.slow()).rejects.toBeInstanceOf(WorkerTimeoutError);
  });

  it("rewraps a worker-side __workerError envelope as a WorkerError with .method", async () => {
    const {proxy} = makeFixture({
      boom: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw {__workerError: true, name: "Error", message: "from-worker"};
      },
    });
    const err = await proxy.boom().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WorkerError);
    expect((err as WorkerError).method).toBe("boom");
  });

  it("registers the call with InFlightRegistry and removes it after settle", async () => {
    const {proxy, inFlight} = makeFixture({echo: async (m: string) => m});
    const callPromise = proxy.echo("a");
    expect(inFlight.size).toBe(1);
    await callPromise;
    expect(inFlight.size).toBe(0);
  });

  it("treats 0 as 'timeout disabled'", async () => {
    const inFlight = createInFlightRegistry();
    const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
    type Api = {slow: () => Promise<string>};
    const target: Api = {slow: async () => "ok"};
    const proxy = buildCallProxy<Api>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: 0,
      ensureReady: async () => {},
      getTarget: () => target as unknown as Remote<Api>,
      lifecycle: {beginCall: () => {}, endCall: () => {}},
    });
    await expect(proxy.slow()).resolves.toBe("ok");
  });

  it("treats Infinity as 'timeout disabled'", async () => {
    const inFlight = createInFlightRegistry();
    const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
    type Api = {slow: () => Promise<string>};
    const target: Api = {slow: async () => "ok"};
    const proxy = buildCallProxy<Api>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: Infinity,
      ensureReady: async () => {},
      getTarget: () => target as unknown as Remote<Api>,
      lifecycle: {beginCall: () => {}, endCall: () => {}},
    });
    await expect(proxy.slow()).resolves.toBe("ok");
  });

  it("calls lifecycle.beginCall before the target and lifecycle.endCall after settle", async () => {
    const beginCall = vi.fn();
    const endCall = vi.fn();
    const inFlight = createInFlightRegistry();
    const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
    type Api = {ping: () => Promise<string>};
    const target: Api = {ping: async () => "pong"};
    const proxy = buildCallProxy<Api>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: 30_000,
      ensureReady: async () => {},
      getTarget: () => target as unknown as Remote<Api>,
      lifecycle: {beginCall, endCall},
    });
    await proxy.ping();
    expect(beginCall).toHaveBeenCalledOnce();
    expect(endCall).toHaveBeenCalledOnce();
  });

  it("rethrows plain Error from the target without WorkerError wrapping", async () => {
    const {proxy} = makeFixture({
      boom: async () => {
        throw new TypeError("kaboom");
      },
    });
    const err = await proxy.boom().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect((err as Error).message).toBe("kaboom");
    // Critically: NOT wrapped as WorkerError.
    expect(err).not.toBeInstanceOf(WorkerError);
  });
});
