"use server";

import {fetchUser, generateJWT} from "../utils.server";

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

  if (!isAuthenticated) {
    return {status: "FAILURE", message: "User is not authenticated.", identifier: ""};
  }

  const authorizationHeader = await generateJWT(user);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authorizationHeader}`,
  };

  // TODO: Complete the server action.
}
