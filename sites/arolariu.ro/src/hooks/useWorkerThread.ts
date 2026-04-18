"use client";

/**
 * @fileoverview React hook for the Core Web Worker data layer.
 * @module hooks/useWorkerThread
 *
 * @remarks
 * `useWorkerThread` is the primary consumer API for the worker data layer.
 * It bridges the singleton `WorkerClient` into idiomatic React by:
 *
 * - Exposing a reactive `ready` boolean that triggers a re-render once the
 *   worker finishes initialising.
 * - Returning stable, memoized function references so components can include
 *   them in `useEffect`/`useCallback` dependency arrays without extra renders.
 * - Guarding against SSR: the `WorkerClient` is only instantiated inside
 *   `useEffect` (browser-only lifecycle).
 *
 * ---
 *
 * **Worker Initialization (singleton guarantee):**
 * The underlying `Worker` is created once per tab, not once per hook mount.
 * Multiple components can call `useWorkerThread()` simultaneously — they all
 * share the same `WorkerClient` instance.  Only the first call triggers worker
 * construction.
 *
 * **Render Safety:**
 * All returned functions are wrapped in `useCallback` with empty dependency
 * arrays.  `clientRef.current` holds the stable singleton reference and is
 * read at call time, so stale-closure issues are impossible.
 *
 * **SSR / Pre-Mount Behaviour:**
 * Before the effect fires (or in non-browser environments), `ready` is `false`
 * and every method returns a rejected `Promise`.  Components should gate work
 * on `ready === true` or use optional-chaining on the returned methods.
 *
 * **Lifecycle:**
 * ```
 * Mount  → WorkerClient.getInstance()  (creates worker on first call)
 *        → subscribe to onReady
 * Ready  → setReady(true)  → component re-renders with ready=true
 * Unmount → unsubscribe from onReady (worker NOT destroyed — other
 *           components still use the singleton)
 * ```
 */

import {useCallback, useEffect, useRef, useState} from "react";
import type {PayloadFor, WorkerMessageType, WorkerResultTypeMap} from "@/lib/workerTypes";
import {WorkerClient} from "@/workers/client";

// ============================================================================
// Public Types
// ============================================================================

/**
 * Optional configuration for `useWorkerThread`.
 *
 * @remarks
 * Intentionally minimal.  Implementation details (worker URL, DB name, etc.)
 * are encapsulated inside `coreWorker.ts` and `client.ts`.
 */
export interface UseWorkerThreadOptions {
  /**
   * When `false`, the hook will not attempt to connect to the worker on mount.
   * Set to `false` for conditionally-used workers or deferred initialization.
   * Calling `call()` / `get()` etc. while `autoConnect` is `false` returns a
   * rejected Promise.
   *
   * @defaultValue true
   */
  readonly autoConnect?: boolean;
}

/**
 * Return type of `useWorkerThread`.
 *
 * @remarks
 * All method references are stable across re-renders (safe in `useEffect`
 * / `useCallback` dependency arrays).  The `ready` boolean is the only
 * value that changes after mount.
 */
export interface UseWorkerThreadReturn {
  /**
   * `true` once the worker has completed its initialization sequence
   * (IndexedDB open, in-memory store pre-warmed).
   *
   * Gate any worker interaction on this flag to avoid subtle race conditions
   * in components that read data immediately on mount.
   */
  readonly ready: boolean;

  /**
   * Low-level, fully-typed entry point.
   * Prefer the named helpers below for common operations.
   *
   * @see {@link WorkerClient.call}
   */
  readonly call: WorkerClient["call"];

  /**
   * Retrieve a value by key (`undefined` if not found).
   * @see {@link WorkerClient.get}
   */
  readonly get: (key: string) => Promise<unknown>;

  /**
   * Store a structured-cloneable value under `key`.
   * @see {@link WorkerClient.set}
   */
  readonly set: (key: string, value: unknown, persist?: boolean) => Promise<void>;

  /**
   * Remove `key` from the worker's state.
   * @see {@link WorkerClient.delete}
   */
  readonly delete: (key: string, persist?: boolean) => Promise<boolean>;

  /**
   * Bulk-read entries matching an optional key prefix.
   * @see {@link WorkerClient.query}
   */
  readonly query: (prefix?: string, limit?: number) => Promise<Record<string, unknown>>;

  /**
   * Invoke a named processor registered in the worker's command registry.
   * @see {@link WorkerClient.process}
   */
  readonly process: (operation: string, data?: unknown) => Promise<unknown>;
}

// ============================================================================
// SSR / Pre-Mount Fallback
// ============================================================================

/**
 * Error thrown by any method call before the worker is ready.
 * Provides a clear message distinguishing "not yet ready" from "operation failed".
 */
const NOT_READY_ERROR = new Error(
  "[useWorkerThread] Worker is not available yet. " +
    "Await ready === true before calling worker methods.",
);

/**
 * Returns a rejected Promise with `NOT_READY_ERROR`.
 * Used as the fallback for every method before `clientRef.current` is set.
 */
function rejectNotReady<T>(): Promise<T> {
  return Promise.reject(NOT_READY_ERROR) as Promise<T>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Connects a React component to the Core Web Worker data layer.
 *
 * @param options - Optional configuration (see {@link UseWorkerThreadOptions}).
 * @returns Stable worker methods and a reactive `ready` flag.
 *
 * @example
 * ```tsx
 * "use client";
 *
 * import {useEffect, useState} from "react";
 * import {useWorkerThread} from "@/hooks/useWorkerThread";
 *
 * interface UserPreferences {
 *   theme: "light" | "dark";
 *   locale: string;
 * }
 *
 * function PreferencesPanel() {
 *   const worker = useWorkerThread();
 *   const [prefs, setPrefs] = useState<UserPreferences | null>(null);
 *
 *   // Load preferences once the worker is ready
 *   useEffect(() => {
 *     if (!worker.ready) return;
 *     worker
 *       .get("user:prefs")
 *       .then((raw) => setPrefs(raw as UserPreferences ?? null))
 *       .catch(console.error);
 *   }, [worker.ready, worker.get]);
 *
 *   const handleSave = async (updated: UserPreferences) => {
 *     await worker.set("user:prefs", updated);
 *     setPrefs(updated);
 *   };
 *
 *   if (!worker.ready) return <p>Initialising…</p>;
 *   return <PrefsForm value={prefs} onSave={handleSave} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * "use client";
 *
 * import {useEffect, useState} from "react";
 * import {useWorkerThread} from "@/hooks/useWorkerThread";
 *
 * // Query all entries with a given prefix
 * function InvoiceCache() {
 *   const {ready, query, process} = useWorkerThread();
 *   const [data, setData] = useState<Record<string, unknown>>({});
 *
 *   useEffect(() => {
 *     if (!ready) return;
 *     query("invoice:", 100).then(setData).catch(console.error);
 *   }, [ready, query]);
 *
 *   const handleCountAll = async () => {
 *     const n = await process("COUNT");
 *     console.log("Total worker entries:", n);
 *   };
 *
 *   return <DataGrid rows={data} onCountAll={handleCountAll} />;
 * }
 * ```
 *
 * @see {@link WorkerClient}        — singleton client that owns the Worker
 * @see {@link UseWorkerThreadOptions} — available configuration options
 */
export function useWorkerThread(options?: UseWorkerThreadOptions): UseWorkerThreadReturn {
  const {autoConnect = true} = options ?? {};

  /**
   * Reactive ready flag.  `false` on server and before READY signal.
   * Setting it triggers a component re-render.
   */
  const [ready, setReady] = useState<boolean>(false);

  /**
   * Stable reference to the singleton `WorkerClient`.
   * Set inside `useEffect` (browser-only) and never reassigned.
   */
  const clientRef = useRef<WorkerClient | null>(null);

  // --------------------------------------------------------------------------
  // Effect: connect to the singleton worker and track ready state
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!autoConnect) return;

    // Web Workers are browser-only; next.js may render this code on the server
    if (typeof globalThis.window === "undefined") return;

    let unsubscribeReady: () => void = () => { /* no-op until subscription is established */ };

    try {
      const client = WorkerClient.getInstance();
      clientRef.current = client;

      if (client.isReady) {
        // Worker was already initialised (e.g. another component mounted first)
        setReady(true);
      } else {
        // Subscribe; the returned function cancels the subscription on cleanup
        unsubscribeReady = client.onReady(() => setReady(true));
      }
    } catch (error) {
      console.error("[useWorkerThread] Failed to connect to WorkerClient:", error);
    }

    return () => {
      // Cancel the ready subscription if the component unmounts before ready.
      // Do NOT call client.destroy() here — other mounted components still use
      // the singleton worker.
      unsubscribeReady();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- autoConnect is read once on mount
  }, [autoConnect]);

  // --------------------------------------------------------------------------
  // Stable callback: call<T>
  // --------------------------------------------------------------------------
  /**
   * The `call` helper wraps `WorkerClient.call` with the same generic
   * signature so callers retain full type inference.
   *
   * @remarks
   * `useCallback` does not natively preserve generic type parameters.
   * We define the callback as a proper generic function (so `T` is used in
   * both the parameter list and the return type, satisfying strict unused-param
   * checks) and then cast the stable reference to `WorkerClient["call"]`.
   */
  const call = useCallback(
    <T extends WorkerMessageType>(type: T, payload: PayloadFor<T>): Promise<WorkerResultTypeMap[T]> => {
      const client = clientRef.current;
      if (!client) return Promise.reject(NOT_READY_ERROR) as Promise<WorkerResultTypeMap[T]>;
      return client.call(type, payload);
    },
    [],
  ) as WorkerClient["call"]; // restores the polymorphic signature for callers

  // --------------------------------------------------------------------------
  // Stable callbacks: high-level helpers
  // --------------------------------------------------------------------------

  const get = useCallback((key: string): Promise<unknown> => {
    return clientRef.current?.get(key) ?? rejectNotReady();
  }, []);

  const set = useCallback((key: string, value: unknown, persist?: boolean): Promise<void> => {
    return clientRef.current?.set(key, value, persist) ?? rejectNotReady();
  }, []);

  const workerDelete = useCallback((key: string, persist?: boolean): Promise<boolean> => {
    return clientRef.current?.delete(key, persist) ?? rejectNotReady();
  }, []);

  const query = useCallback(
    (prefix?: string, limit?: number): Promise<Record<string, unknown>> => {
      return clientRef.current?.query(prefix, limit) ?? rejectNotReady();
    },
    [],
  );

  const process = useCallback((operation: string, data: unknown = {}): Promise<unknown> => {
    return clientRef.current?.process(operation, data) ?? rejectNotReady();
  }, []);

  // --------------------------------------------------------------------------
  // Return
  // --------------------------------------------------------------------------

  return {
    ready,
    call,
    get,
    set,
    delete: workerDelete,
    query,
    process,
  } as const;
}
