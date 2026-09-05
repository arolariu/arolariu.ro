/**
 * @fileoverview Deterministic, abort-aware controlled clock builder.
 * @module scripts/testing/builders/clock.builder
 *
 * @remarks
 * Time only moves when a test moves it. A pending delay resolves once `advance` reaches its due
 * time, and rejects with the linked cancellation the moment its signal aborts.
 */

import {commandCancellationFromSignal} from "../../core/runtime/cancellation.ts";
import type {Clock} from "../../core/runtime/runtime-capability.ts";

/** Wall-clock instant the controlled clock reports before any time is advanced. */
const CONTROLLED_CLOCK_EPOCH_MS = Date.UTC(2025, 0, 1, 0, 0, 0, 0);

/** A deterministic clock plus the controls a test drives it with. */
export type ControlledClock = Clock
  & Readonly<{
    /** Moves virtual time forward and settles every delay that becomes due. */
    advance: (milliseconds: number) => Promise<void>;
    /** How many delays are still waiting for time to advance. */
    pendingDelayCount: number;
  }>;

interface PendingDelay {
  readonly dueAt: number;
  readonly settle: () => void;
}

/**
 * Builds a deterministic clock whose delays only elapse when a test advances it.
 *
 * @param startMilliseconds - Initial monotonic reading; defaults to `0`.
 * @returns The controlled clock and its advance/inspection controls.
 */
export function buildControlledClock(startMilliseconds: number = 0): ControlledClock {
  let now = startMilliseconds;
  const pending = new Set<PendingDelay>();

  return {
    monotonicNow: (): number => now,
    isoTimestamp: (): string => new Date(CONTROLLED_CLOCK_EPOCH_MS + (now - startMilliseconds)).toISOString(),
    delay: (milliseconds: number, signal?: AbortSignal): Promise<void> => {
      if (signal?.aborted === true) {
        return Promise.reject(commandCancellationFromSignal(signal));
      }
      return new Promise<void>((resolve, reject) => {
        if (milliseconds <= 0) {
          resolve();
          return;
        }
        let detach = (): void => undefined;
        const entry: PendingDelay = {
          dueAt: now + milliseconds,
          settle: (): void => {
            detach();
            resolve();
          },
        };
        pending.add(entry);
        if (signal !== undefined) {
          const onAbort = (): void => {
            pending.delete(entry);
            reject(commandCancellationFromSignal(signal));
          };
          signal.addEventListener("abort", onAbort, {once: true});
          detach = (): void => {
            signal.removeEventListener("abort", onAbort);
          };
        }
      });
    },
    advance: async (milliseconds: number): Promise<void> => {
      now += Math.max(0, milliseconds);
      for (const entry of [...pending]) {
        if (entry.dueAt <= now) {
          pending.delete(entry);
          entry.settle();
        }
      }
      await Promise.resolve();
    },
    get pendingDelayCount(): number {
      return pending.size;
    },
  };
}
