"use client";

/**
 * @fileoverview Context provider for managing scan upload state.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext
 *
 * @remarks
 * Supports direct-to-Blob uploads via SAS URLs with bounded concurrency,
 * retry policy, progress reporting, and a compatibility fallback path.
 */

import {prepareScanUpload, recordBulkUploadTelemetry, uploadScan} from "@/lib/actions/scans";
import {useScansStore} from "@/stores";
import type {BulkUploadTelemetryPayload, CachedScan, UploadFailureReasonCategory, UploadFailureReasonCounters} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {createContext, use, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {v4 as uuidv4} from "uuid";

/**
 * Status of a pending upload.
 */
type PendingUploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

/**
 * Represents a file pending upload.
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
}

/**
 * Session statistics for tracking upload progress.
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

const MAX_RETRY_ATTEMPTS = 3;
const MAX_CONCURRENT_UPLOADS = 3;
const BASE_RETRY_DELAY_MS = 750;

type CompatibilityFallbackMode = "on-direct-failure" | "always" | "never";

interface ScanUploadRolloutConfiguration {
  isDirectUploadEnabled: boolean;
  compatibilityFallbackMode: CompatibilityFallbackMode;
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
  const toRemove = uploads.find((upload) => upload.id === uploadId);
  if (toRemove) {
    revokePreview(toRemove);
  }

  return uploads.filter((upload) => upload.id !== uploadId);
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

/**
 * Waits for a given delay.
 */
async function waitFor(delayMs: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

/**
 * Calculates exponential backoff with jitter.
 */
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 250);
  return exponentialDelay + jitter;
}

/**
 * Parses string-like environment values into booleans.
 */
function parseBooleanFlag(value: string | undefined, fallbackValue: boolean): boolean {
  if (value === undefined) {
    return fallbackValue;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  return fallbackValue;
}

/**
 * Resolves the compatibility fallback mode from environment values.
 */
function parseCompatibilityFallbackMode(value: string | undefined): CompatibilityFallbackMode {
  if (value === "always" || value === "never" || value === "on-direct-failure") {
    return value;
  }

  return "on-direct-failure";
}

/**
 * Returns rollout controls for direct upload and compatibility fallback behavior.
 */
function getScanUploadRolloutConfiguration(): ScanUploadRolloutConfiguration {
  const directUploadRolloutValue = process.env["NEXT_PUBLIC_SCAN_UPLOAD_DIRECT_ENABLED"];
  const compatibilityFallbackModeValue = process.env["NEXT_PUBLIC_SCAN_UPLOAD_COMPATIBILITY_FALLBACK_MODE"];

  return {
    isDirectUploadEnabled: parseBooleanFlag(directUploadRolloutValue, true),
    compatibilityFallbackMode: parseCompatibilityFallbackMode(compatibilityFallbackModeValue),
  };
}

/**
 * Returns true when an upload error should be retried.
 */
function isRetryableUploadError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage = error.message.toLowerCase();

  if (normalizedMessage.includes("network error") || normalizedMessage.includes("timed out") || normalizedMessage.includes("connection")) {
    return true;
  }

  const statusMatch = /status\s(?<statusCode>\d{3})/u.exec(normalizedMessage);
  const statusCodeText = statusMatch?.groups?.["statusCode"];

  if (!statusCodeText) {
    return false;
  }

  const statusCode = Number(statusCodeText);
  return [408, 409, 429, 500, 502, 503, 504].includes(statusCode);
}

/**
 * Creates zeroed counters for upload failure reason categories.
 */
function createFailureReasonCounters(): UploadFailureReasonCounters {
  return {
    network: 0,
    timeout: 0,
    throttled: 0,
    server_error: 0,
    client_error: 0,
    auth: 0,
    compatibility: 0,
    unknown: 0,
  };
}

/**
 * Extracts an HTTP status code from upload error text when present.
 */
function extractStatusCode(errorMessage: string): number | null {
  const normalizedMessage = errorMessage.toLowerCase();
  const statusMatch = /status\s(?<statusCode>\d{3})/u.exec(normalizedMessage);
  const statusCodeText = statusMatch?.groups?.["statusCode"];

  if (!statusCodeText) {
    return null;
  }

  return Number(statusCodeText);
}

/**
 * Categorizes an upload failure message into an observability-friendly bucket.
 */
function categorizeUploadFailureReason(errorMessage: string): UploadFailureReasonCategory {
  const normalizedMessage = errorMessage.toLowerCase();

  if (normalizedMessage.includes("compatibility")) {
    return "compatibility";
  }

  if (
    normalizedMessage.includes("network error")
    || normalizedMessage.includes("connection")
    || normalizedMessage.includes("failed to fetch")
  ) {
    return "network";
  }

  if (normalizedMessage.includes("timed out") || normalizedMessage.includes("timeout")) {
    return "timeout";
  }

  const statusCode = extractStatusCode(normalizedMessage);
  if (statusCode === null) {
    return "unknown";
  }

  if (statusCode === 401 || statusCode === 403) {
    return "auth";
  }

  if (statusCode === 408) {
    return "timeout";
  }

  if (statusCode === 429) {
    return "throttled";
  }

  if (statusCode >= 500) {
    return "server_error";
  }

  if (statusCode >= 400) {
    return "client_error";
  }

  return "unknown";
}

/**
 * Uploads a file directly to Azure Blob Storage using a SAS URL.
 */
async function uploadFileToBlobWithSas(
  params: Readonly<{
    uploadUrl: string;
    file: File;
    mimeType: string;
    metadata: Record<string, string>;
    onProgress: (progress: number) => void;
  }>,
): Promise<void> {
  const {uploadUrl, file, mimeType, metadata, onProgress} = params;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("PUT", uploadUrl, true);
    request.setRequestHeader("x-ms-blob-type", "BlockBlob");
    request.setRequestHeader("Content-Type", mimeType);

    for (const [key, value] of Object.entries(metadata)) {
      request.setRequestHeader(`x-ms-meta-${key}`, value);
    }

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || event.total === 0) {
        return;
      }

      const progress = Math.round((event.loaded / event.total) * 100);
      onProgress(progress);
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`Direct upload failed with status ${request.status}`));
    });

    request.addEventListener("error", () => {
      reject(new Error("Network error during direct upload"));
    });

    request.addEventListener("abort", () => {
      reject(new Error("Direct upload was aborted"));
    });

    request.send(file);
  });
}

const initialSessionStats: SessionStats = {
  totalAdded: 0,
  totalCompleted: 0,
  totalFailed: 0,
};

export function ScanUploadProvider({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.upload-scans");
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>(initialSessionStats);

  const addScan = useScansStore((state) => state.addScan);
  const removalTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  /**
   * Cleanup pending delayed removals on unmount.
   */
  useEffect(() => {
    return () => {
      for (const timeoutIdentifier of removalTimeouts.current) {
        clearTimeout(timeoutIdentifier);
      }
      removalTimeouts.current.clear();
    };
  }, []);

  /**
   * Update a pending upload by ID.
   */
  const updateUpload = useCallback((id: string, patch: Partial<PendingUpload>) => {
    setPendingUploads((previousUploads) => previousUploads.map((upload) => (upload.id === id ? {...upload, ...patch} : upload)));
  }, []);

  /**
   * Add files to the upload queue.
   */
  const addFiles = useCallback(
    (files: FileList) => {
      const newUploads: PendingUpload[] = [];

      for (const file of files) {
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";

        if (!isImage && !isPdf) {
          toast.error(t("errors.unsupportedType", {type: file.type}));
        } else if (file.size > 10 * 1024 * 1024) {
          toast.error(t("errors.tooLarge", {name: file.name}));
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
        setPendingUploads((previousUploads) => [...previousUploads, ...newUploads]);
        setSessionStats((previousStats) => ({
          ...previousStats,
          totalAdded: previousStats.totalAdded + newUploads.length,
        }));
        toast.success(t("toasts.addedToQueue", {count: String(newUploads.length)}));
      }
    },
    [t],
  );

  /**
   * Remove files from the upload queue.
   */
  const removeFiles = useCallback((ids: string[]) => {
    setPendingUploads((previousUploads) => {
      const identifiers = new Set(ids);
      const toRemove = previousUploads.filter((upload) => identifiers.has(upload.id));

      for (const upload of toRemove) {
        revokePreview(upload);
      }

      return previousUploads.filter((upload) => !identifiers.has(upload.id));
    });
  }, []);

  /**
   * Clear all pending files.
   */
  const clearAll = useCallback(() => {
    setPendingUploads((previousUploads) => {
      for (const upload of previousUploads) {
        revokePreview(upload);
      }

      return [];
    });

    toast.info(t("toasts.allCleared"));
  }, [t]);

  /**
   * Rename a pending file.
   */
  const renameFile = useCallback(
    (id: string, newName: string) => {
      updateUpload(id, {name: newName});
    },
    [updateUpload],
  );

  /**
   * Remove a completed upload from the pending list after a delay.
   */
  const scheduleUploadRemoval = useCallback((uploadId: string, delayMs: number) => {
    const timeoutIdentifier = setTimeout(() => {
      setPendingUploads((previousUploads) => removeUploadFromList(previousUploads, uploadId));
      removalTimeouts.current.delete(timeoutIdentifier);
    }, delayMs);

    removalTimeouts.current.add(timeoutIdentifier);
  }, []);

  /**
   * Upload all pending files to Azure.
   * Authentication is handled by server actions.
   */
  const uploadAll = useCallback(async (): Promise<void> => {
    const uploadsToProcess = pendingUploads.filter((upload) => upload.status === "idle" || upload.status === "failed");

    if (uploadsToProcess.length === 0) {
      toast.info(t("toasts.noFiles"));
      return;
    }

    setIsUploading(true);

    interface UploadOneResult {
      isSuccessful: boolean;
      failureReason: UploadFailureReasonCategory | null;
    }

    const uploadStartedAt = performance.now();
    let totalRetryCount = 0;
    const failureReasonCounters = createFailureReasonCounters();
    const rolloutConfiguration = getScanUploadRolloutConfiguration();

    const uploadOne = async (upload: PendingUpload): Promise<UploadOneResult> => {
      let lastErrorMessage = t("toasts.genericUploadFailed");
      const shouldAttemptDirectUpload =
        rolloutConfiguration.isDirectUploadEnabled && rolloutConfiguration.compatibilityFallbackMode !== "always";

      if (shouldAttemptDirectUpload) {
        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
          const isRetry = attempt > 1;

          updateUpload(upload.id, {
            status: isRetry ? "retrying" : "uploading",
            attempts: attempt,
            progress: 0,
            error: undefined,
          });

          try {
            const preparedUpload = await prepareScanUpload({
              fileName: upload.name,
              mimeType: upload.mimeType,
              sizeInBytes: upload.size,
            });

            updateUpload(upload.id, {status: "uploading", progress: 5, error: undefined});

            await uploadFileToBlobWithSas({
              uploadUrl: preparedUpload.uploadUrl,
              file: upload.file,
              mimeType: upload.mimeType,
              metadata: preparedUpload.metadata,
              onProgress: (progress) => {
                updateUpload(upload.id, {
                  progress: Math.max(5, Math.min(progress, 99)),
                });
              },
            });

            const cachedScan: CachedScan = {
              ...preparedUpload.scan,
              cachedAt: new Date(),
            };

            addScan(cachedScan);
            updateUpload(upload.id, {
              status: "completed",
              progress: 100,
              error: undefined,
            });

            scheduleUploadRemoval(upload.id, 1000);
            return {
              isSuccessful: true,
              failureReason: null,
            };
          } catch (error) {
            lastErrorMessage = error instanceof Error ? error.message : t("toasts.unknownDirectUploadError");

            const hasAttemptsLeft = attempt < MAX_RETRY_ATTEMPTS;
            if (hasAttemptsLeft && isRetryableUploadError(error)) {
              totalRetryCount += 1;
              updateUpload(upload.id, {
                status: "retrying",
                error: t("toasts.retryingWithAttempt", {
                  error: lastErrorMessage,
                  attempt: String(attempt),
                  maxAttempts: String(MAX_RETRY_ATTEMPTS),
                }),
              });

              await waitFor(calculateRetryDelay(attempt));
              continue;
            }

            break;
          }
        }
      }

      const shouldUseCompatibilityFallback = rolloutConfiguration.compatibilityFallbackMode !== "never";
      if (!shouldUseCompatibilityFallback) {
        updateUpload(upload.id, {
          status: "failed",
          progress: 0,
          error: lastErrorMessage,
        });

        return {
          isSuccessful: false,
          failureReason: categorizeUploadFailureReason(lastErrorMessage),
        };
      }

      // Compatibility fallback for environments where direct upload cannot complete.
      try {
        updateUpload(upload.id, {
          status: "uploading",
          progress: 10,
          error: t("toasts.compatibilityFallback"),
        });

        const base64Data = await fileToBase64(upload.file);
        const legacyResult = await uploadScan({
          base64Data,
          fileName: upload.name,
          mimeType: upload.mimeType,
        });

        if (legacyResult.status === 201) {
          const cachedScan: CachedScan = {
            ...legacyResult.scan,
            cachedAt: new Date(),
          };

          addScan(cachedScan);
          updateUpload(upload.id, {
            status: "completed",
            progress: 100,
            error: undefined,
          });

          scheduleUploadRemoval(upload.id, 1000);
          return {
            isSuccessful: true,
            failureReason: null,
          };
        }

        lastErrorMessage = t("toasts.compatibilityFailedStatus", {status: String(legacyResult.status)});
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : t("toasts.unknownCompatibilityUploadError");
      }

      updateUpload(upload.id, {
        status: "failed",
        progress: 0,
        error: lastErrorMessage,
      });

      return {
        isSuccessful: false,
        failureReason: categorizeUploadFailureReason(lastErrorMessage),
      };
    };

    let successCount = 0;
    let failCount = 0;
    let currentIndex = 0;

    const workerCount = Math.min(MAX_CONCURRENT_UPLOADS, uploadsToProcess.length);

    await Promise.all(
      Array.from({length: workerCount}, async () => {
        while (true) {
          const itemIndex = currentIndex;
          currentIndex += 1;

          if (itemIndex >= uploadsToProcess.length) {
            break;
          }

          const upload = uploadsToProcess[itemIndex];
          if (!upload) {
            break;
          }

          const uploadResult = await uploadOne(upload);
          if (uploadResult.isSuccessful) {
            successCount += 1;
          } else {
            failCount += 1;
            if (uploadResult.failureReason) {
              failureReasonCounters[uploadResult.failureReason] += 1;
            }
          }
        }
      }),
    );

    const durationMs = Math.max(0, Math.round(performance.now() - uploadStartedAt));

    setIsUploading(false);

    setSessionStats((previousStats) => ({
      ...previousStats,
      totalCompleted: previousStats.totalCompleted + successCount,
      totalFailed: previousStats.totalFailed + failCount,
    }));

    if (successCount > 0) {
      toast.success(t("toasts.uploadSuccess", {count: String(successCount)}));
    }

    if (failCount > 0) {
      toast.error(t("toasts.uploadFailed", {count: String(failCount)}));
    }

    const telemetryPayload: BulkUploadTelemetryPayload = {
      batchSize: uploadsToProcess.length,
      totalBytes: uploadsToProcess.reduce((totalSize, upload) => totalSize + upload.size, 0),
      concurrency: workerCount,
      retryCount: totalRetryCount,
      durationMs,
      successCount,
      failureCount: failCount,
      failureReasons: failureReasonCounters,
    };

    try {
      await recordBulkUploadTelemetry(telemetryPayload);
    } catch (error) {
      console.warn("Failed to record bulk upload telemetry", error);
    }
  }, [pendingUploads, updateUpload, addScan, scheduleUploadRemoval, t]);

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
