/**
 * @fileoverview Recorder for the termination signals that ended a command run.
 * @module scripts/platform/signals
 *
 * @remarks
 * `NodeRuntime.runMain` already handles `SIGINT` and `SIGTERM` by interrupting the main fiber, so
 * these listeners only remember which signals arrived. The CLI entry passes the recorded signal to
 * `exitCodeFor` to choose between exit codes `130` and `143`, and provides the recorder as
 * {@link TerminationSignals}, so `Process` can tell a terminal Ctrl+C (which a terminal-attached
 * child receives too) from a programmatic interruption, and a second Ctrl+C from the first.
 */

import {Context} from "effect";

import type {TerminationSignal} from "./exit.ts";

/** Read-only view of the termination signals the process has received. */
export interface TerminationSignalsShape {
  /** Returns the most recently received termination signal, if any. */
  readonly last: () => TerminationSignal | undefined;
  /** Returns how many termination signals have been received. */
  readonly count: () => number;
}

/** Handle over the installed termination-signal listeners. */
export interface SignalRecorder extends TerminationSignalsShape {
  /** Removes the listeners this recorder installed. */
  readonly dispose: () => void;
}

/**
 * The termination signals of the running process.
 *
 * @remarks
 * Defaults to a view that never reports a signal, so a program run without the CLI entry (a test,
 * a worker) treats every interruption as programmatic.
 */
export const TerminationSignals: Context.Reference<TerminationSignalsShape> = Context.Reference<TerminationSignalsShape>(
  "arolariu/scripts/TerminationSignals",
  {
    defaultValue: () => ({last: () => undefined, count: () => 0}),
  },
);

const terminationSignals: readonly TerminationSignal[] = ["SIGINT", "SIGTERM"];

/**
 * Installs `SIGINT` and `SIGTERM` listeners that record the received signals without exiting or
 * interrupting anything.
 *
 * @returns A recorder exposing the last signal, the signal count, and a `dispose` that removes its listeners.
 */
export function recordTerminationSignals(): SignalRecorder {
  let lastSignal: TerminationSignal | undefined;
  let received = 0;
  const listeners = terminationSignals.map((signal) => {
    const listener = (): void => {
      lastSignal = signal;
      received += 1;
    };
    process.on(signal, listener);
    return {signal, listener};
  });

  return {
    last: (): TerminationSignal | undefined => lastSignal,
    count: (): number => received,
    dispose: (): void => {
      for (const {signal, listener} of listeners) {
        process.off(signal, listener);
      }
    },
  };
}
