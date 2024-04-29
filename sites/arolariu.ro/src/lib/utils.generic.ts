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
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
