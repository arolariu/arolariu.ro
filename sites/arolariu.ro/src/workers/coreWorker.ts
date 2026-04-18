/**
 * @fileoverview Core Web Worker — stateful data layer for the arolariu.ro frontend.
 * @module workers/coreWorker
 *
 * @remarks
 * This module runs exclusively inside a **Dedicated Web Worker** thread.
 * It is completely isolated from the main UI thread and must never be imported
 * directly by React components or Next.js pages.
 *
 * ---
 *
 * **Storage Architecture (three tiers):**
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Tier 1: In-Memory Map<string, unknown>                         │
 * │  · Sub-millisecond reads/writes                                 │
 * │  · Pre-warmed from IndexedDB on worker startup                  │
 * │  · Authoritative during the current page session                │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Tier 2: IndexedDB (Dexie)  — "arolariu-worker-state"          │
 * │  · Durable persistence across page reloads                      │
 * │  · Written on SET/DELETE when persist=true (default)            │
 * │  · Read only during initialization (pre-warms Tier 1)           │
 * ├─────────────────────────────────────────────────────────────────┤
 * │  Tier 3: BroadcastChannel  — "arolariu-worker-sync-v1"         │
 * │  · Cross-tab memory synchronisation                             │
 * │  · Broadcast after every SET/DELETE; received tabs update       │
 * │    their in-memory store (no DB write, no re-broadcast)         │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * **Concurrency Model:**
 * JavaScript's single-threaded event loop is the concurrency primitive.
 * Each incoming `message` event starts an async `dispatch()` call that
 * returns a Promise.  Multiple `dispatch` Promises may be in flight
 * simultaneously (parallel DB writes, parallel PROCESS calls) but Map
 * operations within each handler are synchronous and therefore safe.
 * Responses are sent when their Promise resolves — the client demultiplexes
 * them by request ID.
 *
 * **Cross-Tab Sync Logic:**
 * After every SET or DELETE the worker posts a `WorkerSyncMessage` to the
 * shared BroadcastChannel.  The browser guarantees that a sender never
 * receives its own messages, so no `tabId` check is needed for loop
 * prevention.  Receiving workers update their in-memory Map and return
 * immediately — they do not re-broadcast and do not write to IndexedDB
 * (the originating tab already did).
 *
 * **Lifecycle:**
 * ```
 * 1. Script parsed & top-level code executed (synchronous setup)
 * 2. initialize() called: opens Dexie DB, loads all rows into store
 * 3. WorkerReadySignal posted to main thread  ← client unblocks
 * 4. Worker processes incoming messages indefinitely
 * 5. Worker.terminate() called by client.destroy() → all resources freed
 * ```
 *
 * **Adding Custom Processors:**
 * Register a new entry in `processorRegistry` near the bottom of this file.
 * The key is the `operation` string the caller passes in `ProcessPayload`.
 * Only statically registered processors can run — no eval, no dynamic code.
 */

import Dexie, {type Table} from "dexie";
import type {
  WorkerProcessor,
  WorkerReadySignal,
  WorkerRequest,
  WorkerResponse,
  WorkerSyncMessage,
} from "@/lib/workerTypes";

// ============================================================================
// Worker Global Scope
// ============================================================================

/**
 * Typed handle to the Dedicated Worker global scope.
 *
 * TypeScript types the global `self` as `Window & typeof globalThis` based on
 * the DOM lib.  We cast to `DedicatedWorkerGlobalScope` — the actual runtime
 * type inside a worker — to get the correct `postMessage` signature (single
 * argument, no `targetOrigin`).  The `"webworker"` lib in `tsconfig.json`
 * makes `DedicatedWorkerGlobalScope` available without any reference directives.
 */
const workerScope = globalThis as unknown as DedicatedWorkerGlobalScope;

// ============================================================================
// Persistence Layer (Dexie / IndexedDB — Tier 2)
// ============================================================================

/** Schema for a single persisted state record. */
interface StateRecord {
  /** Primary key — mirrors the in-memory Map key. */
  key: string;
  /**
   * Stored value.  Dexie uses the structured-clone algorithm internally,
   * so any cloneable value is supported.
   */
  value: unknown;
  /** Unix epoch milliseconds of the last write.  Used for debugging / future TTL. */
  updatedAt: number;
}

/**
 * Isolated Dexie database for the worker's persistent state.
 *
 * @remarks
 * Intentionally separate from the main-thread `ZustandDB` ("zustand-store")
 * to prevent schema conflicts.  Only the worker thread opens this database.
 * The main thread never touches "arolariu-worker-state" directly.
 */
class WorkerDatabase extends Dexie {
  /** Key-value table.  Primary key: `key`.  Secondary index: `updatedAt`. */
  state!: Table<StateRecord, string>;

  constructor() {
    super("arolariu-worker-state");
    this.version(1).stores({
      // "key"       → primary key
      // "updatedAt" → indexed for potential future TTL sweeps
      state: "key,updatedAt",
    });
  }
}

const db = new WorkerDatabase();

// ============================================================================
// In-Memory Store (Tier 1)
// ============================================================================

/**
 * The hot-path state store.  All GET operations are served from here after
 * initialization; SET/DELETE keep this and IndexedDB in sync.
 *
 * Never exported — all access is via the message protocol.
 */
const store = new Map<string, unknown>();

// ============================================================================
// Cross-Tab BroadcastChannel (Tier 3)
// ============================================================================

/** Versioned channel name prevents accidental cross-version bleed. */
const BC_CHANNEL_NAME = "arolariu-worker-sync-v1" as const;

/**
 * BroadcastChannel that fans out state mutations to all other tabs.
 *
 * @remarks
 * **Self-delivery:**  The browser suppresses delivery of a message to the
 * context that posted it, so the originating tab's worker never sees its
 * own sync messages.  No sender-ID comparison is needed.
 *
 * **Inbound handler:**  Updates the in-memory store only.  No DB write
 * (origin tab already persisted) and no re-broadcast (would cause loops).
 */
const broadcastChannel = new BroadcastChannel(BC_CHANNEL_NAME);

broadcastChannel.addEventListener("message", (event: MessageEvent<WorkerSyncMessage>): void => {
  const msg = event.data;
  // Ignore messages from unrelated channels that share the same BroadcastChannel name
  if (msg.type !== "WORKER_SYNC") return;

  if (msg.deleted) {
    store.delete(msg.key);
  } else {
    store.set(msg.key, msg.value);
  }
  // No IndexedDB write — the originating worker already persisted.
  // No re-broadcast   — BroadcastChannel handles fan-out natively.
});

// ============================================================================
// Processor Registry
// ============================================================================

/**
 * Named-command registry for PROCESS operations.
 *
 * @remarks
 * Only processors registered here can be invoked.  This enforces a
 * capability-based model: callers name an operation, they do not supply code.
 *
 * **Built-in operations:**
 * | Name                  | Input                     | Returns                          |
 * |-----------------------|---------------------------|----------------------------------|
 * | `"FILTER_BY_PREFIX"`  | `{ prefix: string }`      | `Record<string, unknown>`        |
 * | `"COUNT"`             | `{}` (ignored)            | `number`                         |
 * | `"KEYS"`             | `{}` (ignored)            | `string[]`                       |
 * | `"CLEAR_ALL"`         | `{}` (ignored)            | `void` (clears memory + DB)      |
 */
const processorRegistry = new Map<string, WorkerProcessor>([
  [
    "FILTER_BY_PREFIX",
    (data: unknown, state: ReadonlyMap<string, unknown>): Record<string, unknown> => {
      const {prefix} = data as {prefix: string};
      const result: Record<string, unknown> = {};
      for (const [key, value] of state) {
        if (key.startsWith(prefix)) {
          result[key] = value;
        }
      }
      return result;
    },
  ],
  ["COUNT", (_data: unknown, state: ReadonlyMap<string, unknown>): number => state.size],
  ["KEYS", (_data: unknown, state: ReadonlyMap<string, unknown>): string[] => [...state.keys()]],
  [
    "CLEAR_ALL",
    async (_data: unknown, _state: ReadonlyMap<string, unknown>): Promise<void> => {
      store.clear();
      await db.state.clear();
      // Broadcast a special sentinel so other tabs also clear their in-memory stores
      const clearAllMsg: WorkerSyncMessage = {
        type: "WORKER_SYNC",
        key: "__CLEAR_ALL__",
        value: null,
        deleted: true,
        tabId: "broadcast",
      };
      // eslint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin concept
      broadcastChannel.postMessage(clearAllMsg);
    },
  ],
]);

// ============================================================================
// Response Helpers
// ============================================================================

/** Constructs a success `WorkerResponse` for the given request. */
function respond(id: string, type: WorkerRequest["type"], result?: unknown): WorkerResponse {
  return {id, type, success: true, result};
}

/** Constructs an error `WorkerResponse` for the given request. */
function respondError(id: string, type: WorkerRequest["type"], error: unknown): WorkerResponse {
  const message = error instanceof Error ? error.message : String(error);
  return {id, type, success: false, error: message};
}

/** Sends a mutation notification to all other tabs via BroadcastChannel. */
function broadcastMutation(key: string, value: unknown, deleted: boolean, tabId: string): void {
  const msg: WorkerSyncMessage = {type: "WORKER_SYNC", key, value, deleted, tabId};
  // eslint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin concept
  broadcastChannel.postMessage(msg);
}

// ============================================================================
// Operation Handlers
// ============================================================================

/**
 * GET — returns the value for `key` from the in-memory store.
 * Falls back to a direct IndexedDB read on a cache miss (e.g. race during init).
 */
async function handleGet(req: Extract<WorkerRequest, {type: "GET"}>): Promise<WorkerResponse> {
  const {key} = req.payload;

  if (store.has(key)) {
    return respond(req.id, "GET", store.get(key));
  }

  // Cache miss: the store may not yet be fully pre-warmed (e.g. very early request)
  try {
    const record = await db.state.get(key);
    if (record !== undefined) {
      store.set(key, record.value); // warm the cache for subsequent reads
      return respond(req.id, "GET", record.value);
    }
    return respond(req.id, "GET");
  } catch (error) {
    return respondError(req.id, "GET", error);
  }
}

/**
 * SET — writes `value` under `key` in memory, optionally persists to IndexedDB,
 * then broadcasts the mutation to other tabs.
 */
async function handleSet(req: Extract<WorkerRequest, {type: "SET"}>): Promise<WorkerResponse> {
  const {key, value, persist = true} = req.payload;

  // Memory write first — synchronous and always succeeds
  store.set(key, value);

  if (persist) {
    try {
      await db.state.put({key, value, updatedAt: Date.now()});
    } catch (error) {
      // Non-fatal: memory write already succeeded; log and continue
      console.error("[CoreWorker] IndexedDB SET failed for key:", key, error);
    }
  }

  // Broadcast after the DB write (or failure) to keep cross-tab sync consistent
  broadcastMutation(key, value, false, req.tabId);

  return respond(req.id, "SET");
}

/**
 * DELETE — removes `key` from memory, optionally from IndexedDB,
 * then broadcasts the deletion to other tabs.
 */
async function handleDelete(req: Extract<WorkerRequest, {type: "DELETE"}>): Promise<WorkerResponse> {
  const {key, persist = true} = req.payload;

  store.delete(key);

  if (persist) {
    try {
      await db.state.delete(key);
    } catch (error) {
      console.error("[CoreWorker] IndexedDB DELETE failed for key:", key, error);
    }
  }

  broadcastMutation(key, undefined, true, req.tabId);

  return respond(req.id, "DELETE", true);
}

/**
 * QUERY — scans the in-memory store and returns all entries whose keys start
 * with `prefix` (or all entries when prefix is omitted), up to `limit` items.
 */
function handleQuery(req: Extract<WorkerRequest, {type: "QUERY"}>): WorkerResponse {
  const {prefix, limit} = req.payload;
  const result: Record<string, unknown> = {};
  let count = 0;

  for (const [key, value] of store) {
    if (limit !== undefined && count >= limit) break;
    if (prefix === undefined || key.startsWith(prefix)) {
      result[key] = value;
      count++;
    }
  }

  return respond(req.id, "QUERY", result);
}

/**
 * PROCESS — looks up the requested `operation` in the processor registry and
 * executes it, passing `data` and a read-only view of the current state.
 */
async function handleProcess(
  req: Extract<WorkerRequest, {type: "PROCESS"}>,
): Promise<WorkerResponse> {
  const {operation, data} = req.payload;

  const processor = processorRegistry.get(operation);
  if (!processor) {
    return respondError(
      req.id,
      "PROCESS",
      `Unknown operation: "${operation}". Register it in coreWorker.processorRegistry.`,
    );
  }

  try {
    const result = await Promise.resolve(processor(data, store));
    return respond(req.id, "PROCESS", result);
  } catch (error) {
    return respondError(req.id, "PROCESS", error);
  }
}

// ============================================================================
// Message Dispatcher
// ============================================================================

/**
 * Routes an incoming `WorkerRequest` to the appropriate handler.
 *
 * @remarks
 * The `switch` statement is the single authoritative dispatch point.
 * TypeScript narrows each `case` to the exact request variant, so
 * handlers receive fully-typed payloads.  The `default` branch is a
 * compile-time exhaustiveness guard — at runtime it should be unreachable.
 */
async function dispatch(req: WorkerRequest): Promise<WorkerResponse> {
  switch (req.type) {
    case "GET":
      return handleGet(req);
    case "SET":
      return handleSet(req);
    case "DELETE":
      return handleDelete(req);
    case "QUERY":
      return handleQuery(req);
    case "PROCESS":
      return handleProcess(req);
    default: {
      // Exhaustiveness guard — TypeScript narrows `req` to `never` here
      const _unreachable: never = req;
      return respondError(
        (_unreachable as WorkerRequest).id,
        "GET",
        `Unhandled message type: ${String((_unreachable as WorkerRequest).type)}`,
      );
    }
  }
}

// ============================================================================
// Message Handler
// ============================================================================

workerScope.addEventListener("message", (event: MessageEvent<WorkerRequest>): void => {
  // Dispatch runs concurrently for all in-flight requests.  Responses are
  // sent when each Promise settles; the client demultiplexes by request ID.
  void (async () => {
    try {
      const response = await dispatch(event.data);
      // eslint-disable-next-line unicorn/require-post-message-target-origin -- DedicatedWorkerGlobalScope.postMessage has no targetOrigin
      workerScope.postMessage(response);
    } catch (error: unknown) {
      const {id, type} = event.data;
      // eslint-disable-next-line unicorn/require-post-message-target-origin -- DedicatedWorkerGlobalScope.postMessage has no targetOrigin
      workerScope.postMessage(respondError(id, type, error));
    }
  })();
});

// ============================================================================
// Initialization
// ============================================================================

/**
 * Opens the Dexie database, pre-warms the in-memory store from all persisted
 * records, then posts the `WorkerReadySignal` to the main thread.
 *
 * @remarks
 * Pre-warming ensures that the first GET after the READY signal always hits
 * the fast in-memory path rather than triggering an IndexedDB read.
 *
 * On DB failure the worker falls back to memory-only mode: state is volatile
 * (lost on reload) but all operations remain functional.  The READY signal
 * is sent regardless — the client must never hang waiting for it.
 */
async function initialize(): Promise<void> {
  try {
    await db.open();
    const records = await db.state.toArray();
    for (const record of records) {
      store.set(record.key, record.value);
    }
  } catch (error) {
    console.error(
      "[CoreWorker] IndexedDB unavailable — falling back to memory-only mode:",
      error,
    );
  } finally {
    // Always signal ready so the client is not left waiting
    const readySignal: WorkerReadySignal = {id: "__ready__", type: "READY"};
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- DedicatedWorkerGlobalScope.postMessage has no targetOrigin
    workerScope.postMessage(readySignal);
  }
}

// Top-level await kicks off initialization as soon as the worker module is parsed
await initialize();
