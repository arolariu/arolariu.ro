/**
 * @fileoverview Unit tests for pending upload image rotation.
 * @module app/domains/invoices/upload-scans/_intake/rotatePendingUploadFile.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {rotatePendingUploadFile} from "./rotatePendingUploadFile";

describe("rotatePendingUploadFile", () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;
  const originalImage = globalThis.Image;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:rotated-preview");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    globalThis.Image = originalImage;
    vi.restoreAllMocks();
  });

  it("rejects PDF files before creating canvas work", async () => {
    const pdf = new File([new Uint8Array([1])], "receipt.pdf", {type: "application/pdf"});

    await expect(
      rotatePendingUploadFile({
        file: pdf,
        preview: "blob:pdf-preview",
        direction: "cw",
      }),
    ).rejects.toThrow("PDF rotation is not supported");
  });

  it("rotates an image file and returns a replacement file and preview", async () => {
    class MockImage {
      public width = 20;
      public height = 10;
      private listeners = new Map<string, () => void>();

      public addEventListener(type: string, listener: () => void): void {
        this.listeners.set(type, listener);
      }

      public set src(_value: string) {
        queueMicrotask(() => this.listeners.get("load")?.());
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image;

    const drawImage = vi.fn();
    const rotate = vi.fn();
    const translate = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({drawImage, rotate, translate})),
      toBlob: vi.fn((callback: BlobCallback) => callback(new Blob([new Uint8Array([2])], {type: "image/jpeg"}))),
    } as unknown as HTMLCanvasElement;

    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    const result = await rotatePendingUploadFile({
      file: new File([new Uint8Array([1])], "receipt.jpg", {type: "image/jpeg"}),
      preview: "blob:old-preview",
      direction: "cw",
    });

    expect(result.file.name).toBe("receipt.jpg");
    expect(result.file.type).toBe("image/jpeg");
    expect(result.preview).toBe("blob:rotated-preview");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:old-preview");
    expect(translate).toHaveBeenCalled();
    expect(rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(drawImage).toHaveBeenCalled();
  });

  it("throws an error when canvas context is unavailable", async () => {
    class MockImage {
      public width = 20;
      public height = 10;
      private listeners = new Map<string, () => void>();

      public addEventListener(type: string, listener: () => void): void {
        this.listeners.set(type, listener);
      }

      public set src(_value: string) {
        queueMicrotask(() => this.listeners.get("load")?.());
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image;

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;

    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    await expect(
      rotatePendingUploadFile({
        file: new File([new Uint8Array([1])], "receipt.jpg", {type: "image/jpeg"}),
        preview: "blob:old-preview",
        direction: "cw",
      }),
    ).rejects.toThrow("Failed to get canvas context");
  });

  it("throws an error when blob creation fails", async () => {
    class MockImage {
      public width = 20;
      public height = 10;
      private listeners = new Map<string, () => void>();

      public addEventListener(type: string, listener: () => void): void {
        this.listeners.set(type, listener);
      }

      public set src(_value: string) {
        queueMicrotask(() => this.listeners.get("load")?.());
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image;

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({drawImage: vi.fn(), rotate: vi.fn(), translate: vi.fn()})),
      toBlob: vi.fn((callback: BlobCallback) => callback(null)),
    } as unknown as HTMLCanvasElement;

    vi.spyOn(document, "createElement").mockReturnValue(canvas);

    await expect(
      rotatePendingUploadFile({
        file: new File([new Uint8Array([1])], "receipt.jpg", {type: "image/jpeg"}),
        preview: "blob:old-preview",
        direction: "cw",
      }),
    ).rejects.toThrow("Failed to create rotated upload blob");
  });
});
