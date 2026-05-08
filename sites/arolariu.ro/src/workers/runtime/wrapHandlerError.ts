/**
 * @fileoverview Worker-side handler wrapper that translates thrown values
 * into the `__workerError` envelope the host's call proxy unwraps.
 * @module workers/runtime/wrapHandlerError
 *
 * @remarks
 * Comlink's default `throwTransferHandler` only round-trips `name`, `message`,
 * and `stack`; WHATWG HTML §2.7.3 further normalizes `Error.name` to one of
 * the seven standard names. To preserve the original error's name and
 * message across the structured-clone boundary we throw a plain envelope
 * object instead. The host's `buildCallProxy` rewraps the envelope as a
 * typed `WorkerError` whose `.cause` holds the envelope.
 */

export type WorkerErrorEnvelope = Readonly<{
  __workerError: true;
  name: string;
  message: string;
  stack?: string;
}>;

/**
 * Wrap a handler function so any thrown value becomes a `WorkerErrorEnvelope`.
 *
 * @typeParam TArgs - The handler's argument tuple type.
 * @typeParam TReturn - The handler's resolved return type.
 * @param fn - The handler to wrap. Must return a promise.
 * @returns A function with the same signature whose thrown values are
 *   normalized into a `__workerError` envelope.
 */
export function wrapHandlerError<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    try {
      return await fn(...args);
    } catch (cause) {
      const err = cause as {name?: string; message?: string; stack?: string};
      const envelope: WorkerErrorEnvelope = {
        __workerError: true,
        name: typeof err?.name === "string" ? err.name : "Error",
        message: typeof err?.message === "string" ? err.message : String(cause),
        ...(typeof err?.stack === "string" ? {stack: err.stack} : {}),
      };
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- intentional plain-object envelope; see fileoverview
      throw envelope;
    }
  };
}
