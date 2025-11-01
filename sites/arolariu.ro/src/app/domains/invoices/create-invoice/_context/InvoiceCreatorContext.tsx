"use client";

import {generateGuid} from "@/lib/utils.generic";
import {bulkCreateInvoicesAction} from "@/lib/actions/invoices/bulkCreateInvoices";
import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useMemo, useRef, useState} from "react";
import type {InvoiceScan, InvoiceScanType} from "../_types/InvoiceScan";
import {rotateImageImpl} from "../_utils/fileActions";

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

const classify = (file: File): InvoiceScanType => (file.type === "application/pdf" ? "pdf" : "image");
const InvoiceCreatorContext = createContext<InvoiceCreatorContextType | undefined>(undefined);

/**
 * This component provides the context for the invoice creator.
 * It manages the state of invoice scans and upload status.
 * @returns The InvoiceCreatorContext provider component.
 */
export function InvoiceCreatorProvider({children}: Readonly<{children: React.ReactNode}>) {
  const [scans, setScans] = useState<InvoiceScan[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingNext, setIsProcessingNext] = useState(false);
  const isProcessingRef = useRef(false);

  const addFiles = useCallback(
    (files: FileList) => {
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
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const acceptedTypes = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);
      
      Array.from(files).forEach((file) => {
        // Validate file type
        if (!acceptedTypes.has(file.type)) {
          toast.error(`Unsupported file type: ${file.name}. Only JPG, PNG, and PDF files are allowed.`);
          return;
        }

        // Validate file size
        if (file.size > maxFileSize) {
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
    },
    [],
  );

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

  const clearAll = useCallback(() => {
    console.log(">>> Cleaing all scans...");
    setScans((prev) => {
      prev.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
      return [];
    });
  }, []);

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
      setScans((prev) => prev.map((s) => {
        const toastId = toast.loading(`Processing ${s.name}...`, {
          description: "Uploading to server",
        });
        toastIds.set(s.id, toastId);
        return {...s, isProcessing: true};
      }));

      // Prepare scans data for bulk action
      const scansData = scans.map((scan) => ({
        file: scan.file,
        name: scan.name,
        type: scan.type,
        uploadedAt: scan.uploadedAt.toISOString(),
      }));

      // Submit all scans via bulk action (processes in batches of 10)
      const result = await bulkCreateInvoicesAction({
        scans: scansData,
        userIdentifier,
        userJwt,
      });

      // Process results and update toasts
      result.results.forEach((scanResult) => {
        const scan = scans.find((s) => s.name === scanResult.scanName);
        if (!scan) {
          return;
        }

        const toastId = toastIds.get(scan.id);
        
        if (scanResult.success) {
          // Update toast to success
          toast.success(`Successfully processed ${scanResult.scanName}`, {
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
          // Update toast to error
          toast.error(`Failed to process ${scanResult.scanName}`, {
            id: toastId,
            description: scanResult.error || "Unknown error",
          });
          
          // Mark scan as not processing
          setScans((prev) => prev.map((s) => (s.id === scan.id ? {...s, isProcessing: false} : s)));
        }
      });

      // Show summary toast
      if (result.totalProcessed > 0) {
        toast.success(`Processed ${result.totalProcessed} of ${scans.length} file(s)`, {
          description: result.totalFailed > 0 ? `${result.totalFailed} failed` : "All files processed successfully",
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
 * This hook provides the context value for the invoice creator.
 * @returns The context value for the invoice creator.
 */
export function useInvoiceCreator() {
  const context = use(InvoiceCreatorContext);
  if (context === undefined) {
    throw new Error("useInvoiceCreator must be used within an InvoiceCreatorProvider");
  }

  return context;
}
