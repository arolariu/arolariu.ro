/**
 * @fileoverview Worker-side runtime: exposes a typed API once the bootstrap
 * handshake completes.
 * @module workers/runtime/exposeWorker
 *
 * @remarks
 * Mirrors `createWorkerHost` from the parent side. Handles the bootstrap
 * handshake, normalizes thrown errors so the parent wrapper can rewrap them
 * as `WorkerError`, and emits `{kind: "ready"}` on the event port to signal
 * readiness to the host.
 *
 * Handshake state lives in a per-`expose()` `WorkerRuntime` object; the
 * module-level `activeRuntime` pointer is updated on each successful
 * bootstrap so `getEventPort()` / `getBootstrapCapabilities()` continue to
 * work as zero-argument helpers. `__resetForTesting()` clears the pointer.
 */

import * as Comlink from "comlink";

import type {WorkerCapabilities} from "../host/workerCapabilities";
import {validateBootstrap, type WorkerBootstrap} from "../host/workerEnvelope";
import {emitEvent} from "./emitEvent";
import {installUnhandledRejectionBridge} from "./installUnhandledRejectionBridge";
import {wrapHandlerError} from "./wrapHandlerError";

/** Per-`expose()` runtime state, populated after bootstrap. */
type WorkerRuntime = {
  eventPort: MessagePort | null;
  capabilities: WorkerCapabilities | null;
};

/** The most-recently bootstrapped runtime — backs `getEventPort`/`getBootstrapCapabilities`. */
let activeRuntime: WorkerRuntime | null = null;

/**
 * Returns the event port granted to this worker during bootstrap.
 * Returns `null` until bootstrap has completed.
 *
 * Use this to emit additional `WorkerEvent`s from inside handlers:
 * ```ts
 * const port = getEventPort();
 * if (port) emitEvent(port, {kind: "log", level: "info", msg: "phase X"});
 * ```
 */
export function getEventPort(): MessagePort | null {
  return activeRuntime?.eventPort ?? null;
}

/**
 * Returns the host-supplied capability snapshot from the bootstrap handshake.
 * Returns `null` until bootstrap has completed. Worker code should use this
 * helper rather than peeking at the raw bootstrap message to keep layering
 * clean.
 */
export function getBootstrapCapabilities(): WorkerCapabilities | null {
  return activeRuntime?.capabilities ?? null;
}

/**
 * Reset the active runtime pointer. **Test-only.** Production code must not call this.
 * @internal
 */
export function __resetForTesting(): void {
  activeRuntime = null;
}

/** Options for `expose`. The `self` parameter is for testability only. */
export type ExposeOptions = Readonly<{
  /** Override the global scope. Test-only; production code omits this. */
  self?: DedicatedWorkerGlobalScope;
}>;

/**
 * Expose a typed API to the parent host.
 *
 * @typeParam TApi - The API shape (must match what the parent expects).
 * @param api - The implementation object whose methods will be called via Comlink.
 * @param options - Optional test injection.
 */
export function expose<TApi extends Record<string, unknown>>(api: TApi, options: ExposeOptions = {}): void {
  const scope = options.self ?? (globalThis as unknown as DedicatedWorkerGlobalScope);
  const runtime: WorkerRuntime = {eventPort: null, capabilities: null};

  const onBootstrap = (event: MessageEvent): void => {
    const data = event.data as unknown;
    if (!validateBootstrap(data)) {
      return; // ignore non-bootstrap traffic
    }
    const bootstrap = data as WorkerBootstrap;
    runtime.eventPort = bootstrap.eventPort;
    // SPEC: The event port is send-only on the worker side (we only
    // postMessage on it; never addEventListener). Per WHATWG HTML §9.4.5
    // `port.start()` is only required for the receiving side. Omitted as
    // a no-op.
    runtime.capabilities = bootstrap.capabilities;
    activeRuntime = runtime;

    // Forward unhandled promise rejections inside the worker as structured
    // log events. No uninstall: the bridge's lifetime equals the worker's
    // realm — `terminate()` destroys both.
    installUnhandledRejectionBridge(scope, bootstrap.eventPort);

    // Wrap each method so thrown errors become serializable envelopes.
    const wrapped: Record<string, unknown> = {};
    for (const key of Object.keys(api)) {
      const value = (api as Record<string, unknown>)[key];
      wrapped[key] =
        typeof value === "function"
          ? wrapHandlerError(value as (...a: unknown[]) => Promise<unknown>)
          : value;
    }

    Comlink.expose(wrapped, bootstrap.rpcPort);

    // One-shot bootstrap: detach the listener so future messages on `self` are ignored.
    scope.removeEventListener("message", onBootstrap);

    emitEvent(bootstrap.eventPort, {kind: "ready"});
  };

  scope.addEventListener("message", onBootstrap);
}
