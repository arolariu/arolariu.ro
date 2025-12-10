"use client";

import {toast} from "@arolariu/components";
import {createContext, use, useCallback, useMemo, useState} from "react";
import {v4 as uuidv4} from "uuid";
import {createInvoiceAction} from "../_actions/createInvoiceAction";
import {isImageSubmission, PendingInvoiceStatus, PendingInvoiceSubmission} from "../_types/InvoiceSubmission";

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

/**
 * Revokes the object URL for a submission to free memory.
 * @param submission - The submission whose preview URL should be revoked.
 */
function revokePreview(submission: PendingInvoiceSubmission): void {
  if (submission.preview) {
    URL.revokeObjectURL(submission.preview);
  }
}

export function InvoiceCreatorProvider({children}: Readonly<{children: React.ReactNode}>) {
  const [submissions, setSubmissions] = useState<PendingInvoiceSubmission[]>([]);

  /**
   * Processes a FileList and creates PendingInvoiceSubmission objects for each valid file.
   * Supports image and PDF file types.
   */
  const addSubmissions = useCallback(async (files: FileList) => {
    const newSubmissions: PendingInvoiceSubmission[] = [];

    for (const file of files) {
      const id = uuidv4();
      const preview = URL.createObjectURL(file);

      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) {
        console.warn(`>>> Unsupported file type: ${file.type}`);
        continue;
      }

      const baseSubmission = {
        id,
        name: file.name,
        file,
        mimeType: file.type,
        size: file.size,
        preview,
        uploadedAt: new Date(),
        createdAt: new Date(),
        status: "idle" as PendingInvoiceStatus,
        attempts: 0,
        lastUpdatedAt: new Date().toISOString(),
      };

      if (isImage) {
        newSubmissions.push({
          ...baseSubmission,
          type: "image",
          adjustments: {
            rotation: 0,
            brightness: 100,
            contrast: 100,
            saturation: 100,
          },
        });
      } else {
        newSubmissions.push({
          ...baseSubmission,
          type: "pdf",
          adjustments: undefined,
        });
      }
    }

    setSubmissions((prev) => [...prev, ...newSubmissions]);
  }, []);

  /**
   * Removes submissions by IDs and revokes their preview URLs to free memory.
   */
  const removeSubmissions = useCallback((ids: string[]) => {
    setSubmissions((prev) => {
      const idsSet = new Set(ids);
      const submissionsToRemove = prev.filter((s) => idsSet.has(s.id));

      for (const submission of submissionsToRemove) {
        revokePreview(submission);
      }

      return prev.filter((s) => !idsSet.has(s.id));
    });
    toast.error(`${ids.length} submissions have been removed!`);
  }, []);

  /**
   * Clears all submissions and revokes their preview URLs.
   */
  const clearAllSubmissions = useCallback(() => {
    setSubmissions((prev) => {
      for (const submission of prev) {
        revokePreview(submission);
      }
      return [];
    });
    toast.info("All submissions have been cleared!");
  }, []);

  /**
   * Rotates an image submission by the specified degrees.
   */
  const rotateSubmissionPhoto = useCallback(async (id: string, degrees: number): Promise<void> => {
    setSubmissions((prev) =>
      prev.map((submission) => {
        if (submission.id === id && isImageSubmission(submission)) {
          const currentRotation = submission.adjustments.rotation;
          return {
            ...submission,
            adjustments: {
              ...submission.adjustments,
              rotation: (currentRotation + degrees) % 360,
            },
          };
        }
        return submission;
      }),
    );
  }, []);

  /**
   * Renames a submission by ID.
   */
  const renameSubmission = useCallback((id: string, newName: string) => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? {...s, name: newName} : s)));
  }, []);

  /**
   * Updates a single submission's status and optional extra properties.
   */
  const updateSubmissionStatus = useCallback((id: string, status: PendingInvoiceStatus, extra?: Partial<PendingInvoiceSubmission>) => {
    setSubmissions((prev) => prev.map((s) => (s.id === id ? ({...s, status, ...extra} as PendingInvoiceSubmission) : s)));
  }, []);

  /**
   * Removes a single submission by ID and revokes its preview URL.
   */
  const removeSubmissionById = useCallback((id: string) => {
    setSubmissions((prev) => {
      const toRemove = prev.find((s) => s.id === id);
      if (toRemove) revokePreview(toRemove);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  /**
   * Processes all pending submissions by calling the createInvoice server action.
   * Updates status throughout the lifecycle (creating → removed on success, failed on error).
   */
  const processSubmission = useCallback(async (): Promise<void> => {
    const submissionsToProcess = submissions.filter((s) => s.status === "idle" || s.status === "failed");

    if (submissionsToProcess.length === 0) {
      return;
    }

    // Mark all as creating
    for (const s of submissionsToProcess) {
      updateSubmissionStatus(s.id, "creating");
    }

    await Promise.all(
      submissionsToProcess.map(async (submission) => {
        try {
          const result = await createInvoiceAction(submission);

          if ("invoiceId" in result) {
            toast.success(`Invoice ${result.invoiceId} created successfully!`);
            removeSubmissionById(submission.id);
          } else {
            updateSubmissionStatus(submission.id, "failed", {error: result.message});
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          updateSubmissionStatus(submission.id, "failed", {error: errorMessage});
        }
      }),
    );
  }, [submissions, updateSubmissionStatus, removeSubmissionById]);

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
