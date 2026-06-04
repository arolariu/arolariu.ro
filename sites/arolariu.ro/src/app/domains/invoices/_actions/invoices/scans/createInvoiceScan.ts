"use server";

/**
 * @fileoverview Server action for uploading invoice scans to Azure Blob Storage.
 * @module app/domains/invoices/_actions/invoices/scans/createInvoiceScan
 *
 * @remarks
 * Handles secure upload of invoice images and documents to Azure Blob Storage as part
 * of the invoice creation and management workflow. This is typically the first step when
 * creating an invoice from a physical receipt or digital document.
 *
 * **Key Features:**
 * - Server-side execution only
 * - Direct upload to Azure Blob Storage (no intermediate storage)
 * - Automatic content type detection
 * - Blob metadata tracking (size, type, custom fields)
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 *
 * **Storage Configuration:**
 * - Container: `invoices`
 * - Authentication: Centralized Azure credential singleton
 *   - Production: Managed Identity (Azure-hosted)
 *   - Development: Azure CLI credentials
 *   - CI/CD: Environment variables
 * - Blob naming: Caller provides unique name (typically UUID + extension)
 *
 * **Supported File Formats:**
 * - Images: JPEG, PNG, WebP, HEIC
 * - Documents: PDF
 *
 * **Workflow Position:**
 * This action is typically followed by invoice creation or attachment actions
 * that reference the uploaded blob URL.
 *
 * @see {@link createInvoice} - Using uploaded scan in invoice creation
 * @see {@link attachScanToInvoice} - Adding scans to existing invoices
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {createBlobClient} from "@/lib/azure/storageClient";
import {convertBase64ToBlob, createErrorResult, type ServerActionResult} from "@/lib/utils.server";

/**
 * Input parameters for the createInvoiceScan server action.
 *
 * @remarks
 * The base64Data can include or omit the data URI prefix (e.g., "data:image/jpeg;base64,").
 * The blobName should include the file extension for proper content type detection.
 */
type ServerActionInputType = Readonly<{
  /** The base64-encoded file content. May include or omit data URI prefix. */
  readonly base64Data: string;
  /** The unique blob name including extension (e.g., "uuid-v4.jpg"). */
  readonly blobName: string;
  /** Optional key-value metadata stored with the blob (e.g., uploadedBy, source). */
  readonly metadata?: {[propertyName: string]: string};
}>;

/**
 * Output result type for the createInvoiceScan server action.
 *
 * @remarks
 * Returns a ServerActionResult with upload status and blob URL on success.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<
  Readonly<{
    /** HTTP status code from Azure Blob Storage (201 indicates successful creation). */
    status: number;
    /** Full URL to the uploaded blob in Azure Storage. */
    blobUrl: string;
  }>
>;

/**
 * Uploads an invoice scan to Azure Blob Storage for invoice processing.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Uses centralized Azure credential singleton via `createBlobClient`.
 * The credential chain supports:
 * - **Production**: Managed Identity (automatic when running on Azure)
 * - **Development**: Azure CLI credentials (`az login`)
 * - **CI/CD**: Environment variables (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`)
 *
 * **No JWT Authentication Required:** Unlike API-calling actions, this directly uses Azure SDK
 * with the centralized credential singleton. No user JWT or `fetchBFFUserFromAuthService` needed.
 *
 * **Storage Configuration:**
 * - Fetches blob storage endpoint from configuration
 * - Creates client for `invoices` container
 * - Uploads to block blob with unique caller-provided name
 *
 * **Upload Process:**
 * 1. Convert base64 string to Blob (strips data URI prefix if present)
 * 2. Convert Blob to ArrayBuffer for Azure SDK
 * 3. Prepare metadata (size in MB, content type, custom fields)
 * 4. Upload to Azure Blob Storage with content type headers
 * 5. Return status code (201) and public blob URL
 *
 * **Metadata Tracking:**
 * The uploaded blob includes automatic metadata:
 * - `blobName` - The blob identifier
 * - `approximateSizeInMb` - File size with 4 decimal precision
 * - `type` - MIME content type (e.g., "image/jpeg", "application/pdf")
 * - Custom metadata from caller (e.g., `uploadedBy`, `invoiceId`)
 *
 * **Cache Behavior:**
 * This action does NOT trigger Next.js cache revalidation (no `revalidatePath` calls).
 * Blob storage operations are independent of cached invoice data.
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.createInvoiceScan` - Parent span
 * - `azure.blob.upload.error` - Error event (on failure)
 *
 * **Error Handling:**
 * - HTTP 5xx (Azure service errors) return user message about server issues
 * - HTTP 4xx (client errors) return validation/file error message
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Creates blob in Azure Storage `invoices` container
 * - Sets blob content type HTTP header
 * - Stores blob metadata (size, type, custom fields)
 * - Emits telemetry spans and logs
 * - Does NOT update local cache (storage operation only)
 *
 * **Performance:**
 * - Base64 decoding happens server-side (no client processing)
 * - Direct upload to Azure (no intermediate storage)
 * - Single network round-trip to Azure Storage
 *
 * @param params - The input parameters object.
 * @param params.base64Data - Base64-encoded file content (with or without data URI prefix).
 * @param params.blobName - Unique blob name including extension (e.g., "123e4567-e89b-12d3-a456-426614174000.jpg").
 * @param params.metadata - Optional key-value metadata pairs to store with the blob.
 * @returns A result object containing the Azure status code and blob URL on success, or an error result when upload fails.
 *
 * @example
 * ```typescript
 * import { createInvoiceScan } from "@/app/domains/invoices/_actions/invoices/scans/createInvoiceScan";
 * import { v4 as uuidv4 } from "uuid";
 *
 * // Client-side: Convert file to base64
 * const fileToBase64 = (file: File): Promise<string> => {
 *   return new Promise((resolve, reject) => {
 *     const reader = new FileReader();
 *     reader.readAsDataURL(file);
 *     reader.onload = () => resolve(reader.result as string);
 *     reader.onerror = (error) => reject(error);
 *   });
 * };
 *
 * const file = event.target.files[0]; // User-selected file
 * const base64 = await fileToBase64(file);
 *
 * // Server action: Upload to Azure
 * const result = await createInvoiceScan({
 *   base64Data: base64,
 *   blobName: `${uuidv4()}.jpg`,
 *   metadata: {
 *     uploadedBy: user.id,
 *     originalFilename: file.name
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Uploaded successfully");
 *   console.log("Status:", result.data.status); // 201
 *   console.log("Blob URL:", result.data.blobUrl);
 *   // Use blobUrl in createInvoice or attachScanToInvoice
 * } else {
 *   console.error("Upload failed:", result.error);
 * }
 * ```
 *
 * @see {@link createBlobClient} - Azure credential singleton initialization
 * @see {@link convertBase64ToBlob} - Base64 to Blob conversion utility
 * @see {@link ServerActionResult} - Result type wrapper
 */
export async function createInvoiceScan({base64Data, metadata, blobName}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{createInvoiceScan}}, with:", {blobName});

  return withSpan("api.actions.invoices.createInvoiceScan", async () => {
    try {
      // Step 1. Prepare for blob upload
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");
      // Step 2. Upload the blob to Azure Storage
      const storageClient = await createBlobClient(storageEndpoint);
      const containerClient = storageClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const originalFile = await convertBase64ToBlob(base64Data);
      const arrayBuffer = await originalFile.arrayBuffer();
      const blobMetadata = {
        ...metadata,
        blobName,
        approximateSizeInMb: (originalFile.size / 1024 / 1024).toPrecision(4),
        type: originalFile.type,
      };

      const blobUploadResponse = await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: {
          blobContentType: originalFile.type,
        },
        metadata: blobMetadata,
      });

      if (blobUploadResponse._response.status === 201) {
        logWithTrace(
          "info",
          "Successfully uploaded invoice scan to Azure Blob Storage",
          {blobName, blobUrl: blockBlobClient.url},
          "server",
        );
        return {
          success: true,
          data: {
            status: blobUploadResponse._response.status,
            blobUrl: blockBlobClient.url,
          },
        } as const;
      }

      addSpanEvent("azure.blob.upload.error");
      const internalMessage = `Failed to upload invoice scan: ${blobUploadResponse._response.status}}`;
      logWithTrace("warn", internalMessage, {blobName}, "server");
      const userMessage =
        blobUploadResponse._response.status >= 500
          ? "A server error occurred while uploading the scan. Please try again later."
          : "Failed to upload the scan. Please check the file and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("azure.blob.upload.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error uploading invoice scan...", {blobName, error}, "server");
      console.error("Error uploading invoice scan:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
