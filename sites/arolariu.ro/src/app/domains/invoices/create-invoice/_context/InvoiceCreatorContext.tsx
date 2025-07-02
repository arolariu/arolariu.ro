/** @format */

"use client";

import type {UploadStatus} from "@/types";
import {createContext, Dispatch, SetStateAction, useContext, useMemo, useState} from "react";
import type {InvoiceScan} from "../_types/InvoiceScan";

interface InvoiceCreatorContextType {
  scans: InvoiceScan[];
  setScans: Dispatch<SetStateAction<InvoiceScan[]>>;
  uploadStatus: UploadStatus;
  setUploadStatus: Dispatch<SetStateAction<UploadStatus>>;
}

const InvoiceCreatorContext = createContext<InvoiceCreatorContextType | undefined>(undefined);

export function InvoiceCreatorProvider({children}: Readonly<{children: React.ReactNode}>) {
  const [scans, setScans] = useState<InvoiceScan[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("UNKNOWN");

  const value = useMemo(
    () => ({
      scans,
      setScans,
      uploadStatus,
      setUploadStatus,
    }),
    [scans, uploadStatus],
  );

  return <InvoiceCreatorContext.Provider value={value}>{children}</InvoiceCreatorContext.Provider>;
}

/**
 * This hook provides the context value for the invoice creator.
 * @returns The context value for the invoice creator.
 */
export function useInvoiceCreator() {
  const context = useContext(InvoiceCreatorContext);
  if (context === undefined) {
    throw new Error("useInvoiceCreator must be used within an InvoiceCreatorProvider");
  }

  return context;
}
