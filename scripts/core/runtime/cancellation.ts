/**
 * @fileoverview Engine-neutral cancellation contract, typed cancellation error, and abort-signal
 * linking used by every command scope. Nothing here reads ambient state or touches an engine
 * primitive: a cancellation is a plain value derived from an `AbortSignal`, and linking composes
 * signals without ever owning the lifetime of the parents it observes.
 * @module scripts/core/runtime/cancellation
 */

/** Thrown when a command invocation is cancelled by signal or interrupt. */
export class CommandCancellation extends Error {
  /** Process exit code the caller should surface: `130` for `SIGINT`, `143` for `SIGTERM`. */
  public readonly exitCode: 130 | 143;

  /**
   * Creates a cancellation error carrying the exit code the caller should surface.
   *
   * @param message - Human-readable cancellation reason.
   * @param exitCode - `130` for an interactive interrupt, `143` for a termination request.
   */
  public constructor(message: string, exitCode: 130 | 143) {
    super(message);
    this.name = "CommandCancellation";
    this.exitCode = exitCode;
  }
}

/**
 * Derives a {@link CommandCancellation} for an aborted signal, preserving an already-typed
 * cancellation reason instead of wrapping it a second time.
 *
 * @param signal - The aborted signal.
 * @param options - Optional fallback message and exit code used when `signal.reason` is not
 * already a {@link CommandCancellation}.
 * @returns A {@link CommandCancellation} describing why `signal` aborted.
 */
export function commandCancellationFromSignal(
  signal: AbortSignal,
  options?: Readonly<{message?: string; exitCode?: 130 | 143}>,
): CommandCancellation {
  const {reason} = signal;
  if (reason instanceof CommandCancellation) {
    return reason;
  }

  const message = options?.message ?? (reason instanceof Error ? reason.message : "Operation was cancelled.");
  const exitCode = options?.exitCode ?? 130;
  return new CommandCancellation(message, exitCode);
}

/** One abort signal derived from zero or more parent signals, with explicit teardown. */
export interface LinkedAbortSignal {
  /** Aborts once any linked parent signal aborts, propagating its reason. */
  readonly signal: AbortSignal;
  /** Detaches every parent listener without aborting {@link LinkedAbortSignal.signal}. */
  readonly dispose: () => void;
}

/**
 * Links zero or more optional parent signals into one child signal, so combining, for example,
 * a command's root cancellation signal with a per-call timeout signal never requires the caller
 * to track more than one signal, and disposing the link never leaks the parent listeners it added.
 *
 * @param signals - Parent signals to link; `undefined` entries are ignored.
 * @returns The linked signal and a disposer that detaches every parent listener.
 */
export function linkAbortSignals(...signals: readonly (AbortSignal | undefined)[]): LinkedAbortSignal {
  const controller = new AbortController();
  const parents = signals.filter((signal): signal is AbortSignal => signal !== undefined);

  const alreadyAborted = parents.find((signal) => signal.aborted);
  if (alreadyAborted !== undefined) {
    controller.abort(alreadyAborted.reason);
  }

  const listeners = parents.map((signal) => {
    const listener = (): void => {
      if (!controller.signal.aborted) {
        controller.abort(signal.reason);
      }
    };
    signal.addEventListener("abort", listener, {once: true});
    return {signal, listener};
  });

  const dispose = (): void => {
    for (const {signal, listener} of listeners) {
      signal.removeEventListener("abort", listener);
    }
  };

  return {signal: controller.signal, dispose};
}
