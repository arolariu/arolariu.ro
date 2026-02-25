/**
 * @fileoverview Hardcoded storage configuration for scan server actions.
 * @module lib/actions/scans/storageConfig
 *
 * @remarks
 * This helper intentionally keeps frontend storage configuration hardcoded for now
 * so all scan actions share a single source of truth. Dynamic configuration lookup
 * can replace this helper in a future migration.
 */

/**
 * Frontend storage configuration shape.
 */
export type FrontendStorageConfiguration = Readonly<{
  storageEndpoint: string;
  containerName: string;
}>;

const HARDCODED_STORAGE_CONFIGURATION: FrontendStorageConfiguration = {
  storageEndpoint: "https://qtcy47sacc.blob.core.windows.net/",
  containerName: "invoices",
} as const;

/**
 * Returns hardcoded storage configuration for scan workflows.
 */
export function getScansStorageConfiguration(): FrontendStorageConfiguration {
  return HARDCODED_STORAGE_CONFIGURATION;
}

/**
 * Extracts the Azure Storage account name from a Blob endpoint URL.
 */
export function getStorageAccountName(storageEndpoint: string): string {
  const {hostname} = new URL(storageEndpoint);
  const [accountName] = hostname.split(".");

  if (!accountName) {
    throw new Error(`Unable to derive storage account name from endpoint: ${storageEndpoint}`);
  }

  return accountName;
}

