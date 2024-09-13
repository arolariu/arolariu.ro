/** @format */
"use server";

import {fetchConfigurationValue} from "@/lib/utils.server";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import {BlobStorageResponse} from "./uploadBlob";

export default async function fetchBlob(containerName: string, blobName: string): Promise<BlobStorageResponse> {
  try {
    const credentials = new DefaultAzureCredential();
    const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");
    const storageClient = new BlobServiceClient(storageEndpoint, credentials);

    const containerClient = storageClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const blobDownloadResponse = await blockBlobClient.download();

    return {
      status: blobDownloadResponse._response.status,
      blobIdentifier: blobName.split(".")[0]!,
      blobName,
      blobUrl: blockBlobClient.url,
      blobMetadata: blobDownloadResponse.metadata,
    };
  } catch (error) {
    console.error("Error fetching blob from Azure Storage", error);
    return {
      status: 500,
      blobIdentifier: "",
      blobName: "",
      blobUrl: "",
      blobMetadata: {},
    };
  }
}
