/**
 * @fileoverview Wire protocol envelope shared between worker host and runtime.
 * @module workers/host/workerEnvelope
 *
 * @remarks
 * Defines the bootstrap message and the worker-to-parent event union, plus a
 * runtime validator for the bootstrap message. See spec §5 for the full
 * protocol description.
 */

import type {WorkerCapabilities} from "./workerCapabilities";

/** Protocol version. Bump for any breaking change to bootstrap or WorkerEvent. */
export const WORKER_PROTOCOL_VERSION = 1 as const;

/**
 * Bootstrap message — single-shot, parent → worker, before any RPC.
 * Two `MessagePort`s are transferred; both are required.
 */
export type WorkerBootstrap = Readonly<{
  kind: "bootstrap";
  version: typeof WORKER_PROTOCOL_VERSION;
  rpcPort: MessagePort;
  eventPort: MessagePort;
  capabilities: WorkerCapabilities;
}>;

/**
 * Worker → parent event, sent over the dedicated event channel.
 * Best-effort fire-and-forget; not used for request/response.
 */
export type WorkerEvent =
  | Readonly<{kind: "ready"}>
  | Readonly<{
      kind: "log";
      level: "debug" | "info" | "warn" | "error";
      msg: string;
      attrs?: Record<string, unknown>;
    }>
  | Readonly<{
      kind: "metric";
      name: string;
      value: number;
      unit?: string;
      attrs?: Record<string, string | number>;
    }>
  | Readonly<{
      kind: "span";
      name: string;
      startMs: number;
      durationMs: number;
      attrs?: Record<string, string | number>;
    }>;

/**
 * Validate that an unknown value is a well-formed `WorkerBootstrap`.
 * Used by both worker (incoming bootstrap) and host (defensive sanity check
 * before sending).
 */
export function validateBootstrap(message: unknown): message is WorkerBootstrap {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const m = message as Record<string, unknown>;
  if (m.kind !== "bootstrap") return false;
  if (m.version !== WORKER_PROTOCOL_VERSION) return false;
  // Check for MessagePort by duck typing: should have onmessage and postMessage
  if (typeof m.rpcPort !== "object" || m.rpcPort === null || typeof (m.rpcPort as {postMessage?: unknown}).postMessage !== "function") return false;
  if (typeof m.eventPort !== "object" || m.eventPort === null || typeof (m.eventPort as {postMessage?: unknown}).postMessage !== "function") return false;
  if (typeof m.capabilities !== "object" || m.capabilities === null) return false;
  return true;
}
