"use client";

/**
 * @fileoverview Slim provider for route-scoped scan upload state.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext
 *
 * @remarks
 * Owns the reducer, composes the lifecycle hooks, and exposes the action API.
 * Heavy batch orchestration lives in `_upload/uploadSession`; all user-facing
 * strings are localized via `next-intl-selector`.
 */

import {extractBase64FromBlob} from "@/lib/utils.client";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode} from "react";
import {v4 as uuidv4} from "uuid";
import {createScan, createScanUploadTarget} from "../../_actions/scans";
import {usePreviewUrlLifecycle} from "../_hooks/usePreviewUrlLifecycle";
import {useUploadProgressEvents} from "../_hooks/useUploadProgressEvents";
import {createPendingUpload} from "../_intake/pendingUploadFactory";
import {rotatePendingUploadFile} from "../_intake/rotatePendingUploadFile";
import {validateUploadFiles} from "../_intake/validation";
import {COMPLETED_UPLOAD_REMOVAL_DELAY_MS} from "../_model/constants";
import {uploadReducer} from "../_model/reducer";
import {selectRemovableUploads, selectUploadableItems} from "../_model/selectors";
import {initialUploadState} from "../_model/state";
import type {PendingUpload, SessionStats, UploadCompletionSummary, UploadRunnerDependencies} from "../_types";
import {runUploadSession} from "../_upload/uploadSession";

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
  const t = useTranslations();
  const [state, dispatch] = useReducer(uploadReducer, initialUploadState);
  const removalTimersRef = useRef<Set<TimeoutHandle>>(new Set());
  const {revokePreviewUrl, revokePreviews} = usePreviewUrlLifecycle(state.pendingUploads);
  const {dispatchProgress} = useUploadProgressEvents(dispatch);

  useEffect(() => {
    const timers = removalTimersRef.current;
    return () => {
      for (const timerId of timers) {
        globalThis.clearTimeout(timerId);
      }
    };
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[], source: UploadIntakeSource = "input"): Promise<void> => {
      const validation = validateUploadFiles(Array.from(files));

      for (const invalid of validation.invalidFiles) {
        switch (invalid.reason) {
          case "file-too-large":
            toast.error(t((m) => m.pages.invoices.uploadScans.errors.tooLarge, {name: invalid.file.name}));
            break;
          case "unsupported-type":
            toast.error(t((m) => m.pages.invoices.uploadScans.errors.unsupportedType, {type: invalid.file.type || "unknown"}));
            break;
          case "unsupported-extension":
            toast.error(t((m) => m.pages.invoices.uploadScans.errors.unsupportedExtension, {name: invalid.file.name}));
            break;
          default:
            break;
        }
      }

      const uploads = validation.validFiles.map((file) => createPendingUpload(file, uuidv4()));
      if (uploads.length === 0) {
        return;
      }

      dispatch({type: "scanUpload.queue.filesAccepted", occurredAt: Date.now(), source, uploads});
      toast.success(t((m) => m.pages.invoices.uploadScans.toast.filesAdded, {count: uploads.length}));
    },
    [t],
  );

  const removeFiles = useCallback(
    (ids: string[]): void => {
      const idsSet = new Set(ids);
      const removableUploads = state.pendingUploads.filter(
        (upload) => idsSet.has(upload.id) && (upload.status === "idle" || upload.status === "failed"),
      );
      revokePreviews(removableUploads);
      dispatch({type: "scanUpload.queue.itemRemoved", occurredAt: Date.now(), source: "input", ids});
    },
    [revokePreviews, state.pendingUploads],
  );

  const clearAll = useCallback((): void => {
    revokePreviews(selectRemovableUploads(state));
    dispatch({type: "scanUpload.queue.removableItemsCleared", occurredAt: Date.now(), source: "input"});
    toast.info(t((m) => m.pages.invoices.uploadScans.toast.allFilesCleared));
  }, [revokePreviews, state, t]);

  const renameFile = useCallback((id: string, newName: string): void => {
    dispatch({type: "scanUpload.queue.itemRenamed", occurredAt: Date.now(), source: "input", id, name: newName});
  }, []);

  const rotateFile = useCallback(
    async (id: string, direction: "cw" | "ccw"): Promise<void> => {
      const upload = state.pendingUploads.find((item) => item.id === id);
      if (!upload || upload.status === "uploading" || upload.status === "retrying" || upload.status === "completed") {
        return;
      }

      if (!upload.file) {
        toast.error(t((m) => m.pages.invoices.uploadScans.toast.rotateUnavailable));
        return;
      }

      try {
        const rotated = await rotatePendingUploadFile({file: upload.file, preview: upload.preview, direction});
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
      } catch {
        toast.error(t((m) => m.pages.invoices.uploadScans.toast.rotateFailed));
      }
    },
    [state.pendingUploads, t],
  );

  const scheduleUploadRemoval = useCallback((uploadId: string): void => {
    const timerId = globalThis.setTimeout(() => {
      dispatch({type: "scanUpload.preview.completedItemHidden", occurredAt: Date.now(), source: "timer", uploadId});
      removalTimersRef.current.delete(timerId);
    }, COMPLETED_UPLOAD_REMOVAL_DELAY_MS);

    removalTimersRef.current.add(timerId);
  }, []);

  const uploadAll = useCallback(async (): Promise<void> => {
    const uploadsToProcess = selectUploadableItems(state);
    if (uploadsToProcess.length === 0) {
      toast.info(t((m) => m.pages.invoices.uploadScans.toast.noFilesToUpload));
      return;
    }

    const dependencies: UploadRunnerDependencies = {
      createUploadTarget: createScanUploadTarget,
      uploadScan: createScan,
      readFileAsBase64: extractBase64FromBlob,
    };

    const outcome = await runUploadSession({
      uploads: uploadsToProcess,
      dependencies,
      emit: dispatch,
      onProgress: dispatchProgress,
      revokePreview: revokePreviewUrl,
      scheduleRemoval: scheduleUploadRemoval,
    });

    for (const code of outcome.toasts) {
      if (code.key === "uploadSucceeded") {
        toast.success(t((m) => m.pages.invoices.uploadScans.toast.uploadSucceeded, {count: code.count}));
      } else {
        toast.error(t((m) => m.pages.invoices.uploadScans.toast.uploadFailed, {count: code.count}));
      }
    }
  }, [dispatchProgress, revokePreviewUrl, scheduleUploadRemoval, state, t]);

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
