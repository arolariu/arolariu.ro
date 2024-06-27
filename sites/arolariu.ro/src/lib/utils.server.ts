/** @format */

import "server-only";

import {AppConfigurationClient} from "@azure/app-configuration";
import {DefaultAzureCredential} from "@azure/identity";
import {Blob} from "node:buffer";
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
export async function base64ToBlob(base64String: string): Promise<Blob> {
  // Extract and store the mime type.
  const mimeType = getMimeTypeFromBase64(base64String) as string;

  // Remove the mime type from the base64 string.
  const base64 = base64String.replace(/^data:(.*?);base64,/u, "");

  const byteCharacters = atob(base64);
  const byteArrays = [...byteCharacters].map((char) => char.codePointAt(0) as number);

  const byteArray = new Uint8Array(byteArrays);
  return new Blob([byteArray], {type: mimeType});
}

export async function generateAzureCredentials(): Promise<DefaultAzureCredential> {
  switch (process.env["SITE_ENV"]?.toLowerCase() ?? "development") {
    case "production":
      const managedIdentityClientId = await fetchConfigurationValue("AzureOptions:FrontendIdentityClientId");
      return new DefaultAzureCredential({managedIdentityClientId});
    case "development":
      return new DefaultAzureCredential();
    default:
      return new DefaultAzureCredential();
  }
}
