/**
 * @fileoverview Stub for `@/lib/azure/storageClient` in Vitest tests.
 * @module tests/stubs/lib/azure/storageClient
 *
 * @remarks
 * The real module imports `server-only` and Azure SDK classes.
 * This stub provides no-op mocks for blob storage operations and generic helpers.
 *
 * Tests that need to control blob client behavior should chain mocks:
 * ```ts
 * import {createBlobClient} from "@/lib/azure/storageClient";
 * const mockBlobClient = vi.mocked(createBlobClient);
 * mockBlobClient.mockResolvedValue({
 *   getContainerClient: vi.fn().mockReturnValue({
 *     getBlockBlobClient: vi.fn().mockReturnValue({
 *       upload: vi.fn().mockResolvedValue({}),
 *     }),
 *   }),
 * } as any);
 * ```
 *
 * Generic blob repository helpers added for Task 1 (RFC-aligned CRUD operations):
 * ```ts
 * import {uploadBlobObject} from "@/lib/azure/storageClient";
 * const mockUpload = vi.mocked(uploadBlobObject);
 * mockUpload.mockResolvedValue({
 *   name: "blob.jpg",
 *   url: "https://storage.test/blob.jpg",
 *   metadata: {},
 *   contentType: "image/jpeg",
 *   contentLength: 1024,
 *   createdOn: new Date(),
 *   etag: "etag",
 * });
 * ```
 */

import {vi} from "vitest";

export const createBlobClient = vi.fn();

/** Passthrough: returns the URL unchanged (Azurite URLs don't need rewriting in tests). */
export const rewriteAzuriteUrl = vi.fn((url: string) => url);

// Generic blob repository helpers (Task 1)
export const createBlobUploadTarget = vi.fn();
export const uploadBlobObject = vi.fn();
export const listBlobObjects = vi.fn();
export const getBlobObject = vi.fn();
export const updateBlobObject = vi.fn();
export const deleteBlobObject = vi.fn();
export const resolveBlobObjectByMetadata = vi.fn();
