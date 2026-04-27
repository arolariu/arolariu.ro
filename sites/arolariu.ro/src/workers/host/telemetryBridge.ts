/**
 * @fileoverview Parent-side telemetry bridge for the Web Worker foundation.
 * @module workers/host/telemetryBridge
 *
 * @remarks
 * Wraps each RPC call in a span (debug log for now; OTel tracer is wired by
 * RFC 1001's frontend instrumentation as a follow-up) and ingests
 * `WorkerEvent`s sent over the side channel. Logs forward to an injectable
 * logger; default is `console.*`.
 *
 * The bridge is the single place where worker telemetry meets the site's
 * observability story. Replacing `console.*` with the OTel client API is a
 * non-breaking change — the bridge surface stays the same.
 */

import type {WorkerEvent} from "./workerEnvelope";

/** Minimal logger shape; matches the subset of `console` we use. */
export type WorkerLogger = Readonly<{
  debug: (msg: string, attrs?: unknown) => void;
  info: (msg: string, attrs?: unknown) => void;
  warn: (msg: string, attrs?: unknown) => void;
  error: (msg: string, attrs?: unknown) => void;
}>;

const DEFAULT_LOGGER: WorkerLogger = {
  debug: (msg, attrs) => console.debug(msg, attrs),
  info: (msg, attrs) => console.info(msg, attrs),
  warn: (msg, attrs) => console.warn(msg, attrs),
  error: (msg, attrs) => console.error(msg, attrs),
};

/** Optional injection seam for tests. */
export type CreateTelemetryBridgeOptions = Readonly<{
  logger?: WorkerLogger;
}>;

/** Bridge surface returned by `createTelemetryBridge`. */
export type TelemetryBridge = Readonly<{
  /** Wrap a parent-side RPC call in a span. Resolves/rejects with the inner result. */
  wrapCall: <T>(method: string, fn: () => Promise<T>) => Promise<T>;
  /** Forward a worker-emitted event to the appropriate sink. */
  ingestEvent: (event: WorkerEvent) => void;
}>;

/**
 * Build the parent-side telemetry bridge for a host named `name`.
 * @param name - Stable host name (e.g., `"ai"`); appears in span/log labels.
 * @param options - Optional logger injection for tests.
 */
export function createTelemetryBridge(name: string, options: CreateTelemetryBridgeOptions = {}): TelemetryBridge {
  const logger = options.logger ?? DEFAULT_LOGGER;

  return {
    async wrapCall<T>(method: string, fn: () => Promise<T>): Promise<T> {
      const start = performance.now();
      const span = `worker.${name}.${method}`;
      try {
        const result = await fn();
        logger.debug(span, {status: "ok", durationMs: Math.round(performance.now() - start)});
        return result;
      } catch (error) {
        logger.error(span, {
          status: "error",
          durationMs: Math.round(performance.now() - start),
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    ingestEvent(event: WorkerEvent): void {
      switch (event.kind) {
        case "ready":
          return; // consumed by workerLifecycle; not forwarded
        case "log":
          logger[event.level](`[worker:${name}] ${event.msg}`, event.attrs);
          return;
        case "metric":
          logger.debug(`[worker:${name}] metric`, {worker: name, name: event.name, value: event.value, unit: event.unit, attrs: event.attrs});
          return;
        case "span":
          logger.debug(`[worker:${name}] span`, {worker: name, name: event.name, startMs: event.startMs, durationMs: event.durationMs, attrs: event.attrs});
          return;
      }
    },
  };
}
