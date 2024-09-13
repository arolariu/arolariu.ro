/** @format */

"use server";

import {convertBase64ToBlob, fetchConfigurationValue} from "@/lib/utils.server";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";

export type BlobStorageResponse = {
  status: number;
  blobIdentifier: string;
  blobName: string;
  blobUrl: string;
  blobMetadata?: {[propertyName: string]: string};
};

export default async function uploadBlob(
  containerName: string,
  base64Data: string,
  metadata?: {[propertyName: string]: string},
  blobName?: string,
): Promise<BlobStorageResponse> {
  try {
    const originalFile = await convertBase64ToBlob(base64Data);

    const credentials = new DefaultAzureCredential();
    const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");

    const storageClient = new BlobServiceClient(storageEndpoint, credentials);
    const containerClient = storageClient.getContainerClient(containerName);

    const uuid = crypto.randomUUID();
    let officialBlobName = blobName ?? `${uuid}.${originalFile.type.split("/")[1] as string}`;
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
