/**
 * @fileoverview Internal barrel for the host layer.
 * Consumers import from `@/workers`, never from this file directly.
 * @internal
 */

export {createWorkerHost} from "./createWorkerHost";
export type {CreateWorkerHostOptions, WorkerHost} from "./createWorkerHost";
export type {WorkerHostState} from "./workerLifecycle";
export type {WorkerCapabilities} from "./workerCapabilities";
export type {WorkerEvent} from "./workerEnvelope";
export {
  WorkerCrashError,
  WorkerDeadError,
  WorkerError,
  WorkerNotAvailableError,
  WorkerTimeoutError,
} from "./workerErrors";
