/**
 * @fileoverview Two-channel bootstrap handshake for the Web Worker host.
 * @module workers/host/bootHandshake
 *
 * @remarks
 * Owns: building the rpc + event `MessageChannel` pair, posting the
 * bootstrap message with both ports transferred, attaching the bootstrap-
 * timeout, swapping the event-port listener to steady-state mode after
 * `{kind: "ready"}` arrives, and exposing a `teardown()` that closes both
 * parent ports and clears the timeout.
 *
 * Intentionally NOT owned by this helper:
 * - Lifecycle state transitions (`bootBegin`, `bootComplete`, `crash`).
 *   The host owns the lifecycle and decides what each handshake outcome
 *   means; e.g., a "rejected during boot" outcome may map to either
 *   `WorkerCrashError` (timeout) or `WorkerDeadError` (host disposed
 *   during boot) depending on host-level state the helper does not see.
 * - Worker `error` event listening. The host attaches that listener
 *   BEFORE constructing the handshake so an `error` arriving during boot
 *   still triggers the host's `handleCrash()` path.
 * - Comlink wrapping. Callers wrap `parentRpcPort` themselves once
 *   `ready` resolves.
 */

import {createPortPair} from "./createPortPair";
import type {WorkerCapabilities} from "./workerCapabilities";
import {validateBootstrap, WORKER_PROTOCOL_VERSION, type WorkerBootstrap, type WorkerEvent} from "./workerEnvelope";
import {WorkerCrashError} from "./workerErrors";

/** Inputs to {@link createBootHandshake}. */
export type CreateBootHandshakeOptions = Readonly<{
  /** The underlying `Worker` to which the bootstrap message will be posted. */
  worker: Worker;
  /** Capability snapshot to forward in the bootstrap envelope. */
  capabilities: WorkerCapabilities;
  /**
   * Sink for non-`ready` events arriving on the event port — both during the
   * pre-handshake window (defensive parity) and after the handshake completes
   * (steady-state). Stray post-handshake `ready` events are filtered upstream
   * and never delivered here.
   */
  onEvent: (event: WorkerEvent) => void;
  /** Maximum time (ms) we wait for the worker to emit `{kind: "ready"}`. */
  bootstrapTimeoutMs: number;
}>;

/** Return value of {@link createBootHandshake}. */
export type BootHandshake = Readonly<{
  /**
   * Resolves when the worker emits `{kind: "ready"}` on the event port.
   *
   * @remarks
   * **Callers MUST `await ready` (or attach a `.catch`) before allowing the
   * host scope to settle.** The helper attaches its own `.catch(() => {})`
   * internally to suppress unhandled-rejection warnings on the
   * synchronous-failure paths (validation failure, `postMessage` throw),
   * so a rejection that is never observed by the caller would be silently
   * swallowed.
   *
   * Error types the helper itself can reject `ready` with:
   * - {@link WorkerCrashError} (with an empty `errors` array) — when the
   *   bootstrap timeout fires. The host's
   *   `err instanceof WorkerCrashError` discrimination depends on this.
   * - The bootstrap-validation `Error` thrown synchronously when
   *   `validateBootstrap` returns `false`. The same `Error` instance is
   *   both rejected on `ready` and rethrown synchronously, so the caller
   *   can observe via either path.
   * - The error thrown by `worker.postMessage` (e.g., `DataCloneError`).
   *   Same dual-observability semantics as the validation path: rejected
   *   on `ready` first, then rethrown.
   * - Whatever the caller passes via {@link BootHandshake.rejectIfPending}
   *   — pass-through; the helper does not wrap or transform it. The host
   *   currently uses this for `WorkerDeadError` (host-driven cancellation
   *   during boot).
   *
   * **Maintainer note:** any new internal rejection path added below
   * (e.g., a `messageerror` listener that rejects with
   * `WorkerMessageError`) MUST be added to this list AND the host's
   * `instanceof WorkerCrashError` discrimination in
   * `createWorkerHost.ts` reconsidered — silently widening the helper's
   * rejection surface would cause the host to skip its `handleCrash()`
   * branch for the new error type.
   */
  ready: Promise<void>;
  /** Parent half of the rpc channel — wrap with Comlink after `ready` resolves. */
  parentRpcPort: MessagePort;
  /** Parent half of the event channel — already attached to ingest events. */
  parentEventPort: MessagePort;
  /** Reject the pending `ready` promise with the supplied error (idempotent). */
  rejectIfPending: (err: unknown) => void;
  /** Close ports and clear timers. Idempotent. */
  teardown: () => void;
}>;

/**
 * Build a two-channel bootstrap handshake against the supplied {@link Worker}.
 *
 * Behavior:
 * 1. Creates the rpc + event {@link MessageChannel} pair.
 * 2. Wires the event port's `onmessage` to: resolve `ready` on `{kind: "ready"}`,
 *    forward any other event via {@link CreateBootHandshakeOptions.onEvent}.
 * 3. After `ready` resolves, swaps the event-port listener to a steady-state
 *    handler that filters stray `ready` events and forwards everything else.
 * 4. Validates the constructed bootstrap envelope; throws synchronously if
 *    invalid (rejecting the `ready` promise eagerly first).
 * 5. Calls `worker.postMessage(envelope, [rpcPort, eventPort])`; if it throws
 *    (e.g., DataCloneError), rejects `ready` and rethrows.
 * 6. Arms a timeout that rejects `ready` with {@link WorkerCrashError} if no
 *    `{kind: "ready"}` arrives in time. Disposed-during-boot translation is
 *    the host's responsibility (see module remarks).
 *
 * @param opts - Configuration; see {@link CreateBootHandshakeOptions}.
 * @returns A {@link BootHandshake} instance.
 *
 * @throws {Error} Synchronously if the bootstrap envelope fails validation.
 * @throws {Error} Synchronously if `worker.postMessage` throws (e.g.,
 *   DataCloneError). In both cases the helper has already closed its ports
 *   and rejected `ready`; the caller is responsible for any host-level
 *   teardown (lifecycle transitions, error listener removal, etc.).
 */
export function createBootHandshake(opts: CreateBootHandshakeOptions): BootHandshake {
  const rpc = createPortPair();
  const event = createPortPair();

  let bootTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let rejectBoot: ((err: unknown) => void) | null = null;
  let tornDown = false;

  const ready = new Promise<void>((resolve, reject) => {
    rejectBoot = reject;

    bootTimeoutId = setTimeout(() => {
      bootTimeoutId = null;
      // Disposed-state translation lives at the host level; we always reject
      // with a generic crash here.
      reject(new WorkerCrashError([]));
    }, opts.bootstrapTimeoutMs);

    event.parent.onmessage = (e: MessageEvent): void => {
      const ev = e.data as WorkerEvent;
      if (ev.kind === "ready") {
        if (bootTimeoutId !== null) {
          clearTimeout(bootTimeoutId);
          bootTimeoutId = null;
        }
        // Swap to steady-state mode for the rest of the worker's lifetime.
        event.parent.onmessage = (next: MessageEvent): void => {
          const nextEv = next.data as WorkerEvent;
          // Filter stray `ready` events that arrive after bootstrap.
          if (nextEv.kind === "ready") return;
          opts.onEvent(nextEv);
        };
        resolve();
        return;
      }
      // Defensive parity: forward any non-ready event arriving before handshake.
      opts.onEvent(ev);
    };
  }).finally(() => {
    rejectBoot = null;
  });

  function closePorts(): void {
    try {
      rpc.parent.close();
    } catch {
      /* port already detached */
    }
    try {
      event.parent.close();
    } catch {
      /* port already detached */
    }
  }

  const bootstrap: WorkerBootstrap = {
    kind: "bootstrap",
    version: WORKER_PROTOCOL_VERSION,
    rpcPort: rpc.transferable,
    eventPort: event.transferable,
    capabilities: opts.capabilities,
  };

  // Suppress "unhandled rejection" warnings on the synchronous-failure path
  // where the caller's `await ready` is never reached because the constructor
  // throws first. The thrown error is observed by the caller via the throw;
  // the parallel rejection on `ready` is just a side-effect of eagerly
  // releasing the captured closures.
  ready.catch(() => {
    /* loser; the caller observes the failure via the synchronous throw */
  });

  // SECURITY: self-validate so a malformed bootstrap is caught here, not via
  // a 10-second silent timeout at the worker boundary.
  if (!validateBootstrap(bootstrap)) {
    const err = new Error("Worker host produced an invalid bootstrap message; check capabilities snapshot.");
    rejectBoot?.(err);
    if (bootTimeoutId !== null) {
      clearTimeout(bootTimeoutId);
      bootTimeoutId = null;
    }
    closePorts();
    throw err;
  }

  try {
    opts.worker.postMessage(bootstrap, [rpc.transferable, event.transferable]);
  } catch (err) {
    rejectBoot?.(err);
    if (bootTimeoutId !== null) {
      clearTimeout(bootTimeoutId);
      bootTimeoutId = null;
    }
    closePorts();
    throw err;
  }

  return {
    ready,
    parentRpcPort: rpc.parent,
    parentEventPort: event.parent,
    rejectIfPending(err: unknown): void {
      rejectBoot?.(err);
    },
    teardown(): void {
      if (tornDown) return;
      tornDown = true;
      if (bootTimeoutId !== null) {
        clearTimeout(bootTimeoutId);
        bootTimeoutId = null;
      }
      closePorts();
    },
  };
}
