/** @format */

import {Blob} from "node:buffer";
import crypto from "node:crypto";
import {Resend} from "resend";

export const API_URL = process.env["API_URL"] ?? "";
export const API_JWT = process.env["API_JWT"] ?? "";

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
 * This function creates a JWT token, using the header, payload, and secret.
 * It uses the HMAC SHA256 algorithm to sign the token.
 * @param header The header of the JWT token, which contains the algorithm and type.
 * @param payload The payload of the JWT token, which contains the claims.
 * @param secret The secret to sign the JWT token with, which is a string.
 * @returns The JWT token signed with the secret, header, and payload.
 * @see https://jwt.io/
 */
export function createJwtToken(
  header: Readonly<{alg: string; typ: string}>,
  payload: Readonly<{[key: string]: any}>,
  secret: Readonly<string>,
): Readonly<string> {
  const __base64UrlEncode__ = (str: string): Readonly<string> =>
    Buffer.from(str).toString("base64").replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");

  const encodedHeader = __base64UrlEncode__(JSON.stringify(header));
  const encodedPayload = __base64UrlEncode__(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");

  return `${encodedHeader}.${encodedPayload}.${signature}` as const;
}
