/** Thrown when Worker is unavailable, such as during server-side rendering. */
export class WorkerNotAvailableError extends Error {
  constructor(message = "Worker is not available in this environment.") {
    super(message);
    this.name = "WorkerNotAvailableError";
  }
}
