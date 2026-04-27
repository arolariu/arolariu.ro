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
 */

import * as Comlink from "comlink";

import {validateBootstrap, type WorkerBootstrap} from "../host/workerEnvelope";
import {emitEvent} from "./emitEvent";

/** Module-level slot for the event port; populated after bootstrap. */
let eventPort: MessagePort | null = null;

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
  return eventPort;
}

/**
 * Reset module-level state. **Test-only.** Production code must not call this.
 * @internal
 */
export function __resetForTesting(): void {
  eventPort = null;
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

  const onBootstrap = (event: MessageEvent): void => {
    const data = event.data as unknown;
    if (!validateBootstrap(data)) {
      return; // ignore non-bootstrap traffic
    }
    const bootstrap = data as WorkerBootstrap;
    eventPort = bootstrap.eventPort;
    eventPort.start();

    // Wrap each method so thrown errors become plain serializable objects.
    const wrapped: Record<string, unknown> = {};
    for (const key of Object.keys(api)) {
      const value = (api as Record<string, unknown>)[key];
      if (typeof value === "function") {
        wrapped[key] = async (...args: unknown[]): Promise<unknown> => {
          try {
            return await (value as (...a: unknown[]) => unknown)(...args);
          } catch (cause) {
            // Re-throw as a plain object Comlink can serialize.
            // Parent rewraps as WorkerError with name/message/stack preserved.
            const err = cause as {name?: string; message?: string; stack?: string};
            throw {
              __workerError: true,
              name: typeof err?.name === "string" ? err.name : "Error",
              message: typeof err?.message === "string" ? err.message : String(cause),
              stack: typeof err?.stack === "string" ? err.stack : undefined,
            };
          }
        };
      } else {
        wrapped[key] = value;
      }
    }

    Comlink.expose(wrapped, bootstrap.rpcPort);

    // One-shot bootstrap: detach the listener so future messages on `self` are ignored.
    scope.removeEventListener("message", onBootstrap);

    emitEvent(bootstrap.eventPort, {kind: "ready"});
  };

  scope.addEventListener("message", onBootstrap);
}
