/**
 * @fileoverview Unit tests for scan upload file validation.
 * @module app/domains/invoices/upload-scans/_files/uploadValidation.test
 */

import {describe, expect, it} from "vitest";
import {ACCEPTED_UPLOAD_EXTENSIONS, MAX_UPLOAD_FILE_SIZE_BYTES, UPLOAD_INPUT_ACCEPT} from "./uploadFormatPolicy";
import {extractFilesFromDataTransferItems, validateUploadFile, validateUploadFiles} from "./uploadValidation";

/**
 * Creates a browser file fixture for upload validation tests.
 *
 * @param name - File name exposed to validation.
 * @param type - Browser-reported MIME type.
 * @param size - File size in bytes.
 * @returns File with deterministic byte content.
 */
function createFile(name: string, type: string, size = 4): File {
  return new File([new Uint8Array(size)], name, {type});
}

describe("upload format policy", () => {
  it("exposes an input accept string that matches all accepted extensions", () => {
    expect(ACCEPTED_UPLOAD_EXTENSIONS).toEqual(["bin", "pdf", "jpg", "jpeg", "png", "bmp", "heif", "heic", "tif", "tiff"]);
    expect(UPLOAD_INPUT_ACCEPT).toBe(".bin,.pdf,.jpg,.jpeg,.png,.bmp,.heif,.heic,.tif,.tiff");
  });
});

describe("validateUploadFile", () => {
  it("accepts supported upload files within the size limit", () => {
    const files = [
      createFile("raw.bin", "application/octet-stream"),
      createFile("raw-empty-type.bin", ""),
      createFile("receipt.pdf", "application/pdf"),
      createFile("receipt.jpg", "image/jpeg"),
      createFile("receipt.jpeg", "image/jpeg"),
      createFile("receipt-alias.jpg", "image/jpg"),
      createFile("receipt.png", "image/png"),
      createFile("receipt.bmp", "image/bmp"),
      createFile("receipt.heif", "image/heif"),
      createFile("receipt.heic", "image/heic"),
      createFile("receipt.tif", "image/tiff"),
      createFile("receipt.tiff", "image/tiff"),
    ];

    expect(files.map((file) => validateUploadFile(file))).toEqual(files.map((file) => ({isValid: true, file})));
  });

  it("rejects generic MIME types for non-bin extensions", () => {
    const file = createFile("receipt.jpg", "application/octet-stream");

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-type",
      message: "Unsupported file type: application/octet-stream",
    });
  });

  it("rejects empty MIME types for non-bin extensions", () => {
    const file = createFile("receipt.jpg", "");

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-type",
      message: "Unsupported file type: unknown",
    });
  });

  it("rejects unsupported extensions even when the MIME type is supported", () => {
    const file = createFile("receipt.gif", "image/png");

    expect(validateUploadFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: "Unsupported file extension: receipt.gif",
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
