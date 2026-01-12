/**
 * @fileoverview Server action for fetching blobs from Azure Storage.
 * @module sites/arolariu.ro/src/lib/actions/storage/fetchBlob
 */

"use server";

import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import fetchConfigurationValue from "./fetchConfig";

type ServerActionInputType = {
  containerName: string;
  blobName: string;
};

type ServerActionOutputType = Promise<
  Readonly<{
    status: number;
    blobIdentifier: string;
    blobName: string;
    blobUrl: string;
    blobMetadata?: {[propertyName: string]: string};
  }>
>;

/**
 * This server action will fetch a blob from Azure Storage.
 * The blob will be fetched from the specified container and will be identified by the blob name.
 * @param containerName - The name of the container where the blob is stored.
 * @param blobName - The name of the blob to fetch.
 * @returns The response from the Azure Storage service.
 */
export default async function fetchBlob({containerName, blobName}: ServerActionInputType): ServerActionOutputType {
  try {
    const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");
    const storageCredentials = new DefaultAzureCredential();
    const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);

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
