/**
 * @fileoverview Forward worker-side `unhandledrejection` events to the parent
 * over the side-channel event port as a `{kind: "log", level: "error"}` event.
 * @module workers/runtime/installUnhandledRejectionBridge
 *
 * @remarks
 * Without this bridge a rejected promise inside a handler (e.g. a forgotten
 * `await`) silently disappears — the worker keeps running, the parent sees
 * nothing, and the bug only surfaces if the user reads the worker's console.
 * Forwarding the rejection as a structured log event surfaces it through the
 * parent's existing logger seam (`telemetryBridge.ingestEvent`).
 *
 * NOTE: This is *diagnostic*, not a crash signal. The host does NOT
 * transition to `dead` on an unhandled rejection — the worker keeps running.
 * If the rejection signals real corruption, callers should explicitly call
 * `host.restart()` after observing the log line.
 */

import {emitEvent} from "./emitEvent";

/**
 * Install a worker-side listener that forwards every `unhandledrejection`
 * event to the parent over the supplied event port as a structured
 * `{kind: "log", level: "error"}` envelope.
 *
 * @param scope - The dedicated worker global scope to attach the listener to.
 * @param port - The event-channel `MessagePort` granted at bootstrap.
 * @returns An `uninstall` function that detaches the listener.
 */
export function installUnhandledRejectionBridge(scope: DedicatedWorkerGlobalScope, port: MessagePort): () => void {
  const handler = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    const text = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    emitEvent(port, {
      kind: "log",
      level: "error",
      msg: "Unhandled rejection in worker",
      attrs: {reason: text},
    });
  };
  scope.addEventListener("unhandledrejection", handler as EventListener);
  return () => {
    scope.removeEventListener("unhandledrejection", handler as EventListener);
  };
}
