"use server";

import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import {fetchConfigurationValue, fetchUser, generateJWT} from "../utils.server";

type invoiceRequest = {
  image: undefined | Blob;
};

type invoiceResponse = {
  status: "SUCCESS" | "FAILURE";
  message: string;
  identifier: string;
};

/**
 * This function uploads the invoice to the server.
 * There are four main steps:
 * 1. Fetch the user.
 * 2. Generate a JWT for the user.
 * 3. Upload the image to the server.
 * 4. Send a full analysis request to the server.
 * @param image The image to be uploaded.
 * @returns The result of the upload.
 */
export default async function uploadInvoice(invoice: invoiceRequest): Promise<invoiceResponse> {
  const {user, isAuthenticated} = await fetchUser();
  const authorizationHeader = await generateJWT(user);

  // Step 1. Upload invoice photo to the blob storage server.
  const credentials = new DefaultAzureCredential();
  const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");
  const storageClient = new BlobServiceClient(storageEndpoint, credentials);

  const containerName = "invoices";
  const containerClient = storageClient.getContainerClient(containerName);

  const uuid = crypto.randomUUID();
  const blobName = `${uuid}.${invoice.image?.type.split("/")[1]}`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.upload(invoice.image as Blob, invoice.image?.size as number);

  // Step 2. Send a POST message to the main backend server to ack the image upload.
  let response = await fetch("https://api.arolariu.ro/rest/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authorizationHeader}`,
    },
    body: JSON.stringify({
      photoLocation: `${storageEndpoint}/${containerName}/${blobName}`,
      photoMetadata: [
        {
          key: "Account",
          value: isAuthenticated ? user?.id : "guest",
        },
      ],
    }),
  });

  console.log(response);

  // Step 3 (optional). Send a POST message to the main backend server to request a full analysis.
  if (isAuthenticated) {
    // authenticated users get a full analysis as soon as they upload the invoice.
    response = await fetch(`https://api.arolariu.ro/rest/user/${user?.id}/invoices/${uuid}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authorizationHeader}`,
      },
      body: "1",
    });

    console.log(response);
  }

  return {
    status: "SUCCESS",
    message: "Invoice uploaded successfully.",
    identifier: uuid,
  };
}
