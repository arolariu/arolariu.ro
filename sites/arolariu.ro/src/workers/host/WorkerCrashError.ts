/**
 * Thrown when the underlying worker terminated unexpectedly. In-flight calls
 * reject with this error; consumers must restart the host to recover.
 */
export class WorkerCrashError extends Error {
  public readonly inFlightMethods: ReadonlyArray<string>;

  constructor(inFlightMethods: ReadonlyArray<string>) {
    super(`Worker crashed with ${inFlightMethods.length} in-flight call(s): [${inFlightMethods.join(", ")}].`);
    this.name = "WorkerCrashError";
    this.inFlightMethods = inFlightMethods;
  }
}
