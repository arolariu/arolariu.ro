"use client";

/**
 * @fileoverview Context provider for managing route-scoped scan upload state.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext
 *
 * @remarks
 * Keeps transient browser upload state in memory while delegating event
 * transitions, file intake, upload execution, and browser side effects to
 * focused route-local modules.
 */

import {toast} from "@arolariu/components";
import {extractBase64FromBlob} from "@/lib/utils.client";
import {createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode} from "react";
import {v4 as uuidv4} from "uuid";
import {createScan, createScanUploadTarget} from "../../_actions/scans";
import {createPendingUpload} from "../_intake/pendingUploadFactory";
import {rotatePendingUploadFile} from "../_intake/rotatePendingUploadFile";
import {validateUploadFiles} from "../_intake/validation";
import {usePreviewUrlLifecycle} from "../_hooks/usePreviewUrlLifecycle";
import {useUploadProgressEvents} from "../_hooks/useUploadProgressEvents";
import {uploadReducer} from "../_model/reducer";
import {selectRemovableUploads, selectUploadableItems} from "../_model/selectors";
import {initialUploadState} from "../_model/state";
import {uploadPendingScanMultiple} from "../_upload/multipleUploadRunner";
import {COMPLETED_UPLOAD_REMOVAL_DELAY_MS} from "../_model/constants";
import type {CreateUploadTargetResult, PendingUpload, SessionStats, UploadCompletionSummary, UploadRunnerDependencies} from "../_types";

type TimeoutHandle = ReturnType<typeof globalThis.setTimeout>;
type UploadIntakeSource = "input" | "drop" | "paste";

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
  readonly addFiles: (files: FileList | File[], source?: UploadIntakeSource) => Promise<void>;
  /** Remove idle or failed files from the upload queue. */
  readonly removeFiles: (ids: string[]) => void;
  /** Clear all idle or failed files. Active uploads remain locked. */
  readonly clearAll: () => void;
  /** Rename an idle or failed file. */
  readonly renameFile: (id: string, newName: string) => void;
  /** Rotate an idle or failed pending image upload before upload. */
  readonly rotateFile: (id: string, direction: "cw" | "ccw") => Promise<void>;
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
  const {revokePreviewUrl, revokePreviews} = usePreviewUrlLifecycle(state.pendingUploads);
  const {dispatchProgress} = useUploadProgressEvents(dispatch);

  useEffect(() => {
    return () => {
      for (const timerId of removalTimersRef.current) {
        globalThis.clearTimeout(timerId);
      }
    };
  }, []);

  const addFiles = useCallback(async (files: FileList | File[], source: UploadIntakeSource = "input"): Promise<void> => {
    const validation = validateUploadFiles(Array.from(files));

    for (const invalidFile of validation.invalidFiles) {
      toast.error(invalidFile.message);
    }

    const uploads = validation.validFiles.map((file) => createPendingUpload(file, uuidv4()));

    if (uploads.length === 0) {
      return;
    }

    dispatch({
      type: "scanUpload.queue.filesAccepted",
      occurredAt: Date.now(),
      source,
      uploads,
    });
    toast.success(`Added ${uploads.length} file(s) to upload queue`);
  }, []);

  const removeFiles = useCallback(
    (ids: string[]): void => {
      const idsSet = new Set(ids);
      const removableUploads = state.pendingUploads.filter(
        (upload) => idsSet.has(upload.id) && (upload.status === "idle" || upload.status === "failed"),
      );
      revokePreviews(removableUploads);
      dispatch({
        type: "scanUpload.queue.itemRemoved",
        occurredAt: Date.now(),
        source: "input",
        ids,
      });
    },
    [revokePreviews, state.pendingUploads],
  );

  const clearAll = useCallback((): void => {
    revokePreviews(selectRemovableUploads(state));
    dispatch({
      type: "scanUpload.queue.removableItemsCleared",
      occurredAt: Date.now(),
      source: "input",
    });
    toast.info("All files cleared");
  }, [revokePreviews, state]);

  const renameFile = useCallback((id: string, newName: string): void => {
    dispatch({
      type: "scanUpload.queue.itemRenamed",
      occurredAt: Date.now(),
      source: "input",
      id,
      name: newName,
    });
  }, []);

  const rotateFile = useCallback(
    async (id: string, direction: "cw" | "ccw"): Promise<void> => {
      const upload = state.pendingUploads.find((item) => item.id === id);
      if (!upload || upload.status === "uploading" || upload.status === "retrying" || upload.status === "completed") {
        return;
      }

      if (!upload.file) {
        toast.error("Cannot rotate this upload because the original file is unavailable");
        return;
      }

      try {
        const rotated = await rotatePendingUploadFile({
          file: upload.file,
          preview: upload.preview,
          direction,
        });
        dispatch({
          type: "scanUpload.queue.itemRotated",
          occurredAt: Date.now(),
          source: "input",
          id,
          file: rotated.file,
          preview: rotated.preview,
          mimeType: rotated.mimeType,
          size: rotated.size,
        });
      } catch (error: unknown) {
        console.error(">>> Error rotating pending upload:", error);
        toast.error(error instanceof Error ? error.message : "Failed to rotate upload");
      }
    },
    [state.pendingUploads],
  );

  const scheduleUploadRemoval = useCallback((uploadId: string): void => {
    const timerId = globalThis.setTimeout(() => {
      dispatch({
        type: "scanUpload.preview.completedItemHidden",
        occurredAt: Date.now(),
        source: "timer",
        uploadId,
      });
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

    dispatch({type: "scanUpload.batch.requested", occurredAt: Date.now(), source: "batch"});
    dispatch({type: "scanUpload.batch.started", occurredAt: Date.now(), source: "batch"});

    /**
     * Adapts the server action to the runner's expected interface.
     *
     * @param input - Upload target request parameters.
     * @returns Upload target result with metadata.
     */
    const createUploadTarget = async (input: Readonly<{
      fileName: string;
      mimeType: string;
      sizeInBytes: number;
    }>): Promise<CreateUploadTargetResult> => {
      return createScanUploadTarget({
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeInBytes: input.sizeInBytes,
      });
    };

    const dependencies: UploadRunnerDependencies = {
      createUploadTarget,
      uploadScan: createScan,
      readFileAsBase64: extractBase64FromBlob,
    };

    const batchResult = await uploadPendingScanMultiple({
      uploads: uploadsToProcess,
      dependencies,
      callbacks: {onProgress: dispatchProgress},
    });

    for (const result of batchResult.results) {
      const upload = uploadsToProcess.find((item) => item.id === result.uploadId);
      if (result.success) {
        if (upload) {
          revokePreviewUrl(upload.preview);
          dispatch({
            type: "scanUpload.item.uploadSucceeded",
            occurredAt: Date.now(),
            source: "runner",
            uploadId: result.uploadId,
            attempt: result.attempts,
            blobUrl: result.blobUrl,
            completion: {
              id: upload.id,
              name: upload.name,
              preview: result.blobUrl,
            },
          });
          scheduleUploadRemoval(upload.id);
        }
      } else {
        dispatch({
          type: "scanUpload.item.uploadFailed",
          occurredAt: Date.now(),
          source: "runner",
          uploadId: result.uploadId,
          attempt: result.attempts,
          reason: result.reason,
          error: result.error,
        });
      }
    }

    dispatch({type: "scanUpload.batch.finished", occurredAt: Date.now(), source: "batch"});

    if (batchResult.successCount > 0) {
      toast.success(`Successfully uploaded ${batchResult.successCount} scan(s)`);
    }
    if (batchResult.failureCount > 0) {
      toast.error(`Failed to upload ${batchResult.failureCount} scan(s)`);
    }
  }, [dispatchProgress, revokePreviewUrl, scheduleUploadRemoval, state]);

  const resetSessionStats = useCallback((): void => {
    dispatch({type: "scanUpload.session.statsReset", occurredAt: Date.now(), source: "input"});
  }, []);

  const clearCompletedBatch = useCallback((): void => {
    dispatch({type: "scanUpload.prompt.completedBatchCleared", occurredAt: Date.now(), source: "input"});
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
      rotateFile,
      uploadAll,
      resetSessionStats,
      clearCompletedBatch,
    }),
    [addFiles, clearAll, clearCompletedBatch, removeFiles, renameFile, rotateFile, resetSessionStats, state, uploadAll],
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
