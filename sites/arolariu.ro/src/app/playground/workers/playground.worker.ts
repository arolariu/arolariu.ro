/**
 * @fileoverview Canned demo worker for the dev-only playground at
 * `/playground/workers/`. Exposes a deliberately surface-rich api for
 * exercising every documented foundation behavior.
 * @module app/playground/workers/playground.worker
 *
 * @remarks
 * The parent route is gated with `notFound()` outside development, so the
 * playground is unreachable at runtime in production. The worker chunk
 * itself is still emitted by Turbopack because the import graph from
 * `island.tsx` is statically reachable from `page.tsx` regardless of
 * `NODE_ENV` — but the chunk is small and only loaded by the gated route.
 */

import type {WorkerCapabilities} from "@/workers";
import {emitEvent, expose, getBootstrapCapabilities, getEventPort} from "@/workers/runtime";

export type PlaygroundWorkerApi = {
  echo: (msg: string) => Promise<string>;
  sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  throwError: (code: string) => Promise<never>;
  crash: () => Promise<never>;
  reportCapabilities: () => Promise<WorkerCapabilities | null>;
  emitEvents: (count: number) => Promise<void>;
};

const api: PlaygroundWorkerApi = {
  echo: async (msg) => msg,
  sleep: async (ms, _signal) => {
    // Note: AbortSignal is parent-side only in v1; the worker never receives a real signal.
    // The parent rejects the call when the signal aborts; this handler keeps running
    // until the timer completes. See README "Known limitations".
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
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
  reportCapabilities: async () => getBootstrapCapabilities(),
  emitEvents: async (count) => {
    const port = getEventPort();
    if (!port) return;
    for (let i = 0; i < count; i += 1) {
      emitEvent(port, {kind: "log", level: "info", msg: `event-${i}`});
    }
  },
};

expose<PlaygroundWorkerApi>(api);
