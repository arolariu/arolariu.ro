/**
 * @fileoverview Public API surface for the Web Worker foundation.
 * @module workers
 *
 * @remarks
 * Consumers import from this barrel only. The directories `host/`, `runtime/`,
 * and `react/` are implementation details and may be re-organized without notice.
 *
 * Worker-side code (inside `*.worker.ts` files) imports from `@/workers/runtime`.
 *
 * **`client-only`:** This module imports `client-only` so any accidental
 * import from a Server Component fails the Next.js build with a clear message
 * rather than at runtime via `typeof Worker !== "undefined"`.
 */

import {transfer as comlinkTransfer} from "comlink";
import "./client-only";

export {
  createWorkerHost,
  WorkerCrashError,
  WorkerDeadError,
  WorkerError,
  WorkerMessageError,
  WorkerNotAvailableError,
  WorkerTimeoutError,
} from "./host";
export type {CreateWorkerHostOptions, WorkerCapabilities, WorkerEvent, WorkerHost, WorkerHostState} from "./host";

/**
 * Mark a value carrying transferables (e.g. `ArrayBuffer`, `MessagePort`,
 * `OffscreenCanvas`) so the worker host transfers ownership instead of
 * structured-cloning. Wraps Comlink's `transfer()` under a name that doesn't
 * tie consumers to the underlying RPC library.
 *
 * @typeParam T - The value being transferred. Returned unchanged to the
 *                caller; Comlink reads the transfer list from a hidden
 *                marker on the value during `postMessage`, so pass the
 *                wrapper as a normal argument to your worker method —
 *                Comlink unwraps it on the other side.
 * @param value - The payload (often an object that contains the
 *                transferable, e.g. `{buffer}`).
 * @param transfers - The transferable objects to move. After the call
 *                    settles, the originals are detached on the parent
 *                    side and unusable.
 *
 * @example
 * ```ts
 * // Move `buffer` into the worker (zero copy). The parent's `buffer`
 * // becomes a detached, zero-byte ArrayBuffer once the call is dispatched.
 * await host.api.process(transferable(buffer, [buffer]));
 * ```
 */
export function transferable<T>(value: T, transfers: Transferable[]): T {
  return comlinkTransfer(value, transfers);
}
