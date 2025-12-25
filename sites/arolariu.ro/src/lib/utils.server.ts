// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker, not a runtime import
import "server-only";

import {addSpanEvent, logWithTrace, recordSpanError, withSpan} from "@/instrumentation.server";
import {type JWTPayload, SignJWT, jwtVerify} from "jose";
import {Blob} from "node:buffer";
import {Resend} from "resend";

/* v8 ignore start - Environment variables evaluated at module load time cannot be unit tested */
export const API_URL = process.env["API_URL"] ?? "";
export const API_JWT = process.env["API_JWT"] ?? "";

/**
 * The configuration store identifier.
 *
 * @remarks
 * **Source**: `process.env.CONFIG_STORE`
 *
 * **Usage**: Identifies the Azure App Configuration store or local config source.
 */
export const CONFIG_STORE = process.env["CONFIG_STORE"] ?? "";
/* v8 ignore stop */

/**
 * Singleton pattern class object that handles the interaction with the Resend API (mail).
 * @see https://resend.com/docs/getting-started
 */
export const resend = new Resend(process.env["RESEND_API_KEY"]);

/**
 * This function extracts a base64 string from a blob, and returns the mime type.
 * @param base64String The base64 string to extract the mime type from
 * @returns The mime type, or null if not found
 */
export function getMimeTypeFromBase64(base64String: string): string | null {
  // Use a named capture group for the mime type to satisfy lint rule and improve clarity
  const match = /^data:(?<mime>[^;]+);base64,/u.exec(base64String);
  return match?.groups?.["mime"] ?? null;
}

/**
 * This async function converts a base64 string to a Blob object.
 * It uses the atob function to decode the base64 string and create a Blob object from it.
 * @param base64String The base64 string to convert
 * @returns The Blob object created from the base64 string
 * @see https://developer.mozilla.org/en-US/docs/Web/API/atob
 */
export async function convertBase64ToBlob(base64String: string): Promise<Blob> {
  // Extract and store the mime type.
  const mimeType = getMimeTypeFromBase64(base64String) as string;

  // Remove the mime type from the base64 string.
  // Use a non-capturing group since we don't consume the captured value here
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
