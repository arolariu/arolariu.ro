/**
 * @fileoverview Stub for `@/lib/utils.server` in Vitest tests.
 * @module tests/stubs/lib/utils.server
 *
 * @remarks
 * The real module imports `server-only` and uses `jose` for JWT operations.
 * This stub provides no-op `vi.fn()` mocks and re-exports the types.
 *
 * ```ts
 * import {fetchWithTimeout} from "@/lib/utils.server";
 * vi.mocked(fetchWithTimeout).mockResolvedValue(new Response('{"ok":true}'));
 * ```
 */

import {vi} from "vitest";

// #region Type re-exports

export type JwtVerificationResult = {valid: true; payload: Record<string, unknown>} | {valid: false; error: string};

export type ServerActionErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

export type ServerActionResult<T> = {status: "success"; data: T} | {status: "error"; error: string; errorCode: ServerActionErrorCode};

// #endregion

// #region Constants

export const DEFAULT_FETCH_TIMEOUT = 30_000;

// #endregion

// #region Functions

export const convertBase64ToBlob = vi.fn();
export const createJwtToken = vi.fn();
export const verifyJwtToken = vi.fn();

/** Alias kept for backward compatibility — some tests import as `createJWT`. */
export const createJWT = createJwtToken;
/** Alias kept for backward compatibility — some tests import as `verifyJWT`. */
export const verifyJWT = verifyJwtToken;

export const fetchWithTimeout = vi.fn();
export const mapHttpStatusToErrorCode = vi.fn(() => "UNKNOWN_ERROR" as ServerActionErrorCode);
export const parseBackendError = vi.fn(() => "Unknown error");
export const createErrorResult = vi.fn(
  <T>() => ({status: "error" as const, error: "test error", errorCode: "UNKNOWN_ERROR" as ServerActionErrorCode}) as ServerActionResult<T>,
);

// #endregion
