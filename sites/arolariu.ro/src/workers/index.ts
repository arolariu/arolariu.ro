/**
 * @fileoverview Public API surface for the Web Worker foundation.
 * @module workers
 *
 * @remarks
 * Consumers import from this barrel only. The directories `host/` and `runtime/`
 * are implementation details and may be re-organized without notice.
 *
 * Worker-side code (inside `*.worker.ts` files) imports from `@/workers/runtime`.
 *
 * See the README in this directory for the full guide.
 */

export {createWorkerHost} from "./host";
export type {CreateWorkerHostOptions, WorkerHost, WorkerHostState, WorkerCapabilities, WorkerEvent} from "./host";
export {
  WorkerCrashError,
  WorkerDeadError,
  WorkerError,
  WorkerNotAvailableError,
  WorkerTimeoutError,
} from "./host";
export {type Remote} from "comlink";
