/**
 * @fileoverview Canned demo worker for the dev-only playground at
 * `/playground/workers/`. Exposes a deliberately surface-rich api for
 * exercising every documented foundation behavior.
 * @module app/playground/workers/playground.worker
 *
 * @remarks
 * This file is dev-only — the parent route is gated with `notFound()` outside
 * development, so the worker module is unreachable in production runtimes
 * (and can be tree-shaken by Turbopack from prod bundles).
 */

import {emitEvent, expose, getEventPort} from "@/workers/runtime";
import type {WorkerCapabilities} from "@/workers";

export type PlaygroundWorkerApi = {
  echo: (msg: string) => Promise<string>;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  throwError: (code: string) => Promise<never>;
  crash: () => Promise<never>;
  reportCapabilities: () => Promise<WorkerCapabilities | null>;
  emitEvents: (count: number) => Promise<void>;
};

let cachedCapabilities: WorkerCapabilities | null = null;

const api: PlaygroundWorkerApi = {
  echo: async (msg) => msg,
  sleep: async (ms, signal) => {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => resolve(), ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(signal.reason ?? new Error("aborted"));
      });
    });
  },
  throwError: async (code) => {
    throw new Error(`playground:${code}`);
  },
  crash: async () => {
    // Schedule an uncaught microtask exception so the worker dies "for real".
    queueMicrotask(() => {
      throw new Error("simulated playground crash");
    });
    // Resolve the call before the crash; the host sees the worker die.
    return new Promise<never>(() => {
      /* never resolves */
    });
  },
  reportCapabilities: async () => cachedCapabilities,
  emitEvents: async (count) => {
    const port = getEventPort();
    if (!port) return;
    for (let i = 0; i < count; i += 1) {
      emitEvent(port, {kind: "log", level: "info", msg: `event-${i}`});
    }
  },
};

// Capture capabilities from the bootstrap message into a module-level cache.
// Register this listener BEFORE `expose` so it runs first when the bootstrap
// arrives (listeners fire in registration order). `expose` will remove only
// its own listener after handshake; ours stays attached but no further messages
// match the shape, so it's a no-op afterward.
self.addEventListener("message", (event) => {
  const data = event.data as {capabilities?: WorkerCapabilities} | null;
  if (data && typeof data === "object" && data.capabilities) {
    cachedCapabilities = data.capabilities;
  }
});

expose<PlaygroundWorkerApi>(api);
