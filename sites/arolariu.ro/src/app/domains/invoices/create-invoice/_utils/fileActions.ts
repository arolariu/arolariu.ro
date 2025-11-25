import {v4 as uuidv4} from "uuid";
import {createInvoiceAction} from "../_actions/createInvoiceAction";
import {isImageSubmission, PendingInvoiceStatus, PendingInvoiceSubmission} from "../_types/InvoiceSubmission";

/**
 * Converts a FileList to an array of PendingInvoiceSubmission objects.
 * @param files The FileList to process.
 * @returns A promise that resolves to an array of PendingInvoiceSubmission objects.
 */
export async function processFiles(files: FileList): Promise<PendingInvoiceSubmission[]> {
  const submissions: PendingInvoiceSubmission[] = [];

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
      submissions.push({
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
      submissions.push({
        ...baseSubmission,
        type: "pdf",
      });
    }
  }

  return submissions;
}

/**
 * Revokes the object URL for a submission to free memory.
 * @param submission The submission to revoke.
 */
export function revokePreview(submission: PendingInvoiceSubmission) {
  if (submission.preview) {
    URL.revokeObjectURL(submission.preview);
  }
}

/**
 * Rotates a submission photo by the specified degrees.
 * @param submissions The list of submissions.
 * @param id The ID of the submission to rotate.
 * @param degrees The degrees to rotate.
 * @returns The updated list of submissions.
 */
export function rotateSubmissionInList(submissions: PendingInvoiceSubmission[], id: string, degrees: number): PendingInvoiceSubmission[] {
  return submissions.map((submission) => {
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
  });
}

/**
 * Renames a submission.
 * @param submissions The list of submissions.
 * @param id The ID of the submission to rename.
 * @param newName The new name.
 * @returns The updated list of submissions.
 */
export function renameSubmissionInList(submissions: PendingInvoiceSubmission[], id: string, newName: string): PendingInvoiceSubmission[] {
  return submissions.map((submission) => (submission.id === id ? {...submission, name: newName} : submission));
}

/**
 * Removes a submission from the list and revokes its preview URL.
 * @param submissions The list of submissions.
 * @param id The ID of the submission to remove.
 * @returns The updated list of submissions.
 */
export function removeSubmissionFromList(submissions: PendingInvoiceSubmission[], id: string): PendingInvoiceSubmission[] {
  const submissionToRemove = submissions.find((s) => s.id === id);
  if (submissionToRemove) {
    revokePreview(submissionToRemove);
  }
  return submissions.filter((s) => s.id !== id);
}

/**
 * Removes multiple submissions from the list and revokes their preview URLs.
 * @param submissions The list of submissions.
 * @param ids The IDs of the submissions to remove.
 * @returns The updated list of submissions.
 */
export function removeSubmissionsFromList(submissions: PendingInvoiceSubmission[], ids: string[]): PendingInvoiceSubmission[] {
  const idsSet = new Set(ids);
  const submissionsToRemove = submissions.filter((s) => idsSet.has(s.id));

  for (const submission of submissionsToRemove) {
    revokePreview(submission);
  }

  return submissions.filter((s) => !idsSet.has(s.id));
}

/**
 * Clears all submissions and revokes their preview URLs.
 * @param submissions The list of submissions.
 * @returns An empty list of submissions.
 */
export function clearSubmissionsList(submissions: PendingInvoiceSubmission[]): PendingInvoiceSubmission[] {
  for (const submission of submissions) {
    revokePreview(submission);
  }
  return [];
}

/**
 * Updates the status of a submission.
 * @param submissions The list of submissions.
 * @param id The ID of the submission to update.
 * @param status The new status.
 * @param extra Extra properties to merge into the submission.
 * @returns The updated list of submissions.
 */
export function updateSubmissionStatusInList(
  submissions: PendingInvoiceSubmission[],
  id: string,
  status: PendingInvoiceStatus,
  extra?: Partial<PendingInvoiceSubmission>,
): PendingInvoiceSubmission[] {
  return submissions.map((s) => (s.id === id ? ({...s, status, ...extra} as PendingInvoiceSubmission) : s));
}

/**
 * Processes pending submissions by calling the createInvoice server action.
 * @param submissions The list of submissions.
 * @param onStatusUpdate Callback to update the status of a submission.
 */
export async function processPendingSubmissions(
  submissions: PendingInvoiceSubmission[],
  onStatusUpdate: (id: string, status: PendingInvoiceStatus, extra?: Partial<PendingInvoiceSubmission>) => void,
): Promise<void> {
  const submissionsToProcess = submissions.filter((s) => s.status === "idle" || s.status === "failed");

  if (submissionsToProcess.length === 0) {
    return;
  }

  // Mark as creating
  for (const s of submissionsToProcess) {
    onStatusUpdate(s.id, "creating");
  }

  await Promise.all(
    submissionsToProcess.map(async (submission) => {
      try {
        const result = await createInvoiceAction(submission);

        if ("invoiceId" in result) {
          onStatusUpdate(submission.id, "completed", {invoiceId: result.invoiceId});
        } else {
          onStatusUpdate(submission.id, "failed", {error: result.message});
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        onStatusUpdate(submission.id, "failed", {error: errorMessage});
      }
    }),
  );
}
