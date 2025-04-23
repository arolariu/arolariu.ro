/** @format */

"use server";

import {convertBase64ToBlob} from "@/lib/utils.server";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import fetchConfigurationValue from "./fetchConfig";

export type BlobStorageResponse = {
  status: number;
  blobIdentifier: string;
  blobName: string;
  blobUrl: string;
  blobMetadata?: {[propertyName: string]: string};
};

/**
 * This server action will upload a blob to Azure Storage.
 * The blob will be uploaded to the specified container and will be identified by the blob name.
 * The blob will be uploaded from a base64 string representation; it can also have additional metadata.
 * @param containerName The name of the container where the blob will be stored.
 * @param base64Data The base64 data of the blob to upload.
 * @param metadata Additional metadata to attach to the blob.
 * @param blobName The name of the blob to upload.
 * @returns The response from the Azure Storage service.
 */
export default async function uploadBlob(
  containerName: string,
  base64Data: string,
  metadata?: {[propertyName: string]: string},
  blobName?: string,
): Promise<BlobStorageResponse> {
  try {
    const originalFile = await convertBase64ToBlob(base64Data);

    const storageCredentials = new DefaultAzureCredential();
    const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");

    const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);
    const containerClient = storageClient.getContainerClient(containerName);

    const uuid = crypto.randomUUID();
    const officialBlobName = blobName ?? `${uuid}.${originalFile.type.split("/")[1] as string}`;
    const blockBlobClient = containerClient.getBlockBlobClient(officialBlobName);

    const arrayBuffer = await originalFile.arrayBuffer();
    const blobMetadata = {
      ...metadata,
      officialBlobName,
      approximateSizeInMb: (originalFile.size / 1024 / 1024).toPrecision(4),
      type: originalFile.type,
    };

    const blobUploadResponse = await blockBlobClient.uploadData(arrayBuffer, {
      blobHTTPHeaders: {
        blobContentType: originalFile.type,
      },
      metadata: blobMetadata,
    });

    if (blobUploadResponse._response.status !== 201) {
      console.error("Error uploading blob to Azure Storage", blobUploadResponse);
    }

    return {
      status: blobUploadResponse._response.status,
      blobIdentifier: uuid,
      blobName: officialBlobName,
      blobUrl: blockBlobClient.url,
      blobMetadata,
    } satisfies BlobStorageResponse;
  } catch (error) {
    console.error("Error uploading the blob to Azure Storage:", error);
    return {
      status: 500,
      blobIdentifier: "",
      blobName: "",
      blobUrl: "",
    } satisfies BlobStorageResponse;
  }
}
