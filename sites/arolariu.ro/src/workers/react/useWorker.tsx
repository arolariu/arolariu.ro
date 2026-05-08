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
      // Strict-Mode remount inherited a host that the previous cycle's
      // cleanup already disposed. Swap in a fresh instance — the re-render
      // triggered by setHost re-runs this effect with the new host, which
      // installs the real unmount cleanup against it. Returning no cleanup
      // here is correct: the disposed host has nothing left to release.
      setHost(factoryRef.current());
      return;
    }
    return () => {
      void host.dispose();
    };
  }, [host]);

  // useSyncExternalStore wires the host's state-change subscription into
  // React's concurrent-rendering snapshot model. We pass `listener` directly
  // (no closure wrapper): TS function-arity coercion lets `() => void` slot
  // into `host.subscribe`'s `(state) => void` parameter, and host.subscribe
  // is already identity-stable across renders.
  const subscribe = useCallback((listener: () => void) => host.subscribe(listener), [host]);
  const getSnapshot = useCallback(() => host.state, [host]);
  // SSR snapshot: workers are client-only, but React still demands a server
  // snapshot for hydration. The host's initial state is "idle" before any
  // boot — safe to serialize and identical between server and client.
  const getServerSnapshot = useCallback(() => "idle" as const, []);

  // Return value intentionally unused: consumers read live state via
  // `host.state` (a getter that always reflects the current value). Calling
  // useSyncExternalStore here is purely for its re-render side-effect when
  // the host's state machine transitions. Exposing the snapshot separately
  // would duplicate the source of truth and risk tearing.
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return host;
}
