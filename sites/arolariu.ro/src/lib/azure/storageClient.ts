/**
 * @fileoverview Factory for creating Azure Blob Storage clients that work in
 * both local Docker (Azurite over HTTP) and Azure (Managed Identity over HTTPS).
 *
 * @module sites/arolariu.ro/src/lib/azure/storageClient
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {BlobServiceClient} from "@azure/storage-blob";

/**
 * Well-known Azurite development storage connection string prefix.
 * This is the canonical public key for Azurite's devstoreaccount1 — it is NOT a real credential.
 * @see https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite#well-known-storage-account-and-key
 */
const AZURITE_CONN_PREFIX =
  "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=";

/** Docker-internal Azurite hostname that must be rewritten for browser access. */
/* eslint-disable sonarjs/no-clear-text-protocols -- Azurite local emulator uses HTTP */
const AZURITE_DOCKER_ORIGIN = "http://azurite:10000";
const AZURITE_HOST_ORIGIN = "http://localhost:10000";
/* eslint-enable sonarjs/no-clear-text-protocols */

/**
 * Rewrites Docker-internal Azurite blob URLs to host-accessible URLs.
 * Inside Docker, blobs are stored with `http://azurite:10000/...` URLs which are
 * unreachable from the host browser. This replaces them with `http://localhost:10000/...`.
 *
 * @param url - The blob URL to normalize
 * @returns The URL with Docker-internal hostname replaced, or unchanged if not Azurite
 */
export function rewriteAzuriteUrl(url: string): string {
  return url.replace(AZURITE_DOCKER_ORIGIN, AZURITE_HOST_ORIGIN);
}

/**
 * Creates a BlobServiceClient for the given storage endpoint.
 *
 * - **HTTP endpoints** (Azurite): uses the well-known dev connection string
 *   because the Azure SDK refuses `TokenCredential` over plain HTTP.
 * - **HTTPS endpoints** (Azure): uses Managed Identity via `getAzureCredential()`.
 */
export async function createBlobClient(storageEndpoint: string): Promise<BlobServiceClient> {
  if (storageEndpoint.startsWith("http://")) {
    if (process.env["AZURE_CLIENT_ID"]) {
      throw new Error("HTTP storage endpoints are not allowed in production. Use HTTPS.");
    }
    const connStr = `${AZURITE_CONN_PREFIX}${storageEndpoint};`;
    return BlobServiceClient.fromConnectionString(connStr);
  }

  const {getAzureCredential} = await import("@/lib/azure/credentials");
  return new BlobServiceClient(storageEndpoint, getAzureCredential());
}
