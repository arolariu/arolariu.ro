"use client";

/**
 * @fileoverview Context provider for managing route-scoped scan upload state.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext
 *
 * @remarks
 * Keeps transient browser upload state in memory while delegating validation,
 * reducer transitions, and one-file upload orchestration to focused utilities.
 */

import {withConcurrencyLimit} from "@/lib/concurrency.client";
import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode} from "react";
import {v4 as uuidv4} from "uuid";
import {generateUploadSasUrl, registerScan, uploadScan} from "../../_actions/scans";
import {initialUploadState, selectUploadableItems, uploadReducer} from "../_utils/uploadReducer";
import {readFileAsBase64, uploadPendingScan} from "../_utils/uploadRunner";
import {
  COMPLETED_UPLOAD_REMOVAL_DELAY_MS,
  UPLOAD_CONCURRENCY_LIMIT,
  type PendingUpload,
  type SessionStats,
  type UploadCompletionSummary,
  type UploadProgressEvent,
  type UploadRunnerDependencies,
} from "../_utils/uploadTypes";
import {validateUploadFiles} from "../_utils/uploadValidation";

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;

interface ScanUploadContextType {
  /** Files currently tracked by the upload route. */
  readonly pendingUploads: PendingUpload[];
  /** Whether a batch upload is currently running. */
  readonly isUploading: boolean;
  /** Upload statistics for the current route session. */
  readonly sessionStats: SessionStats;
  /** Latest successfully uploaded scans for the post-upload prompt. */
  readonly completedBatch: UploadCompletionSummary[];
  /** Add files to the upload queue. */
  readonly addFiles: (files: FileList | File[]) => Promise<void>;
  /** Remove idle or failed files from the upload queue. */
  readonly removeFiles: (ids: string[]) => void;
  /** Clear all idle or failed files. Active uploads remain locked. */
  readonly clearAll: () => void;
  /** Rename an idle or failed file. */
  readonly renameFile: (id: string, newName: string) => void;
  /** Upload all idle and failed files. */
  readonly uploadAll: () => Promise<void>;
  /** Reset route session statistics. */
  readonly resetSessionStats: () => void;
  /** Clear the post-upload prompt completion summary. */
  readonly clearCompletedBatch: () => void;
}

const ScanUploadContext = createContext<ScanUploadContextType | undefined>(undefined);

/**
 * Provides route-scoped scan upload state and actions.
 *
 * @param props - Provider props.
 * @param props.children - Route subtree that consumes upload state.
 * @returns Provider wrapping the upload route subtree.
 */
export function ScanUploadProvider({children}: Readonly<{children: ReactNode}>): React.JSX.Element {
  const [state, dispatch] = useReducer(uploadReducer, initialUploadState);
  const removalTimersRef = useRef<Set<TimeoutHandle>>(new Set());
  const progressFrameRef = useRef<number | null>(null);
  const pendingProgressEventsRef = useRef<Map<string, UploadProgressEvent>>(new Map());
  const revokedPreviewUrlsRef = useRef<Set<string>>(new Set());
  const latestUploadsRef = useRef<PendingUpload[]>([]);

  const revokePreviewUrl = useCallback((preview: string): void => {
    if (preview && preview.startsWith("blob:") && !revokedPreviewUrlsRef.current.has(preview)) {
      URL.revokeObjectURL(preview);
      revokedPreviewUrlsRef.current.add(preview);
    }
  }, []);

  const revokePreviews = useCallback(
    (uploads: PendingUpload[]): void => {
      for (const upload of uploads) {
        revokePreviewUrl(upload.preview);
      }
    },
    [revokePreviewUrl],
  );

  useEffect(() => {
    latestUploadsRef.current = state.pendingUploads;
  }, [state.pendingUploads]);

  useEffect(() => {
    return () => {
      if (progressFrameRef.current !== null) {
        cancelAnimationFrame(progressFrameRef.current);
      }

      for (const timerId of removalTimersRef.current) {
        globalThis.clearTimeout(timerId);
      }

      revokePreviews(latestUploadsRef.current);
    };
  }, [revokePreviews]);

  const addFiles = useCallback(async (files: FileList | File[]): Promise<void> => {
    const validation = validateUploadFiles(Array.from(files));

    for (const invalidFile of validation.invalidFiles) {
      toast.error(invalidFile.message);
    }

    const uploads: PendingUpload[] = validation.validFiles.map((file) => ({
      id: uuidv4(),
      name: file.name,
      file,
      mimeType: file.type,
      size: file.size,
      preview: URL.createObjectURL(file),
      status: "idle",
      progress: 0,
      attempts: 0,
    }));

    if (uploads.length === 0) {
      return;
    }

    dispatch({type: "uploads-added", uploads});
    toast.success(`Added ${uploads.length} file(s) to upload queue`);
  }, []);

  const removeFiles = useCallback(
    (ids: string[]): void => {
      const idsSet = new Set(ids);
      const removableUploads = state.pendingUploads.filter(
        (upload) => idsSet.has(upload.id) && (upload.status === "idle" || upload.status === "failed"),
      );
      revokePreviews(removableUploads);
      dispatch({type: "uploads-removed", ids});
    },
    [revokePreviews, state.pendingUploads],
  );

  const clearAll = useCallback((): void => {
    const removableUploads = state.pendingUploads.filter((upload) => upload.status === "idle" || upload.status === "failed");
    revokePreviews(removableUploads);
    dispatch({type: "uploads-cleared"});
    toast.info("All files cleared");
  }, [revokePreviews, state.pendingUploads]);

  const renameFile = useCallback((id: string, newName: string): void => {
    dispatch({type: "upload-renamed", id, name: newName});
  }, []);

  const dispatchProgress = useCallback((event: UploadProgressEvent): void => {
    pendingProgressEventsRef.current.set(event.uploadId, event);

    if (progressFrameRef.current === null) {
      progressFrameRef.current = requestAnimationFrame(() => {
        const events = Array.from(pendingProgressEventsRef.current.values());
        pendingProgressEventsRef.current.clear();
        progressFrameRef.current = null;

        for (const progressEvent of events) {
          dispatch({
            type: "upload-progressed",
            id: progressEvent.uploadId,
            status: progressEvent.status,
            progress: progressEvent.progress,
            attempts: progressEvent.attempts,
            ...(progressEvent.error === undefined ? {} : {error: progressEvent.error}),
            ...(progressEvent.blobUrl === undefined ? {} : {blobUrl: progressEvent.blobUrl}),
          });
        }
      });
    }
  }, []);

  const scheduleUploadRemoval = useCallback((uploadId: string): void => {
    const timerId = globalThis.setTimeout(() => {
      dispatch({type: "upload-removed-after-completion", id: uploadId});
      removalTimersRef.current.delete(timerId);
    }, COMPLETED_UPLOAD_REMOVAL_DELAY_MS);

    removalTimersRef.current.add(timerId);
  }, []);

  const uploadAll = useCallback(async (): Promise<void> => {
    const uploadsToProcess = selectUploadableItems(state);

    if (uploadsToProcess.length === 0) {
      toast.info("No files to upload");
      return;
    }

    dispatch({type: "batch-started"});

    const dependencies: UploadRunnerDependencies = {
      generateUploadSasUrl,
      registerScan,
      uploadScan,
      fetchImpl: fetch,
      readFileAsBase64,
    };

    const uploadTasks = uploadsToProcess.map((upload) => async () => {
      const result = await uploadPendingScan(upload, dependencies, {onProgress: dispatchProgress});

      if (result.success) {
        revokePreviewUrl(upload.preview);
        dispatch({type: "upload-completed", id: upload.id, attempts: result.attempts, blobUrl: result.blobUrl});
        scheduleUploadRemoval(upload.id);
      } else {
        dispatch({type: "upload-failed", id: upload.id, attempts: result.attempts, error: result.error});
      }

      return result;
    });

    const results = await withConcurrencyLimit(uploadTasks, UPLOAD_CONCURRENCY_LIMIT);
    dispatch({type: "batch-finished"});

    const successCount = results.filter((result) => result?.success === true).length;
    const failCount = results.filter((result) => result?.success === false).length;

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} scan(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} scan(s)`);
    }
  }, [dispatchProgress, revokePreviewUrl, scheduleUploadRemoval, state]);

  const resetSessionStats = useCallback((): void => {
    dispatch({type: "session-stats-reset"});
  }, []);

  const clearCompletedBatch = useCallback((): void => {
    dispatch({type: "completed-batch-cleared"});
  }, []);

  const value = useMemo<ScanUploadContextType>(
    () => ({
      pendingUploads: state.pendingUploads,
      sessionStats: state.sessionStats,
      completedBatch: state.completedBatch,
      isUploading: state.isUploading,
      addFiles,
      removeFiles,
      clearAll,
      renameFile,
      uploadAll,
      resetSessionStats,
      clearCompletedBatch,
    }),
    [addFiles, clearAll, clearCompletedBatch, removeFiles, renameFile, resetSessionStats, state, uploadAll],
  );

  return <ScanUploadContext value={value}>{children}</ScanUploadContext>;
}

/**
 * Reads scan upload context.
 *
 * @returns Current scan upload context value.
 * @throws When used outside `ScanUploadProvider`.
 */
export function useScanUpload(): ScanUploadContextType {
  const context = use(ScanUploadContext);
  if (context === undefined) {
    throw new Error("useScanUpload must be used within a ScanUploadProvider");
  }

  return context;
}
