/** @format */

/**
 * The status of an upload.
 */
export type UploadStatus =
  | "UNKNOWN"
  | "PENDING__CLIENTSIDE" // The upload is pending on the client-side.
  | "PENDING__SERVERSIDE" // The upload is pending on the server-side.
  | "SUCCESS__CLIENTSIDE" // The upload was successful on the client-side.
  | "SUCCESS__SERVERSIDE" // The upload was successful on the server-side.
  | "FAILURE__CLIENTSIDE" // The upload failed on the client-side.
  | "FAILURE__SERVERSIDE"; // The upload failed on the server-side.
