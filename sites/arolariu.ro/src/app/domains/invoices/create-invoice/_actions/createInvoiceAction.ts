"use server";

import {createInvoice} from "@/lib/actions/invoices/createInvoice";
import {createInvoiceScan} from "@/lib/actions/invoices/createInvoiceScan";
import {addSpanEvent, createCounter, createNextJsAttributes, logWithTrace, setSpanAttributes, withSpan} from "@/telemetry";
import {CreateInvoiceDtoPayload, InvoiceScanType} from "@/types/invoices";
import type {PendingInvoiceSubmission, PendingInvoiceSubmissionResult} from "../_types/InvoiceSubmission";

const createInvoiceRequestCounter = createCounter(
  "api.actions.invoices.create.requests",
  "Total number of createInvoice server action requests",
  "1",
);

/**
 * Maps a MIME type to a ScanType integer.
 * @param mimeType The MIME type to map.
 * @returns The ScanType integer.
 */
function mapMimeTypeToScanType(mimeType: string): InvoiceScanType {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return InvoiceScanType.JPEG;
    case "image/png":
      return InvoiceScanType.PNG;
    case "application/pdf":
      return InvoiceScanType.PDF;
    default:
      return InvoiceScanType.OTHER;
  }
}

export async function createInvoiceAction(submission: PendingInvoiceSubmission): Promise<PendingInvoiceSubmissionResult> {
  console.info(">>> Executing server action {{createInvoiceAction}}, with:", {submission});

  return withSpan("api.actions.invoices.create", async () => {
    try {
      // Record request metric
      createInvoiceRequestCounter.add(1, {
        ...createNextJsAttributes("server", {runtime: "nodejs"}),
      });

      // Add semantic span attributes
      setSpanAttributes({
        ...createNextJsAttributes("server", {runtime: "nodejs"}),
        "invoice.submission.id": submission.id,
      });

      logWithTrace("info", "Processing createInvoice server action", {submissionId: submission.id}, "server");

      // ----------------------------------------------------------------------
      // 1. Upload the file to Azure Blob Storage
      // ----------------------------------------------------------------------
      const blobExtension = submission.file.name.split(".").pop();
      const blobName = `${submission.id}#${Date.now().toFixed(0)}.${blobExtension}`;
      addSpanEvent("blob.upload.start", {blobName, mimeType: submission.mimeType, size: submission.size});
      const base64Data = Buffer.from(await submission.file.arrayBuffer()).toString("base64");
      const {status, blobUrl} = await createInvoiceScan({base64Data, blobName});
      if (status !== 201) throw new Error(`Blob upload failed with status ${status}`);
      addSpanEvent("blob.upload.complete", {blobUrl});

      // ----------------------------------------------------------------------
      // 2. Prepare the invoice creation payload with initial scan
      // ----------------------------------------------------------------------
      addSpanEvent("bff.request.attach-scan.start", {blobUrl});
      const invoiceInitialPayload: Partial<CreateInvoiceDtoPayload> = {
        userIdentifier: undefined, // Will be populated in createInvoice action
        initialScan: {
          scanType: mapMimeTypeToScanType(submission.mimeType),
          location: blobUrl,
          metadata: {},
        },
        metadata: {
          requiresAnalysis: "true",
          isImportant: "false",
        },
      };
      addSpanEvent("bff.request.attach-scan.complete");

      addSpanEvent("bff.request.create-invoice.start");
      const invoice = await createInvoice(invoiceInitialPayload);
      addSpanEvent("bff.request.create-invoice.complete", {invoiceId: invoice.id});

      return {
        id: submission.id,
        invoiceId: invoice.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      addSpanEvent("bff.request.create-invoice.error", {error: errorMessage});
      logWithTrace("error", "Error processing createInvoice server action", {error: error as Error}, "server");

      return {
        id: submission.id,
        code: "PROCESSING_ERROR",
        message: errorMessage,
      };
    }
  });
}
