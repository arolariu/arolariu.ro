/**
 * @fileoverview Stub for `@/lib/utils.server` in Vitest tests.
 * @module tests/stubs/lib/utils.server
 *
 * @remarks
 * The real module imports `server-only` and uses `jose` for JWT operations.
 * This stub keeps deterministic helpers behavior-compatible and leaves network/JWT
 * operations as configurable `vi.fn()` mocks.
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
  "NETWORK_ERROR" | "TIMEOUT_ERROR" | "AUTH_ERROR" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR" | "UNKNOWN_ERROR";

export type ServerActionResult<T> = Readonly<
  | {success: true; data: T; error?: never}
  | {success: false; data?: never; error: {code: ServerActionErrorCode; message: string; status?: number}}
>;

// #endregion

// #region Constants

export const DEFAULT_FETCH_TIMEOUT = 30_000;

// #endregion

// #region Functions

export async function convertBase64ToBlob(base64String: string): Promise<Blob> {
  const mimeMatch = /^data:(?<mime>[^;]+);base64,/u.exec(base64String);
  const mimeType = mimeMatch?.groups?.["mime"] ?? "application/octet-stream";
  const base64 = base64String.replace(/^data:(?:[^;]+);base64,/u, "");
  const byteCharacters = atob(base64);
  const byteArray = new Uint8Array([...byteCharacters].map((char) => char.codePointAt(0) as number));

  return new Blob([byteArray], {type: mimeType});
}

export const createJwtToken = vi.fn();
export const verifyJwtToken = vi.fn();

/** Alias kept for backward compatibility — some tests import as `createJWT`. */
export const createJWT = createJwtToken;
/** Alias kept for backward compatibility — some tests import as `verifyJWT`. */
export const verifyJWT = verifyJwtToken;

export const fetchWithTimeout = vi.fn();

export function mapHttpStatusToErrorCode(status: number): ServerActionErrorCode {
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

export function parseBackendError(status: number, body: string): string {
  switch (status) {
    case 429:
      return "Too many requests. Please wait a moment and try again.";
    case 402:
      return "This feature requires a paid subscription.";
    case 409:
      return "Conflict: this resource was modified by another user.";
    case 413: {
      try {
        const parsed = JSON.parse(body) as {detail?: string; maxSize?: string};
        if (parsed.maxSize) {
          return `File is too large. Maximum size is ${parsed.maxSize}.`;
        }
        if (parsed.detail) {
          return parsed.detail;
        }
      } catch {
        // Match production fallback when the backend body is not JSON.
      }

      return "File is too large. Please check the size limit and try again.";
    }
    default: {
      try {
        const parsed = JSON.parse(body) as {detail?: string};
        if (parsed.detail) {
          return parsed.detail;
        }
      } catch {
        const sanitized = body.slice(0, 200);
        return sanitized || "An unknown error occurred.";
      }

      return "An unknown error occurred.";
    }
  }
}

function readHttpStatus(value: unknown): number | undefined {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return undefined;
  }

  const {status} = value as {readonly status?: unknown};
  return typeof status === "number" ? status : undefined;
}

export async function createErrorResult<T>(error: unknown, defaultMessage?: string): Promise<ServerActionResult<T>> {
  if (error instanceof Error && error.name === "TransportValidationError") {
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: defaultMessage ?? error.message,
      },
    } as const;
  }

  if (error instanceof Error) {
    const isTimeout = error.message.includes("timed out");
    const status = isTimeout ? undefined : readHttpStatus(error);

    return {
      success: false,
      error: {
        code: isTimeout ? "TIMEOUT_ERROR" : "NETWORK_ERROR",
        message: error.message,
        ...(status === undefined ? {} : {status}),
      },
    } as const;
  }

  const status = readHttpStatus(error);

  return {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: defaultMessage ?? (typeof error === "string" ? error : "An unknown error occurred"),
      ...(status === undefined ? {} : {status}),
    },
  } as const;
}

// #endregion
