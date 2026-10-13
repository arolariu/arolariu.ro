/**
 * Thrown when a per-call timeout fires. The worker stays alive and its handler
 * may still be running.
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
