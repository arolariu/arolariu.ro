/**
 * @fileoverview Server-only utilities for network and auth concerns.
 * @module sites/arolariu.ro/src/lib/utils.server
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker, not a runtime import
import "server-only";

import {addSpanEvent, logWithTrace, recordSpanError, withSpan} from "@/instrumentation.server";
import {fetchApiUrl} from "@/lib/config/configProxy";
import {type JWTPayload, SignJWT, jwtVerify} from "jose";
import {Blob} from "node:buffer";

/**
 * This async function converts a base64 string to a Blob object.
 * It uses the atob function to decode the base64 string and create a Blob object from it.
 * @param base64String The base64 string to convert
 * @returns The Blob object created from the base64 string
 * @see https://developer.mozilla.org/en-US/docs/Web/API/atob
 */
export async function convertBase64ToBlob(base64String: string): Promise<Blob> {
  // Extract mime type from data URL pattern
  const mimeMatch = /^data:(?<mime>[^;]+);base64,/u.exec(base64String);
  const mimeType = mimeMatch?.groups?.["mime"] ?? "application/octet-stream";

  // Remove the mime type prefix from the base64 string
  const base64 = base64String.replace(/^data:(?:[^;]+);base64,/u, "");

  const byteCharacters = atob(base64);
  const byteArrays = [...byteCharacters].map((char) => char.codePointAt(0) as number);

  const byteArray = new Uint8Array(byteArrays);
  return new Blob([byteArray], {type: mimeType});
}

/**
 * Creates a JWT token using the jose library.
 * This function signs the payload with the provided secret using HS256 algorithm.
 * @param payload The JWT payload containing claims (iss, aud, sub, iat, exp, etc.)
 * @param secret The secret key for signing the token (base64 encoded)
 * @returns Promise resolving to the signed JWT token string
 * @see https://github.com/panva/jose
 */
export async function createJwtToken(payload: Readonly<JWTPayload>, secret: Readonly<string>): Promise<Readonly<string>> {
  return withSpan("auth.jwt.create", async (span) => {
    try {
      const startTime = Date.now();

      // Set span attributes for JWT creation
      span.setAttributes({
        "jwt.algorithm": "HS256",
        "jwt.subject": payload["sub"] ?? "unknown",
        "jwt.issuer": payload["iss"] ?? "unknown",
        "jwt.audience": payload["aud"] ?? "unknown",
      });

      addSpanEvent("jwt.signing.start");
      logWithTrace("debug", "Creating JWT token", {subject: payload["sub"]}, "server");

      // Convert the base64-encoded secret to Uint8Array
      const secretKey = new TextEncoder().encode(secret);
      const jwt = await new SignJWT(payload).setProtectedHeader({alg: "HS256", typ: "JWT"}).setIssuedAt().sign(secretKey);

      const duration = Date.now() - startTime;
      addSpanEvent("jwt.signing.complete", {
        "jwt.duration_ms": duration,
      });

      span.setAttributes({
        "jwt.created": true,
        "jwt.duration_ms": duration,
      });

      logWithTrace("info", "JWT token created successfully", {subject: payload["sub"], duration}, "server");

      return jwt;
    } catch (error) {
      recordSpanError(error, "Failed to create JWT token");
      const errorMessage = error instanceof Error ? error.message : "Failed to create JWT token";
      logWithTrace("error", "JWT token creation failed", {error: errorMessage}, "server");
      throw new Error(errorMessage, {cause: error});
    }
  });
}

/**
 * JWT token verification result type.
 */
export type JwtVerificationResult = {valid: true; payload: Record<string, any>} | {valid: false; error: string};

/**
 * Error codes for server action failures.
 */
export type ServerActionErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "AUTH_ERROR"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN_ERROR";

/**
 * Standardized result type for server actions.
 * Use this for consistent error handling across all server actions.
 */
export type ServerActionResult<T> =
  | {success: true; data: T}
  | {success: false; error: {code: ServerActionErrorCode; message: string; status?: number}};

/**
 * Default timeout for fetch requests in milliseconds (30 seconds).
 */
export const DEFAULT_FETCH_TIMEOUT = 30_000;

function trimTrailingSlashes(value: string): string {
  let normalizedValue = value;

  while (normalizedValue.endsWith("/")) {
    normalizedValue = normalizedValue.slice(0, -1);
  }

  return normalizedValue;
}

async function resolveFetchUrl(url: string): Promise<string> {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const apiUrl = await fetchApiUrl();

  if (apiUrl.trim().length === 0) {
    return url;
  }

  const normalizedBaseUrl = trimTrailingSlashes(apiUrl);
  const normalizedPath = url.startsWith("/") ? url : `/${url}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
}

/**
 * Performs a fetch request with timeout support for either absolute URLs or API-relative paths.
 * Wraps the native fetch with AbortController for timeout handling and resolves relative paths
 * against the exp-provided API base URL on the server.
 *
 * @param url - Absolute URL or API-relative path to fetch
 * @param options - Fetch options (headers, method, body, etc.)
 * @param timeoutMs - Timeout in milliseconds (default: 30 seconds)
 * @returns Promise resolving to the Response object
 * @throws {Error} When request times out or network fails
 *
 * @example
 * ```typescript
 * const response = await fetchWithTimeout(
 *   "/rest/v1/invoices",
 *   { headers: { Authorization: `Bearer ${token}` } },
 *   15000 // 15 second timeout
 * );
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resolvedUrl = await resolveFetchUrl(url);
    const response = await fetch(resolvedUrl, {
      ...options,
      signal: controller.signal,
      cache: "no-store", // Disable caching for authenticated requests
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`, {cause: error});
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Maps HTTP status codes to server action error codes.
 * @param status - HTTP status code
 * @returns Corresponding ServerActionErrorCode
 */
export function mapHttpStatusToErrorCode(status: number): ServerActionErrorCode {
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

/**
 * Creates a standardized error result from an error object.
 * @param error - The caught error
 * @param defaultMessage - Default message if error doesn't have one
 * @returns ServerActionResult with error details
 */
export function createErrorResult<T>(error: unknown, defaultMessage: string): ServerActionResult<T> {
  if (error instanceof Error) {
    const isTimeout = error.message.includes("timed out");
    return {
      success: false,
      error: {
        code: isTimeout ? "TIMEOUT_ERROR" : "NETWORK_ERROR",
        message: error.message,
      },
    };
  }
  return {
    success: false,
    error: {
      code: "UNKNOWN_ERROR",
      message: defaultMessage,
    },
  };
}

/**
 * Verifies and decodes a JWT token using the jose library.
 * This function validates the signature, expiration, and not-before claims.
 * @param token The JWT token string to verify
 * @param secret The secret key used to verify the token signature (base64 encoded)
 * @returns Promise resolving to verification result with decoded payload if valid, or error if invalid
 * @see https://github.com/panva/jose
 */
export async function verifyJwtToken(token: Readonly<string>, secret: Readonly<string>): Promise<JwtVerificationResult> {
  return withSpan("auth.jwt.verify", async (span) => {
    try {
      const startTime = Date.now();

      span.setAttributes({
        "jwt.algorithm": "HS256",
      });

      addSpanEvent("jwt.verification.start");
      logWithTrace("debug", "Verifying JWT token", undefined, "server");

      // Convert the base64-encoded secret to Uint8Array
      const secretKey = new TextEncoder().encode(secret);
      const {payload} = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
      });

      const duration = Date.now() - startTime;
      addSpanEvent("jwt.verification.complete", {
        "jwt.valid": true,
        "jwt.duration_ms": duration,
      });

      span.setAttributes({
        "jwt.valid": true,
        "jwt.subject": (payload["sub"] as string) ?? "unknown",
        "jwt.issuer": (payload["iss"] as string) ?? "unknown",
        "jwt.duration_ms": duration,
      });

      logWithTrace("info", "JWT token verified successfully", {subject: payload["sub"], duration}, "server");

      return {valid: true, payload: payload as Record<string, any>};
    } catch (error) {
      addSpanEvent("jwt.verification.failed", {
        "jwt.valid": false,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      span.setAttributes({
        "jwt.valid": false,
        "jwt.error": error instanceof Error ? error.message : "Unknown error",
      });

      logWithTrace("warn", "JWT token verification failed", {error: error instanceof Error ? error.message : "Unknown error"}, "server");

      return {
        valid: false,
        error: error instanceof Error ? error.message : "Token verification failed",
      };
    }
  });
}
