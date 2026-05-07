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

import {createBootHandshake, type BootHandshake} from "./bootHandshake";
import {buildCallProxy} from "./buildCallProxy";
import {createInFlightRegistry} from "./inFlightRegistry";
import {raceWithSignal} from "./raceWithSignal";
import {createTelemetryBridge} from "./telemetryBridge";
import {getCapabilities, type WorkerCapabilities} from "./workerCapabilities";
import {type WorkerEvent} from "./workerEnvelope";
import {WorkerCrashError, WorkerDeadError, WorkerError, WorkerMessageError, WorkerNotAvailableError, WorkerTimeoutError} from "./workerErrors";
import {createWorkerLifecycle, type WorkerHostState} from "./workerLifecycle";

/** Maximum time (ms) we wait for the worker to emit `{kind: "ready"}`. */
const BOOTSTRAP_TIMEOUT_MS = 10_000;
/** Default idle timeout for lazy-reboot: 5 minutes. */
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60_000;
/** Default per-call timeout: 30 seconds. Set to 0 or `Infinity` to disable. */
const DEFAULT_CALL_TIMEOUT_MS = 30_000;

export {type WorkerCapabilities} from "./workerCapabilities";
export type {WorkerEvent} from "./workerEnvelope";
export {WorkerCrashError, WorkerDeadError, WorkerError, WorkerMessageError, WorkerNotAvailableError, WorkerTimeoutError} from "./workerErrors";
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
  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   *
   * **MUST contract:** Consumers MUST call the returned `unsubscribe`
   * before the subscribing scope unmounts. Listener callbacks hold strong
   * references to their captured closures; failing to unsubscribe leaks
   * the closure (and any DOM nodes it references) for the lifetime of the
   * host. In React, the canonical pattern is to return `unsubscribe`
   * directly from a `useEffect` callback.
   */
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

/**
 * Build a typed {@link WorkerHost}.
 *
 * @typeParam TApi - The typed API exposed by the worker.
 * @param opts - Host configuration; see {@link CreateWorkerHostOptions}.
 * @returns A {@link WorkerHost} instance.
 *
 * @example
 * ```ts
 * import {createWorkerHost} from "@/workers";
 * import type {FeatureXApi} from "./feature-x.api";
 *
 * const host = createWorkerHost<FeatureXApi>({
 *   name: "feature-x",
 *   load: () => new Worker(new URL("./feature-x.worker.ts", import.meta.url), {type: "module"}),
 *   defaultCallTimeoutMs: 5_000,
 * });
 *
 * try {
 *   const result = await host.api.doThing("hello");
 * } catch (err) {
 *   if (err instanceof WorkerCrashError) {
 *     await host.restart();
 *   }
 * }
 * ```
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
  const inFlight = createInFlightRegistry();

  // BOOT-HANDSHAKE: Single host-scope handle for the active two-channel
  // bootstrap handshake. Owns:
  //   - the parent halves of the rpc + event `MessageChannel`s (M1: closed
  //     on teardown to release strong cross-realm references — WHATWG HTML
  //     §9.4.5),
  //   - the bootstrap timeout (G: cleared on teardown so a stale boot can't
  //     resolve against a dead lifecycle),
  //   - the boot-promise rejector (I3: invoked from `dispose()`/`restart()`
  //     so an in-flight bootstrap unblocks immediately).
  // Replaces what used to be four separate host-scope slots.
  let currentBoot: BootHandshake | null = null;

  // C1: Host-level subscriber registry. Subscribers register here and are
  // proxied through to the underlying lifecycle. This lets subscriptions
  // survive a `restart()` that re-creates the lifecycle instance.
  const hostListeners = new Set<(state: WorkerHostState) => void>();
  let lifecycleUnsubscribe: (() => void) | null = null;

  // I1: Track the active error/messageerror listeners so we can detach them on
  // teardown, preventing leaks across reboots.
  let currentListeners: {
    worker: Worker;
    onError: (e: ErrorEvent) => void;
    onMessageError: (e: MessageEvent) => void;
  } | null = null;

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
    // I1: Remove the error/messageerror listeners before terminating to avoid
    // leaks AND so that any post-terminate `error`/`messageerror` event
    // (HTML §10.2.4 parallel delivery) never re-enters host state machine logic.
    if (currentListeners) {
      try {
        currentListeners.worker.removeEventListener("error", currentListeners.onError);
        currentListeners.worker.removeEventListener("messageerror", currentListeners.onMessageError);
      } catch {
        // ignore listener removal errors
      }
      currentListeners = null;
    }
    if (w) {
      try {
        w.terminate();
      } catch {
        // ignore termination errors
      }
    }
    // BOOT-HANDSHAKE: Clear the active handshake last. `teardown()` is
    // idempotent: it clears the bootstrap timeout (G) and closes both
    // parent ports (M1) so they release their strong cross-realm references
    // (WHATWG HTML §9.4.5) instead of waiting for GC.
    if (currentBoot) {
      currentBoot.teardown();
      currentBoot = null;
    }
    if (mode === "dispose") {
      lifecycle.dispose();
    }
  }

  /** Reject all in-flight calls with `WorkerCrashError` and tear down. */
  function handleCrash(): void {
    if (lifecycle.state === "dead" || lifecycle.state === "disposed") return;
    // SAFETY: Drain BEFORE `tearDownWorker` terminates the worker. Comlink's
    // `requestResponseMessage` (comlink/src/comlink.ts) only stores the
    // call's `resolve` callback — there is no `reject`. If we let the worker
    // terminate while a call is in-flight, the consumer's
    // `await proxy.method()` hangs forever (see GoogleChromeLabs/comlink#601).
    // Manually rejecting via the registry is therefore load-bearing — see
    // `InFlightRegistry` remarks.
    inFlight.drainWithFactory((m) => new WorkerCrashError(m));
    lifecycle.crash();
    tearDownWorker("crash");
  }

  /** Perform the bootstrap handshake. Sets `worker` and `proxy` on success. */
  async function performBoot(): Promise<void> {
    if (!isWorkerAvailable()) {
      throw new WorkerNotAvailableError();
    }
    lifecycle.bootBegin();

    // SAFETY: Wrap the synchronous boot setup so a throw from `opts.load()`
    // (CSP failure, bad worker URL, factory bug) doesn't leave the host
    // stranded in `starting`. We transition to `dead` and rethrow so
    // callers see a deterministic failure and can recover via restart()
    // or construct a fresh host.
    let w: Worker;
    try {
      w = opts.load();
      worker = w;
    } catch (err) {
      lifecycle.crash();
      throw err;
    }

    // Listen for unexpected `error` events on the worker. This is wired
    // BEFORE the bootstrap handshake is constructed so an `error` event
    // arriving during boot still triggers `handleCrash()` instead of being
    // silently dropped.
    const onError = (): void => {
      handleCrash();
    };
    w.addEventListener("error", onError);
    const onMessageError = (e: MessageEvent): void => {
      // SPEC: WHATWG HTML §10.2.4 — fired when structured-clone deserialization
      // of a posted message fails. Treat as a crash so consumers get a typed
      // error and the host transitions to `dead` deterministically.
      if (lifecycle.state === "dead" || lifecycle.state === "disposed") return;
      // Snapshot before tearDown nulls currentBoot — if `messageerror` arrives
      // mid-bootstrap, we MUST reject the ready promise so warmUp/ensureReady
      // callers don't hang waiting on a torn-down handshake.
      const pendingBoot = currentBoot;
      const err = new WorkerMessageError("Worker emitted messageerror.", {data: e.data});
      inFlight.drainWithFactory(() => err);
      pendingBoot?.rejectIfPending(err);
      lifecycle.crash();
      tearDownWorker("crash");
    };
    w.addEventListener("messageerror", onMessageError);
    // I1: Track the listeners so teardown can remove them.
    currentListeners = {worker: w, onError, onMessageError};

    // Forward sink for non-`ready` events. The handshake helper invokes
    // this for both pre-bootstrap defensive forwards and post-bootstrap
    // steady-state events; both `opts.onEvent` and the telemetry bridge
    // see the event so behavior parity with the previous inline listener
    // is preserved.
    const forwardEvent = (ev: WorkerEvent): void => {
      opts.onEvent?.(ev);
      bridge.ingestEvent(ev);
    };

    // BOOT-HANDSHAKE: All channel construction, port lifetimes, the boot
    // promise, the bootstrap timeout, and listener-mode swap are owned by
    // `createBootHandshake`. Synchronous failures (validation, postMessage
    // throw) propagate as exceptions; the helper has already rejected its
    // own `ready` promise and closed its ports before throwing. We still
    // need to clean up the host-level error listener and lifecycle.
    let handshake: BootHandshake;
    try {
      handshake = createBootHandshake({
        worker: w,
        capabilities,
        onEvent: forwardEvent,
        bootstrapTimeoutMs: BOOTSTRAP_TIMEOUT_MS,
      });
    } catch (err) {
      // Synchronous failure path (validation or postMessage throw). The
      // handshake has already closed its ports; we still must drop the
      // error listener, terminate the worker, and crash the lifecycle so
      // the host transitions to `dead` deterministically rather than
      // sitting in `starting`.
      tearDownWorker("crash");
      lifecycle.crash();
      throw err;
    }
    currentBoot = handshake;

    try {
      await handshake.ready;
    } catch (err) {
      // I3: If the host was disposed while the bootstrap timer was pending,
      // surface a `WorkerDeadError` rather than the helper's generic
      // `WorkerCrashError`. The helper intentionally does not see host-
      // level state; this translation lives here.
      if (lifecycle.state === "disposed") {
        throw new WorkerDeadError("Host disposed during boot.");
      }
      // Discriminate by error type to preserve the original semantics:
      // - `WorkerCrashError`: the helper's bootstrap timeout fired. Treat
      //   as a hard crash — drain in-flight calls, mark dead, tear down.
      // - `WorkerDeadError` (or anything else): driven externally by
      //   `dispose()`/`restart()`, which have already taken responsibility
      //   for tearing down the worker and managing lifecycle transitions.
      //   Calling `handleCrash` here would mutate the wrong lifecycle —
      //   `restart()` swaps `lifecycle` to a fresh instance synchronously
      //   before the catch block's microtask runs, so the crashed lifecycle
      //   would be the NEW one rather than the abandoned one.
      if (err instanceof WorkerCrashError) {
        handleCrash();
      }
      throw err;
    }

    proxy = Comlink.wrap<TApi>(handshake.parentRpcPort);
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

  const api = buildCallProxy<TApi>({
    inFlight,
    bridge,
    defaultCallTimeoutMs,
    ensureReady,
    getTarget: () => proxy,
    lifecycle: {
      beginCall: () => lifecycle.beginCall(),
      endCall: () => lifecycle.endCall(),
    },
  });

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

      // C: Capture the pending boot handle so we can abort it before tear-down.
      // tearDownWorker also clears the bootstrap timeout (via the handshake's
      // own teardown), but rejecting the boot promise here unblocks any
      // in-flight `ensureReady()` callers that would otherwise wait the full
      // bootstrap timeout.
      const bootToReject = currentBoot;

      const promise = (async (): Promise<void> => {
        // C: Reject the in-flight boot first so `ensureReady()` consumers
        // don't await stale state. `rejectIfPending` is idempotent and a
        // no-op once boot has settled.
        bootToReject?.rejectIfPending(new WorkerDeadError("Restarted during boot."));
        bootPromise = null;

        // D: Drain all calls that were past `lifecycle.beginCall()` with a
        // `WorkerCrashError` listing their methods, BEFORE the worker is
        // terminated. Without this the calls would reject with Comlink
        // port-closed errors (or hang forever) once the underlying worker is
        // gone.
        //
        // SAFETY: Comlink's `requestResponseMessage` stores only the call's
        // `resolve` callback — there is no `reject`. If we let the port close
        // while a call is mid-flight the consumer's `await proxy.method()`
        // hangs forever (see GoogleChromeLabs/comlink#601). Draining via the
        // registry here is load-bearing — see `InFlightRegistry` remarks.
        inFlight.drainWithFactory((m) => new WorkerCrashError(m));

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
        // I2: Race against signal-abort during boot. `raceWithSignal`
        // centralizes the listener cleanup so we don't leak the abort
        // listener on the body-wins path.
        await raceWithSignal(readyPromise, signal);
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
      // `ensureReady()`/`warmUp()` unblock instead of timing out. Snapshot
      // the handle BEFORE `tearDownWorker` clears it.
      const bootToReject = currentBoot;
      // SAFETY: Comlink's `requestResponseMessage` tracks only `resolve`, not
      // `reject` (GoogleChromeLabs/comlink#601), so we MUST drain in-flight
      // calls explicitly. Drain after tearDown so callers observe the disposed
      // state when their rejection callback runs. Snapshot timing is irrelevant
      // — `tearDownWorker` is synchronous and never mutates `inFlight`.
      tearDownWorker("dispose");
      bootToReject?.rejectIfPending(new WorkerDeadError("Host disposed during boot."));
      if (inFlight.size > 0) {
        inFlight.drainWithFactory(
          (m) => new WorkerDeadError(`Worker host was disposed with ${m.length} in-flight call(s): [${m.join(", ")}].`),
        );
      }
    },
  };
}
