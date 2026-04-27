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
 * **Cancellation:** synchronous-already-aborted `AbortSignal`s reject the call
 * before it leaves the parent. Mid-flight worker-side cancellation (sending a
 * cancel message and aborting the in-worker AbortSignal) is deferred — see the
 * spec §10.2 OUT-of-scope items.
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

  const onIdleHandler = (): void => {
    tearDownWorker("lazy-reboot");
  };

  let lifecycle = createWorkerLifecycle({
    idleTimeoutMs,
    onIdle: onIdleHandler,
  });

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

    const ready = new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        eventChannel.port1.onmessage = null;
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
          let callArgs = args;
          if (last instanceof AbortSignal) {
            callArgs = args.slice(0, -1);
            if (last.aborted) {
              return Promise.reject(last.reason ?? new Error("aborted"));
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
                const callPromise = (target as (...a: unknown[]) => Promise<unknown>)(...callArgs);
                try {
                  return await callPromise;
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
      return lifecycle.subscribe(listener);
    },
    capabilities,
    async restart(_signal?: AbortSignal): Promise<void> {
      if (restartLock) return restartLock;
      const promise = (async (): Promise<void> => {
        tearDownWorker("dispose");
        // Rebuild the lifecycle so we can transition idle → starting → ready again.
        lifecycle = createWorkerLifecycle({
          idleTimeoutMs,
          onIdle: onIdleHandler,
        });
        await ensureReady();
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
      tearDownWorker("dispose");
    },
  };
}
