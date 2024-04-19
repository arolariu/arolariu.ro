import "server-only";

import {AppConfigurationClient} from "@azure/app-configuration";

import {Blob} from "node:buffer";

import {type User} from "@clerk/nextjs/server";
import * as jose from "jose";
import {Resend} from "resend";
import {CONFIG_STORE} from "./utils.generic";

/**
 * Singleton pattern class object that handles the interaction with the Resend API (mail).
 */
export const resend = new Resend(process.env["RESEND_API_KEY"]);

export const API_URL = process.env["API_URL"] ?? "";
export const API_JWT = process.env["API_JWT"] ?? "";

/**
 * Generate a JWT for a user.
 * @param user The user for which to generate the JWT.
 * @returns A promise of the JWT.
 */
export async function generateJWT(user: User | null) {
  const secret = new TextEncoder().encode(API_JWT);

  const header = {alg: "HS256", typ: "JWT"};

  const payload = {
    iss: "https://arolariu.ro",
    aud: "https://api.arolariu.ro",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 180,
    sub: user?.username ?? "guest",
  };

  const jwt = await new jose.SignJWT(payload).setProtectedHeader(header).sign(secret);
  return jwt;
}

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
export function getMimeTypeFromBase64(base64String: string): string | undefined {
  const match = /^data:(.*?);base64,/.exec(base64String);
  return match ? match[1] : undefined;
}

/**
 * Function that converts a base64 string to a Blob
 * @param base64String The base64 string to convert
 * @returns The Blob object
 */
export async function base64ToBlob(base64String: string): Promise<Blob> {
  // Extract and store the mime type.
  const mimeType = getMimeTypeFromBase64(base64String) as string;

  // Remove the mime type from the base64 string.
  const base64 = base64String.replace(/^data:(.*?);base64,/, "");

  const byteCharacters = atob(base64);
  const byteArrays = [];
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArrays.push(byteCharacters.codePointAt(i) as number);
  }

  const byteArray = new Uint8Array(byteArrays);
  return new Blob([byteArray], {type: mimeType});
}
