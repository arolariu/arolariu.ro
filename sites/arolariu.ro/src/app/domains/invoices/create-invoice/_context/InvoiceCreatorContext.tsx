"use client";

import {createInvoiceAction} from "@/lib/actions/invoices/createInvoice";
import {generateGuid} from "@/lib/utils.generic";
import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useMemo, useRef, useState} from "react";
import type {InvoiceScan, InvoiceScanType} from "../_types/InvoiceScan";
import {rotateImageImpl} from "../_utils/fileActions";

/**
 * Maximum file size allowed for uploads (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Set of accepted file MIME types for invoice scans
 */
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);

/**
 * Context type definition for the Invoice Creator.
 * @property {InvoiceScan[]} scans - Array of all invoice scans currently loaded
 * @property {boolean} isUploading - Flag indicating if files are currently being uploaded
 * @property {number} uploadProgress - Upload progress percentage (0-100)
 * @property {boolean} isProcessingNext - Flag indicating if scans are being processed for submission
 * @property {(files: FileList) => void} addFiles - Function to add new files to the scan list
 * @property {(id: string) => void} removeScan - Function to remove a specific scan by ID
 * @property {() => void} clearAll - Function to remove all scans
 * @property {(id: string, degrees: number) => Promise<void>} rotateScan - Function to rotate an image scan by degrees
 * @property {(id: string, newName: string) => void} renameScan - Function to rename a scan
 * @property {() => Promise<void>} processNextStep - Function to submit all scans to the backend API
 */
interface InvoiceCreatorContextType {
  scans: InvoiceScan[];
  isUploading: boolean;
  uploadProgress: number;
  isProcessingNext: boolean;

  addFiles: (files: FileList) => void;
  removeScan: (id: string) => void;
  clearAll: () => void;
  rotateScan: (id: string, degrees: number) => Promise<void>;
  renameScan: (id: string, newName: string) => void;
  processNextStep: () => Promise<void>;
}

/**
 * Classifies a file as either PDF or image based on its MIME type.
 * @param file The file to classify
 * @returns Either "pdf" or "image"
 */
const classify = (file: File): InvoiceScanType => (file.type === "application/pdf" ? "pdf" : "image");

/**
 * React Context for managing invoice scan creation state and operations.
 *
 * This context provides:
 * - Scan management (add, remove, clear, rename, rotate)
 * - Upload progress tracking
 * - Processing state management
 * - Backend API submission
 */
const InvoiceCreatorContext = createContext<InvoiceCreatorContextType | undefined>(undefined);

/**
 * Provides context for invoice creation workflow.
 *
 * Manages state and operations for creating invoices from scanned files.
 * Handles file validation, upload progress simulation, scan manipulation, and submission to the backend API.
 *
 * Features include JPG/PNG/PDF support up to 10MB, progress feedback, scan rotation/renaming/removal,
 * one-by-one submission with error handling, toast notifications, and automatic blob URL cleanup.
 * @param props Component props
 * @param props.children Child components to render within the provider
 * @returns The provider component wrapping children
 * @example
 * ```tsx
 * <InvoiceCreatorProvider>
 *   <UploadArea />
 *   <UploadPreview />
 * </InvoiceCreatorProvider>
 * ```
 */
export function InvoiceCreatorProvider({children}: Readonly<{children: React.ReactNode}>) {
  const [scans, setScans] = useState<InvoiceScan[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  const isProcessingRef = useRef(false);

  /**
   * Adds new files to the scan list with validation.
   *
   * Validates each file for:
   * - Supported types (JPG, PNG, PDF)
   * - Maximum size (10MB)
   *
   * Creates blob URLs for preview and simulates upload progress.
   * Shows toast notifications for validation errors and successful uploads.
   * @param {FileList} files List of files to add
   * @example
   * ```tsx
   * const { addFiles } = useInvoiceCreator();
   * <input type="file" onChange={(e) => e.target.files && addFiles(e.target.files)} />
   * ```
   */
  const addFiles = useCallback((files: FileList) => {
    if (!files || files.length === 0) {
      return;
    }

    console.log(">>> Adding files...");

    setIsUploading(true);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    const newScans: InvoiceScan[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!ACCEPTED_TYPES.has(file.type)) {
        toast.error(`Unsupported file type: ${file.name}. Only JPG, PNG, and PDF files are allowed.`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        return;
      }

      const id = generateGuid();
      const url = URL.createObjectURL(file);
      newScans.push({
        id,
        file,
        blob: file,
        name: file.name,
        type: classify(file),
        preview: url,
        uploadedAt: new Date(),
        createdAt: new Date(),
        rotation: 0,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        mimeType: file.type,
        size: file.size,
        url,
      });
    });

    setTimeout(() => {
      if (newScans.length > 0) {
        setScans((prev) => [...prev, ...newScans]);
        toast.success(`${newScans.length} file(s) uploaded successfully!`);
      }
      setIsUploading(false);
      setUploadProgress(0);
    }, 1200);
  }, []);

  /**
   * Removes a specific scan from the list by ID.
   *
   * Automatically revokes the blob URL to prevent memory leaks.
   * @param {string} id Unique identifier of the scan to remove
   * @example
   * ```tsx
   * const { removeScan } = useInvoiceCreator();
   * <button onClick={() => removeScan(scan.id)}>Delete</button>
   * ```
   */
  const removeScan = useCallback((id: string) => {
    console.log(">>> Removing scan with id:", id);
    setScans((prev) => {
      const scan = prev.find((s) => s.id === id);
      if (scan?.preview) {
        URL.revokeObjectURL(scan.preview);
      }
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  /**
   * Clears all scans from the list.
   *
   * Revokes all blob URLs to prevent memory leaks.
   * @example
   * ```tsx
   * const { clearAll } = useInvoiceCreator();
   * <button onClick={clearAll}>Clear All</button>
   * ```
   */
  const clearAll = useCallback(() => {
    console.log(">>> Clearing all scans...");
    setScans((prev) => {
      prev.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
      return [];
    });
  }, []);

  /**
   * Rotates an image scan by the specified degrees.
   *
   * Only works for image scans (JPG, PNG). PDF rotation is not supported.
   * Creates a new blob URL for the rotated image and revokes the old one.
   * @param {string} id Unique identifier of the scan to rotate
   * @param {number} degrees Rotation amount in degrees (typically 90, 180, or 270)
   * @returns {Promise<void>} Resolves when rotation completes
   * @example
   * ```tsx
   * const { rotateScan } = useInvoiceCreator();
   * <button onClick={() => rotateScan(scan.id, 90)}>Rotate 90°</button>
   * ```
   */
  const rotateScan = useCallback(
    async (id: string, degrees: number) => {
      console.log(">>> Rotating scan with id:", id);
      setScans((prev) => prev.map((s) => (s.id === id ? {...s, isProcessing: true} : s)));
      const scan = scans.find((s) => s.id === id);
      if (!scan) {
        setScans((prev) => prev.map((s) => (s.id === id ? {...s, isProcessing: false} : s)));
        return;
      }
      if (scan.type === "pdf") {
        toast.error("Rotation is supported only for images.");
        setScans((prev) => prev.map((s) => (s.id === id ? {...s, isProcessing: false} : s)));
        return;
      }
      try {
        const {file, blob, url} = await rotateImageImpl(scan, degrees);
        URL.revokeObjectURL(scan.preview);
        setScans((prev) => prev.map((s) => (s.id === id ? {...s, file, blob, preview: url, url, rotation: 0, isProcessing: false} : s)));
        toast.success(`${scan.name} rotated`);
      } catch (error) {
        console.error(error);
        setScans((prev) => prev.map((s) => (s.id === id ? {...s, isProcessing: false} : s)));
        toast.error(`Failed to rotate ${scan.name}`);
      }
    },
    [scans],
  );

  /**
   * Renames a scan while preserving its file extension.
   *
   * The extension is automatically retained from the original filename.
   * Creates a new File object with the updated name.
   * @param {string} id Unique identifier of the scan to rename
   * @param {string} newName New name for the scan (with or without extension)
   * @example
   * ```tsx
   * const { renameScan } = useInvoiceCreator();
   * <button onClick={() => renameScan(scan.id, "Invoice-2024-01")}>Rename</button>
   * ```
   */
  const renameScan = useCallback((id: string, newName: string) => {
    console.log(">>> Renaming scan with id:", id);
    setScans((prev) =>
      prev.map((s) => {
        if (s.id !== id) {
          return s;
        }

        const ext = s.name.split(".").pop();
        const base = newName.replace(/\.[^/.]+$/u, "");
        const finalName = ext ? `${base}.${ext}` : base;
        const newFile = new File([s.blob], finalName, {type: s.mimeType});
        toast.success(`${s.name} renamed to ${finalName}`);
        return {...s, name: finalName, file: newFile};
      }),
    );
  }, []);

  /**
   * Processes and submits all scans to the backend API.
   *
   * This function:
   * 1. Validates there are scans to process
   * 2. Prevents concurrent execution using a ref guard
   * 3. Fetches user credentials from the BFF (/api/user)
   * 4. Submits each scan one-by-one to the backend API
   * 5. Shows loading toasts that update to success/error for each scan
   * 6. Removes successfully processed scans from the list
   * 7. Displays a summary toast with total results
   *
   * Each scan is processed independently - one failure doesn't stop others.
   * Successfully processed scans are removed from the list.
   * Failed scans remain for retry.
   * @returns {Promise<void>} Resolves when all scans have been processed
   * @example
   * ```tsx
   * const { processNextStep } = useInvoiceCreator();
   * <button onClick={processNextStep}>Submit All</button>
   * ```
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity -- Complex sequential workflow with proper error handling and user feedback. Refactoring would reduce readability.
  const processNextStep = useCallback(async () => {
    if (isProcessingRef.current) {
      return;
    }

    if (scans.length === 0) {
      toast.info("No files to process.");
      return;
    }

    // Set processing flag before async work
    isProcessingRef.current = true;
    setIsProcessingNext(true);

    // Track results for summary
    let totalProcessed = 0;
    let totalFailed = 0;

    // Create toast IDs map for each scan to update toasts
    const toastIds = new Map<string, string | number>();

    try {
      // Fetch user information
      const userResponse = await fetch("/api/user");
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user information");
      }
      const {userIdentifier, userJwt} = await userResponse.json();

      // Mark all scans as processing and create loading toasts
      setScans((prev) =>
        prev.map((s) => {
          const toastId = toast.loading(`Processing ${s.name}...`, {
            description: "Uploading to server",
          });
          toastIds.set(s.id, toastId);
          return {...s, isProcessing: true};
        }),
      );

      // Process each scan one by one
      for (const scan of scans) {
        const toastId = toastIds.get(scan.id);

        try {
          // Prepare FormData for this scan
          const formData = new FormData();
          formData.append("file", scan.file);
          formData.append(
            "metadata",
            JSON.stringify({
              requiresAnalysis: "true",
              fileName: scan.name,
              fileType: scan.type,
              uploadedAt: scan.uploadedAt.toISOString(),
            }),
          );

          // Submit this scan to the backend
          const result = await createInvoiceAction({
            formData,
            userIdentifier,
            userJwt,
          });

          if (result.success) {
            totalProcessed++;

            // Update toast to success
            toast.success(`Successfully processed ${scan.name}`, {
              id: toastId,
              description: "Invoice created",
            });

            // Remove successfully processed scan
            setScans((prev) => {
              const updated = prev.filter((s) => s.id !== scan.id);
              if (scan.preview) {
                URL.revokeObjectURL(scan.preview);
              }
              return updated;
            });
          } else {
            totalFailed++;

            // Update toast to error
            toast.error(`Failed to process ${scan.name}`, {
              id: toastId,
              description: result.error || "Unknown error",
            });

            // Mark scan as not processing
            setScans((prev) => prev.map((s) => (s.id === scan.id ? {...s, isProcessing: false} : s)));
          }
        } catch (scanError) {
          totalFailed++;
          console.error(`Error processing scan ${scan.name}:`, scanError);

          // Update toast to error
          toast.error(`Failed to process ${scan.name}`, {
            id: toastId,
            description: scanError instanceof Error ? scanError.message : "Unknown error",
          });

          // Mark scan as not processing
          setScans((prev) => prev.map((s) => (s.id === scan.id ? {...s, isProcessing: false} : s)));
        }
      }

      // Show summary toast
      if (totalProcessed > 0) {
        toast.success(`Processed ${totalProcessed} of ${scans.length} file(s)`, {
          description: totalFailed > 0 ? `${totalFailed} failed` : "All files processed successfully",
        });
      } else {
        toast.error("Failed to process any files", {
          description: "Please check your connection and try again",
        });
      }
    } catch (error) {
      console.error("Error in processNextStep:", error);

      // Update all loading toasts to error
      toastIds.forEach((toastId) => {
        toast.error("Processing failed", {
          id: toastId,
          description: error instanceof Error ? error.message : "Unknown error",
        });
      });

      toast.error(error instanceof Error ? error.message : "Failed to process files");
      // Reset all scans to not processing state
      setScans((prev) => prev.map((s) => ({...s, isProcessing: false})));
    } finally {
      setIsProcessingNext(false);
      // eslint-disable-next-line require-atomic-updates -- False positive: ref assignment is intentionally synchronous
      isProcessingRef.current = false;
    }
  }, [scans]);

  const value = useMemo<InvoiceCreatorContextType>(
    () => ({
      scans,
      isUploading,
      uploadProgress,
      isProcessingNext,
      addFiles,
      removeScan,
      clearAll,
      rotateScan,
      renameScan,
      processNextStep,
    }),
    [scans, isUploading, uploadProgress, isProcessingNext, addFiles, removeScan, clearAll, rotateScan, renameScan, processNextStep],
  );

  return <InvoiceCreatorContext value={value}>{children}</InvoiceCreatorContext>;
}

/**
 * Custom hook to access the Invoice Creator Context.
 *
 * Must be used within an InvoiceCreatorProvider component.
 * Provides access to all scan management operations and state.
 * @returns Context value with scan state and operations
 * @throws {Error} If used outside of InvoiceCreatorProvider
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     scans,
 *     addFiles,
 *     removeScan,
 *     processNextStep,
 *     isProcessingNext
 *   } = useInvoiceCreator();
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={(e) => e.target.files && addFiles(e.target.files)} />
 *       <button onClick={processNextStep} disabled={isProcessingNext}>
 *         Submit {scans.length} scan(s)
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useInvoiceCreator() {
  const context = use(InvoiceCreatorContext);
  if (context === undefined) {
    throw new Error("useInvoiceCreator must be used within an InvoiceCreatorProvider");
  }

  return context;
}
