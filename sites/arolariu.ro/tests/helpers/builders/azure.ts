/**
 * Azure Blob Storage test doubles for mocking blob client operations.
 * @module tests/helpers/builders/azure
 */

import type {BlobServiceClient, BlockBlobClient, ContainerClient} from "@azure/storage-blob";
import {vi} from "vitest";

/**
 * Configuration options for Azure Blob mock builders.
 */
export type AzureBlobMockOptions = Readonly<{
  /**
   * The URL for the blob resource.
   * @defaultValue "https://storage.test/blob.jpg"
   */
  blobUrl?: string;

  /**
   * Metadata to return from getProperties.
   * @defaultValue {}
   */
  metadata?: Record<string, string>;

  /**
   * HTTP status code to return from uploadData.
   * @defaultValue 201
   */
  uploadStatus?: number;
}>;

/**
 * Test double for BlockBlobClient with core methods.
 */
export type TestBlockBlobClient = Pick<BlockBlobClient, "getProperties" | "uploadData" | "url">;

/**
 * Test double for ContainerClient with getBlockBlobClient method.
 */
export type TestContainerClient = Pick<ContainerClient, "getBlockBlobClient">;

/**
 * Test double for BlobServiceClient with getContainerClient method.
 */
export type TestBlobServiceClient = Pick<BlobServiceClient, "getContainerClient">;

/**
 * Creates a mock BlockBlobClient for testing.
 *
 * @param options - Configuration for the mock
 * @returns A BlockBlobClient test double with url, getProperties, and uploadData
 *
 * @example
 * ```typescript
 * const blockBlobClient = buildBlockBlobClientMock({
 *   blobUrl: "https://storage.test/invoice.pdf",
 *   metadata: {status: "uploaded"},
 * });
 *
 * expect(blockBlobClient.url).toBe("https://storage.test/invoice.pdf");
 * await blockBlobClient.getProperties(); // {metadata: {status: "uploaded"}}
 * ```
 */
export function buildBlockBlobClientMock(options: AzureBlobMockOptions = {}): BlockBlobClient {
  return {
    url: options.blobUrl ?? "https://storage.test/blob.jpg",
    getProperties: vi.fn().mockResolvedValue({
      metadata: options.metadata ?? {},
    }),
    uploadData: vi.fn().mockResolvedValue({
      _response: {
        status: options.uploadStatus ?? 201,
      },
    }),
  } as unknown as BlockBlobClient;
}

/**
 * Creates a mock ContainerClient for testing.
 *
 * @param options - Configuration for the underlying BlockBlobClient
 * @returns A ContainerClient test double with getBlockBlobClient method
 *
 * @example
 * ```typescript
 * const containerClient = buildContainerClientMock({
 *   blobUrl: "https://storage.test/scans/invoice.pdf",
 * });
 *
 * const blockBlobClient = containerClient.getBlockBlobClient("invoice.pdf");
 * expect(blockBlobClient.url).toBe("https://storage.test/scans/invoice.pdf");
 * ```
 */
export function buildContainerClientMock(options: AzureBlobMockOptions = {}): ContainerClient {
  const blockBlobClient = buildBlockBlobClientMock(options);

  return {
    getBlockBlobClient: vi.fn(() => blockBlobClient),
  } as unknown as ContainerClient;
}

/**
 * Creates a mock BlobServiceClient for testing.
 *
 * @param containerClient - Optional container client to return; defaults to a new mock
 * @returns A BlobServiceClient test double with getContainerClient method
 *
 * @example
 * ```typescript
 * const containerClient = buildContainerClientMock();
 * const blobServiceClient = buildBlobServiceClientMock(containerClient);
 *
 * const container = blobServiceClient.getContainerClient("scans");
 * expect(container).toBe(containerClient);
 * ```
 */
export function buildBlobServiceClientMock(containerClient: ContainerClient = buildContainerClientMock()): BlobServiceClient {
  return {
    getContainerClient: vi.fn(() => containerClient),
  } as unknown as BlobServiceClient;
}
