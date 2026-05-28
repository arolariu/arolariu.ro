/**
 * @fileoverview Stub for `@/lib/utils.generic` in Vitest tests.
 * @module tests/stubs/lib/utils.generic
 *
 * @remarks
 * This stub provides no-op `vi.fn()` mocks for generic utility functions.
 * Test files can override these mocks with custom implementations as needed.
 *
 * ```ts
 * import {validateStringIsGuidType} from "@/lib/utils.generic";
 * vi.mocked(validateStringIsGuidType).mockImplementation((input, paramName) => {
 *   if (!isValidGuid(input)) throw new Error(`Invalid ${paramName}`);
 * });
 * ```
 */

import {vi} from "vitest";

// #region Functions

export const generateInvoiceId = vi.fn(() => "test-invoice-id");
export const generateMerchantId = vi.fn(() => "test-merchant-id");
export const generateProductId = vi.fn(() => "test-product-id");
export const generateScanId = vi.fn(() => "test-scan-id");
export const parseInvoiceJson = vi.fn((json: string) => JSON.parse(json));
export const sleep = vi.fn(() => Promise.resolve());
export const validateStringIsGuidType = vi.fn();

// #endregion
