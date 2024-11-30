/** @format */

import {AppConfigurationClient} from "@azure/app-configuration";
import {Blob} from "node:buffer";
import crypto from "node:crypto";
import {Resend} from "resend";
import {CONFIG_STORE} from "./utils.generic";

/**
 * Singleton pattern class object that handles the interaction with the Resend API (mail).
 */
export const resend = new Resend(process.env["RESEND_API_KEY"]);

export const API_URL = process.env["API_URL"] ?? "";
export const API_JWT = process.env["API_JWT"] ?? "";

/**
 * Function to fetch a configuration value from Azure App Configuration.
 * @param key The key of the configuration value to fetch.
 * @returns The value of the configuration value.
 */
export async function fetchConfigurationValue(key: string): Promise<string> {
  console.log("Trying to fetch the following key:", key);
  const client = new AppConfigurationClient(CONFIG_STORE);
  const setting = await client.getConfigurationSetting({key});
  return setting.value ?? "";
}

/**
 * Function that extracts a base64 string from a blob
 * @param base64String The base64 string to extract the mime type from
 * @returns The mime type
 */
export function getMimeTypeFromBase64(base64String: string): string | null {
  const match = /^data:(.*?);base64,/u.exec(base64String);
  return match ? match.at(1)! : null;
}

/**
 * Function that converts a base64 string to a Blob
 * @param base64String The base64 string to convert
 * @returns The Blob object
 */
export async function convertBase64ToBlob(base64String: string): Promise<Blob> {
  // Extract and store the mime type.
  const mimeType = getMimeTypeFromBase64(base64String) as string;

  // Remove the mime type from the base64 string.
  const base64 = base64String.replace(/^data:(.*?);base64,/u, "");

  const byteCharacters = atob(base64);
  const byteArrays = [...byteCharacters].map((char) => char.codePointAt(0) as number);

  const byteArray = new Uint8Array(byteArrays);
  return new Blob([byteArray], {type: mimeType});
}

function __base64UrlEncode(str: string): string {
  return Buffer.from(str).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

type JwtHeader = {alg: string; typ: string};
type JwtPayload = {[key: string]: any};

/**
 * This function creates a JWT token.
 * @param header  The header of the JWT token.
 * @param payload  The payload of the JWT token.
 * @param secret  The secret to sign the JWT token with.
 * @returns  The JWT token signed with the secret, header, and payload.
 */
export function createJwtToken(header: JwtHeader, payload: JwtPayload, secret: string): string {
  const encodedHeader = __base64UrlEncode(JSON.stringify(header));
  const encodedPayload = __base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
