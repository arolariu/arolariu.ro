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
  WorkerMessageError,
  WorkerNotAvailableError,
  WorkerTimeoutError,
} from "./host";

// Re-export the Comlink markers we use so consumers don't dual-import from
// "comlink" directly. Bundler chunk-splitting can otherwise produce two
// distinct Comlink instances with incompatible internal symbols, leading
// to silent breakage when a `proxy()`-marked value crosses chunks.
export {proxy, transfer, releaseProxy} from "comlink";
export {type Remote} from "comlink";
