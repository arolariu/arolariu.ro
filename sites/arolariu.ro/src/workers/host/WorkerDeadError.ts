/**
 * Thrown when a call is attempted on a dead or disposed host. Dead hosts must
 * restart; disposed hosts are permanently unusable.
 */
export class WorkerDeadError extends Error {
  constructor(message = "Worker host is dead or disposed.") {
    super(message);
    this.name = "WorkerDeadError";
  }
}
