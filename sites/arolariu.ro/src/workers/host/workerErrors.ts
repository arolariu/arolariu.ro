/**
 * @fileoverview Error taxonomy for the Web Worker foundation.
 * @module workers/host/workerErrors
 *
 * @remarks
 * Six distinct error classes covering the complete failure surface of a
 * `WorkerHost`. The wrapper normalizes Comlink's serialized errors into
 * `WorkerError` so consumers never need string-matching error checks.
 */

export {WorkerCrashError} from "./WorkerCrashError";
export {WorkerDeadError} from "./WorkerDeadError";
export {WorkerMessageError} from "./WorkerMessageError";
export {WorkerNotAvailableError} from "./WorkerNotAvailableError";
export {WorkerTimeoutError} from "./WorkerTimeoutError";

/**
 * Thrown when a worker handler method itself threw an exception.
 * The original error info is preserved on `cause`; the worker stays alive.
 */
export class WorkerError extends Error {
  public readonly method: string;

  constructor(cause: unknown, method: string) {
    super(`Worker handler "${method}" threw an error.`, {cause});
    this.name = "WorkerError";
    this.method = method;
  }
}
