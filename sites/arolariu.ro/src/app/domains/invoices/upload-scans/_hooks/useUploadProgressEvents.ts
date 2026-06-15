"use client";

/**
 * @fileoverview React hook for coalescing upload progress into reducer events.
 * @module app/domains/invoices/upload-scans/_hooks/useUploadProgressEvents
 *
 * @remarks
 * Upload runners can emit several progress notifications in quick succession.
 * This hook batches the latest progress event per upload into the next animation
 * frame so the reducer receives fewer, more meaningful UI updates.
 */

import {useCallback, useEffect, useRef} from "react";
import type {UploadEvent} from "../_model/events";
import type {UploadProgressEvent} from "../_types";

type HookOutput = Readonly<{
  /** Queues an upload progress event for the next animation frame. */
  dispatchProgress: (event: UploadProgressEvent) => void;
}>;

/**
 * Coalesces upload progress events before dispatching reducer events.
 *
 * @param dispatch - Upload reducer dispatch function.
 * @returns Progress callback passed to upload runners.
 */
export function useUploadProgressEvents(dispatch: (event: UploadEvent) => void): HookOutput {
  const progressFrameRef = useRef<number | null>(null);
  const pendingProgressEventsRef = useRef<Map<string, UploadProgressEvent>>(new Map());

  const dispatchProgress = useCallback(
    (event: UploadProgressEvent): void => {
      pendingProgressEventsRef.current.set(event.uploadId, event);

      if (progressFrameRef.current === null) {
        progressFrameRef.current = requestAnimationFrame(() => {
          const events = Array.from(pendingProgressEventsRef.current.values());
          pendingProgressEventsRef.current.clear();
          progressFrameRef.current = null;

          for (const progressEvent of events) {
            dispatch({
              type: "scanUpload.item.progressChanged",
              occurredAt: Date.now(),
              source: "runner",
              uploadId: progressEvent.uploadId,
              status: progressEvent.status,
              progress: progressEvent.progress,
              attempt: progressEvent.attempts,
              ...(progressEvent.error === undefined ? {} : {error: progressEvent.error}),
              ...(progressEvent.blobUrl === undefined ? {} : {blobUrl: progressEvent.blobUrl}),
            });
          }
        });
      }
    },
    [dispatch],
  );

  useEffect(() => {
    return () => {
      if (progressFrameRef.current !== null) {
        cancelAnimationFrame(progressFrameRef.current);
      }
    };
  }, []);

  return {dispatchProgress};
}
