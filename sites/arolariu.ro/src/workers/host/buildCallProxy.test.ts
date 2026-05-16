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

// Constraint uses `(...args: never[]) => Promise<unknown>` (NOT `unknown[]`):
// `never` is the bottom type, so via parameter contravariance any concrete
// function signature satisfies it (a function that requires a `string` arg
// is assignable to one that requires `never` because no value is `never`).
// This lets callers pass `{echo: async (msg: string) => string}` and have
// TS infer the precise literal type, so `proxy.echo` is dot-accessible
// without tripping noPropertyAccessFromIndexSignature.
function makeFixture<TApi extends Record<string, (...args: never[]) => Promise<unknown>>>(target: TApi) {
  const inFlight = createInFlightRegistry();
  const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
  return {
    inFlight,
    bridge,
    proxy: buildCallProxy<TApi>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: 30_000,
      ensureReady: async () => {},
      getTarget: () => target as unknown as Remote<TApi>,
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
    // Explicit `Promise<unknown>` return type prevents TS from inferring the
    // always-throwing body as `Promise<never>`, which would collapse the
    // proxy's call expression to `never` (no `.catch`) under tsgo strictness.
    const {proxy} = makeFixture({
      boom: async (): Promise<unknown> => {
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

  it("returns undefined for symbol-keyed property access", () => {
    // Exercises the `typeof prop !== "string"` true branch (line 48).
    const {proxy} = makeFixture({ping: async () => "pong"});
    const value = (proxy as unknown as Record<symbol, unknown>)[Symbol.iterator];
    expect(value).toBeUndefined();
  });

  it("rejects when getTarget() returns null after ensureReady (no target branch)", async () => {
    // Exercises the `if (!target)` branch (line 78): getTarget returns null
    // even after ensureReady, which should throw "no target after ensureReady".
    const inFlight = createInFlightRegistry();
    const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
    type Api = {missing: () => Promise<string>};
    const proxy = buildCallProxy<Api>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: 0,
      ensureReady: async () => {},
      getTarget: () => null, // always returns null
      lifecycle: {beginCall: () => {}, endCall: () => {}},
    });
    const proxyAsRecord = proxy as unknown as Record<string, () => Promise<unknown>>;
    await expect(proxyAsRecord["missing"]!()).rejects.toThrow("Worker host has no target after ensureReady");
  });

  it("resolves normally when an AbortSignal is passed but not yet aborted", async () => {
    // Exercises the `if (signal.aborted)` false branch (line 58) — the signal is
    // passed as last arg (triggering the instanceof check) but is not aborted,
    // so the call proceeds normally.
    const ac = new AbortController();
    // Do NOT abort — signal.aborted is false.
    const {proxy} = makeFixture({echo: async (msg: string) => `echo:${msg}`});
    const echoWithSignal = proxy.echo as unknown as (msg: string, signal: AbortSignal) => Promise<string>;
    await expect(echoWithSignal("hi", ac.signal)).resolves.toBe("echo:hi");
  });

  it("rejects with fallback Error when pre-aborted signal has no reason", async () => {
    // Exercises the `signal.reason ?? new Error("aborted")` fallback in the
    // pre-aborted path (line 59) when signal.reason is undefined.
    // ac.abort() with no argument leaves reason as undefined on some runtimes.
    const ac = new AbortController();
    ac.abort(); // no reason → reason may be undefined or DOMException
    const {proxy} = makeFixture({slow: async (_signal: AbortSignal) => "done"});
    // The call should reject — either with `reason` or with the "aborted" fallback.
    await expect(proxy.slow(ac.signal)).rejects.toThrow();
  });

  it("rejects with 'no method' error when the target object lacks the requested method", async () => {
    // Drives the `typeof fn !== "function"` branch (line 81 of buildCallProxy.ts).
    // We provide a target that has no methods at all — getTarget() returns an
    // object with no callable properties, so any prop access yields undefined.
    const inFlight = createInFlightRegistry();
    const bridge = createTelemetryBridge("test", {logger: SILENT_LOGGER});
    // An empty object has no methods; the proxy will call getTarget() and then
    // try to look up the method by name — undefined is not a function.
    const emptyTarget = {} as unknown as {missing: () => Promise<string>};
    const proxy = buildCallProxy<typeof emptyTarget>({
      inFlight,
      bridge,
      defaultCallTimeoutMs: 0,
      ensureReady: async () => {},
      getTarget: () => emptyTarget as never,
      lifecycle: {beginCall: () => {}, endCall: () => {}},
    });
    const proxyAsRecord = proxy as unknown as Record<string, () => Promise<unknown>>;
    await expect(proxyAsRecord["missing"]!()).rejects.toThrow('Worker host has no method "missing"');
  });

  it("rethrows plain Error from the target without WorkerError wrapping", async () => {
    // See the matching note on the __workerError envelope test: explicit
    // `Promise<unknown>` keeps the inferred return type from collapsing
    // to `Promise<never>` and breaking `.catch` resolution under tsgo.
    const {proxy} = makeFixture({
      boom: async (): Promise<unknown> => {
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
