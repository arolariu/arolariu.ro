/**
 * @fileoverview Factory for creating Azure Blob Storage clients that work in
 * both local Docker (Azurite over HTTP) and Azure (Managed Identity over HTTPS).
 *
 * @module sites/arolariu.ro/src/lib/azure/storageClient
 */

// eslint-disable-next-line n/no-extraneous-import -- server-only is a Next.js build-time marker
import "server-only";

import {BlobServiceClient} from "@azure/storage-blob";

/** Well-known Azurite development storage connection string prefix. */
const AZURITE_CONN_PREFIX =
  "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=";

/**
 * Creates a BlobServiceClient for the given storage endpoint.
 *
 * - **HTTP endpoints** (Azurite): uses the well-known dev connection string
 *   because the Azure SDK refuses `TokenCredential` over plain HTTP.
 * - **HTTPS endpoints** (Azure): uses Managed Identity via `getAzureCredential()`.
 */
export async function createBlobClient(storageEndpoint: string): Promise<BlobServiceClient> {
  if (storageEndpoint.startsWith("http://")) {
    const connStr = `${AZURITE_CONN_PREFIX}${storageEndpoint};`;
    return BlobServiceClient.fromConnectionString(connStr);
  }

  const {getAzureCredential} = await import("@/lib/azure/credentials");
  return new BlobServiceClient(storageEndpoint, getAzureCredential());
}
