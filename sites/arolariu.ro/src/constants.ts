/**
 * This file is used to store constants that are used in the BFF NextJS server.
 * The constants are injected into the server at build time.
 * These constants are not available in the client.
 */

import "server-only";

export const SITE_ENV = process.env["SITE_ENV"] ?? "";
export const SITE_URL = process.env["SITE_URL"] ?? "";
export const SITE_NAME = process.env["SITE_NAME"] ?? "";
export const API_URL = process.env["API_URL"] ?? "";
export const API_JWT = process.env["API_JWT"] ?? "";
export const COMMIT_SHA = process.env["COMMIT_SHA"] ?? "";
export const TIMESTAMP = process.env["TIMESTAMP"] ?? "";
export const CONFIG_STORE = process.env["CONFIG_STORE"] ?? "";
