"use client";

/**
 * @fileoverview Build a feature-specific React hook that constructs a
 * `WorkerHost` with fixed options and binds it to a component lifecycle.
 * @module workers/react/createWorkerHook
 *
 * @example
 * ```tsx
 * const useFeatureXWorker = createWorkerHook<FeatureXApi>({
 *   name: "feature-x",
 *   load: () => new Worker(new URL("./feature-x.worker.ts", import.meta.url), {type: "module"}),
 * });
 *
 * function FeatureX() {
 *   const host = useFeatureXWorker();
 *   // ...
 * }
 * ```
 */

import {createWorkerHost, type CreateWorkerHostOptions, type WorkerHost} from "../host";
import {useWorker} from "./useWorker";

/**
 * Build a feature-specific React hook bound to a fixed `WorkerHost` config.
 *
 * The returned hook calls `useWorker` internally so the resulting host is
 * Strict-Mode-safe and is disposed on real unmount.
 *
 * @remarks
 * **MUST be called at module scope.** The returned hook is a stable React
 * hook function; calling `createWorkerHook` inside a component body would
 * produce a new hook function on every render, which would break the Rules
 * of Hooks (the call ordering would change between renders, and `useWorker`'s
 * internal `useState` would receive a fresh factory closure each time,
 * defeating Strict-Mode-safe host re-creation).
 *
 * @typeParam TApi - The typed API the worker exposes.
 * @param options - Host configuration. The same options object is reused
 *                  by the factory closure each time a fresh host must be
 *                  constructed (initial mount, Strict-Mode remount, etc.).
 * @returns A zero-arg React hook that returns a live `WorkerHost`.
 */
export function createWorkerHook<TApi>(
  options: CreateWorkerHostOptions<TApi>,
): () => WorkerHost<TApi> {
  return function useFeatureWorker(): WorkerHost<TApi> {
    return useWorker(() => createWorkerHost<TApi>(options));
  };
}
