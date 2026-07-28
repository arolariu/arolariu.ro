/**
 * @fileoverview Factory for creating Azure Blob Storage clients that work in
 * both local Docker (Azurite over HTTP) and Azure (Managed Identity over HTTPS).
 * Provides generic blob repository operations (CRUD) for any container/blob.
 *
 * @module sites/arolariu.ro/src/lib/azure/storageClient
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {BlobSASPermissions, BlobServiceClient, type BlockBlobClient, generateBlobSASQueryParameters} from "@azure/storage-blob";

/**
 * Well-known Azurite development storage connection string prefix.
 * This is the canonical public key for Azurite's devstoreaccount1 — it is NOT a real credential.
 * @see https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite#well-known-storage-account-and-key
 */
const AZURITE_CONN_PREFIX =
  "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=";

/** Docker-internal Azurite hostname that must be rewritten for browser access. */
/* eslint-disable sonarjs/no-clear-text-protocols -- Azurite local emulator uses HTTP */
const AZURITE_DOCKER_ORIGIN = "http://azurite:10000";
const AZURITE_HOST_ORIGIN = "http://localhost:10000";
/* eslint-enable sonarjs/no-clear-text-protocols */

/**
 * Rewrites Docker-internal Azurite blob URLs to host-accessible URLs.
 * Inside Docker, blobs are stored with `http://azurite:10000/...` URLs which are
 * unreachable from the host browser. This replaces them with `http://localhost:10000/...`.
 *
 * @param url - The blob URL to normalize
 * @returns The URL with Docker-internal hostname replaced, or unchanged if not Azurite
 */
export function rewriteAzuriteUrl(url: string): string {
  return url.replace(AZURITE_DOCKER_ORIGIN, AZURITE_HOST_ORIGIN);
}

/**
 * Creates a BlobServiceClient for the given storage endpoint.
 *
 * - **HTTP endpoints** (Azurite): uses the well-known dev connection string
 *   because the Azure SDK refuses `TokenCredential` over plain HTTP.
 * - **HTTPS endpoints** (Azure): uses Managed Identity via `getAzureCredential()`.
 */
export async function createBlobClient(storageEndpoint: string): Promise<BlobServiceClient> {
  if (storageEndpoint.startsWith("http://")) {
    if (process.env["AZURE_CLIENT_ID"]) {
      throw new Error("HTTP storage endpoints are not allowed in production. Use HTTPS.");
    }
    const connStr = `${AZURITE_CONN_PREFIX}${storageEndpoint};`;
    return BlobServiceClient.fromConnectionString(connStr);
  }

  const {getAzureCredential} = await import("@/lib/azure/credentials");
  return new BlobServiceClient(storageEndpoint, getAzureCredential());
}

/**
 * Blob upload target containing SAS URL and required headers for client-side direct upload.
 */
export type BlobUploadTarget = Readonly<{
  /** The SAS URL for uploading (may be direct URL for HTTP/Azurite) */
  sasUrl: string;
  /** The blob name within the container */
  blobName: string;
  /** The blob URL without SAS (permanent reference) */
  blobUrl: string;
  /** When the SAS token expires */
  expiresAt: Date;
  /** Required HTTP headers for the upload PUT request */
  requiredHeaders: Readonly<Record<string, string>>;
}>;

/**
 * Represents a blob object in storage with metadata and properties.
 */
export type BlobObject = Readonly<{
  /** Blob name within container */
  name: string;
  /** Full blob URL */
  url: string;
  /** Custom metadata key-value pairs */
  metadata: Readonly<Record<string, string | undefined>>;
  /** MIME content type */
  contentType: string;
  /** Size in bytes */
  contentLength: number;
  /** Creation timestamp */
  createdOn?: Date;
  /** ETag for concurrency control */
  etag?: string;
}>;

/**
 * Creates a blob upload target with SAS URL and required headers for client-side uploads.
 *
 * For HTTP/Azurite endpoints, returns direct URL (no SAS needed for dev).
 * For HTTPS/Azure endpoints, generates user delegation SAS with create+write permissions.
 *
 * @param options - Upload target configuration
 * @param options.storageEndpoint - Storage account endpoint URL
 * @param options.containerName - Target container name
 * @param options.blobName - Target blob name
 * @param options.contentType - MIME type for the blob
 * @param options.metadata - Optional metadata key-value pairs
 * @param options.expiresInMinutes - SAS expiration time (default: 60 minutes)
 * @returns Upload target with SAS URL and required headers
 */
export async function createBlobUploadTarget(
  options: Readonly<{
    storageEndpoint: string;
    containerName: string;
    blobName: string;
    contentType: string;
    metadata?: Readonly<Record<string, string>>;
    expiresInMinutes?: number;
  }>,
): Promise<BlobUploadTarget> {
  const {storageEndpoint, containerName, blobName, contentType, metadata = {}, expiresInMinutes = 60} = options;

  const client = await createBlobClient(storageEndpoint);
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Build required headers (always needed for client-side REST PUT)
  const requiredHeaders: Record<string, string> = {
    "x-ms-blob-type": "BlockBlob",
    "Content-Type": contentType,
  };

  // Add metadata headers
  for (const [key, value] of Object.entries(metadata)) {
    requiredHeaders[`x-ms-meta-${key}`] = value;
  }

  // HTTP/Azurite: direct URL, no SAS needed
  if (storageEndpoint.startsWith("http://")) {
    const normalizedUrl = rewriteAzuriteUrl(blockBlobClient.url);
    return {
      sasUrl: normalizedUrl,
      blobName,
      blobUrl: normalizedUrl,
      expiresAt,
      requiredHeaders,
    };
  }

  // HTTPS/Azure: generate user delegation SAS
  const startsOn = new Date();
  const userDelegationKey = await client.getUserDelegationKey(startsOn, expiresAt);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("cw"), // create + write
      startsOn,
      expiresOn: expiresAt,
    },
    userDelegationKey,
    client.accountName,
  );

  const sasUrl = `${blockBlobClient.url}?${sasToken.toString()}`;

  return {
    sasUrl,
    blobName,
    blobUrl: blockBlobClient.url,
    expiresAt,
    requiredHeaders,
  };
}

/**
 * Uploads a blob object with content, content type, and metadata.
 *
 * @param options - Upload configuration
 * @param options.storageEndpoint - Storage account endpoint URL
 * @param options.containerName - Target container name
 * @param options.blobName - Target blob name
 * @param options.content - Blob content as Uint8Array
 * @param options.contentType - MIME type
 * @param options.metadata - Optional metadata key-value pairs
 * @returns The uploaded blob object
 */
export async function uploadBlobObject(
  options: Readonly<{
    storageEndpoint: string;
    containerName: string;
    blobName: string;
    content: Uint8Array;
    contentType: string;
    metadata?: Readonly<Record<string, string>>;
  }>,
): Promise<BlobObject> {
  const {storageEndpoint, containerName, blobName, content, contentType, metadata} = options;

  const client = await createBlobClient(storageEndpoint);
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(content, {
    blobHTTPHeaders: {blobContentType: contentType},
    metadata,
  });

  return mapBlockBlobClientToBlobObject(blockBlobClient, blobName);
}

/**
 * Lists blob objects in a container with optional prefix filtering.
 *
 * @param options - List configuration
 * @param options.storageEndpoint - Storage account endpoint URL
 * @param options.containerName - Container name
 * @param options.prefix - Optional blob name prefix filter
 * @param options.includeMetadata - Whether to include metadata (default: false)
 * @returns Array of blob objects
 */
export async function listBlobObjects(
  options: Readonly<{
    storageEndpoint: string;
    containerName: string;
    prefix?: string;
    includeMetadata?: boolean;
  }>,
): Promise<BlobObject[]> {
  const {storageEndpoint, containerName, prefix, includeMetadata = false} = options;

  const client = await createBlobClient(storageEndpoint);
  const containerClient = client.getContainerClient(containerName);

  const blobs: BlobObject[] = [];
  for await (const blob of containerClient.listBlobsFlat({prefix, includeMetadata})) {
    const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
    blobs.push({
      name: blob.name,
      url: rewriteAzuriteUrl(blockBlobClient.url),
      metadata: blob.metadata ?? {},
      contentType: blob.properties.contentType ?? "application/octet-stream",
      contentLength: blob.properties.contentLength ?? 0,
      createdOn: blob.properties.createdOn,
      etag: blob.properties.etag,
    });
  }

  return blobs;
}

/**
 * Gets a single blob object by name.
 *
 * @param options - Get configuration
 * @param options.storageEndpoint - Storage account endpoint URL
 * @param options.containerName - Container name
 * @param options.blobName - Blob name
 * @returns The blob object
 */
export async function getBlobObject(
  options: Readonly<{
    storageEndpoint: string;
    containerName: string;
    blobName: string;
  }>,
): Promise<BlobObject> {
  const {storageEndpoint, containerName, blobName} = options;

  const client = await createBlobClient(storageEndpoint);
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  return mapBlockBlobClientToBlobObject(blockBlobClient, blobName);
}

/**
 * Updates a blob object's content, content type, or metadata.
 *
 * - If content is provided, performs full upload (overwrites blob).
 * - If only metadata is provided, updates metadata only with optional ETag condition.
 *
 * @param options - Update configuration
 * @param options.storageEndpoint - Storage account endpoint URL
 * @param options.containerName - Container name
 * @param options.blobName - Blob name
 * @param options.content - Optional new content
 * @param options.contentType - Optional new content type (used with content)
 * @param options.metadata - Optional metadata to set
 * @param options.etag - Optional ETag for optimistic concurrency (metadata-only updates)
 * @returns The updated blob object
 */
export async function updateBlobObject(
  options: Readonly<{
    storageEndpoint: string;
    containerName: string;
    blobName: string;
    content?: Uint8Array;
    contentType?: string;
    metadata?: Readonly<Record<string, string>>;
    etag?: string;
  }>,
): Promise<BlobObject> {
  const {storageEndpoint, containerName, blobName, content, contentType, metadata, etag} = options;

  const client = await createBlobClient(storageEndpoint);
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  if (content) {
    // Full content update
    await blockBlobClient.uploadData(content, {
      blobHTTPHeaders: contentType ? {blobContentType: contentType} : undefined,
      metadata,
    });
  } else if (metadata) {
    // Metadata-only update
    await blockBlobClient.setMetadata(metadata, etag ? {conditions: {ifMatch: etag}} : undefined);
  }

  return mapBlockBlobClientToBlobObject(blockBlobClient, blobName);
}

/**
 * Deletes a blob if it exists.
 *
 * @param options - Delete configuration
 * @param options.storageEndpoint - Storage account endpoint URL
 * @param options.containerName - Container name
 * @param options.blobName - Blob name
 * @returns Delete result with success status
 */
export async function deleteBlobObject(
  options: Readonly<{
    storageEndpoint: string;
    containerName: string;
    blobName: string;
  }>,
): Promise<Readonly<{succeeded: boolean; errorCode?: string}>> {
  const {storageEndpoint, containerName, blobName} = options;

  const client = await createBlobClient(storageEndpoint);
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const result = await blockBlobClient.deleteIfExists();
  return {succeeded: result.succeeded, errorCode: result.errorCode};
}

/**
 * Finds the first blob object matching a metadata predicate.
 *
 * @param options - Search configuration
 * @param options.storageEndpoint - Storage account endpoint URL
 * @param options.containerName - Container name
 * @param options.prefix - Optional blob name prefix filter
 * @param options.predicate - Function to test each blob's metadata
 * @returns First matching blob object or null
 */
export async function resolveBlobObjectByMetadata(
  options: Readonly<{
    storageEndpoint: string;
    containerName: string;
    prefix?: string;
    predicate: (blob: BlobObject) => boolean;
  }>,
): Promise<BlobObject | null> {
  const {storageEndpoint, containerName, prefix, predicate} = options;

  const blobs = await listBlobObjects({
    storageEndpoint,
    containerName,
    prefix,
    includeMetadata: true,
  });

  for (const blob of blobs) {
    if (predicate(blob)) {
      return blob;
    }
  }

  return null;
}

/**
 * Maps a BlockBlobClient to a BlobObject by fetching properties.
 * Helper function to ensure consistent BlobObject creation.
 *
 * @param blockBlobClient - The blob client instance
 * @param blobName - The blob name
 * @returns BlobObject with properties from storage
 */
async function mapBlockBlobClientToBlobObject(blockBlobClient: BlockBlobClient, blobName: string): Promise<BlobObject> {
  const properties = await blockBlobClient.getProperties();

  return {
    name: blobName,
    url: rewriteAzuriteUrl(blockBlobClient.url),
    metadata: properties.metadata ?? {},
    contentType: properties.contentType ?? "application/octet-stream",
    contentLength: properties.contentLength ?? 0,
    createdOn: properties.createdOn,
    etag: properties.etag,
  };
}
