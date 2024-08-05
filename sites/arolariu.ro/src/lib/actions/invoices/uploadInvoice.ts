/** @format */

"use server";

import type {UserInformation} from "@/types/UserInformation";
import Invoice, {InvoicePayload} from "@/types/invoices/Invoice";
import {API_URL} from "../../utils.server";
import {BlobStorageResponse} from "../azure/uploadBlob";

/**
 * This function uploads the invoice to the server.
 * There are four main steps:
 * 1. Fetch the user.
 * 2. Generate a JWT for the user.
 * 3. Upload the image to the server.
 * 4. Send a full analysis request to the server.
 * @returns The result of the upload.
 */
export default async function uploadInvoice(blobInformation: BlobStorageResponse, userInformation: UserInformation) {
  try {
    const invoicePayload = {
      userIdentifier: userInformation.userIdentifier,
      photoIdentifier: blobInformation.blobIdentifier,
      photoLocation: blobInformation.blobUrl,
      photoMetadata: {} as Record<string, string>,
    } satisfies InvoicePayload;

    const photoMetadata = {dateOfUploadToServer: new Date().toISOString()} as Record<string, string>;
    for (const metadataKey in blobInformation.blobMetadata) {
      const metadataValue = blobInformation.blobMetadata[metadataKey] as string;
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

    if (!invoiceResponse.ok) {
      console.error("Error uploading the invoice to the server:", invoiceResponse.statusText);
      return {
        status: "FAILURE",
        message: "Error uploading the invoice to the server.",
        identifier: "",
      };
    }

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
