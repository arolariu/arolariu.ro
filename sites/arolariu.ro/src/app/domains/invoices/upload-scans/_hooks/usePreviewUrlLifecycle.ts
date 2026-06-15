"use client";

/**
 * @fileoverview React hook for scan upload preview URL cleanup.
 * @module app/domains/invoices/upload-scans/_hooks/usePreviewUrlLifecycle
 *
 * @remarks
 * Pending uploads hold blob object URLs for local previews. This hook revokes
 * each blob URL at most once and cleans up any remaining previews when the
 * provider unmounts.
 */

import {useCallback, useEffect, useRef} from "react";
import type {PendingUpload} from "../_types";

type HookOutput = Readonly<{
  /** Revokes one preview URL when it is a blob URL and has not been revoked. */
  revokePreviewUrl: (preview: string) => void;
  /** Revokes previews for a collection of uploads. */
  revokePreviews: (uploads: readonly PendingUpload[]) => void;
}>;

/**
 * Tracks and revokes object URLs created for local upload previews.
 *
 * @param currentUploads - Current route queue used for unmount cleanup.
 * @returns Preview URL cleanup helpers.
 */
export function usePreviewUrlLifecycle(currentUploads: readonly PendingUpload[]): HookOutput {
  const revokedPreviewUrlsRef = useRef<Set<string>>(new Set());
  const latestUploadsRef = useRef<readonly PendingUpload[]>(currentUploads);

  const revokePreviewUrl = useCallback((preview: string): void => {
    if (preview.startsWith("blob:") && !revokedPreviewUrlsRef.current.has(preview)) {
      URL.revokeObjectURL(preview);
      revokedPreviewUrlsRef.current.add(preview);
    }
  }, []);

  const revokePreviews = useCallback(
    (uploads: readonly PendingUpload[]): void => {
      for (const upload of uploads) {
        revokePreviewUrl(upload.preview);
      }
    },
    [revokePreviewUrl],
  );

  useEffect(() => {
    latestUploadsRef.current = currentUploads;
  }, [currentUploads]);

  useEffect(() => {
    return () => {
      revokePreviews(latestUploadsRef.current);
    };
  }, [revokePreviews]);

  return {revokePreviewUrl, revokePreviews};
}
