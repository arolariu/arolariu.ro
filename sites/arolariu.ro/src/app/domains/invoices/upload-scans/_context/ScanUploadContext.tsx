"use client";

/**
 * @fileoverview Context provider for managing scan upload state.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext
 *
 * @remarks
 * Simplified version of InvoiceCreatorContext that only handles uploading
 * scans to Azure Blob Storage. Does not create invoices.
 */

import {generateUploadSasUrl, registerScan, uploadScan} from "@/lib/actions/scans";
import {withConcurrencyLimit} from "@/lib/concurrency.client";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useMemo, useState} from "react";
import {v4 as uuidv4} from "uuid";

/**
 * Status of a pending upload
 */
type PendingUploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

/**
 * Represents a file pending upload
 */
interface PendingUpload {
  id: string;
  name: string;
  file: File;
  mimeType: string;
  size: number;
  preview: string;
  status: PendingUploadStatus;
  progress: number;
  attempts: number;
  error?: string;
  blobUrl?: string; // Azure blob URL after successful upload
}

/**
 * Session statistics for tracking upload progress
 */
interface SessionStats {
  /** Total files added this session */
  totalAdded: number;
  /** Successfully uploaded files this session */
  totalCompleted: number;
  /** Failed uploads this session */
  totalFailed: number;
}

interface ScanUploadContextType {
  /** Files pending upload */
  pendingUploads: PendingUpload[];
  /** Whether any uploads are in progress */
  isUploading: boolean;
  /** Session statistics that persist through the upload flow */
  sessionStats: SessionStats;
  /** Add files to the upload queue (async due to batching) */
  addFiles: (files: FileList) => Promise<void>;
  /** Remove files from the upload queue */
  removeFiles: (ids: string[]) => void;
  /** Clear all pending files */
  clearAll: () => void;
  /** Rename a pending file */
  renameFile: (id: string, newName: string) => void;
  /** Upload all pending files to Azure */
  uploadAll: () => Promise<void>;
  /** Reset session statistics */
  resetSessionStats: () => void;
}

const ScanUploadContext = createContext<ScanUploadContextType | undefined>(undefined);

/**
 * Revokes the object URL for a pending upload to free memory.
 */
function revokePreview(upload: PendingUpload): void {
  if (upload.preview) {
    URL.revokeObjectURL(upload.preview);
  }
}

/**
 * Removes an upload from the list by ID, revoking its preview first.
 */
function removeUploadFromList(uploads: PendingUpload[], uploadId: string): PendingUpload[] {
  const toRemove = uploads.find((u) => u.id === uploadId);
  if (toRemove) revokePreview(toRemove);
  return uploads.filter((u) => u.id !== uploadId);
}

/**
 * Converts a File to base64 string.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

const initialSessionStats: SessionStats = {
  totalAdded: 0,
  totalCompleted: 0,
  totalFailed: 0,
};

export function ScanUploadProvider({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>(initialSessionStats);
  const addScan = useScansStore((state) => state.addScan);

  /**
   * Add files to the upload queue.
   * Uses batching to prevent DOM overload when dropping 50+ files.
   */
  const addFiles = useCallback(async (files: FileList) => {
    const newUploads: PendingUpload[] = [];

    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) {
        toast.error(`Unsupported file type: ${file.type}`);
      } else if (file.size > 10 * 1024 * 1024) {
        // Check file size (max 10MB)
        toast.error(`File too large: ${file.name} (max 10MB)`);
      } else {
        const id = uuidv4();
        const preview = URL.createObjectURL(file);

        newUploads.push({
          id,
          name: file.name,
          file,
          mimeType: file.type,
          size: file.size,
          preview,
          status: "idle",
          progress: 0,
          attempts: 0,
        });
      }
    }

    if (newUploads.length > 0) {
      // Batch updates to prevent DOM overload with large file counts
      const BATCH_SIZE = 5;
      for (let i = 0; i < newUploads.length; i += BATCH_SIZE) {
        const batch = newUploads.slice(i, i + BATCH_SIZE);
        // Yield to browser to prevent UI blocking
        await new Promise((resolve) => setTimeout(resolve, 0));
        setPendingUploads((prev) => [...prev, ...batch]);
      }

      setSessionStats((prev) => ({
        ...prev,
        totalAdded: prev.totalAdded + newUploads.length,
      }));
      toast.success(`Added ${newUploads.length} file(s) to upload queue`);
    }
  }, []);

  /**
   * Remove files from the upload queue.
   */
  const removeFiles = useCallback((ids: string[]) => {
    setPendingUploads((prev) => {
      const idsSet = new Set(ids);
      const toRemove = prev.filter((u) => idsSet.has(u.id));

      for (const upload of toRemove) {
        revokePreview(upload);
      }

      return prev.filter((u) => !idsSet.has(u.id));
    });
  }, []);

  /**
   * Clear all pending files.
   */
  const clearAll = useCallback(() => {
    setPendingUploads((prev) => {
      for (const upload of prev) {
        revokePreview(upload);
      }
      return [];
    });
    toast.info("All files cleared");
  }, []);

  /**
   * Rename a pending file.
   */
  const renameFile = useCallback((id: string, newName: string) => {
    setPendingUploads((prev) => prev.map((u) => (u.id === id ? {...u, name: newName} : u)));
  }, []);

  /**
   * Update a single upload's status, progress, and optionally its blobUrl.
   */
  const updateUploadStatus = useCallback(
    (id: string, status: PendingUploadStatus, progress: number, error?: string, blobUrl?: string) => {
      setPendingUploads((prev) => prev.map((u) => (u.id === id ? {...u, status, progress, error, ...(blobUrl && {blobUrl})} : u)));
    },
    [],
  );

  /**
   * Remove a completed upload from the pending list after a delay.
   */
  const scheduleUploadRemoval = useCallback((uploadId: string, delayMs: number) => {
    setTimeout(() => {
      setPendingUploads((prev) => removeUploadFromList(prev, uploadId));
    }, delayMs);
  }, []);

  /**
   * Upload all pending files to Azure.
   * Uses parallel direct-to-Azure uploads with SAS tokens for better performance.
   * Falls back to server-side upload if SAS generation fails.
   */
  const uploadAll = useCallback(async (): Promise<void> => {
    const uploadsToProcess = pendingUploads.filter((u) => u.status === "idle" || u.status === "failed");

    if (uploadsToProcess.length === 0) {
      toast.info("No files to upload");
      return;
    }

    setIsUploading(true);

    // Mark all as uploading
    for (const upload of uploadsToProcess) {
      updateUploadStatus(upload.id, "uploading", 0);
    }

    let successCount = 0;
    let failCount = 0;

    // Create upload tasks with concurrency limit (max 5 parallel)
    // Attempts direct Azure upload via SAS URL first (fast, no server bottleneck).
    // Falls back to server-side upload if SAS fails (CORS not deployed yet, etc.)
    const uploadTasks = uploadsToProcess.map((upload) => async () => {
      try {
        // Step 1: Preparing SAS URL (0% → 30%)
        updateUploadStatus(upload.id, "uploading", 0);

        const sasResult = await generateUploadSasUrl({
          fileName: upload.name,
          mimeType: upload.mimeType,
        });

        updateUploadStatus(upload.id, "uploading", 30);

        if (sasResult.success && sasResult.sasUrl && sasResult.scanId && sasResult.blobUrl) {
          // Step 2: Upload file directly to Azure using SAS URL (30% → 70%)
          const uploadResponse = await fetch(sasResult.sasUrl, {
            method: "PUT",
            body: upload.file,
            headers: {
              "x-ms-blob-type": "BlockBlob",
              "Content-Type": upload.mimeType,
            },
          });

          updateUploadStatus(upload.id, "uploading", 70);

          if (uploadResponse.ok) {
            // Step 3: Register scan metadata with server (70% → 90%)
            const registerResult = await registerScan({
              scanId: sasResult.scanId,
              blobUrl: sasResult.blobUrl,
              fileName: upload.name,
              mimeType: upload.mimeType,
              sizeInBytes: upload.size,
            });

            updateUploadStatus(upload.id, "uploading", 90);

            if (registerResult.success && registerResult.scan) {
              const cachedScan: CachedScan = {
                ...registerResult.scan,
                cachedAt: new Date(),
              };
              addScan(cachedScan);
              // Step 4: Complete (100%)
              updateUploadStatus(upload.id, "completed", 100, undefined, registerResult.scan.blobUrl);
              successCount++;
              scheduleUploadRemoval(upload.id, 1000);
              return {success: true, uploadId: upload.id};
            }
          }
          // If direct upload or registration failed, fall through to server upload
        }

        // Fallback: Server-side upload (works without CORS)
        // Reset progress for fallback path
        updateUploadStatus(upload.id, "uploading", 50);

        const base64Data = await fileToBase64(upload.file);
        const result = await uploadScan({
          base64Data,
          fileName: upload.name,
          mimeType: upload.mimeType,
        });

        updateUploadStatus(upload.id, "uploading", 90);

        if (result.status === 201) {
          const cachedScan: CachedScan = {
            ...result.scan,
            cachedAt: new Date(),
          };
          addScan(cachedScan);
          updateUploadStatus(upload.id, "completed", 100, undefined, result.scan.blobUrl);
          successCount++;
          scheduleUploadRemoval(upload.id, 1000);
          return {success: true, uploadId: upload.id};
        } else {
          throw new Error(`Upload failed with status ${result.status}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        updateUploadStatus(upload.id, "failed", 0, errorMessage);
        failCount++;
        return {success: false, uploadId: upload.id, error: errorMessage};
      }
    });

    // Execute uploads with concurrency limit (5 parallel uploads)
    await withConcurrencyLimit(uploadTasks, 5);

    setIsUploading(false);

    // Update session stats
    setSessionStats((prev) => ({
      ...prev,
      totalCompleted: prev.totalCompleted + successCount,
      totalFailed: prev.totalFailed + failCount,
    }));

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} scan(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} scan(s)`);
    }
  }, [pendingUploads, updateUploadStatus, addScan, scheduleUploadRemoval]);

  /**
   * Reset session statistics.
   */
  const resetSessionStats = useCallback(() => {
    setSessionStats(initialSessionStats);
  }, []);

  const value = useMemo<ScanUploadContextType>(
    () => ({
      pendingUploads,
      sessionStats,
      isUploading,
      addFiles,
      removeFiles,
      clearAll,
      renameFile,
      uploadAll,
      resetSessionStats,
    }),
    [pendingUploads, sessionStats, isUploading, addFiles, removeFiles, clearAll, renameFile, uploadAll, resetSessionStats],
  );

  return <ScanUploadContext value={value}>{children}</ScanUploadContext>;
}

export function useScanUpload(): ScanUploadContextType {
  const context = use(ScanUploadContext);
  if (context === undefined) {
    throw new Error("useScanUpload must be used within a ScanUploadProvider");
  }
  return context;
}
