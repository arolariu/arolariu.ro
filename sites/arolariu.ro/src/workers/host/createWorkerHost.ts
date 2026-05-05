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
import {WorkerCrashError, WorkerDeadError, WorkerError, WorkerNotAvailableError, WorkerTimeoutError} from "./workerErrors";
import {createWorkerLifecycle, type WorkerHostState} from "./workerLifecycle";

/** Maximum time (ms) we wait for the worker to emit `{kind: "ready"}`. */
const BOOTSTRAP_TIMEOUT_MS = 10_000;
/** Default idle timeout for lazy-reboot: 5 minutes. */
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60_000;
/** Default per-call timeout: 30 seconds. Set to 0 or `Infinity` to disable. */
const DEFAULT_CALL_TIMEOUT_MS = 30_000;

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
  /**
   * Per-call timeout in ms. Each proxy method call rejects with
   * {@link WorkerTimeoutError} if it exceeds this duration (measured from
   * after the boot handshake completes, so boot latency is excluded).
   *
   * Default `30000` (30 seconds). Set to `0` or `Infinity` to disable.
   *
   * NOTE: The timeout rejects the consumer's promise but does NOT cancel
   * the worker-side computation — Comlink has no cancellation protocol.
   * If a hung handler must be reclaimed, call `host.restart()`.
   */
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
  const defaultCallTimeoutMs = opts.defaultCallTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS;
  const capabilities = getCapabilities();
  const bridge = createTelemetryBridge(opts.name);

  let worker: Worker | null = null;
  let proxy: Remote<TApi> | null = null;
  let bootPromise: Promise<void> | null = null;
  let restartLock: Promise<void> | null = null;
  const inFlight = new Set<InFlightEntry>();

  // M1: Track the parent-side ports of both `MessageChannel`s so teardown can
  // explicitly `close()` them. Per WHATWG HTML §9.4.5, a `MessagePort` with
  // active listeners is a strong cross-realm reference. Worker termination
  // collects the worker realm, but the parent's `port1`s with `onmessage`
  // handlers stay alive until GC unless we close them here.
  let parentRpcPort: MessagePort | null = null;
  let parentEventPort: MessagePort | null = null;

  // C1: Host-level subscriber registry. Subscribers register here and are
  // proxied through to the underlying lifecycle. This lets subscriptions
  // survive a `restart()` that re-creates the lifecycle instance.
  const hostListeners = new Set<(state: WorkerHostState) => void>();
  let lifecycleUnsubscribe: (() => void) | null = null;

  // I1: Track the active error listener so we can detach it on teardown,
  // preventing leaks across reboots.
  let currentErrorListener: {worker: Worker; handler: (e: ErrorEvent) => void} | null = null;

  // I3: Allow `dispose()`/`restart()` to cancel an in-flight bootstrap promise.
  let rejectBoot: ((err: Error) => void) | null = null;

  // G: Hoist the bootstrap timeout handle so teardown/restart can clear it
  // before it ever fires. Otherwise a stale boot would resolve against a
  // dead lifecycle and surface as a misleading `WorkerCrashError`.
  let bootTimeoutId: ReturnType<typeof setTimeout> | null = null;

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
   *
   * G: Always clears any in-flight bootstrap timeout so a stale boot can't
   * resolve after teardown.
   *
   * SPEC (WHATWG HTML §10.2.4): The worker's `error` event delivery is a
   * parallel algorithm; an `error` task can be queued and then run to
   * completion AFTER `terminate()` returns. We detach our error listener
   * BEFORE calling `terminate()` so any late event hits a no-op listener
   * set instead of re-entering the host state machine.
   *
   * M1: Calls `parentRpcPort.close()` and `parentEventPort.close()` to
   * release the strong cross-realm references those ports hold while their
   * `onmessage` handlers are registered (WHATWG HTML §9.4.5). Without this,
   * the parent's `port1`s linger until GC even after `worker.terminate()`.
   *
   * COOPERATIVE: For `lazy-reboot` and `dispose` we attempt
   * `Comlink.releaseProxy()` before `terminate()` so the worker side gets a
   * chance to flush. We deliberately SKIP this for `crash` because the
   * proxy is already wedged — `releaseProxy` is itself an RPC and would
   * hang on a closed port (see SAFETY note in `handleCrash`).
   */
  function tearDownWorker(mode: TeardownMode): void {
    // COOPERATIVE: Best-effort cooperative shutdown for graceful teardowns.
    // Fire-and-forget; we don't await because terminate() is the hard
    // backstop and we don't want a hung worker to block teardown.
    if ((mode === "dispose" || mode === "lazy-reboot") && proxy !== null) {
      try {
        const releaseable = proxy as unknown as {[Comlink.releaseProxy]?: () => void};
        releaseable[Comlink.releaseProxy]?.();
      } catch {
        // Ignore: the proxy may already be wedged; terminate() will free it.
      }
    }
    const w = worker;
    worker = null;
    proxy = null;
    // G: Clear the bootstrap timeout if pending so it can never fire after
    // teardown and resolve against a dead lifecycle.
    if (bootTimeoutId !== null) {
      clearTimeout(bootTimeoutId);
      bootTimeoutId = null;
    }
    // I1: Remove the error listener before terminating to avoid leaks AND so
    // that any post-terminate `error` event (HTML §10.2.4 parallel delivery)
    // never re-enters host state machine logic.
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
    // M1: Explicitly close the parent's `MessagePort`s so they release their
    // strong cross-realm references (WHATWG HTML §9.4.5) instead of waiting
    // for GC.
    if (parentRpcPort) {
      try {
        parentRpcPort.close();
      } catch {
        // ignore close errors (port may already be detached)
      }
      parentRpcPort = null;
    }
    if (parentEventPort) {
      try {
        parentEventPort.close();
      } catch {
        // ignore close errors (port may already be detached)
      }
      parentEventPort = null;
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
    // SAFETY: Snapshot and clear in-flight entries BEFORE `tearDownWorker`
    // terminates the worker. Comlink's `requestResponseMessage`
    // (comlink/src/comlink.ts) only stores the call's `resolve` callback —
    // there is no `reject`. If we let the worker terminate while a call is
    // in-flight, the consumer's `await proxy.method()` hangs forever
    // (see GoogleChromeLabs/comlink#601). Manually rejecting `inFlight` here
    // is therefore load-bearing — do not remove or reorder.
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
    // M1: Capture the parent-side ports so `tearDownWorker` can close them.
    // The `port2` halves are transferred to the worker via `postMessage`
    // below and become unreachable from this realm immediately after.
    parentRpcPort = rpcChannel.port1;
    parentEventPort = eventChannel.port1;

    // Listen for unexpected `error` events on the worker.
    const onError = (): void => {
      handleCrash();
    };
    w.addEventListener("error", onError);
    // I1: Track the listener so teardown can remove it.
    currentErrorListener = {worker: w, handler: onError};

    const ready = new Promise<void>((resolve, reject) => {
      // I3: Expose this `reject` so `dispose()`/`restart()` can cancel a
      // pending boot.
      rejectBoot = reject;

      bootTimeoutId = setTimeout(() => {
        eventChannel.port1.onmessage = null;
        bootTimeoutId = null;
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
          if (bootTimeoutId !== null) {
            clearTimeout(bootTimeoutId);
            bootTimeoutId = null;
          }
          // Swap to the steady-state listener that ingests events.
          eventChannel.port1.onmessage = (next: MessageEvent): void => {
            const ev = next.data as WorkerEvent;
            // I4: Filter stray `ready` events that arrive after bootstrap.
            // Bootstrap-ready is consumed by the boot promise itself; never forward.
            if (ev.kind === "ready") return;
            opts.onEvent?.(ev);
            bridge.ingestEvent(ev);
          };
          resolve();
          return;
        }
        // E: Bootstrap `ready` is handled in the branch above (consumed by the
        // boot promise; never forwarded). Anything else that arrives before
        // the handshake is forwarded defensively to keep behavior parity with
        // the steady-state listener for non-`ready` events.
        opts.onEvent?.(event);
        bridge.ingestEvent(event);
      };
      // SPEC: `port.start()` is implicitly called when assigning
      // `port.onmessage` (WHATWG HTML §9.4.5). The explicit call previously
      // here was a no-op; left as a comment for clarity.
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
              // Belt-and-suspenders: per WHATWG DOM, `signal.reason` on an
              // aborted signal is always defined (defaults to AbortError
              // DOMException). The `??` fallback is unreachable on a
              // spec-compliant runtime but guards against polyfills that
              // diverge from spec.
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
            // Use Reflect.get rather than a Record<string,unknown> cast so
            // prototype lookup semantics are preserved and we don't widen
            // the proxy's static type.
            const target = Reflect.get(proxy as object, prop) as unknown;
            if (typeof target !== "function") {
              throw new Error(`Worker host has no method "${prop}"`);
            }
            lifecycle.beginCall();

            // K: Per-call timeout. Measured from AFTER ensureReady so boot
            // latency is not charged to the consumer's budget. Disabled for
            // 0, negative, NaN, or Infinity (Number.isFinite gate).
            //
            // NOTE: The timeout rejects the consumer's promise but does NOT
            // abort the worker-side handler — Comlink has no cancellation
            // protocol. If a hung handler must be reclaimed, the consumer
            // should call host.restart().
            const callStartMs = performance.now();
            let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
            let timeoutPromise: Promise<never> | null = null;
            if (defaultCallTimeoutMs > 0 && Number.isFinite(defaultCallTimeoutMs)) {
              timeoutPromise = new Promise<never>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                  reject(new WorkerTimeoutError(prop, Math.round(performance.now() - callStartMs)));
                }, defaultCallTimeoutMs);
              });
              // Suppress "unhandled rejection" if the call wins the race.
              timeoutPromise.catch(() => {
                /* loser */
              });
            }

            try {
              const wrapped = bridge.wrapCall(prop, async () => {
                const callPromise = (async (): Promise<unknown> => {
                  const result = (target as (...a: unknown[]) => Promise<unknown>)(...callArgs);
                  try {
                    return await result;
                  } catch (cause) {
                    // 3) Normalize worker-thrown errors. The worker side
                    //    throws a plain `__workerError` envelope (see
                    //    exposeWorker.ts ENVELOPE comment) because Comlink's
                    //    default throwTransferHandler only round-trips
                    //    name/message/stack and HTML S2.7.3 normalizes
                    //    Error.name. We rewrap into `WorkerError` here so
                    //    consumers see a typed exception with the original
                    //    method name attached.
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

                // C3/H: Mid-flight abort — race the body promise against an
                // abort promise so an `AbortSignal` that fires after the call
                // has begun rejects the consumer's promise. The worker
                // continues running until its handler completes; this is the
                // documented v1 limitation. See README "Known limitations".
                //
                // H: Clean up the abort listener once the race settles so we
                // don't leak listeners on the consumer's signal across many
                // calls.
                if (signal) {
                  let onAbort: (() => void) | null = null;
                  const abortPromise = new Promise<never>((_, reject) => {
                    onAbort = (): void => {
                      // Belt-and-suspenders: `signal.reason` is always
                      // defined on an aborted signal per WHATWG DOM.
                      reject(signal!.reason ?? new Error("aborted"));
                    };
                    if (signal!.aborted) {
                      onAbort();
                    } else {
                      signal!.addEventListener("abort", onAbort, {once: true});
                    }
                  });
                  // Suppress "unhandled rejection" on whichever side loses.
                  callPromise.catch(() => {
                    /* loser */
                  });
                  abortPromise.catch(() => {
                    /* loser */
                  });
                  try {
                    return await Promise.race([callPromise, abortPromise]);
                  } finally {
                    // H: Detach the abort listener if it never fired (call
                    // completed first). `{once: true}` already self-removes
                    // on fire; this branch is the body-wins path.
                    if (onAbort && !signal.aborted) {
                      signal.removeEventListener("abort", onAbort);
                    }
                  }
                }

                return await callPromise;
              });

              // K: Race against the per-call timeout if enabled. Suppress
              // the loser's rejection so neither outcome surfaces as an
              // unhandled-rejection warning.
              if (timeoutPromise) {
                wrapped.catch(() => {
                  /* loser; bridge.wrapCall has already logged via telemetry */
                });
                return await Promise.race([wrapped, timeoutPromise]);
              }
              return await wrapped;
            } finally {
              // K: Always clear the timeout handle whether the call won,
              // the timeout won, or the call threw.
              if (timeoutHandle !== null) clearTimeout(timeoutHandle);
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
        // Belt-and-suspenders: `signal.reason` is always defined per WHATWG DOM.
        throw signal.reason ?? new Error("aborted");
      }
      if (restartLock) return restartLock;

      // C: Capture the pending boot rejector so we can abort it before tear-down.
      // tearDownWorker also clears the bootstrap timeout, but rejecting the
      // boot promise here unblocks any in-flight `ensureReady()` callers that
      // would otherwise wait the full bootstrap timeout.
      const bootRejector = rejectBoot;
      rejectBoot = null;

      // D: Snapshot all in-flight calls and reject them with `WorkerCrashError`
      // before the worker is terminated. Without this the calls would reject
      // with Comlink port-closed errors (or hang forever) once the underlying
      // worker is gone.
      //
      // SAFETY: Comlink's `requestResponseMessage` stores only the call's
      // `resolve` callback — there is no `reject`. If we let the port close
      // while a call is mid-flight the consumer's `await proxy.method()`
      // hangs forever (see GoogleChromeLabs/comlink#601). Rejecting the
      // snapshot here is load-bearing — do not reorder relative to
      // `tearDownWorker`.
      const drainEntries = Array.from(inFlight);
      const drainMethods = drainEntries.map((entry) => entry.method);
      inFlight.clear();

      const promise = (async (): Promise<void> => {
        // C: Reject the in-flight boot first so `ensureReady()` consumers
        // don't await stale state.
        if (bootRejector) {
          bootRejector(new WorkerDeadError("Restarted during boot."));
        }
        bootPromise = null;

        // D: Reject all calls that were past `lifecycle.beginCall()` with a
        // `WorkerCrashError` listing their methods.
        if (drainEntries.length > 0) {
          const crashError = new WorkerCrashError(drainMethods);
          for (const entry of drainEntries) {
            entry.reject(crashError);
          }
        }

        // J: Swap the lifecycle pointer BEFORE tearing down the old one so
        // public subscribers see `dead → starting → ready` rather than
        // `dead → disposed → starting → ready`. The temporary swap-back is
        // necessary because `tearDownWorker("dispose")` calls
        // `lifecycle.dispose()` on whichever lifecycle is currently active.
        const previousLifecycle = lifecycle;
        const nextLifecycle = createWorkerLifecycle({
          idleTimeoutMs,
          onIdle: onIdleHandler,
        });
        lifecycle = nextLifecycle;
        // C1: re-attach the host-level proxy subscription to the new lifecycle
        // BEFORE disposing the old one, so subscribers see only the new
        // lifecycle's transitions during the rest of restart.
        attachLifecycleSubscription();

        // Tear down the old worker against its original lifecycle so the
        // private `disposed` transition is invisible to public subscribers.
        lifecycle = previousLifecycle;
        tearDownWorker("dispose");
        lifecycle = nextLifecycle;

        const readyPromise = ensureReady();
        // I2: Race against signal-abort during boot, with cleanup on the
        // body-wins path so we don't leak the abort listener.
        if (signal) {
          let onAbort: (() => void) | null = null;
          const abortPromise = new Promise<never>((_, reject) => {
            onAbort = (): void => {
              // Belt-and-suspenders: `signal.reason` is always defined per WHATWG DOM.
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
          try {
            await Promise.race([readyPromise, abortPromise]);
          } finally {
            // I: Detach the abort listener if it never fired (boot won the
            // race). `{once: true}` self-removes on fire; this is the
            // body-wins path.
            if (onAbort && !signal.aborted) {
              signal.removeEventListener("abort", onAbort);
            }
          }
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
