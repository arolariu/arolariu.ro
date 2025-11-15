"use client";

import {createContext, use, useCallback, useMemo, useState} from "react";
import {PendingInvoiceSubmission} from "../_types/InvoiceSubmission";

interface InvoiceCreatorContextType {
  submissions: Array<PendingInvoiceSubmission>;
  addSubmission: (files: FileList) => void;
  removeSubmission: (id: string) => void;
  clearAllSubmissions: () => void;
  rotateSubmissionPhoto: (id: string, degrees: number) => Promise<void>;
  renameSubmission: (id: string, newName: string) => void;
  processSubmission: () => Promise<void>;
}

const InvoiceCreatorContext = createContext<InvoiceCreatorContextType | undefined>(undefined);

export function InvoiceCreatorProvider({children}: Readonly<{children: React.ReactNode}>) {
  const [submissions, setSubmissions] = useState<PendingInvoiceSubmission[]>([]);

  const addSubmission = useCallback((files: FileList) => {}, []);
  const removeSubmission = useCallback((id: string) => {}, []);
  const clearAllSubmissions = useCallback(() => {}, []);
  const rotateSubmissionPhoto = useCallback((id: string, degrees: number): Promise<void> => {}, []);
  const renameSubmission = useCallback(() => {}, []);
  const processSubmission = useCallback((): Promise<void> => {}, []);

  const value = useMemo<InvoiceCreatorContextType>(
    () => ({
      submissions,
      addSubmission,
      removeSubmission,
      clearAllSubmissions,
      rotateSubmissionPhoto,
      renameSubmission,
      processSubmission,
    }),
    [submissions, addSubmission, removeSubmission, clearAllSubmissions, rotateSubmissionPhoto, renameSubmission, processSubmission],
  );

  return <InvoiceCreatorContext value={value}>{children}</InvoiceCreatorContext>;
}

export function useInvoiceCreator() {
  const context = use(InvoiceCreatorContext);
  if (context === undefined) {
    throw new Error("useInvoiceCreator must be used within an InvoiceCreatorProvider");
  }

  return context;
}
