"use client";

/**
 * @fileoverview Subscribe to a worker host's `WorkerEvent` stream from a React
 * component. Wraps `host.subscribeToEvents` with the React-canonical
 * "stable-listener-via-ref" pattern so the underlying subscription is not
 * re-created on every render when the listener identity changes.
 * @module workers/react/useWorkerEvent
 */

import {useEffect, useRef} from "react";

import type {WorkerEvent, WorkerHost} from "../host";

/**
 * Subscribe to `WorkerEvent`s emitted by a `WorkerHost`.
 *
 * The listener identity may change between renders without re-creating the
 * underlying subscription — the hook reads the latest listener through a ref
 * each time the host fires.
 *
 * @typeParam TApi - The typed API the worker exposes.
 * @param host - The `WorkerHost` returned by `useWorker` (or constructed
 *               directly via `createWorkerHost`).
 * @param listener - Callback invoked for every `WorkerEvent` the host
 *                   receives. The callback runs synchronously inside the
 *                   host's `forwardEvent` fan-out.
 */
export function useWorkerEvent<TApi>(host: WorkerHost<TApi>, listener: (event: WorkerEvent) => void): void {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;
  useEffect(() => {
    const unsubscribe = host.subscribeToEvents((event) => listenerRef.current(event));
    return unsubscribe;
  }, [host]);
}
