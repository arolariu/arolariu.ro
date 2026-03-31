"use server";

/**
 * @fileoverview Server action for generating SAS URLs for direct client-to-Azure uploads.
 * @module lib/actions/scans/generateSasUrl
 *
 * @remarks
 * This action generates short-lived Shared Access Signature (SAS) URLs that allow
 * clients to upload files directly to Azure Blob Storage, bypassing the server.
 *
 * **Benefits:**
 * - No base64 encoding overhead (33% payload size increase eliminated)
 * - Server is not a bottleneck (client uploads directly to Azure)
 * - Parallel uploads (5 concurrent connections)
 * - Lower server CPU/memory usage
 *
 * **Security:**
 * - SAS tokens expire in 30 minutes
 * - Tokens grant only write permission (no read/delete)
 * - User authentication required before generating token
 * - Blob path includes user identifier for isolation
 *
 * **Workflow:**
 * 1. Client calls this action to get SAS URL for each file
 * 2. Client uploads file directly to Azure using PUT request
 * 3. Client calls registration action to add scan metadata
 *
 * @see {@link registerScan} for post-upload registration
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {createBlobClient} from "@/lib/azure/storageClient";
import {BlobSASPermissions, generateBlobSASQueryParameters} from "@azure/storage-blob";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for generating a SAS URL.
 */
type GenerateSasUrlInput = Readonly<{
  /** Original filename from the upload */
  fileName: string;
  /** MIME type of the file (e.g., "image/jpeg", "application/pdf") */
  mimeType: string;
}>;

/**
 * Response from the SAS URL generation operation.
 */
type GenerateSasUrlOutput = Readonly<{
  /** Whether the operation succeeded */
  success: boolean;
  /** SAS URL for direct upload (if success) */
  sasUrl?: string;
  /** Blob name in Azure Storage (if success) */
  blobName?: string;
  /** Blob URL without SAS token (if success) */
  blobUrl?: string;
  /** Scan ID for registration (if success) */
  scanId?: string;
  /** Error message (if failure) */
  error?: string;
}>;

/**
 * Generates a UUIDv7-like identifier using timestamp + random bytes.
 * This ensures chronological ordering while maintaining uniqueness.
 */
function generateScanId(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 19)}`;
}

/**
 * Generates a SAS URL for direct client-to-Azure upload.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches user from auth service.
 *
 * **Blob Naming:** `scans/{userIdentifier}/{scanId}_{timestamp}.{extension}`
 *
 * **SAS Token Permissions:**
 * - Create: Allow creating new blobs
 * - Write: Allow writing blob content
 * - Expiry: 30 minutes from generation
 *
 * **Development Mode (Azurite):**
 * For local development with Azurite over HTTP, SAS tokens are not needed.
 * Returns the direct blob URL instead.
 *
 * **Production Mode (Azure):**
 * Uses User Delegation Key with Managed Identity for SAS token generation.
 * This is more secure than account key-based SAS.
 *
 * @param input - SAS URL generation parameters
 * @returns Object with SAS URL, blob name, and scan ID
 * @throws {Error} When authentication fails
 * @throws {Error} When SAS token generation fails
 *
 * @example
 * ```typescript
 * const result = await generateUploadSasUrl({
 *   fileName: "receipt.jpg",
 *   mimeType: "image/jpeg"
 * });
 *
 * if (result.success) {
 *   // Upload file directly to Azure
 *   await fetch(result.sasUrl, {
 *     method: 'PUT',
 *     body: file,
 *     headers: {
 *       'x-ms-blob-type': 'BlockBlob',
 *       'Content-Type': result.mimeType
 *     }
 *   });
 * }
 * ```
 */
export async function generateUploadSasUrl(input: GenerateSasUrlInput): Promise<GenerateSasUrlOutput> {
  console.info(">>> Executing server action::generateUploadSasUrl");

  return withSpan("api.actions.scans.generateSasUrl", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      if (!userIdentifier) {
        return {success: false, error: "Authentication required"};
      }

      // Step 2. Generate scan ID and blob name
      addSpanEvent("scan.id.generate");
      const scanId = generateScanId();
      const timestamp = Date.now();
      const extension = input.fileName.split(".").pop() ?? "bin";
      const blobName = `scans/${userIdentifier}/${scanId}_${timestamp}.${extension}`;

      // Step 3. Prepare storage client
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");

      const storageClient = await createBlobClient(storageEndpoint);
      const containerClient = storageClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Step 4. For Azurite (dev), return the direct URL
      // Azurite doesn't require SAS tokens for local development
      if (storageEndpoint.startsWith("http://")) {
        addSpanEvent("azurite.dev.mode");
        logWithTrace("info", "Development mode: returning direct URL (no SAS)", {blobName}, "server");
        return {
          success: true,
          sasUrl: blockBlobClient.url,
          blobName,
          blobUrl: blockBlobClient.url,
          scanId,
        };
      }

      // Step 5. For Azure (prod), generate a SAS token using User Delegation Key
      addSpanEvent("azure.sas.generation.start");
      logWithTrace("info", "Generating SAS URL for production", {blobName}, "server");

      const startDate = new Date();
      const expiryDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      const userDelegationKey = await storageClient.getUserDelegationKey(startDate, expiryDate);

      const sasToken = generateBlobSASQueryParameters(
        {
          containerName,
          blobName,
          permissions: BlobSASPermissions.parse("cw"), // create + write only
          startsOn: startDate,
          expiresOn: expiryDate,
        },
        userDelegationKey,
        storageClient.accountName,
      ).toString();

      addSpanEvent("azure.sas.generation.complete");

      return {
        success: true,
        sasUrl: `${blockBlobClient.url}?${sasToken}`,
        blobName,
        blobUrl: blockBlobClient.url,
        scanId,
      };
    } catch (error) {
      addSpanEvent("sas.generation.error");
      logWithTrace("error", "Failed to generate SAS URL", {error: String(error)}, "server");
      console.error("Failed to generate SAS URL:", error);
      return {success: false, error: "Failed to prepare upload"};
    }
  });
}
