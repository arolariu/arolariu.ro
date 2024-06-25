/** @format */
"use server";

import {fetchConfigurationValue} from "@/lib/utils.server";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import {BlobStorageResponse} from "./uploadBlob";

export default async function fetchBlobFromAzureStorage(
  containerName: string,
  blobName: string,
): Promise<BlobStorageResponse> {
  const credentials = new DefaultAzureCredential();
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
