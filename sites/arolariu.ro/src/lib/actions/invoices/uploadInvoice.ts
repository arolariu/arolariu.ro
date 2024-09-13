/** @format */

"use server";

import type {UserInformation} from "@/types/UserInformation";
import Invoice, {InvoicePayload} from "@/types/invoices/Invoice";
import {API_URL} from "../../utils.server";
import uploadBlobToAzureStorage from "../storage/uploadBlob";

/**
 * This function uploads the invoice to the server.
 * There are four main steps:
 * 1. Fetch the user.
 * 2. Generate a JWT for the user.
 * 3. Upload the image to the server.
 * 4. Send a full analysis request to the server.
 * @returns The result of the upload.
 */
export default async function uploadInvoice(blobInformation: string, userInformation: UserInformation) {
  try {
    const storageResponse = await uploadBlobToAzureStorage("invoices", blobInformation);

    const invoicePayload = {
      userIdentifier: userInformation.userIdentifier,
      photoIdentifier: storageResponse.blobIdentifier,
      photoLocation: storageResponse.blobUrl,
      photoMetadata: {} as Record<string, string>,
    } satisfies InvoicePayload;

    const photoMetadata = {dateOfUploadToServer: new Date().toISOString()} as Record<string, string>;
    for (const metadataKey in storageResponse.blobMetadata) {
      const metadataValue = storageResponse.blobMetadata[metadataKey] as string;
      photoMetadata[metadataKey] = metadataValue;
    }

    invoicePayload.photoMetadata = photoMetadata;

    const invoiceHttpHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userInformation.userJwt}`,
    };

    const invoiceResponse = await fetch(`${API_URL}/rest/v1/invoices`, {
      method: "POST",
      headers: invoiceHttpHeaders,
      body: JSON.stringify(invoicePayload),
    });

    const {id} = (await invoiceResponse.json()) as Invoice;
    return {
      status: "SUCCESS",
      message: "Invoice uploaded successfully.",
      identifier: id,
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
