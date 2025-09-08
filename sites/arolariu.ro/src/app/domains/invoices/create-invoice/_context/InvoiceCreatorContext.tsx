/** @format */

"use client";

import {generateGuid} from "@/lib/utils.generic";
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
      Array.from(files).forEach((file) => {
        if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
          toast.error(`Unsupported file type: ${file.name}`);
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
        setScans((prev) => [...prev, ...newScans]);
        setIsUploading(false);
        setUploadProgress(0);
        toast.success(`${newScans.length} file(s) uploaded successfully!`);
      }, 1200);
    },
    [scans.length],
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
    isProcessingRef.current = true;
    setIsProcessingNext(true);

    const copy = [...scans];
    for (const scan of copy) {
      setScans((prev) => prev.map((s) => (s.id === scan.id ? {...s, isProcessing: true} : s)));
      // todo: submit to backend;
      const didFail = Math.random() < 0.2;
      if (didFail) {
        toast.error(`Failed to process ${scan.name}. Please try again.`);
        setScans((prev) => prev.map((s) => (s.id === scan.id ? {...s, isProcessing: false} : s)));
      } else {
        toast.success(`Successfully processed ${scan.name}.`);
        setScans((prev) => {
          const updated = prev.filter((s) => s.id !== scan.id);
          URL.revokeObjectURL(scan.preview);
          return updated;
        });
      }
    }

    setIsProcessingNext(false);
    isProcessingRef.current = false;
    if (scans.length > 0 && scans.every((s) => !s.isProcessing)) {
      toast.info("All files have been processed (or skipped due to failure).");
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
