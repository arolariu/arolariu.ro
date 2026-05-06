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
 *
 * SECURITY: This is the trust boundary between the worker realm and the
 * host. Even though we own the worker source, structured-clone deserialization
 * can yield unexpected shapes (extra fields, wrong types, prototype-pollution
 * attempts). This predicate must reject anything that does not strictly
 * match `WorkerBootstrap`, and callers must NEVER spread or pass through
 * unvalidated fields. New fields added to `WorkerBootstrap` MUST be
 * validated here before they are read elsewhere.
 *
 * The `capabilities` object is also strictly validated — required fields
 * must be present with the right primitive types, and optional fields, if
 * present, must be the right primitive type. Workers consume the snapshot
 * via `getBootstrapCapabilities()`, so a malformed value flowing through
 * here would silently corrupt downstream `if (caps.hasWebGpu)` branches.
 */
export function validateBootstrap(message: unknown): message is WorkerBootstrap {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const m = message as Record<string, unknown>;
  if (m.kind !== "bootstrap") return false;
  if (m.version !== WORKER_PROTOCOL_VERSION) return false;

  // Check for MessagePort by duck typing: require a callable postMessage method.
  const isRpcPortObject = typeof m.rpcPort === "object" && m.rpcPort !== null;
  if (!isRpcPortObject) return false;
  const hasRpcPostMessage = typeof (m.rpcPort as {postMessage?: unknown}).postMessage === "function";
  if (!hasRpcPostMessage) return false;

  const isEventPortObject = typeof m.eventPort === "object" && m.eventPort !== null;
  if (!isEventPortObject) return false;
  const hasEventPostMessage = typeof (m.eventPort as {postMessage?: unknown}).postMessage === "function";
  if (!hasEventPostMessage) return false;

  if (typeof m.capabilities !== "object" || m.capabilities === null) return false;
  // SECURITY: validate capabilities fields strictly so untrusted snapshots
  // can't leak into worker code via getBootstrapCapabilities().
  const caps = m.capabilities as Record<string, unknown>;
  if (typeof caps.crossOriginIsolated !== "boolean") return false;
  if (typeof caps.hasWebGpu !== "boolean") return false;
  // Optional numeric fields: if present, must be a number.
  if (caps.hardwareConcurrency !== undefined && typeof caps.hardwareConcurrency !== "number") return false;
  if (caps.deviceMemory !== undefined && typeof caps.deviceMemory !== "number") return false;
  return true;
}
