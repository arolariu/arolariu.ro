/**
 * @fileoverview Unit tests for scan upload file validation.
 * @module app/domains/invoices/upload-scans/_intake/validation.test
 */

import {describe, expect, it} from "vitest";
import {ACCEPTED_SCAN_FILE_EXTENSIONS} from "../../_utils/mimeTypeUtilities";
import {extractFilesFromDataTransferItems, MAX_UPLOAD_FILE_SIZE_BYTES, SCAN_UPLOAD_INPUT_ACCEPT, validateUploadFiles} from "./validation";
import type {UploadBatchValidationResult} from "../_types";

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

/**
 * Validates one file through the public batch validation API.
 *
 * @param file - Candidate upload file.
 * @returns The single-file validation result.
 */
function validateSingleFile(file: File): UploadBatchValidationResult["invalidFiles"][number] | Readonly<{isValid: true; file: File}> {
  const result = validateUploadFiles([file]);
  const validFile = result.validFiles.at(0);
  if (validFile) {
    return {isValid: true, file: validFile};
  }

  const invalidFile = result.invalidFiles.at(0);
  if (invalidFile) {
    return invalidFile;
  }

  throw new Error("Expected one validation result");
}

describe("upload format policy", () => {
  it("exposes an input accept string that matches all accepted extensions", () => {
    expect(ACCEPTED_SCAN_FILE_EXTENSIONS).toEqual(["jpg", "jpeg", "png", "bmp", "tif", "tiff", "heif", "heic", "pdf"]);
    expect(SCAN_UPLOAD_INPUT_ACCEPT).toBe(".jpg,.jpeg,.png,.bmp,.tif,.tiff,.heif,.heic,.pdf");
  });
});

describe("validateUploadFile", () => {
  it("accepts supported upload files within the size limit", () => {
    const files = [
      createFile("receipt.pdf", "application/pdf"),
      createFile("receipt-empty.pdf", ""),
      createFile("receipt.jpg", "image/jpeg"),
      createFile("receipt-empty.jpg", ""),
      createFile("receipt.jpeg", "image/jpeg"),
      createFile("receipt-alias.jpg", "image/jpg"),
      createFile("receipt.png", "image/png"),
      createFile("receipt.bmp", "image/bmp"),
      createFile("receipt.heif", "image/heif"),
      createFile("receipt.heic", "image/heic"),
      createFile("receipt.tif", "image/tiff"),
      createFile("receipt-empty.tiff", ""),
      createFile("receipt.tiff", "image/tiff"),
    ];

    expect(files.map((file) => validateSingleFile(file))).toEqual(files.map((file) => ({isValid: true, file})));
  });

  it("rejects binary files because upload-scans only accepts scan document formats", () => {
    const file = createFile("raw.bin", "application/octet-stream");

    expect(validateSingleFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: "Unsupported file extension: raw.bin",
    });
  });

  it("rejects generic MIME types for supported scan extensions", () => {
    const file = createFile("receipt.jpg", "application/octet-stream");

    expect(validateSingleFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-type",
      message: "Unsupported file type: application/octet-stream",
    });
  });

  it("accepts empty MIME types for supported scan extensions by inferring from extension", () => {
    const file = createFile("receipt.jpg", "");

    expect(validateSingleFile(file)).toEqual({isValid: true, file});
  });

  it("rejects unsupported extensions even when the MIME type is supported", () => {
    const file = createFile("receipt.gif", "image/png");

    expect(validateSingleFile(file)).toEqual({
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: "Unsupported file extension: receipt.gif",
    });
  });

  it("rejects files larger than 10 MB", () => {
    const file = createFile("large.pdf", "application/pdf", MAX_UPLOAD_FILE_SIZE_BYTES + 1);

    expect(validateSingleFile(file)).toEqual({
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
          reason: "unsupported-extension",
          message: "Unsupported file extension: receipt.txt",
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
