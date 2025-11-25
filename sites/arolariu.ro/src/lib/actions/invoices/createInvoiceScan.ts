import {convertBase64ToBlob} from "@/lib/utils.server";
import {withSpan} from "@/telemetry";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";

type ServerActionInputType = Readonly<{
  base64Data: string;
  blobName: string;
  metadata?: {[propertyName: string]: string};
}>;
type ServerActionOutputType = Promise<
  Readonly<{
    status: number;
    blobUrl: string;
  }>
>;

export async function createInvoiceScan({base64Data, metadata, blobName}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{createInvoiceScan}} with:", {blobName});

  return withSpan("api.actions.invoices.createInvoiceScan", async () => {
    try {
      // Step 1. Prepare for blob upload
      const containerName = "invoices";
      const storageCredentials = new DefaultAzureCredential();
      // todo: fetch from config service.
      const storageEndpoint = "https://qtcy47sacc.blob.core.windows.net/";

      // Step 2. Upload the blob to Azure Storage
      const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);
      const containerClient = storageClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const originalFile = await convertBase64ToBlob(base64Data);
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
        status: blobUploadResponse._response.status,
        blobUrl: blockBlobClient.url,
      } as const;
    } catch (error) {
      console.error("Error uploading invoice scan:", error);
      throw error;
    }
  });
}
