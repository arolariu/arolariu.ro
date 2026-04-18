/**
 * @fileoverview Singleton WorkerClient — main-thread interface to the Core Web Worker.
 * @module workers/client
 *
 * @remarks
 * `WorkerClient` is the sole owner of the `Worker` instance for a given browser
 * tab.  It translates promise-based method calls into fire-and-forget
 * `postMessage` requests and correlates worker responses back to their
 * originating Promises via a UUID-keyed `Map`.
 *
 * ---
 *
 * **Singleton Pattern:**
 * The module-level `_instance` variable holds one `WorkerClient` per tab.
 * `WorkerClient.getInstance()` is the only public constructor — direct
 * instantiation is prevented by the private constructor.  Any number of React
 * components calling `getInstance()` always receive the same object.
 *
 * **Concurrency Model:**
 * ```
 * Component A ─┐
 * Component B ─┼─► call("GET",  {key:"a"}) ─► postMessage({id:"uuid-1", ...})
 * Component C ─┘─► call("SET",  {key:"b"}) ─► postMessage({id:"uuid-2", ...})
 *                                                      │
 *                           Worker processes both ◄────┘
 *                                      │
 *               pending.get("uuid-1") ◄── response {id:"uuid-1", ...}
 *               pending.get("uuid-2") ◄── response {id:"uuid-2", ...}
 * ```
 * All in-flight requests live in `pending: Map<string, PendingResolver>`.
 * Since the main thread is single-threaded, Map accesses are race-condition-free.
 * Each resolver is deleted before the Promise resolves, preventing leaks.
 *
 * **Ready State:**
 * The worker sends a `WorkerReadySignal` after initialization completes.
 * `call()` is safe before the READY signal — requests are buffered by the
 * worker and answered once it finishes initializing.  `isReady` is exposed
 * so UI code can gate interactions on the hook's `ready` flag.
 *
 * **Memory Management:**
 * - Resolved/rejected Promises: removed from `pending` immediately on response.
 * - Worker crash: `handleError` rejects all pending promises and clears the Map.
 * - `destroy()`: terminates the worker, rejects all pending, clears singleton.
 */

import type {
  PayloadFor,
  WorkerInboundMessage,
  WorkerMessageType,
  WorkerRequest,
  WorkerResultTypeMap,
} from "@/lib/workerTypes";

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Resolver pair stored in `pending` while a request is in flight.
 *
 * @remarks
 * Both callbacks accept `unknown` / `Error` so the Map can hold resolvers
 * for all result types without generics on the Map itself.  The generic
 * cast happens inside `call<T>` where the concrete `T` is known.
 */
interface PendingResolver {
  /** Resolves the caller's Promise with the response result. */
  resolve: (value: unknown) => void;
  /** Rejects the caller's Promise with an Error. */
  reject: (reason: Error) => void;
}

// ============================================================================
// Module-Level Singleton State
// ============================================================================

/**
 * The one `WorkerClient` instance for this tab.
 * `null` until `getInstance()` is first called; `null` again after `destroy()`.
 */
let _instance: WorkerClient | null = null;

// ============================================================================
// WorkerClient
// ============================================================================

/**
 * Singleton client that owns the Dedicated Web Worker and exposes a fully
 * typed, promise-based API for all data-layer operations.
 *
 * @example
 * ```typescript
 * // Typical usage is through the React hook:
 * const {get, set, ready} = useWorkerThread();
 *
 * // Direct usage outside React (e.g. a service module):
 * const client = WorkerClient.getInstance();
 * await client.set("session:token", jwtString);
 * const token = await client.get("session:token");
 * ```
 *
 * @see {@link useWorkerThread} for the React hook wrapper.
 */
export class WorkerClient {
  // --------------------------------------------------------------------------
  // Private Fields
  // --------------------------------------------------------------------------

  /** The underlying `Worker` object. Terminated on `destroy()`. */
  private readonly worker: Worker;

  /**
   * In-flight request registry.
   * Key:   UUIDv4 request ID (also present in the `WorkerRequest` payload).
   * Value: `{resolve, reject}` pair for the caller's Promise.
   */
  private readonly pending = new Map<string, PendingResolver>();

  /**
   * Stable, tab-unique identifier generated once per `WorkerClient` instance.
   * Included in every `WorkerRequest` so the worker can tag
   * `WorkerSyncMessage` broadcasts with the originating tab.
   */
  private readonly tabId: string;

  /** Becomes `true` when the first `WorkerReadySignal` is received. */
  private _isReady = false;

  /**
   * Callbacks registered via `onReady()`.
   * Cleared (and never fired again) after the first READY signal.
   */
  private readonly readyListeners = new Set<() => void>();

  // --------------------------------------------------------------------------
  // Constructor (private)
  // --------------------------------------------------------------------------

  private constructor() {
    this.tabId = crypto.randomUUID();

    /**
     * Instantiate the worker using Next.js / Webpack 5's worker bundling.
     * The URL is relative to THIS file (`workers/client.ts`), so
     * `"coreWorker.ts"` resolves to `workers/coreWorker.ts`.
     *
     * Webpack compiles the worker into a separate chunk and rewrites the
     * `new URL(...)` call at build time.  The `{type: "module"}` option
     * informs the browser that the emitted chunk uses ES module semantics.
     */
    this.worker = new Worker(new URL("coreWorker.ts", import.meta.url), {
      type: "module",
      name: "arolariu-core-worker",
    });

    this.worker.addEventListener("message", this.handleMessage.bind(this) as EventListener);
    this.worker.addEventListener("error", this.handleError.bind(this));
  }

  // --------------------------------------------------------------------------
  // Singleton Factory
  // --------------------------------------------------------------------------

  /**
   * Returns the singleton `WorkerClient` for this tab, creating it on first call.
   *
   * @remarks
   * **SSR guard:** throws immediately in non-browser environments because
   * `Worker` is undefined on the server.  The `useWorkerThread` hook wraps
   * this call inside `useEffect` (client-only), so server rendering is safe.
   *
   * @throws {Error} When called outside a browser context (e.g. during SSR).
   * @returns The singleton `WorkerClient` instance.
   */
  static getInstance(): WorkerClient {
    if (typeof globalThis.window === "undefined") {
      throw new TypeError(
        "[WorkerClient] Web Workers are not available in server-side rendering context.",
      );
    }
    _instance ??= new WorkerClient();
    return _instance;
  }

  // --------------------------------------------------------------------------
  // Internal Message Routing
  // --------------------------------------------------------------------------

  /**
   * Routes every inbound message from the worker to the correct handler.
   *
   * @remarks
   * Two paths:
   * 1. `type === "READY"` → flip `_isReady`, notify ready listeners.
   * 2. Regular response  → look up `pending`, resolve or reject, delete entry.
   *
   * **Narrowing rationale:**
   * `WorkerInboundMessage = WorkerResponse | WorkerReadySignal`.
   * Discriminating on `type === "READY"` is reliable because
   * `WorkerReadySignal.type` is `"READY"` (a string literal) while
   * `WorkerMessageType` (`"GET" | "SET" | "DELETE" | "QUERY" | "PROCESS"`)
   * never includes `"READY"`.  TypeScript correctly narrows to `WorkerResponse`
   * in the else-path after the guard returns.
   */
  private handleMessage(event: MessageEvent<WorkerInboundMessage>): void {
    const {data} = event;

    // ── Path 1: one-shot initialization signal ──────────────────────────────
    if (data.type === "READY") {
      this._isReady = true;
      for (const cb of this.readyListeners) {
        try {
          cb();
        } catch (error) {
          console.error("[WorkerClient] onReady callback threw:", error);
        }
      }
      this.readyListeners.clear();
      return;
    }

    // ── Path 2: regular operation response ──────────────────────────────────
    // TypeScript narrows `data` to `WorkerResponse` here (READY guard above)
    const resolver = this.pending.get(data.id);
    if (!resolver) {
      // Response for a cancelled or already-resolved request — safe to ignore
      return;
    }

    // Remove before resolution to prevent any re-entrant lookup
    this.pending.delete(data.id);

    if (data.success) {
      resolver.resolve(data.result);
    } else {
      resolver.reject(new Error(data.error));
    }
  }

  /**
   * Handles uncaught errors thrown by the worker script itself (syntax errors,
   * uncaught exceptions at the top level, etc.).
   *
   * @remarks
   * Rejects every pending Promise so callers are not left hanging, then
   * clears the map to free memory.
   */
  private handleError(event: ErrorEvent): void {
    const errorMessage = `[WorkerClient] Worker script error: ${event.message}`;
    console.error(errorMessage, event);

    const error = new Error(errorMessage);
    for (const resolver of this.pending.values()) {
      resolver.reject(error);
    }
    this.pending.clear();
  }

  // --------------------------------------------------------------------------
  // Core Call API
  // --------------------------------------------------------------------------

  /**
   * Sends a typed request to the worker and returns a Promise for its result.
   *
   * @remarks
   * **Type safety:**
   * - `type` is constrained to `WorkerMessageType` (the discriminant string).
   * - `payload` is inferred as `PayloadFor<T>`, the exact payload shape for
   *   that operation.  TypeScript rejects mismatched type/payload pairs at
   *   compile time.
   * - Return type is `Promise<WorkerResultTypeMap[T]>`.
   *
   * **Concurrency:**
   * Multiple simultaneous calls are safe.  Each gets its own UUIDv4 `id`.
   * Responses are matched back via `handleMessage → pending.get(id)`.
   *
   * @param type - The operation type string (e.g. `"GET"`, `"SET"`).
   * @param payload - The payload matching the chosen `type`.
   * @returns A Promise that resolves with the typed operation result.
   *
   * @example
   * ```typescript
   * // GET — returns `unknown`; narrow the type in your calling code
   * const raw = await client.call("GET", {key: "user:prefs"});
   * const prefs = raw as UserPreferences;
   *
   * // SET — returns `void`
   * await client.call("SET", {key: "user:prefs", value: prefs});
   *
   * // QUERY — returns `Record<string, unknown>`
   * const all = await client.call("QUERY", {prefix: "user:"});
   * ```
   */
  call<T extends WorkerMessageType>(
    type: T,
    payload: PayloadFor<T>,
  ): Promise<WorkerResultTypeMap[T]> {
    return new Promise<WorkerResultTypeMap[T]>((resolve, reject) => {
      const id = crypto.randomUUID();

      // Register the resolver BEFORE postMessage to handle any synchronous
      // error that might fire before the microtask queue drains
      this.pending.set(id, {
        // Cast: the worker guarantees it sends the right result type for each
        // operation — enforced by the shared `WorkerResultTypeMap` contract.
        resolve: (value: unknown) => resolve(value as WorkerResultTypeMap[T]),
        reject,
      });

      // Construct the request as a discriminated union member
      const request = {id, tabId: this.tabId, type, payload} as WorkerRequest;
      // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker.postMessage has no targetOrigin parameter
      this.worker.postMessage(request);
    });
  }

  // --------------------------------------------------------------------------
  // High-Level API (convenience wrappers over `call`)
  // --------------------------------------------------------------------------

  /**
   * Retrieves the value stored under `key`, or `undefined` if not found.
   *
   * @remarks
   * The return type is `unknown` because the stored type cannot be statically
   * proven.  Callers should narrow via a type guard or explicit cast.
   *
   * @param key - The key to look up.
   * @returns The stored value, or `undefined`.
   *
   * @example
   * ```typescript
   * const raw = await client.get("user:prefs");
   * const prefs = raw as UserPreferences | undefined;
   * ```
   */
  get(key: string): Promise<unknown> {
    return this.call("GET", {key});
  }

  /**
   * Stores `value` under `key`.
   *
   * @param key - The key to write under.
   * @param value - A structured-cloneable value.
   * @param persist - Write to IndexedDB too (default `true`).
   *
   * @example
   * ```typescript
   * await client.set("user:prefs", {theme: "dark", locale: "ro"});
   * // Ephemeral (memory-only) write:
   * await client.set("session:flag", true, false);
   * ```
   */
  set(key: string, value: unknown, persist = true): Promise<void> {
    return this.call("SET", {key, value, persist});
  }

  /**
   * Removes `key` from the worker's state.
   *
   * @param key - The key to remove.
   * @param persist - Delete from IndexedDB too (default `true`).
   * @returns `true` (always; provided for interface consistency).
   *
   * @example
   * ```typescript
   * await client.delete("session:token");
   * ```
   */
  delete(key: string, persist = true): Promise<boolean> {
    return this.call("DELETE", {key, persist});
  }

  /**
   * Returns all entries whose keys start with `prefix` (or all entries if
   * `prefix` is omitted), capped at `limit` items.
   *
   * @param prefix - Optional key prefix filter.
   * @param limit - Maximum number of results.
   * @returns A plain object mapping each matching key to its value.
   *
   * @example
   * ```typescript
   * const invoiceEntries = await client.query("invoice:", 50);
   * ```
   */
  query(prefix?: string, limit?: number): Promise<Record<string, unknown>> {
    return this.call("QUERY", {prefix, limit});
  }

  /**
   * Invokes a named processor from the worker's command registry.
   *
   * @remarks
   * The `operation` string must match a key registered in `coreWorker.ts`'s
   * `processorRegistry`.  Unrecognised names result in a rejected Promise.
   *
   * Built-in operations: `"COUNT"`, `"KEYS"`, `"FILTER_BY_PREFIX"`, `"CLEAR_ALL"`.
   *
   * @param operation - Registered processor name.
   * @param data - Structured-cloneable data forwarded to the processor.
   * @returns The processor's return value (`unknown`; narrow in calling code).
   *
   * @example
   * ```typescript
   * const count = await client.process("COUNT", {}) as number;
   * const keys  = await client.process("KEYS",  {}) as string[];
   * const hits  = await client.process("FILTER_BY_PREFIX", {prefix: "invoice:"});
   * ```
   */
  process(operation: string, data: unknown = {}): Promise<unknown> {
    return this.call("PROCESS", {operation, data});
  }

  // --------------------------------------------------------------------------
  // Ready State
  // --------------------------------------------------------------------------

  /**
   * Whether the worker has completed its initialization sequence.
   *
   * @remarks
   * `false` until the `WorkerReadySignal` is received from the worker.
   * Requests sent via `call()` before `isReady` is `true` are still valid —
   * they are queued in the worker's event loop and answered after init.
   * The `ready` flag in `useWorkerThread` tracks this value reactively.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Registers a callback that fires exactly once when the worker becomes ready.
   *
   * @remarks
   * If the worker is already ready, the callback is scheduled as a microtask
   * (never synchronous) so callers can safely call `onReady` in constructor
   * code without worrying about re-entrant state updates.
   *
   * @param callback - Zero-argument function to invoke on ready.
   * @returns An unsubscribe function.  Call it before the callback fires to
   *          cancel the subscription (e.g. in a `useEffect` cleanup).
   *
   * @example
   * ```typescript
   * const off = client.onReady(() => console.log("Worker ready!"));
   * // Cancel if component unmounts before ready:
   * return () => off();
   * ```
   */
  onReady(callback: () => void): () => void {
    if (this._isReady) {
      // Fire as a microtask to keep caller code predictable (never synchronous)
      queueMicrotask(callback);
      return () => { /* no-op: callback already queued */ };
    }

    this.readyListeners.add(callback);
    return () => {
      this.readyListeners.delete(callback);
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Terminates the worker and resets the singleton.
   *
   * @remarks
   * - All pending Promises are rejected immediately with a "destroyed" error.
   * - `readyListeners` are cleared (ready callbacks will never fire).
   * - `worker.terminate()` stops the worker thread; the BroadcastChannel it
   *   holds is closed by the browser automatically.
   * - After `destroy()`, `WorkerClient.getInstance()` creates a fresh worker.
   *
   * **When to call:**
   * - `window.beforeunload` for cleanup on page exit.
   * - Test teardown between test cases.
   * - HMR (Hot Module Replacement) invalidation callbacks in development.
   *
   * @example
   * ```typescript
   * window.addEventListener("beforeunload", () => {
   *   WorkerClient.getInstance().destroy();
   * });
   * ```
   */
  destroy(): void {
    const error = new Error("[WorkerClient] Worker was destroyed.");
    for (const resolver of this.pending.values()) {
      resolver.reject(error);
    }
    this.pending.clear();
    this.readyListeners.clear();

    this.worker.terminate();
    _instance = null;
  }
}
