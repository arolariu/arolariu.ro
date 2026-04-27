/**
 * @fileoverview State machine, idle timer, and in-flight tracker for a worker host.
 * @module workers/host/workerLifecycle
 *
 * @remarks
 * Pure logic — no `Worker`, no Comlink. `createWorkerHost` glues this to the
 * transport. Tests use fake timers to drive idle scheduling deterministically.
 *
 * **State semantics:** see spec §6.1. The `ready` state is the only one
 * accepting calls; `idle`/`starting` queue work; `dead`/`disposed` reject it.
 *
 * **Lazy reboot:** when the idle timer fires we call `onIdle` but do **not**
 * change the public state — `createWorkerHost` silently disposes the worker
 * and lazy-reboots on the next call.
 */

export type WorkerHostState = "idle" | "starting" | "ready" | "dead" | "disposed";

export type CreateWorkerLifecycleOptions = Readonly<{
  /** Idle timeout in ms. `0` or `Infinity` disables. */
  idleTimeoutMs: number;
  /** Called when the idle timer fires. */
  onIdle?: () => void;
}>;

export type WorkerLifecycle = {
  readonly state: WorkerHostState;
  readonly inFlight: number;
  bootBegin: () => void;
  bootComplete: () => void;
  crash: () => void;
  dispose: () => void;
  beginCall: () => void;
  endCall: () => void;
  subscribe: (listener: (state: WorkerHostState) => void) => () => void;
};

export function createWorkerLifecycle(options: CreateWorkerLifecycleOptions): WorkerLifecycle {
  let state: WorkerHostState = "idle";
  let inFlight = 0;
  let idleHandle: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(state: WorkerHostState) => void>();

  const idleEnabled = options.idleTimeoutMs > 0 && Number.isFinite(options.idleTimeoutMs);

  const setState = (next: WorkerHostState): void => {
    if (state === next) return;
    state = next;
    for (const listener of listeners) listener(state);
  };

  const clearIdle = (): void => {
    if (idleHandle !== null) {
      clearTimeout(idleHandle);
      idleHandle = null;
    }
  };

  const scheduleIdle = (): void => {
    if (!idleEnabled) return;
    if (state !== "ready") return;
    if (inFlight > 0) return;
    clearIdle();
    idleHandle = setTimeout(() => {
      idleHandle = null;
      options.onIdle?.();
    }, options.idleTimeoutMs);
  };

  return {
    get state(): WorkerHostState {
      return state;
    },
    get inFlight(): number {
      return inFlight;
    },
    bootBegin(): void {
      if (state === "disposed") return;
      setState("starting");
    },
    bootComplete(): void {
      if (state !== "starting") return;
      setState("ready");
      scheduleIdle();
    },
    crash(): void {
      if (state === "disposed") return;
      clearIdle();
      setState("dead");
    },
    dispose(): void {
      clearIdle();
      setState("disposed");
    },
    beginCall(): void {
      inFlight += 1;
      clearIdle();
    },
    endCall(): void {
      if (inFlight > 0) inFlight -= 1;
      if (inFlight === 0) scheduleIdle();
    },
    subscribe(listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
