/** @format */
"use server";

import {fetchConfigurationValue, generateAzureCredentials} from "@/lib/utils.server";
import {BlobServiceClient} from "@azure/storage-blob";
import {BlobStorageResponse} from "./uploadBlob";

export default async function fetchBlobFromAzureStorage(
  containerName: string,
  blobName: string,
): Promise<BlobStorageResponse> {
  const credentials = await generateAzureCredentials();
  const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");
  const storageClient = new BlobServiceClient(storageEndpoint, credentials);

  const containerClient = storageClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const blobDownloadResponse = await blockBlobClient.download();

  return {
    blobIdentifier: blobName.split(".")[0]!,
    blobName,
    blobUrl: blockBlobClient.url,
    blobMetadata: blobDownloadResponse.metadata,
  };
}
