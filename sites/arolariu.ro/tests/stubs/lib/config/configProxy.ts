/**
 * @fileoverview Stub for `@/lib/config/configProxy` in Vitest tests.
 * @module tests/stubs/lib/config/configProxy
 *
 * @remarks
 * The real module talks to the exp service over HTTP with Azure credentials.
 * This stub provides no-op `vi.fn()` mocks — tests set their own return values:
 *
 * ```ts
 * import {fetchResendApiKey} from "@/lib/config/configProxy";
 * vi.mocked(fetchResendApiKey).mockResolvedValue("re_test_key");
 * ```
 */

import {vi} from "vitest";

// Cache utilities
export const isConfigValueResponse = vi.fn(() => false);
export const getCachedConfigValue = vi.fn(() => null);
export const setCachedConfigValue = vi.fn();
export const invalidateConfigValueCache = vi.fn();
export const invalidateConfigCache = vi.fn();

// Constants
export const EXP_SERVICE_TOKEN_SCOPE = "api://test-scope/.default" as const;

// Fetch functions (tests must set mockResolvedValue)
export const fetchConfigValue = vi.fn();
export const fetchConfigValues = vi.fn();
export const fetchApiUrl = vi.fn();
export const fetchApiJwtSecret = vi.fn();
export const fetchResendApiKey = vi.fn();
