/**
 * @fileoverview Worker-side helper for emitting events over the side channel.
 * @module workers/runtime/emitEvent
 *
 * @remarks
 * Workers send `{kind, ...}` messages to the parent over a dedicated
 * `MessagePort` that the host receives separately from the RPC channel.
 * Telemetry is best-effort: a failure to post must never propagate.
 */

import type {WorkerEvent} from "../host/workerEnvelope";

/**
 * Send a typed `WorkerEvent` over the worker's event port.
 * Errors from `postMessage` are silently swallowed — telemetry must never crash
 * the worker.
 *
 * @param port - The event-channel port the worker received during bootstrap.
 * @param event - The event to send.
 */
export function emitEvent(port: MessagePort, event: WorkerEvent): void {
  try {
    port.postMessage(event);
  } catch {
    // Intentional swallow: telemetry must never crash the worker.
    // The parent will see the missing event in its log; no further action needed.
  }
}
