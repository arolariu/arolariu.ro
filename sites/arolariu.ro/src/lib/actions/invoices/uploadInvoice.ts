/** @format */

"use server";

import type {UserInformation} from "@/types";
import type {Invoice, InvoicePayload} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import uploadBlobToAzureStorage from "../storage/uploadBlob";

type ActionInput = {
  blobInformation: string;
  userInformation: UserInformation;
};

type ActionOutput = {
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
 * @returns The result of the upload.
 */
export default async function uploadInvoice({blobInformation, userInformation}: Readonly<ActionInput>): Promise<ActionOutput> {
  try {
    const storageResponse = await uploadBlobToAzureStorage("invoices", blobInformation);

    const invoicePayload = {
      userIdentifier: userInformation.userIdentifier,
      photoIdentifier: storageResponse.blobIdentifier,
      photoLocation: storageResponse.blobUrl,
      photoMetadata: {} as Record<string, string>,
    } satisfies InvoicePayload;

    const photoMetadata = {dateOfUploadToServer: new Date().toISOString()} as Record<string, string>;

    // eslint-disable-next-line guard-for-in -- we care for all metadata keys.
    for (const metadataKey in storageResponse.blobMetadata) {
      // eslint-disable-next-line security/detect-object-injection -- this is safe.
      const metadataValue = storageResponse.blobMetadata[metadataKey] as string;
      // eslint-disable-next-line security/detect-object-injection -- this is safe.
      photoMetadata[metadataKey] = metadataValue;
    }

    invoicePayload.photoMetadata = photoMetadata;

    const invoiceResponse = await fetch(`${API_URL}/rest/v1/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userInformation.userJwt}`,
      },
      body: JSON.stringify(invoicePayload),
    });

    const {id} = (await invoiceResponse.json()) as Invoice;
    return {
      status: "SUCCESS",
      message: "Invoice uploaded successfully.",
      identifier: id,
    };
  } catch (error) {
    console.error(">>> Error uploading the invoice to the server:", error);
    return {
      status: "FAILURE",
      message: "Error uploading the invoice to the server.",
      identifier: "",
    };
  }
}
