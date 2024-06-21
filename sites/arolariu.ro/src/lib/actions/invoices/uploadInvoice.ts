/** @format */

"use server";

import {SITE_URL} from "@/lib/utils.generic";
import type {UserInformation} from "@/types/UserInformation";
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
export default async function uploadInvoice(blobInformation: BlobStorageResponse) {
  try {
    const userInformationResponse = await fetch(`${SITE_URL}/api/user`);
    const userInformation = (await userInformationResponse.json()) as UserInformation;

    const invoicePayload = {
      userIdentfier: userInformation.userIdentifier,
      photoIdentifier: blobInformation.blobIdentifier,
      photoLocation: blobInformation.blobUrl,
      photoMetadata: blobInformation.blobMetadata,
    };

    const invoiceHttpHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userInformation.userJwt}`,
    };

    console.log("userInformation", userInformation);
    console.log("invoicePayload", invoicePayload);
    console.log("invoiceHttpHeaders", invoiceHttpHeaders);

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
