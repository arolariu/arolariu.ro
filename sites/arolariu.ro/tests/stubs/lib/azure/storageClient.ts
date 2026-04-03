/**
 * @fileoverview Stub for `@/lib/azure/storageClient` in Vitest tests.
 * @module tests/stubs/lib/azure/storageClient
 *
 * @remarks
 * The real module imports `server-only` and Azure SDK classes.
 * This stub provides no-op mocks for blob storage operations.
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
 */

import {vi} from "vitest";

export const createBlobClient = vi.fn();

/** Passthrough: returns the URL unchanged (Azurite URLs don't need rewriting in tests). */
export const rewriteAzuriteUrl = vi.fn((url: string) => url);
