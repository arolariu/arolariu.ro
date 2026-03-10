/**
 * @fileoverview Azure helpers and config key mappings used by monorepo scripts.
 * @module scripts/azure
 *
 * @remarks
 * Provides the mapping between exp config key names and typed environment
 * variable names, plus small utilities for detecting secrets.
 */

import type {AllEnvironmentVariablesKeys} from "../types";

/**
 * Checks if a given key name represents a secret by pattern matching
 * against common secret indicators.
 *
 * @param key - The key name to check.
 * @returns `true` if the key appears to represent a secret.
 */
export function isSecretKey(key: string): boolean {
  const secretPatternsType = ["SECRET", "KEY", "JWT", "TOKEN", "PASSWORD"];
  return secretPatternsType.some((pattern) => key.includes(pattern));
}

/**
 * Mapping between exp config key names and the typed environment variable
 * names expected by the website build.
 *
 * @remarks
 * Used by `generate.env.ts` to translate the exp `/api/v1/build-time`
 * response into a `.env` file with the correct variable names.
 */
export const APP_CONFIGURATION_MAPPING: Record<string, AllEnvironmentVariablesKeys> = {
  "Site:Environment": "SITE_ENV",
  "Site:Name": "SITE_NAME",
  "Site:Url": "SITE_URL",
  "Auth:Clerk:PublishableKey": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "Auth:Clerk:SecretKey": "CLERK_SECRET_KEY",
  "Site:UseCdn": "USE_CDN",
};
