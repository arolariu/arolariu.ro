/**
 * @fileoverview Test utility: a controllable `Worker`-shaped object backed by
 * the worker-side `expose` runtime, with no real worker thread involved.
 * @module workers/host/__tests__/mockWorker
 *
 * @remarks
 * Used exclusively by foundation unit tests. Lets us drive the host through
 * every state transition deterministically, and feeds Comlink real
 * `MessagePort`s so error normalization round-trips end-to-end.
 *
 * Not exported from any barrel; not bundled in production.
 */

import {expose, type ExposeOptions} from "../../runtime/exposeWorker";

export type CreateMockWorkerOptions<TApi extends Record<string, unknown>> = Readonly<{
  /** The api the mock worker will expose, identical to what a real worker would expose. */
  api: TApi;
}>;

export type MockWorker = Readonly<{
  /** The `Worker`-shaped object the host treats as a real Worker. */
  worker: Worker;
  /** Trigger an `error` event on the worker so the host sees an unexpected crash. */
  simulateCrash: () => void;
  /** Resolves the first time `terminate()` is called. */
  whenTerminated: Promise<void>;
}>;

/**
 * Build a controllable `Worker`-shaped object whose handlers run synchronously
 * inside the parent process. Useful for testing host lifecycle without spinning
 * up a real worker thread.
 */
export function createMockWorker<TApi extends Record<string, unknown>>(
  options: CreateMockWorkerOptions<TApi>,
): MockWorker {
  let bootstrapHandler: ((event: MessageEvent) => void) | null = null;
  let errorHandler: ((event: ErrorEvent) => void) | null = null;
  let terminated = false;
  let resolveTerminated!: () => void;
  const whenTerminated = new Promise<void>((resolve) => {
    resolveTerminated = resolve;
  });

  // Build a fake DedicatedWorkerGlobalScope that the runtime will use.
  const fakeSelf = {
    addEventListener: (type: string, handler: (e: MessageEvent) => void): void => {
      if (type === "message") bootstrapHandler = handler;
    },
    removeEventListener: (type: string): void => {
      if (type === "message") bootstrapHandler = null;
    },
  } as unknown as DedicatedWorkerGlobalScope;

  // Boot the worker-side runtime against our fake self.
  // This is the same code the real worker would run.
  expose<TApi>(options.api, {self: fakeSelf} as ExposeOptions);

  // Build the `Worker`-shaped object we hand to the host.
  const worker: Worker = {
    postMessage: ((data: unknown, transfer?: Transferable[] | StructuredSerializeOptions): void => {
      if (terminated) return;
      // Forward the bootstrap to the runtime listener.
      const ports = Array.isArray(transfer) ? transfer : [];
      const event = new MessageEvent("message", {data, ports: ports.filter((p): p is MessagePort => p instanceof MessagePort)});
      bootstrapHandler?.(event);
    }) as Worker["postMessage"],
    terminate: (): void => {
      if (terminated) return;
      terminated = true;
      bootstrapHandler = null;
      resolveTerminated();
    },
    addEventListener: ((type: string, handler: EventListenerOrEventListenerObject): void => {
      if (type === "error") {
        errorHandler = handler as (e: ErrorEvent) => void;
      }
    }) as Worker["addEventListener"],
    removeEventListener: ((type: string): void => {
      if (type === "error") errorHandler = null;
    }) as Worker["removeEventListener"],
    dispatchEvent: () => true,
    onmessage: null,
    onmessageerror: null,
    onerror: null,
  };

  return {
    worker,
    simulateCrash: (): void => {
      if (terminated) return;
      const event = new ErrorEvent("error", {message: "simulated crash"});
      errorHandler?.(event);
      terminated = true;
      resolveTerminated();
    },
    whenTerminated,
  };
}
