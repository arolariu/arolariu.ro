/**
 * @fileoverview Azure helpers and config key mappings used by monorepo scripts.
 * @module scripts/azure
 *
 * @remarks
 * Provides the mapping between exp config key names and typed environment
 * variable names, plus small utilities for detecting secrets.
 */

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
 * This is the single source of truth for generated App Configuration keys.
 * Used by `generate.env.ts` to translate the exp `/api/v1/build-time`
 * response into a `.env` file with the correct variable names.
 */
export const APP_CONFIGURATION_MAPPING = {
  "Site:Environment": "SITE_ENV",
  "Site:Name": "SITE_NAME",
  "Site:Url": "SITE_URL",
  "Auth:Clerk:PublishableKey": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "Auth:Clerk:SecretKey": "CLERK_SECRET_KEY",
  "Site:UseCdn": "USE_CDN",
} as const satisfies Record<string, string>;

/**
 * Union of all values in {@link APP_CONFIGURATION_MAPPING}; the set of
 * environment variable names that the generator fetches or prompts for.
 */
export type AppConfigurationEnvironmentKey = (typeof APP_CONFIGURATION_MAPPING)[keyof typeof APP_CONFIGURATION_MAPPING];

/**
 * Azure Managed Identity / WorkloadIdentity environment variable names that
 * are preserved verbatim from an existing `.env` file into the generated one.
 */
export const AZURE_RUNTIME_IDENTITY_KEYS = ["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"] as const;

/**
 * Union of all environment variable names that may appear in a generated `.env`
 * file — the App Configuration values plus the Azure runtime identity keys.
 */
export type GeneratedEnvironmentKey = AppConfigurationEnvironmentKey | (typeof AZURE_RUNTIME_IDENTITY_KEYS)[number];

/**
 * Canonical type for fetched, prompted, and persisted environment configuration
 * in generator scripts.  Only keys derived from the Azure mapping and the Azure
 * runtime identity set are permitted.
 */
export type GeneratedEnvironmentConfiguration = Partial<Record<GeneratedEnvironmentKey, string>>;
