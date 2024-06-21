/** @format */

"use server";

import type {UserInformation} from "@/types/UserInformation";
import {InvoicePayload} from "@/types/invoices/Invoice";
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
      userIdentfier: userInformation.userIdentifier,
      photoIdentifier: blobInformation.blobIdentifier,
      photoLocation: blobInformation.blobUrl,
      photoMetadata: [{key: "dateOfUploadToServer", value: new Date().toISOString()}],
    } satisfies InvoicePayload;

    for (const metadataKey in blobInformation.blobMetadata) {
      invoicePayload.photoMetadata.push({key: metadataKey, value: blobInformation.blobMetadata[metadataKey]!});
    }

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

    return {
      status: "SUCCESS",
      message: "Invoice uploaded successfully.",
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
