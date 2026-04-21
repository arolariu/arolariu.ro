/**
 * @fileoverview Shared type definitions for the Web Worker data layer.
 * @module lib/workerTypes
 *
 * @remarks
 * All types in this module are shared between the worker thread (`coreWorker.ts`)
 * and the main thread (`workers/client.ts`). Every value that crosses the boundary
 * must satisfy the structured-clone algorithm — no functions, Promises, or DOM nodes
 * in payloads.
 *
 * **Design: Discriminated Union on `type`**
 * `WorkerRequest` is a discriminated union, ensuring each message type carries
 * exactly the right payload shape.  This enables exhaustive switch-based
 * dispatch in the worker with compile-time guarantees.
 *
 * **Message Flow:**
 * ```
 * Main thread → Worker  :  WorkerRequest      (via worker.postMessage)
 * Worker → Main thread  :  WorkerResponse     (via self.postMessage)
 * Worker → Main thread  :  WorkerReadySignal  (one-shot init signal)
 * Tab A Worker → Tab B Worker : WorkerSyncMessage (via BroadcastChannel)
 * ```
 */

// ============================================================================
// Payload Types (structured-cloneable input shapes per operation)
// ============================================================================

/**
 * Payload for GET — retrieve a single value by key.
 */
export interface GetPayload {
  /** The key to look up in the worker's state store. */
  readonly key: string;
}

/**
 * Payload for SET — write a key-value pair into the worker's state store.
 */
export interface SetPayload {
  /** The key to write under. */
  readonly key: string;
  /**
   * The value to store.  Must satisfy the structured-clone algorithm
   * (no functions, Symbols, DOM nodes, or circular references).
   */
  readonly value: unknown;
  /**
   * When `true` (default) the value is also written to IndexedDB so it
   * survives page reloads.  Pass `false` for ephemeral, memory-only writes.
   * @defaultValue true
   */
  readonly persist?: boolean;
}

/**
 * Payload for DELETE — remove a key from the worker's state store.
 */
export interface DeletePayload {
  /** The key to remove. */
  readonly key: string;
  /**
   * When `true` (default) the key is also deleted from IndexedDB.
   * @defaultValue true
   */
  readonly persist?: boolean;
}

/**
 * Payload for QUERY — bulk-read entries matching an optional prefix filter.
 */
export interface QueryPayload {
  /**
   * Optional key prefix.  Only entries whose keys start with this string
   * are included in the response.  Omit to return all entries.
   */
  readonly prefix?: string;
  /**
   * Maximum number of entries to return.
   * Omit for no limit.
   */
  readonly limit?: number;
}

/**
 * Payload for PROCESS — invoke a named processor from the worker's command registry.
 *
 * @remarks
 * Only processors pre-registered inside `coreWorker.ts` can be executed.
 * There is no way to inject arbitrary code — callers specify an operation
 * name, not a function.
 */
export interface ProcessPayload {
  /**
   * The name of the registered processor (e.g. `"FILTER_BY_PREFIX"`, `"COUNT"`).
   * Unrecognised names result in a `WorkerErrorResponse`.
   */
  readonly operation: string;
  /** Structured-cloneable data forwarded to the processor verbatim. */
  readonly data: unknown;
}

// ============================================================================
// Request Types (Discriminated Union)
// ============================================================================

/** Fields present in every outbound request. */
interface BaseRequest {
  /**
   * Unique request identifier (UUIDv4).
   * The worker echoes this ID in its response so the client can resolve
   * the correct in-flight Promise.
   */
  readonly id: string;
  /**
   * Stable identifier for the originating browser tab (UUIDv4 generated
   * once per `WorkerClient` instance).  Included in `WorkerSyncMessage`
   * broadcasts for traceability; BroadcastChannel suppresses self-delivery
   * natively so this is not used for echo-prevention.
   */
  readonly tabId: string;
}

/**
 * All possible messages that the main thread can send to the worker.
 *
 * @remarks
 * The union is discriminated on the `type` field.  A `switch` on `type`
 * inside the worker narrows each variant to its exact payload type,
 * enabling compile-time exhaustiveness checking.
 *
 * @example
 * ```typescript
 * function dispatch(req: WorkerRequest) {
 *   switch (req.type) {
 *     case "GET":     return handleGet(req.payload);    // GetPayload
 *     case "SET":     return handleSet(req.payload);    // SetPayload
 *     case "DELETE":  return handleDelete(req.payload); // DeletePayload
 *     case "QUERY":   return handleQuery(req.payload);  // QueryPayload
 *     case "PROCESS": return handleProcess(req.payload);// ProcessPayload
 *   }
 * }
 * ```
 */
export type WorkerRequest =
  | (BaseRequest & {readonly type: "GET"; readonly payload: GetPayload})
  | (BaseRequest & {readonly type: "SET"; readonly payload: SetPayload})
  | (BaseRequest & {readonly type: "DELETE"; readonly payload: DeletePayload})
  | (BaseRequest & {readonly type: "QUERY"; readonly payload: QueryPayload})
  | (BaseRequest & {readonly type: "PROCESS"; readonly payload: ProcessPayload});

/**
 * Union of all valid worker operation type strings.
 * Derived from the discriminated union so it's always in sync.
 */
export type WorkerMessageType = WorkerRequest["type"];

// ============================================================================
// Response Types
// ============================================================================

/**
 * Response emitted by the worker when an operation succeeds.
 */
export interface WorkerSuccessResponse {
  /** Matches the `id` field of the originating `WorkerRequest`. */
  readonly id: string;
  /** The operation type that produced this response. */
  readonly type: WorkerMessageType;
  readonly success: true;
  /**
   * Return value of the operation.
   * Callers that know the concrete type should cast via the high-level
   * helpers (`WorkerClient.get`, `.query`, etc.) which carry result types.
   */
  readonly result: unknown;
}

/**
 * Response emitted by the worker when an operation fails.
 */
export interface WorkerErrorResponse {
  /** Matches the `id` field of the originating `WorkerRequest`. */
  readonly id: string;
  /** The operation type that failed. */
  readonly type: WorkerMessageType;
  readonly success: false;
  /** Human-readable description of the failure. */
  readonly error: string;
}

/** Discriminated union of worker response variants. */
export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

// ============================================================================
// Special Signals
// ============================================================================

/**
 * One-shot signal posted by the worker after its initialization is complete
 * (IndexedDB opened, in-memory store pre-warmed).
 *
 * @remarks
 * The sentinel ID `"__ready__"` must never be used as a regular request ID.
 * The `WorkerClient` detects this message and resolves any pending
 * `onReady` subscribers.
 */
export interface WorkerReadySignal {
  readonly id: "__ready__";
  readonly type: "READY";
}

/**
 * Union of all messages that can arrive from the worker to the main thread.
 * Used to type the `onmessage` handler in `WorkerClient`.
 */
export type WorkerInboundMessage = WorkerResponse | WorkerReadySignal;

// ============================================================================
// Cross-Tab BroadcastChannel Sync Message
// ============================================================================

/**
 * Message broadcast across tabs via `BroadcastChannel` after a mutating
 * operation (SET or DELETE) so every tab's worker stays in sync.
 *
 * @remarks
 * **Self-delivery suppression:**
 * `BroadcastChannel` never delivers a message back to the context that
 * sent it, so the originating tab's worker will never see its own sync
 * messages.  No additional de-duplication logic is required.
 *
 * **Receiving side:**
 * Upon receipt, a tab's worker updates its in-memory `Map` only — it does
 * NOT write to IndexedDB (the origin tab already did) and does NOT
 * re-broadcast (that would cause an infinite loop).
 */
export interface WorkerSyncMessage {
  /** Fixed discriminant to filter out unrelated BroadcastChannel traffic. */
  readonly type: "WORKER_SYNC";
  /** The key that was mutated. */
  readonly key: string;
  /**
   * New value (meaningful only when `deleted` is `false`).
   * Must be structured-cloneable.
   */
  readonly value: unknown;
  /** `true` when the key was removed; `false` when it was created/updated. */
  readonly deleted: boolean;
  /** Tab ID of the originating tab (for audit / future conflict detection). */
  readonly tabId: string;
}

// ============================================================================
// Result Type Map  (operation → return type)
// ============================================================================

/**
 * Maps each `WorkerMessageType` to the expected TypeScript type of the
 * operation's result value.
 *
 * @remarks
 * `WorkerClient.call<T extends WorkerMessageType>` uses this map as its
 * return type, providing end-to-end type safety without requiring callers
 * to cast manually.
 *
 * `GET` and `PROCESS` intentionally return `unknown` because the stored
 * value type cannot be statically proven — callers must narrow via type
 * guards or generic helpers.
 */
export interface WorkerResultTypeMap {
  GET: unknown;
  SET: void;
  DELETE: boolean;
  QUERY: Record<string, unknown>;
  PROCESS: unknown;
}

// ============================================================================
// Utility: Payload Extractor
// ============================================================================

/**
 * Extracts the correct payload type for a given `WorkerMessageType`.
 *
 * @remarks
 * Used in `WorkerClient.call<T>` to correlate the `type` argument with
 * the `payload` argument at compile time, preventing mismatched pairs.
 *
 * @example
 * ```typescript
 * type GetPayloadType    = PayloadFor<"GET">;    // GetPayload
 * type SetPayloadType    = PayloadFor<"SET">;    // SetPayload
 * type DeletePayloadType = PayloadFor<"DELETE">; // DeletePayload
 * ```
 */
export type PayloadFor<T extends WorkerMessageType> = Extract<WorkerRequest, {type: T}>["payload"];

// ============================================================================
// Processor Registry Type
// ============================================================================

/**
 * A named processing function that can be registered in the worker's
 * command registry and invoked via PROCESS messages.
 *
 * @remarks
 * **Safety contract:**
 * Processors MUST NOT mutate the `state` Map directly.  Use SET/DELETE
 * requests for all mutations.  Processors are read-only computations over
 * the current state.
 *
 * **Async support:**
 * Processors may return a `Promise`.  The worker awaits the result before
 * sending the response.
 *
 * @param data - Arbitrary structured-cloneable data passed by the caller.
 * @param state - Read-only snapshot of the worker's current in-memory state.
 * @returns A structured-cloneable result (or a Promise thereof).
 */
export type WorkerProcessor = (
  data: unknown,
  state: ReadonlyMap<string, unknown>,
) => unknown | Promise<unknown>;
