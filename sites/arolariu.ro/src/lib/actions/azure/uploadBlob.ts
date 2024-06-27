/** @format */

"use server";

import {base64ToBlob, fetchConfigurationValue, generateAzureCredentials} from "@/lib/utils.server";
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

  const credentials = await generateAzureCredentials();
  const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");
  const storageClient = new BlobServiceClient(storageEndpoint, credentials);

  const containerClient = storageClient.getContainerClient(containerName);

  const uuid = crypto.randomUUID();
  let officialBlobName = blobName;
  if (officialBlobName === undefined) {
    officialBlobName = `${uuid}.${originalFile.type.split("/")[1] as string}`;
  }

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

  const response = {
    blobIdentifier: uuid,
    blobName: officialBlobName,
    blobUrl: blockBlobClient.url,
    blobMetadata,
  } satisfies BlobStorageResponse;
  console.log(response);

  return response;
}
