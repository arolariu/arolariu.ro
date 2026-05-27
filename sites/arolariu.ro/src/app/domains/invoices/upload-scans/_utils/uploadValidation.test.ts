/**
 * @fileoverview Unit tests for scan upload validation helpers.
 * @module app/domains/invoices/upload-scans/_utils/uploadValidation.test
 */

import {describe, expect, it} from "vitest";
import {MAX_UPLOAD_FILE_SIZE_BYTES} from "./uploadTypes";
import {extractFilesFromDataTransferItems, validateUploadFile, validateUploadFiles} from "./uploadValidation";

/**
 * Creates a browser `File` for validation tests.
 *
 * @param name - File name to expose to validation.
 * @param type - MIME type to expose to validation.
 * @param size - File size in bytes.
 * @returns Test file with deterministic byte content.
 */
function createFile(name: string, type: string, size = 4): File {
  return new File([new Uint8Array(size)], name, {type});
}

describe("validateUploadFile", () => {
  it("accepts JPEG, PNG, and PDF files within the size limit", () => {
    const files = [
      createFile("receipt.jpg", "image/jpeg"),
      createFile("receipt.png", "image/png"),
      createFile("receipt.pdf", "application/pdf"),
    ];

    const results = files.map((file) => validateUploadFile(file));

    expect(results).toEqual(files.map((file) => ({isValid: true, file})));
  });

  it("rejects unsupported MIME types", () => {
    const file = createFile("receipt.txt", "text/plain");

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-type",
      message: "Unsupported file type: text/plain",
    });
  });

  it("reports unknown when the browser does not provide a MIME type", () => {
    const file = createFile("receipt.jpg", "");

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-type",
      message: "Unsupported file type: unknown",
    });
  });

  it("rejects supported MIME types with invalid extensions", () => {
    const file = createFile("receipt.gif", "image/png");

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: "Unsupported file extension: receipt.gif",
    });
  });

  it("rejects files without an extension", () => {
    const file = createFile("receipt", "image/png");

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: "Unsupported file extension: receipt",
    });
  });

  it("rejects files larger than 10 MB", () => {
    const file = createFile("large.pdf", "application/pdf", MAX_UPLOAD_FILE_SIZE_BYTES + 1);

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "file-too-large",
      message: "File too large: large.pdf (max 10MB)",
    });
  });
});

describe("validateUploadFiles", () => {
  it("splits valid files and validation errors", () => {
    const validFile = createFile("receipt.jpg", "image/jpeg");
    const invalidFile = createFile("receipt.txt", "text/plain");

    expect(validateUploadFiles([validFile, invalidFile])).toEqual({
      validFiles: [validFile],
      invalidFiles: [
        {
          isValid: false,
          file: invalidFile,
          reason: "unsupported-type",
          message: "Unsupported file type: text/plain",
        },
      ],
    });
  });
});

describe("extractFilesFromDataTransferItems", () => {
  it("extracts file objects from data transfer items", () => {
    const file = createFile("receipt.jpg", "image/jpeg");
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    expect(extractFilesFromDataTransferItems(dataTransfer.items)).toEqual([file]);
  });

  it("skips string data transfer items", () => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add("not-a-file", "text/plain");

    expect(extractFilesFromDataTransferItems(dataTransfer.items)).toEqual([]);
  });
});
