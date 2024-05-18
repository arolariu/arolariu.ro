/** @format */

"use server";

import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import {fetchUser} from "../actions/fetchUser";
import {base64ToBlob, fetchConfigurationValue, generateJWT} from "../utils.server";

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
export default async function uploadInvoice(imageInBase64: string) {
  try {
    // Convert the base64 string to a Blob.
    const invoice = await base64ToBlob(imageInBase64);
    console.log(invoice);

    const {user, isAuthenticated} = await fetchUser();
    const authorizationHeader = await generateJWT(user);
    console.warn("Authorization header:", authorizationHeader);

    // Step 1. Upload invoice photo to the blob storage server.
    const credentials = new DefaultAzureCredential();
    const storageEndpoint = await fetchConfigurationValue("AzureOptions:StorageAccountEndpoint");
    const storageClient = new BlobServiceClient(storageEndpoint, credentials);

    const containerName = "invoices";
    const containerClient = storageClient.getContainerClient(containerName);

    const uuid = crypto.randomUUID();
    const blobName = `${uuid}.${invoice.type.split("/")[1] as string}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const arrayBuffer = await invoice.arrayBuffer();
    await blockBlobClient.uploadData(arrayBuffer, {
      blobHTTPHeaders: {
        blobContentType: invoice.type,
      },
    });

    // TODO: fix this.
    // // Step 2. Send a POST message to the main backend server to ack the image upload.
    // let response = await fetch("https://api.arolariu.ro/rest/invoices", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${authorizationHeader}`,
    //   },
    //   body: JSON.stringify({
    //     photoLocation: `${storageEndpoint}/${containerName}/${blobName}`,
    //     photoMetadata: [
    //       {
    //         key: "Account",
    //         value: isAuthenticated ? user?.id : "guest",
    //       },
    //     ],
    //   }),
    // });

    // // Step 3 (optional). Send a POST message to the main backend server to request a full analysis.
    // if (isAuthenticated) {
    //   // authenticated users get a full analysis as soon as they upload the invoice.
    //   response = await fetch(`https://api.arolariu.ro/rest/user/${user?.id}/invoices/${uuid}/analyze`, {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${authorizationHeader}`,
    //     },
    //     body: "1",
    //   });
    // }

    return {
      status: "SUCCESS",
      message: "Invoice uploaded successfully." + (isAuthenticated ? " Full analysis requested." : ""),
      identifier: crypto.randomUUID(),
    };
  } catch (error) {
    console.error("Error uploading the invoice to the server:", error);
    return {
      status: "FAILURE",
      message: "Error uploading the invoice to the server.",
      identifier: "",
    };
  }
}
