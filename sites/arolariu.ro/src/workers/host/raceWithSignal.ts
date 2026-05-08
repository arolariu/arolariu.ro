/**
 * @fileoverview Race a promise against an `AbortSignal` with deterministic
 * listener cleanup on the body-wins path.
 * @module workers/host/raceWithSignal
 *
 * @remarks
 * Centralizes the abort-race pattern that previously lived inline in
 * `createWorkerHost`'s call proxy and `restart()`. WHATWG DOM guarantees
 * `signal.reason` is defined on an aborted signal; the `??` fallback exists
 * solely for runtimes whose polyfills diverge from spec.
 */

export async function raceWithSignal<T>(body: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return body;

  // Synchronous fast path: pre-aborted signals reject before we ever touch the body.
  if (signal.aborted) {
    throw signal.reason ?? new Error("aborted");
  }

  let onAbort: (() => void) | null = null;
  const abortPromise = new Promise<never>((_resolve, reject) => {
    onAbort = (): void => {
      reject(signal.reason ?? new Error("aborted"));
    };
    signal.addEventListener("abort", onAbort, {once: true});
  });

  // Suppress unhandled-rejection noise on whichever side loses the race.
  body.catch(() => {});
  abortPromise.catch(() => {});

  try {
    return await Promise.race([body, abortPromise]);
  } finally {
    // `{once: true}` self-removes on fire; this branch handles body-wins.
    if (onAbort && !signal.aborted) {
      signal.removeEventListener("abort", onAbort);
    }
  }
}
