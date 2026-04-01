"use server";

/**
 * @fileoverview Server action for marking scans as used by invoices.
 * @module lib/actions/scans/markScansAsUsed
 *
 * @remarks
 * This is a lightweight metadata-only update that sets `usedByInvoice` flag
 * on scan blobs without re-uploading the blob data. This prevents scans from
 * reappearing in the scans list after they've been converted to invoices.
 *
 * **Best-effort operation**: If marking fails, the scan will simply reappear
 * on the next sync—no critical failure.
 *
 * @see {@link fetchScans} for the fetch logic that filters out used scans
 * @see {@link createInvoiceFromScans} for the creation flow that calls this
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {createBlobClient} from "@/lib/azure/storageClient";

/**
 * Input parameters for marking scans as used.
 */
type MarkScansAsUsedInput = Readonly<{
  /** Array of blob names (full paths like "scans/userId/scanId.jpg") */
  blobNames: ReadonlyArray<string>;
}>;

/**
 * Marks scans as used by setting blob metadata.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **What it does**:
 * - Sets `usedByInvoice: "true"` in blob metadata
 * - Sets `status: "archived"` to mark as archived
 * - Does NOT re-upload blob data—only updates metadata
 *
 * **Best-effort**: Failures are logged but don't throw. If a scan fails to
 * be marked, it will simply reappear in the scans list on next sync.
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param input - Marking parameters
 * @returns Promise that resolves when all marks are attempted
 *
 * @example
 * ```typescript
 * // After creating invoices from scans
 * const blobNames = scans.map(scan => 
 *   scan.blobUrl.split("/").slice(-3).join("/")
 * );
 * await markScansAsUsed({blobNames});
 * ```
 */
export async function markScansAsUsed({blobNames}: MarkScansAsUsedInput): Promise<void> {
  console.info(">>> Executing server action::markScansAsUsed");

  return withSpan("api.actions.scans.markScansAsUsed", async () => {
    try {
      // Step 1. Connect to Azure Storage
      addSpanEvent("azure.storage.connect.start");
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");
      const storageClient = await createBlobClient(storageEndpoint);
      const containerClient = storageClient.getContainerClient("invoices");
      addSpanEvent("azure.storage.connect.complete");

      // Step 2. Update metadata for each blob (parallel, best-effort)
      addSpanEvent("azure.blob.metadata.update.start", {count: blobNames.length});
      logWithTrace("info", `Marking ${blobNames.length} scans as used`, {count: blobNames.length}, "server");

      const results = await Promise.allSettled(
        blobNames.map(async (blobName) => {
          try {
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);

            // Fetch existing metadata to preserve it
            const props = await blockBlobClient.getProperties();
            const existingMetadata = props.metadata ?? {};

            // Merge with new flags
            const updatedMetadata = {
              ...existingMetadata,
              usedByInvoice: "true",
              status: "archived",
            };

            // Set updated metadata
            await blockBlobClient.setMetadata(updatedMetadata);
            logWithTrace("info", `Marked scan as used: ${blobName}`, {blobName}, "server");
          } catch (error) {
            // Log but don't fail—best-effort marking
            logWithTrace("warn", `Failed to mark scan as used: ${blobName}`, {blobName, error}, "server");
            console.warn(`Failed to mark scan as used: ${blobName}`, error);
          }
        }),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      addSpanEvent("azure.blob.metadata.update.complete", {succeeded, failed});
      logWithTrace("info", `Marked scans as used: ${succeeded} succeeded, ${failed} failed`, {succeeded, failed}, "server");
    } catch (error) {
      // Log but don't throw—this is a best-effort operation
      addSpanEvent("scans.mark_as_used.error");
      logWithTrace("error", "Error marking scans as used", {error}, "server");
      console.error("Error marking scans as used:", error);
    }
  });
}
