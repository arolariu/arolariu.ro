/**
 * A structured-clone deserialization failure. The host treats this as a crash
 * signal and rejects in-flight calls.
 */
export class WorkerMessageError extends Error {
  public readonly detail?: Readonly<Record<string, unknown>>;

  constructor(message = "Worker message failed to deserialize.", detail?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = "WorkerMessageError";
    if (detail !== undefined) this.detail = detail;
  }
}
