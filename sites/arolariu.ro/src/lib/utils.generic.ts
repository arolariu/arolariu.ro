/** @format */

import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";

export const SITE_ENV = process.env["SITE_ENV"] ?? "";
export const SITE_URL = process.env["SITE_URL"] ?? "";
export const SITE_NAME = process.env["SITE_NAME"] ?? "";
export const COMMIT_SHA = process.env["COMMIT_SHA"] ?? "";
export const TIMESTAMP = process.env["TIMESTAMP"] ?? "";
export const CONFIG_STORE = process.env["CONFIG_STORE"] ?? "";

/**
 * Function that allows you to merge tailwind classes with other classes
 * @param inputs different classes to merge
 * @returns the merged classes
 */
export function cn(...inputs: Readonly<ClassValue[]>) {
  return twMerge(clsx(inputs));
}

/**
 * Function that generates a GUID from an ArrayBuffer
 * @param arraybuffer The ArrayBuffer to generate the GUID from
 * @returns A UUIDv4 compliant GUID, converted to a string
 * @example
 * GUID: b23090df-9e68-4c12-ae2a-5368db13b6c1
 * GUID: 8b3f7b7e-6b1b-4b7b-8b1b-4b7b8b1b4b7b
 * GUID: b1624a43-1f96-4d22-b94f-d030cc5df437
 */
export function generateGuid(arraybuffer: ArrayBuffer): string {
  const byte_array = new Uint8Array(arraybuffer);
  byte_array[6] = (byte_array[6]! & 0x0f) | 0x40;
  byte_array[8] = (byte_array[8]! & 0x3f) | 0x80;
  const uuid_hex = [...byte_array].map((b) => b.toString(16).padStart(2, "0")).join("");

  const uuid_str = `${uuid_hex.slice(0, 8)}-${uuid_hex.slice(8, 12)}-${uuid_hex.slice(12, 16)}-${uuid_hex.slice(16, 20)}-${uuid_hex.slice(20, 32)}`;

  return uuid_str;
}
