/**
 * @fileoverview In-flight call registry for the Web Worker host.
 * @module workers/host/inFlightRegistry
 *
 * @remarks
 * The host registers every proxy method call here BEFORE awaiting `ensureReady`.
 * This is load-bearing: Comlink's `requestResponseMessage` tracks only the
 * call's `resolve` callback (no `reject`), so if the worker terminates while
 * a call is mid-flight the consumer's `await` would hang forever
 * (GoogleChromeLabs/comlink#601). Crash, restart, and dispose all drain the
 * registry through this module so each call sees a deterministic rejection.
 */

type Reject = (err: unknown) => void;

type Entry = Readonly<{method: string; reject: Reject}>;

export type InFlightRegistry = Readonly<{
  /** Number of entries currently registered. */
  size: number;
  /** Register an in-flight call. Returns an idempotent remove handle. */
  register: (method: string, reject: Reject) => () => void;
  /** Reject every entry with `factory(methods)` and clear. */
  drainWithFactory: (factory: (methods: ReadonlyArray<string>) => unknown) => ReadonlyArray<string>;
}>;

export function createInFlightRegistry(): InFlightRegistry {
  const set = new Set<Entry>();

  return {
    get size() {
      return set.size;
    },
    register(method, reject): () => void {
      const entry: Entry = {method, reject};
      set.add(entry);
      return () => {
        set.delete(entry);
      };
    },
    drainWithFactory(factory): ReadonlyArray<string> {
      const snapshot = Array.from(set);
      set.clear();
      const methods = snapshot.map((e) => e.method);
      const err = factory(methods);
      for (const entry of snapshot) entry.reject(err);
      return methods;
    },
  };
}
