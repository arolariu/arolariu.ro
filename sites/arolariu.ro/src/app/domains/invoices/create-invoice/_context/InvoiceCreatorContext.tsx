"use client";

import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useMemo, useState} from "react";
import {PendingInvoiceSubmission} from "../_types/InvoiceSubmission";
import {
  clearSubmissionsList,
  processFiles,
  processPendingSubmissions,
  removeSubmissionsFromList,
  renameSubmissionInList,
  rotateSubmissionInList,
  updateSubmissionStatusInList,
} from "../_utils/fileActions";

interface InvoiceCreatorContextType {
  submissions: Array<PendingInvoiceSubmission>;
  addSubmissions: (files: FileList) => Promise<void>;
  removeSubmissions: (ids: string[]) => void;
  clearAllSubmissions: () => void;
  rotateSubmissionPhoto: (id: string, degrees: number) => Promise<void>;
  renameSubmission: (id: string, newName: string) => void;
  processSubmission: () => Promise<void>;
}

const InvoiceCreatorContext = createContext<InvoiceCreatorContextType | undefined>(undefined);

export function InvoiceCreatorProvider({children}: Readonly<{children: React.ReactNode}>) {
  const [submissions, setSubmissions] = useState<PendingInvoiceSubmission[]>([]);

  const addSubmissions = useCallback(async (files: FileList) => {
    const newSubmissions = await processFiles(files);
    setSubmissions((prev) => [...prev, ...newSubmissions]);
  }, []);

  const removeSubmissions = useCallback((ids: string[]) => {
    setSubmissions((prev) => removeSubmissionsFromList(prev, ids));
    toast.error(`${ids.length} submissions have been removed!`);
  }, []);

  const clearAllSubmissions = useCallback(() => {
    setSubmissions((prev) => clearSubmissionsList(prev));
    toast.info("All submissions have been cleared!");
  }, []);

  const rotateSubmissionPhoto = useCallback(async (id: string, degrees: number): Promise<void> => {
    setSubmissions((prev) => rotateSubmissionInList(prev, id, degrees));
  }, []);

  const renameSubmission = useCallback((id: string, newName: string) => {
    setSubmissions((prev) => renameSubmissionInList(prev, id, newName));
  }, []);

  const processSubmission = useCallback(async (): Promise<void> => {
    await processPendingSubmissions(submissions, (id, status, extra) => {
      setSubmissions((prev) => updateSubmissionStatusInList(prev, id, status, extra));
    });
  }, [submissions]);

  const value = useMemo<InvoiceCreatorContextType>(
    () => ({
      submissions,
      addSubmissions,
      removeSubmissions,
      clearAllSubmissions,
      rotateSubmissionPhoto,
      renameSubmission,
      processSubmission,
    }),
    [submissions, addSubmissions, removeSubmissions, clearAllSubmissions, rotateSubmissionPhoto, renameSubmission, processSubmission],
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
