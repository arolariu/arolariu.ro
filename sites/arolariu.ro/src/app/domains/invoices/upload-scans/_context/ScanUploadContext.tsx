"use client";

/**
 * @fileoverview Context provider for managing scan upload state.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext
 *
 * @remarks
 * Simplified version of InvoiceCreatorContext that only handles uploading
 * scans to Azure Blob Storage. Does not create invoices.
 */

import {uploadScan} from "@/lib/actions/scans";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useMemo, useState} from "react";
import {v4 as uuidv4} from "uuid";

/**
 * Status of a pending upload
 */
type PendingUploadStatus = "idle" | "uploading" | "completed" | "failed";

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
  error?: string;
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
  /** Add files to the upload queue */
  addFiles: (files: FileList) => void;
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
 * Converts a File to base64 string.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
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
   */
  const addFiles = useCallback((files: FileList) => {
    const newUploads: PendingUpload[] = [];

    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) {
        toast.error(`Unsupported file type: ${file.type}`);
        continue;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        continue;
      }

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
      });
    }

    if (newUploads.length > 0) {
      setPendingUploads((prev) => [...prev, ...newUploads]);
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
   * Update a single upload's status.
   */
  const updateUploadStatus = useCallback((id: string, status: PendingUploadStatus, error?: string) => {
    setPendingUploads((prev) => prev.map((u) => (u.id === id ? {...u, status, error} : u)));
  }, []);

  /**
   * Upload all pending files to Azure.
   * Authentication is handled by the server action.
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
      updateUploadStatus(upload.id, "uploading");
    }

    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      uploadsToProcess.map(async (upload) => {
        try {
          // Convert file to base64
          const base64Data = await fileToBase64(upload.file);

          // Upload to Azure (server action handles authentication)
          const result = await uploadScan({
            base64Data,
            fileName: upload.name,
            mimeType: upload.mimeType,
          });

          if (result.status === 201) {
            // Add to scans store with cache timestamp
            const cachedScan: CachedScan = {
              ...result.scan,
              cachedAt: new Date(),
            };
            addScan(cachedScan);

            // Mark as completed and remove from pending
            updateUploadStatus(upload.id, "completed");
            successCount++;

            // Remove from pending after short delay (for visual feedback)
            setTimeout(() => {
              setPendingUploads((prev) => {
                const toRemove = prev.find((u) => u.id === upload.id);
                if (toRemove) revokePreview(toRemove);
                return prev.filter((u) => u.id !== upload.id);
              });
            }, 1000);
          } else {
            updateUploadStatus(upload.id, "failed", `Upload failed with status ${result.status}`);
            failCount++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          updateUploadStatus(upload.id, "failed", errorMessage);
          failCount++;
        }
      }),
    );

    setIsUploading(false);

    // Update session stats with completed and failed counts
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
  }, [pendingUploads, updateUploadStatus, addScan]);

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
