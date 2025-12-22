"use server";

/**
 * @fileoverview Server action for uploading invoice scans to Azure Blob Storage.
 * @module lib/actions/invoices/createInvoiceScan
 *
 * @remarks
 * Handles the secure upload of invoice images/documents to Azure Blob Storage.
 * This is typically the first step in the invoice creation workflow.
 *
 * **Storage Configuration**:
 * - Container: `invoices`
 * - Authentication: Azure DefaultAzureCredential (Managed Identity in prod)
 * - Blob naming: Caller provides unique blob name (typically UUID + extension)
 *
 * **Supported Formats**:
 * - Images: JPEG, PNG, WebP, HEIC
 * - Documents: PDF
 *
 * @see {@link createInvoice} for using the uploaded scan in invoice creation
 * @see {@link attachInvoiceScan} for adding scans to existing invoices
 */

import {withSpan} from "@/instrumentation.server";
import {convertBase64ToBlob} from "@/lib/utils.server";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";

/**
 * Input parameters for uploading an invoice scan.
 *
 * @property base64Data - Base64-encoded file content (with or without data URI prefix)
 * @property blobName - Unique blob name including extension (e.g., "uuid.jpg")
 * @property metadata - Optional key-value pairs stored with the blob
 */
type ServerActionInputType = Readonly<{
  /** The base64-encoded data of the invoice scan. */
  readonly base64Data: string;
  /** The name of the blob to be created in Azure Storage. */
  readonly blobName: string;
  /** Optional metadata to associate with the blob. */
  readonly metadata?: {[propertyName: string]: string};
}>;
/**
 * Response from the scan upload operation.
 *
 * @property status - HTTP status code from Azure (201 = success)
 * @property blobUrl - Full URL to the uploaded blob in Azure Storage
 */
type ServerActionOutputType = Promise<
  Readonly<{
    status: number;
    blobUrl: string;
  }>
>;

/**
 * Uploads an invoice scan to Azure Blob Storage.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Uses Azure DefaultAzureCredential which supports:
 * - Managed Identity (production on Azure)
 * - Azure CLI credentials (local development)
 * - Environment variables (CI/CD)
 *
 * **Side Effects**:
 * - Creates blob in Azure Storage "invoices" container
 * - Emits OpenTelemetry span for tracing
 * - Sets blob metadata including size and content type
 *
 * **Performance**:
 * - Base64 decoding happens server-side
 * - Direct upload to Azure (no intermediate storage)
 *
 * @param input - Upload parameters
 * @param input.base64Data - Base64-encoded file content
 * @param input.blobName - Unique name for the blob (should include extension)
 * @param input.metadata - Optional metadata key-value pairs
 * @returns Object with HTTP status and blob URL
 * @throws {Error} When Azure authentication fails
 * @throws {Error} When blob upload fails
 *
 * @example
 * ```typescript
 * import {createInvoiceScan} from "@/lib/actions/invoices/createInvoiceScan";
 * import {v4 as uuidv4} from "uuid";
 *
 * // Convert file to base64 (client-side)
 * const base64 = await fileToBase64(file);
 *
 * // Upload to Azure (server action)
 * const {status, blobUrl} = await createInvoiceScan({
 *   base64Data: base64,
 *   blobName: `${uuidv4()}.jpg`,
 *   metadata: { uploadedBy: "user-123" }
 * });
 *
 * if (status === 201) {
 *   console.log("Uploaded to:", blobUrl);
 * }
 * ```
 *
 * @see {@link createInvoice} for using the blob URL in invoice creation
 */
export async function createInvoiceScan({base64Data, metadata, blobName}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{createInvoiceScan}} with:", {blobName});

  return withSpan("api.actions.invoices.createInvoiceScan", async () => {
    try {
      // Step 1. Prepare for blob upload
      const containerName = "invoices";
      const storageCredentials = new DefaultAzureCredential();
      // todo: fetch from config service.
      const storageEndpoint = "https://qtcy47sacc.blob.core.windows.net/";

      // Step 2. Upload the blob to Azure Storage
      const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);
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

      if (blobUploadResponse._response.status !== 201) {
        console.error("Error uploading blob to Azure Storage", blobUploadResponse);
      }

      return {
        status: blobUploadResponse._response.status,
        blobUrl: blockBlobClient.url,
      } as const;
    } catch (error) {
      console.error("Error uploading invoice scan:", error);
      throw error;
    }
  });
}
