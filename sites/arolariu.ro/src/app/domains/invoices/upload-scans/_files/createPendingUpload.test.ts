/**
 * @fileoverview Unit tests for pending upload creation.
 * @module app/domains/invoices/upload-scans/_files/createPendingUpload.test
 */

import {afterEach, describe, expect, it, vi} from "vitest";
import {createPendingUpload} from "./createPendingUpload";

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

  it("normalizes bin files without browser MIME type to application/octet-stream", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:raw");
    const file = new File(["data"], "raw.bin", {type: ""});

    expect(createPendingUpload(file, "upload-bin")).toMatchObject({
      id: "upload-bin",
      name: "raw.bin",
      mimeType: "application/octet-stream",
      preview: "blob:raw",
      status: "idle",
    });
  });
});
