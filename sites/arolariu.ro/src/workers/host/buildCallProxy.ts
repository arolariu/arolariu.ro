/**
 * @fileoverview Build the typed `Proxy` that wraps every host RPC call with
 * AbortSignal-as-last-arg detection, in-flight tracking, telemetry spans,
 * worker-error envelope rewrap, and per-call timeout.
 * @module workers/host/buildCallProxy
 *
 * @remarks
 * Pulled out of `createWorkerHost.ts` so each concern can be unit-tested
 * against a plain JS target rather than a real Comlink proxy.
 */

import type {Remote} from "comlink";

import type {InFlightRegistry} from "./inFlightRegistry";
import {raceWithSignal} from "./raceWithSignal";
import type {TelemetryBridge} from "./telemetryBridge";
import {WorkerError, WorkerTimeoutError} from "./workerErrors";

export type CallProxyDeps<TApi> = Readonly<{
  inFlight: InFlightRegistry;
  bridge: TelemetryBridge;
  defaultCallTimeoutMs: number;
  ensureReady: () => Promise<void>;
  /** Returns the wrapped Comlink proxy. */
  getTarget: () => Remote<TApi> | null;
  lifecycle: Readonly<{beginCall: () => void; endCall: () => void}>;
}>;

/**
 * Build the typed `Proxy` that wraps every host RPC call.
 *
 * @remarks
 * The returned proxy implements the *method-call* slice of `Remote<TApi>`.
 * Reads of `string`-keyed props always return a callable; symbol-keyed props
 * (e.g. `Comlink.releaseProxy`, `Comlink.createEndpoint`) return `undefined`.
 * Consumers needing the full Comlink `Remote` surface must hold the underlying
 * `proxy` directly.
 *
 * @remarks
 * Lazy errors: the trap returns a callable for every `string` prop, mirroring
 * Comlink's own `Remote<T>` behavior where calls are deferred. As a side
 * effect, `typeof host.api.foo === 'function'` is always true; feature-detect
 * via runtime inspection of the API contract instead.
 */
export function buildCallProxy<TApi>(deps: CallProxyDeps<TApi>): Remote<TApi> {
  return new Proxy({} as Remote<TApi>, {
    get(_target, prop): unknown {
      if (typeof prop !== "string") return undefined;

      return (...args: unknown[]): Promise<unknown> => {
        // 1) AbortSignal-as-last-arg detection (synchronous reject path).
        const last = args[args.length - 1];
        let signal: AbortSignal | undefined;
        let callArgs = args;
        if (last instanceof AbortSignal) {
          signal = last;
          callArgs = args.slice(0, -1);
          if (signal.aborted) {
            return Promise.reject(signal.reason ?? new Error("aborted"));
          }
        }

        // 2) Register in-flight synchronously so a crash mid-`ensureReady`
        //    still reaches the rejection path.
        let removeFromInFlight: (() => void) | null = null;
        const crashPromise = new Promise<never>((_resolve, reject) => {
          removeFromInFlight = deps.inFlight.register(prop, reject);
        });
        // Suppress unhandled-rejection on whichever promise loses its
        // `Promise.race` — the loser still settles asynchronously after the
        // race completes. Applies to `crashPromise`, `wrapped`, and
        // `bodyPromise` below.
        crashPromise.catch(() => {});

        const body = async (): Promise<unknown> => {
          await deps.ensureReady();
          const target = deps.getTarget();
          if (!target) throw new Error(`Worker host has no target after ensureReady()`);
          const fn = (target as Record<string, unknown>)[prop];
          if (typeof fn !== "function") {
            throw new Error(`Worker host has no method "${prop}"`);
          }
          deps.lifecycle.beginCall();

          const callStartMs = performance.now();
          let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
          let timeoutPromise: Promise<never> | null = null;
          if (deps.defaultCallTimeoutMs > 0 && Number.isFinite(deps.defaultCallTimeoutMs)) {
            timeoutPromise = new Promise<never>((_, reject) => {
              timeoutHandle = setTimeout(() => {
                reject(new WorkerTimeoutError(prop, Math.round(performance.now() - callStartMs)));
              }, deps.defaultCallTimeoutMs);
            });
          }

          try {
            const wrapped = deps.bridge.wrapCall(prop, async () => {
              const callPromise = (async (): Promise<unknown> => {
                try {
                  return await (fn as (...a: unknown[]) => Promise<unknown>)(...callArgs);
                } catch (cause) {
                  if (
                    typeof cause === "object" &&
                    cause !== null &&
                    (cause as {__workerError?: unknown}).__workerError === true
                  ) {
                    throw new WorkerError(cause, prop);
                  }
                  throw cause;
                }
              })();
              return raceWithSignal(callPromise, signal);
            });

            if (timeoutPromise) {
              wrapped.catch(() => {});
              return await Promise.race([wrapped, timeoutPromise]);
            }
            return await wrapped;
          } finally {
            if (timeoutHandle !== null) clearTimeout(timeoutHandle);
            deps.lifecycle.endCall();
          }
        };

        const bodyPromise = body();
        bodyPromise.catch(() => {});
        return Promise.race([bodyPromise, crashPromise]).finally(() => {
          removeFromInFlight?.();
        });
      };
    },
  });
}
