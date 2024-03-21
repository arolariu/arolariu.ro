"use server";

type invoiceRequest = {
  image: undefined | Blob;
}

type invoiceResponse = {
  status: "SUCCESS" | "FAILURE";
  message: string;
  identifier: string;
}

/**
 * This function uploads the invoice to the server.
 * @param image The image to be uploaded.
 * @returns The result of the upload.
 */
export default async function uploadInvoice(invoice: invoiceRequest): Promise<invoiceResponse> {

  // Step 1. Get the user from the session.
  // Step 2. Send the image to the Azure Storage account.

}
