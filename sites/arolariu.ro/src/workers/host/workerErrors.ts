/**
 * @fileoverview Error taxonomy for the Web Worker foundation.
 * @module workers/host/workerErrors
 *
 * @remarks
 * Five distinct error classes covering the complete failure surface of a
 * `WorkerHost`. The wrapper normalizes Comlink's serialized errors into
 * `WorkerError` so consumers never need string-matching error checks.
 */

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

/**
 * Thrown when the underlying worker terminated unexpectedly (uncaught error,
 * OOM, port closed, GPU adapter lost, etc.). All in-flight calls reject with
 * this; consumer must call `restart()` to recover.
 */
export class WorkerCrashError extends Error {
  public readonly inFlightMethods: ReadonlyArray<string>;

  constructor(inFlightMethods: ReadonlyArray<string>) {
    super(`Worker crashed with ${inFlightMethods.length} in-flight call(s): [${inFlightMethods.join(", ")}].`);
    this.name = "WorkerCrashError";
    this.inFlightMethods = inFlightMethods;
  }
}

/**
 * Thrown when a per-call timeout fires. The worker stays alive; the underlying
 * handler may still be running.
 */
export class WorkerTimeoutError extends Error {
  public readonly method: string;
  public readonly elapsedMs: number;

  constructor(method: string, elapsedMs: number) {
    super(`Worker call "${method}" timed out after ${elapsedMs}ms.`);
    this.name = "WorkerTimeoutError";
    this.method = method;
    this.elapsedMs = elapsedMs;
  }
}

/**
 * Thrown when a method call is attempted on a host whose state is `dead` or
 * `disposed`. After `dead`, callers must `restart()`. After `disposed`, the
 * host is permanently unusable.
 */
export class WorkerDeadError extends Error {
  constructor(message = "Worker host is dead or disposed.") {
    super(message);
    this.name = "WorkerDeadError";
  }
}

/**
 * Thrown when a worker call is attempted in an environment where `Worker` is
 * unavailable — typically Server-Side Rendering (`globalThis.Worker` is
 * `undefined`).
 */
export class WorkerNotAvailableError extends Error {
  constructor(message = "Worker is not available in this environment.") {
    super(message);
    this.name = "WorkerNotAvailableError";
  }
}
