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

import "./client-only";
import {transfer as comlinkTransfer} from "comlink";

export {createWorkerHost} from "./host";
export type {CreateWorkerHostOptions, WorkerHost, WorkerHostState, WorkerCapabilities, WorkerEvent} from "./host";
export {
  WorkerCrashError,
  WorkerDeadError,
  WorkerError,
  WorkerMessageError,
  WorkerNotAvailableError,
  WorkerTimeoutError,
} from "./host";

/**
 * Mark a value carrying transferables (e.g. `ArrayBuffer`, `MessagePort`,
 * `OffscreenCanvas`) so the worker host transfers ownership instead of
 * copying. Wraps Comlink's `transfer()` under a name that doesn't tie
 * consumers to the underlying RPC library.
 *
 * @example
 * ```ts
 * await host.api.process(transferable(buffer, [buffer]));
 * ```
 */
export function transferable<T>(value: T, transfers: Transferable[]): T {
  return comlinkTransfer(value, transfers);
}
