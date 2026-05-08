"use client";

/**
 * @fileoverview Strict-Mode-safe React hook for binding a `WorkerHost` to a
 * component lifecycle.
 * @module workers/react/useWorker
 *
 * @remarks
 * - Subscribes to host state changes through `useSyncExternalStore` so
 *   concurrent renders see a consistent snapshot (no tearing).
 * - Detects React 19 Strict Mode's mount → unmount → remount cycle: when the
 *   first cycle's cleanup disposes the host, the effect on the second mount
 *   notices the `disposed` state and re-creates a fresh host before
 *   subscribing.
 * - Calls `host.dispose()` on real unmount.
 *
 * Consumers pass a `factory: () => WorkerHost<TApi>` rather than a
 * pre-constructed host so the hook can re-create on Strict Mode remount
 * without owning options-equality logic.
 */

import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from "react";

import type {WorkerHost} from "../host";

/**
 * Bind a `WorkerHost` to a React component lifecycle.
 *
 * @typeParam TApi - The typed API the worker exposes.
 * @param factory - Zero-arg factory that constructs a fresh `WorkerHost`.
 *                  Called lazily on first render and again whenever the
 *                  current host has been disposed (e.g. across the React 19
 *                  Strict Mode mount → unmount → remount cycle).
 * @returns The live `WorkerHost`. The returned object's identity changes
 *          when a fresh host is created; the hook's `useSyncExternalStore`
 *          subscription guarantees consumers re-render on host state
 *          transitions.
 */
export function useWorker<TApi>(factory: () => WorkerHost<TApi>): WorkerHost<TApi> {
  // We hold the host in state, not memo, so a Strict-Mode disposed-host can
  // be replaced with a fresh one and the new identity propagates through the
  // render tree.
  const [host, setHost] = useState<WorkerHost<TApi>>(factory);
  // Track the latest factory in a ref so the effect closure doesn't capture
  // a stale reference if the consumer ever changes the factory between
  // renders (uncommon but cheap to support).
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  useEffect(() => {
    if (host.state === "disposed") {
      setHost(factoryRef.current());
      return;
    }
    return () => {
      void host.dispose();
    };
  }, [host]);

  // useSyncExternalStore wires the host's state-change subscription into
  // React's concurrent-rendering snapshot model.
  const subscribe = useCallback((listener: () => void) => host.subscribe(() => listener()), [host]);
  const getSnapshot = useCallback(() => host.state, [host]);
  // SSR snapshot: workers are client-only, but React 19 still demands a
  // server snapshot for hydration. The host's static initial state is
  // "idle" before any boot, which is safe to serialize.
  const getServerSnapshot = useCallback(() => "idle" as const, []);

  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return host;
}
