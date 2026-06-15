/**
 * @fileoverview Unit tests for pending upload creation.
 * @module app/domains/invoices/upload-scans/_intake/pendingUploadFactory.test
 */

import {afterEach, describe, expect, it, vi} from "vitest";
import {createPendingUpload} from "./pendingUploadFactory";

describe("createPendingUpload", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a pending upload from a normal image file", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:receipt");
    const file = new File(["data"], "receipt.jpg", {type: "image/jpeg"});

    expect(createPendingUpload(file, "upload-1")).toEqual({
      id: "upload-1",
      name: "receipt.jpg",
      file,
      mimeType: "image/jpeg",
      size: file.size,
      preview: "blob:receipt",
      status: "idle",
      progress: 0,
      attempts: 0,
    });
  });

  it("uses inferred canonical MIME type for supported PDF files without browser MIME type", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pdf");
    const file = new File(["data"], "receipt.pdf", {type: ""});

    expect(createPendingUpload(file, "upload-pdf")).toMatchObject({
      id: "upload-pdf",
      name: "receipt.pdf",
      mimeType: "application/pdf",
      preview: "blob:pdf",
      status: "idle",
    });
  });

  it("uses inferred canonical MIME type for supported JPEG files without browser MIME type", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:jpg");
    const file = new File(["data"], "receipt.jpg", {type: ""});

    expect(createPendingUpload(file, "upload-jpg")).toMatchObject({
      id: "upload-jpg",
      name: "receipt.jpg",
      mimeType: "image/jpeg",
      preview: "blob:jpg",
      status: "idle",
    });
  });
});
