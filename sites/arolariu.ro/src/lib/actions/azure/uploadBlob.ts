/** @format */

"use server";

import {base64ToBlob, fetchConfigurationValue} from "@/lib/utils.server";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";

export type BlobStorageResponse = {
  blobIdentifier: string;
  blobName: string;
  blobUrl: string;
  blobMetadata?: {[propertyName: string]: string};
};

export default async function uploadBlobToAzureStorage(
  containerName: string,
  fileRepresetationAsRawString: string,
  metadata?: {[propertyName: string]: string},
  blobName?: string,
): Promise<BlobStorageResponse> {
  const originalFile = await base64ToBlob(fileRepresetationAsRawString);

  const credentials = new DefaultAzureCredential();
  const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");
  const storageClient = new BlobServiceClient(storageEndpoint, credentials);

  const containerClient = storageClient.getContainerClient(containerName);

  const uuid = crypto.randomUUID();
  blobName = `${uuid}.${originalFile.type.split("/")[1] as string}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const arrayBuffer = await originalFile.arrayBuffer();
  const blobMetadata = {
    ...metadata,
    blobName,
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
    blobIdentifier: uuid,
    blobName,
    blobUrl: blockBlobClient.url,
    blobMetadata,
  };
}
