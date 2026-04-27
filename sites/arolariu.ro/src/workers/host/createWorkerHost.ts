/**
 * @fileoverview Public factory: a typed Worker host with state machine,
 * telemetry, AbortSignal support, idle reboot, and explicit restart.
 * @module workers/host/createWorkerHost
 *
 * @remarks
 * Composes {@link createWorkerLifecycle}, {@link createTelemetryBridge},
 * {@link getCapabilities}, and Comlink into the public worker host API.
 *
 * **Two-channel handshake:** the host creates two `MessageChannel`s and posts
 * the worker side of each (`port2`) to the worker via the bootstrap message.
 * `rpcPort` is wrapped with `Comlink.wrap` for typed RPC; `eventPort` carries
 * worker → parent telemetry events. The worker emits `{kind: "ready"}` on the
 * event port to signal that it is ready for RPC traffic.
 *
 * **Cancellation:** `AbortSignal` is honored on the parent side both when
 * already-aborted at call time and when it aborts mid-flight. Worker-side
 * cancellation (sending a cancel message and aborting the in-worker
 * AbortSignal) is deferred — see the README "Known limitations" section.
 */

import * as Comlink from "comlink";
import {type Remote} from "comlink";

import {createTelemetryBridge} from "./telemetryBridge";
import {getCapabilities, type WorkerCapabilities} from "./workerCapabilities";
import {WORKER_PROTOCOL_VERSION, type WorkerBootstrap, type WorkerEvent} from "./workerEnvelope";
import {WorkerCrashError, WorkerDeadError, WorkerError, WorkerNotAvailableError} from "./workerErrors";
import {createWorkerLifecycle, type WorkerHostState} from "./workerLifecycle";

/** Maximum time (ms) we wait for the worker to emit `{kind: "ready"}`. */
const BOOTSTRAP_TIMEOUT_MS = 10_000;
/** Default idle timeout for lazy-reboot: 5 minutes. */
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60_000;

export {type WorkerCapabilities} from "./workerCapabilities";
export type {WorkerEvent} from "./workerEnvelope";
export {WorkerCrashError, WorkerDeadError, WorkerError, WorkerNotAvailableError, WorkerTimeoutError} from "./workerErrors";
export {type WorkerHostState} from "./workerLifecycle";
export {type Remote} from "comlink";

/**
 * Options for {@link createWorkerHost}.
 * @typeParam TApi - The typed API the worker exposes.
 */
export type CreateWorkerHostOptions<TApi> = Readonly<{
  /** Stable name for telemetry/logs (e.g. `"ai"`). */
  name: string;
  /** Factory that constructs the underlying `Worker`. Lazy; called on first need. */
  load: () => Worker;
  /** Idle timeout in ms after which the worker is silently torn down. Default 5 min. */
  idleTimeoutMs?: number;
  /** Reserved for per-call timeouts; wired in a follow-up. */
  defaultCallTimeoutMs?: number;
  /** Hook called for every `WorkerEvent` emitted by the worker. */
  onEvent?: (event: WorkerEvent) => void;
}>;

/**
 * Public worker host returned by {@link createWorkerHost}.
 * @typeParam TApi - The typed API exposed by the worker.
 */
export type WorkerHost<TApi> = Readonly<{
  /** Comlink-wrapped typed proxy. Calls trigger lazy boot if needed. */
  api: Remote<TApi>;
  /** Current host state. Read live; not a snapshot. */
  readonly state: WorkerHostState;
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe: (listener: (state: WorkerHostState) => void) => () => void;
  /** Capabilities sampled at host construction. */
  readonly capabilities: WorkerCapabilities;
  /** Tear down the current worker (if any) and boot a fresh one. */
  restart: (signal?: AbortSignal) => Promise<void>;
  /** Eagerly boot the worker without making a real RPC call. */
  warmUp: () => Promise<void>;
  /** Permanently dispose. Subsequent calls reject with `WorkerDeadError`. */
  dispose: () => Promise<void>;
}>;

/** Tracks an in-flight call so we can reject it on crash. */
type InFlightEntry = Readonly<{
  method: string;
  reject: (err: unknown) => void;
}>;

/**
 * Build a typed {@link WorkerHost}.
 *
 * @typeParam TApi - The typed API exposed by the worker.
 * @param opts - Host configuration; see {@link CreateWorkerHostOptions}.
 * @returns A {@link WorkerHost} instance.
 */
export function createWorkerHost<TApi>(opts: CreateWorkerHostOptions<TApi>): WorkerHost<TApi> {
  const idleTimeoutMs = opts.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const capabilities = getCapabilities();
  const bridge = createTelemetryBridge(opts.name);

  let worker: Worker | null = null;
  let proxy: Remote<TApi> | null = null;
  let bootPromise: Promise<void> | null = null;
  let restartLock: Promise<void> | null = null;
  const inFlight = new Set<InFlightEntry>();

  // C1: Host-level subscriber registry. Subscribers register here and are
  // proxied through to the underlying lifecycle. This lets subscriptions
  // survive a `restart()` that re-creates the lifecycle instance.
  const hostListeners = new Set<(state: WorkerHostState) => void>();
  let lifecycleUnsubscribe: (() => void) | null = null;

  // I1: Track the active error listener so we can detach it on teardown,
  // preventing leaks across reboots.
  let currentErrorListener: {worker: Worker; handler: (e: ErrorEvent) => void} | null = null;

  // I3: Allow `dispose()` to cancel an in-flight bootstrap promise.
  let rejectBoot: ((err: Error) => void) | null = null;

  const onIdleHandler = (): void => {
    tearDownWorker("lazy-reboot");
  };

  let lifecycle = createWorkerLifecycle({
    idleTimeoutMs,
    onIdle: onIdleHandler,
  });

  /** Wire the lifecycle's state changes into the host-level listener set. */
  function attachLifecycleSubscription(): void {
    if (lifecycleUnsubscribe) lifecycleUnsubscribe();
    lifecycleUnsubscribe = lifecycle.subscribe((state) => {
      for (const listener of hostListeners) listener(state);
    });
  }

  // Initial wiring.
  attachLifecycleSubscription();

  /** True when `Worker` is defined in this environment (i.e., not SSR). */
  function isWorkerAvailable(): boolean {
    return typeof (globalThis as {Worker?: unknown}).Worker !== "undefined";
  }

  /** Mode for {@link tearDownWorker}. */
  type TeardownMode = "lazy-reboot" | "dispose" | "crash";

  /**
   * Tear down the underlying worker resources (terminate + null out).
   * Lifecycle transitions are the caller's responsibility — `crash` is
   * driven by `lifecycle.crash()` in `handleCrash`, `dispose` by
   * `lifecycle.dispose()` here, and `lazy-reboot` leaves state untouched.
   */
  function tearDownWorker(mode: TeardownMode): void {
    const w = worker;
    worker = null;
    proxy = null;
    // I1: Remove the error listener before terminating to avoid leaks.
    if (currentErrorListener) {
      try {
        currentErrorListener.worker.removeEventListener("error", currentErrorListener.handler);
      } catch {
        // ignore listener removal errors
      }
      currentErrorListener = null;
    }
    if (w) {
      try {
        w.terminate();
      } catch {
        // ignore termination errors
      }
    }
    if (mode === "dispose") {
      lifecycle.dispose();
    }
  }

  /** Reject all in-flight calls with `WorkerCrashError` and tear down. */
  function handleCrash(): void {
    if (lifecycle.state === "dead" || lifecycle.state === "disposed") return;
    const methods = Array.from(inFlight, (entry) => entry.method);
    const crashError = new WorkerCrashError(methods);
    // Snapshot and clear before rejecting so endCall() in finally is a no-op
    // for these entries.
    const entries = Array.from(inFlight);
    inFlight.clear();
    lifecycle.crash();
    tearDownWorker("crash");
    for (const entry of entries) {
      entry.reject(crashError);
    }
  }

  /** Perform the bootstrap handshake. Sets `worker` and `proxy` on success. */
  async function performBoot(): Promise<void> {
    if (!isWorkerAvailable()) {
      throw new WorkerNotAvailableError();
    }
    lifecycle.bootBegin();

    const w = opts.load();
    worker = w;

    const rpcChannel = new MessageChannel();
    const eventChannel = new MessageChannel();

    // Listen for unexpected `error` events on the worker.
    const onError = (): void => {
      handleCrash();
    };
    w.addEventListener("error", onError);
    // I1: Track the listener so teardown can remove it.
    currentErrorListener = {worker: w, handler: onError};

    const ready = new Promise<void>((resolve, reject) => {
      // I3: Expose this `reject` so `dispose()` can cancel a pending boot.
      rejectBoot = reject;

      const timeoutId = setTimeout(() => {
        eventChannel.port1.onmessage = null;
        // I3: If we were disposed while the timer was pending, surface a
        // `WorkerDeadError` rather than a misleading `WorkerCrashError`.
        if (lifecycle.state === "disposed") {
          reject(new WorkerDeadError("Host disposed during boot."));
          return;
        }
        handleCrash();
        reject(new WorkerCrashError([]));
      }, BOOTSTRAP_TIMEOUT_MS);

      eventChannel.port1.onmessage = (e: MessageEvent): void => {
        const event = e.data as WorkerEvent;
        if (event.kind === "ready") {
          clearTimeout(timeoutId);
          // Swap to the steady-state listener that ingests events.
          eventChannel.port1.onmessage = (next: MessageEvent): void => {
            const ev = next.data as WorkerEvent;
            // I4: Filter stray `ready` events that arrive after bootstrap.
            if (ev.kind === "ready") return;
            opts.onEvent?.(ev);
            bridge.ingestEvent(ev);
          };
          resolve();
          return;
        }
        // Forward any other events that arrive before "ready" (defensive).
        opts.onEvent?.(event);
        bridge.ingestEvent(event);
      };
      eventChannel.port1.start();
    }).finally(() => {
      // Clear the rejectBoot reference once boot settles either way.
      rejectBoot = null;
    });

    const bootstrap: WorkerBootstrap = {
      kind: "bootstrap",
      version: WORKER_PROTOCOL_VERSION,
      rpcPort: rpcChannel.port2,
      eventPort: eventChannel.port2,
      capabilities,
    };
    w.postMessage(bootstrap, [rpcChannel.port2, eventChannel.port2]);

    await ready;

    proxy = Comlink.wrap<TApi>(rpcChannel.port1);
    lifecycle.bootComplete();
  }

  /** Ensure the worker is booted and `proxy` is non-null, or throw. */
  async function ensureReady(): Promise<void> {
    if (lifecycle.state === "disposed" || lifecycle.state === "dead") {
      throw new WorkerDeadError();
    }
    if (lifecycle.state === "ready" && proxy !== null) return;
    if (!bootPromise) {
      bootPromise = performBoot().finally(() => {
        bootPromise = null;
      });
    }
    await bootPromise;
  }

  /**
   * Build the proxy that intercepts every API method call. Each invocation:
   * 1. Detects an `AbortSignal` last-arg and rejects synchronously if aborted.
   * 2. Awaits {@link ensureReady}.
   * 3. Registers the call in `inFlight` so `handleCrash` can reject it.
   * 4. Wraps the call in a telemetry span and races it against the crash promise.
   * 5. Normalizes worker-thrown errors into {@link WorkerError}.
   */
  function buildProxy(): Remote<TApi> {
    return new Proxy({} as Remote<TApi>, {
      get(_target, prop): unknown {
        if (typeof prop !== "string") return undefined;
        return (...args: unknown[]): Promise<unknown> => {
          // 1) AbortSignal-as-last-arg detection — synchronous so already-aborted
          //    signals reject before any state is touched.
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

          // 2) Register in-flight synchronously. This is critical: a crash
          //    triggered while we're still queued past `await ensureReady()`
          //    must still see this call in `inFlight` and reject it.
          let entry: InFlightEntry | null = null;
          const crashPromise = new Promise<never>((_resolve, reject) => {
            entry = {method: prop, reject};
            inFlight.add(entry);
          });
          // Avoid "unhandled rejection" warnings when only the body path
          // rejects — we always race against `crashPromise`, so any rejection
          // is observed somewhere.
          crashPromise.catch(() => {});

          const body = async (): Promise<unknown> => {
            await ensureReady();
            if (!proxy) {
              throw new WorkerDeadError();
            }
            const target = (proxy as Record<string, unknown>)[prop];
            if (typeof target !== "function") {
              throw new Error(`Worker host has no method "${prop}"`);
            }
            lifecycle.beginCall();
            try {
              return await bridge.wrapCall(prop, async () => {
                const callPromise = (async (): Promise<unknown> => {
                  const result = (target as (...a: unknown[]) => Promise<unknown>)(...callArgs);
                  try {
                    return await result;
                  } catch (cause) {
                    // 3) Normalize worker-thrown errors.
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

                // C3: Mid-flight abort — race the body promise against an
                // abort promise so an `AbortSignal` that fires after the call
                // has begun rejects the consumer's promise. The worker
                // continues running until its handler completes; this is the
                // documented v1 limitation. See README "Known limitations".
                if (signal) {
                  const abortPromise = new Promise<never>((_, reject) => {
                    const onAbort = (): void => {
                      reject(signal!.reason ?? new Error("aborted"));
                    };
                    if (signal.aborted) {
                      onAbort();
                    } else {
                      signal.addEventListener("abort", onAbort, {once: true});
                    }
                  });
                  // Suppress "unhandled rejection" on whichever side loses.
                  callPromise.catch(() => {
                    /* loser */
                  });
                  abortPromise.catch(() => {
                    /* loser */
                  });
                  return await Promise.race([callPromise, abortPromise]);
                }

                return await callPromise;
              });
            } finally {
              lifecycle.endCall();
            }
          };

          // Race the whole body against the crash signal so a crash that
          // fires before/during `ensureReady()` still surfaces as
          // `WorkerCrashError`. Swallow the loser's rejection to avoid
          // unhandled-rejection noise.
          const bodyPromise = body();
          bodyPromise.catch(() => {});
          return Promise.race([bodyPromise, crashPromise]).finally(() => {
            if (entry) inFlight.delete(entry);
          });
        };
      },
    });
  }

  const api = buildProxy();

  return {
    api,
    get state(): WorkerHostState {
      return lifecycle.state;
    },
    subscribe(listener) {
      // C1: register on the host-level set so subscriptions survive `restart()`.
      hostListeners.add(listener);
      return () => {
        hostListeners.delete(listener);
      };
    },
    capabilities,
    async restart(signal?: AbortSignal): Promise<void> {
      // C2: Disposed hosts are terminal — refuse to resurrect.
      if (lifecycle.state === "disposed") {
        throw new WorkerDeadError("Cannot restart a disposed host. Construct a new host instead.");
      }
      // I2: Honor a pre-aborted signal immediately.
      if (signal?.aborted) {
        throw signal.reason ?? new Error("aborted");
      }
      if (restartLock) return restartLock;
      const promise = (async (): Promise<void> => {
        tearDownWorker("dispose");
        // Rebuild the lifecycle so we can transition idle → starting → ready again.
        lifecycle = createWorkerLifecycle({
          idleTimeoutMs,
          onIdle: onIdleHandler,
        });
        // C1: re-attach the host-level proxy subscription to the new lifecycle.
        attachLifecycleSubscription();

        const readyPromise = ensureReady();
        // I2: Race against signal-abort during boot.
        if (signal) {
          const abortPromise = new Promise<never>((_, reject) => {
            const onAbort = (): void => {
              reject(signal.reason ?? new Error("aborted"));
            };
            if (signal.aborted) {
              onAbort();
            } else {
              signal.addEventListener("abort", onAbort, {once: true});
            }
          });
          readyPromise.catch(() => {
            /* swallow loser */
          });
          abortPromise.catch(() => {
            /* swallow loser */
          });
          await Promise.race([readyPromise, abortPromise]);
        } else {
          await readyPromise;
        }
      })().finally(() => {
        restartLock = null;
      });
      restartLock = promise;
      return promise;
    },
    async warmUp(): Promise<void> {
      await ensureReady();
    },
    async dispose(): Promise<void> {
      // I3: Eagerly reject any in-flight bootstrap so callers waiting on
      // `ensureReady()`/`warmUp()` unblock instead of timing out.
      const bootRejector = rejectBoot;
      tearDownWorker("dispose");
      if (bootRejector) {
        rejectBoot = null;
        bootRejector(new WorkerDeadError("Host disposed during boot."));
      }
    },
  };
}
