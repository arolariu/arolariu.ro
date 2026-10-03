/**
 * @fileoverview Recorder for the termination signal that ended a command run.
 * @module scripts/platform/signals
 *
 * @remarks
 * `NodeRuntime.runMain` already handles `SIGINT` and `SIGTERM` by interrupting the main fiber, so
 * these listeners only remember which signal arrived. The CLI entry passes the recorded signal to
 * `exitCodeFor` to choose between exit codes `130` and `143`.
 */

import type {TerminationSignal} from "./exit.ts";

/** Handle over the installed termination-signal listeners. */
export interface SignalRecorder {
  /** Returns the most recently received termination signal, if any. */
  readonly last: () => TerminationSignal | undefined;
  /** Removes the listeners this recorder installed. */
  readonly dispose: () => void;
}

const terminationSignals: readonly TerminationSignal[] = ["SIGINT", "SIGTERM"];

/**
 * Installs `SIGINT` and `SIGTERM` listeners that record the latest signal without exiting or
 * interrupting anything.
 *
 * @returns A recorder exposing the last signal and a `dispose` that removes its listeners.
 */
export function recordTerminationSignals(): SignalRecorder {
  let lastSignal: TerminationSignal | undefined;
  const listeners = terminationSignals.map((signal) => {
    const listener = (): void => {
      lastSignal = signal;
    };
    process.on(signal, listener);
    return {signal, listener};
  });

  return {
    last: (): TerminationSignal | undefined => lastSignal,
    dispose: (): void => {
      for (const {signal, listener} of listeners) {
        process.off(signal, listener);
      }
    },
  };
}
