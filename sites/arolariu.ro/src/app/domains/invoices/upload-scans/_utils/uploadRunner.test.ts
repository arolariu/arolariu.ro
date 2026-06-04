/**
 * @fileoverview Unit tests for the scan upload runner.
 * @module app/domains/invoices/upload-scans/_utils/uploadRunner.test
 */

import {describe, expect, it, vi} from "vitest";
import type {Scan} from "../../../../../types/scans";
import {readFileAsBase64, uploadPendingScan} from "./uploadRunner";
import type {PendingUpload, UploadProgressEvent, UploadRunnerDependencies} from "./uploadTypes";

/**
 * Creates a scan returned by mocked upload dependencies.
 *
 * @param overrides - Properties to override on the default scan.
 * @returns Scan fixture.
 */
function createScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-1",
    userIdentifier: "user-1",
    name: "receipt.jpg",
    blobUrl: "https://storage/scans/scan-1.jpg",
    mimeType: "image/jpeg",
    sizeInBytes: 4,
    scanType: "JPEG",
    uploadedAt: new Date("2026-05-26T00:00:00.000Z"),
    status: "ready",
    metadata: {
      scanId: "scan-1",
      ownerId: "user-1",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: new Date("2026-05-26T00:00:00.000Z"),
      uploadedBy: "user-1",
    },
    ...overrides,
  };
}

/**
 * Creates a pending upload test fixture.
 *
 * @param overrides - Properties to override on the default upload.
 * @returns Pending upload fixture.
 */
function createUpload(overrides: Partial<PendingUpload> = {}): PendingUpload {
  const file = new File([new Uint8Array(4)], "receipt.jpg", {type: "image/jpeg"});
  return {
    id: "upload-1",
    name: "receipt.jpg",
    file,
    mimeType: "image/jpeg",
    size: file.size,
    preview: "blob:preview",
    status: "idle",
    progress: 0,
    attempts: 0,
    ...overrides,
  };
}

/**
 * Creates upload runner dependencies backed by test doubles.
 *
 * @param overrides - Dependency implementations to override.
 * @returns Complete dependency fixture for the upload runner.
 */
function createDependencies(overrides: Partial<UploadRunnerDependencies> = {}): UploadRunnerDependencies {
  const scan = createScan();
  return {
    generateUploadSasUrl: vi.fn().mockResolvedValue({
      success: true,
      data: {
        sasUrl: "https://storage/upload?sas=1",
        blobName: "scans/user-1/scan-1.jpg",
        blobUrl: scan.blobUrl,
        scanId: scan.id,
      },
    }),
    registerScan: vi.fn().mockResolvedValue({success: true, scan}),
    uploadScan: vi.fn().mockResolvedValue({success: true, data: {status: 201, scan}}),
    readFileAsBase64: vi.fn().mockResolvedValue("data:image/jpeg;base64,AAAA"),
    ...overrides,
  };
}

describe("uploadPendingScan", () => {
  it("uploads directly with SAS and registers the scan", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 201}));
    const dependencies = createDependencies();
    const progressEvents: UploadProgressEvent[] = [];

    vi.stubGlobal("fetch", fetchMock);

    try {
      const result = await uploadPendingScan(createUpload(), dependencies, {
        onProgress: (event) => progressEvents.push(event),
      });

      expect(result).toMatchObject({
        success: true,
        uploadId: "upload-1",
        attempts: 1,
        blobUrl: "https://storage/scans/scan-1.jpg",
      });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://storage/upload?sas=1",
        expect.objectContaining({
          method: "PUT",
          headers: {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": "image/jpeg",
          },
        }),
      );
      expect(dependencies.uploadScan).not.toHaveBeenCalled();
      expect(progressEvents.map((event) => event.progress)).toEqual([0, 30, 70, 90]);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("uses global fetch with the browser receiver for direct uploads", async () => {
    const originalFetch = globalThis.fetch;
    const fetchCalls: Array<Readonly<{input: RequestInfo | URL; init?: RequestInit}>> = [];

    function browserBoundFetch(this: typeof globalThis, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }

      fetchCalls.push({input, init});
      return Promise.resolve(new Response(null, {status: 201}));
    }

    vi.stubGlobal("fetch", browserBoundFetch);

    try {
      const result = await uploadPendingScan(
        createUpload(),
        createDependencies(),
        {onProgress: vi.fn()},
      );

      expect(result).toMatchObject({success: true, attempts: 1});
      expect(fetchCalls).toHaveLength(1);
      const [fetchCall] = fetchCalls;
      expect(fetchCall).toMatchObject({
        input: "https://storage/upload?sas=1",
        init: expect.objectContaining({method: "PUT"}),
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("uses server upload fallback when SAS generation fails", async () => {
    const scan = createScan({id: "fallback-scan"});
    const dependencies = createDependencies({
      generateUploadSasUrl: vi.fn().mockResolvedValue({success: false, error: {message: "SAS unavailable"}}),
      uploadScan: vi.fn().mockResolvedValue({success: true, data: {status: 201, scan}}),
    });

    const result = await uploadPendingScan(createUpload(), dependencies, {onProgress: vi.fn()});

    expect(result).toMatchObject({
      success: true,
      attempts: 1,
      blobUrl: scan.blobUrl,
    });
    expect(dependencies.uploadScan).toHaveBeenCalledWith({
      base64Data: "data:image/jpeg;base64,AAAA",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
    });
  });

  it("uses server upload fallback when direct Azure upload fails", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 500})));
    const scan = createScan({id: "fallback-after-put"});
    const dependencies = createDependencies({
      uploadScan: vi.fn().mockResolvedValue({success: true, data: {status: 201, scan}}),
    });

    try {
      const result = await uploadPendingScan(createUpload(), dependencies, {onProgress: vi.fn()});

      expect(result).toMatchObject({
        success: true,
        attempts: 1,
        blobUrl: scan.blobUrl,
      });
      expect(dependencies.uploadScan).toHaveBeenCalledOnce();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("uses server upload fallback when scan registration fails", async () => {
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 201})));
    const scan = createScan({id: "fallback-after-register"});
    const dependencies = createDependencies({
      registerScan: vi.fn().mockResolvedValue({success: false, error: "Registration failed"}),
      uploadScan: vi.fn().mockResolvedValue({success: true, data: {status: 201, scan}}),
    });

    try {
      const result = await uploadPendingScan(createUpload(), dependencies, {onProgress: vi.fn()});

      expect(result).toMatchObject({
        success: true,
        attempts: 1,
        blobUrl: scan.blobUrl,
      });
      expect(dependencies.uploadScan).toHaveBeenCalledOnce();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("retries up to three attempts before failing", async () => {
    const dependencies = createDependencies({
      generateUploadSasUrl: vi.fn().mockResolvedValue({success: false, error: {message: "SAS unavailable"}}),
      uploadScan: vi.fn().mockResolvedValue({success: false, error: {message: "Fallback failed"}}),
    });
    const progressEvents: UploadProgressEvent[] = [];

    const result = await uploadPendingScan(createUpload(), dependencies, {
      onProgress: (event) => progressEvents.push(event),
    });

    expect(result).toEqual({
      success: false,
      uploadId: "upload-1",
      attempts: 3,
      reason: "server-upload-failed",
      error: "Fallback failed",
    });
    expect(dependencies.uploadScan).toHaveBeenCalledTimes(3);
    expect(progressEvents.map((event) => event.status)).toContain("retrying");
    expect(progressEvents.at(-1)).toMatchObject({attempts: 3});
  });

  it("fails immediately when the File reference is missing", async () => {
    const result = await uploadPendingScan(createUpload({file: null}), createDependencies(), {onProgress: vi.fn()});

    expect(result).toEqual({
      success: false,
      uploadId: "upload-1",
      attempts: 0,
      reason: "missing-file",
      error: "File reference lost",
    });
  });

  it("returns an unexpected-error result when every attempt throws", async () => {
    const dependencies = createDependencies({
      generateUploadSasUrl: vi.fn().mockRejectedValue(new Error("SAS service down")),
    });

    const result = await uploadPendingScan(createUpload(), dependencies, {onProgress: vi.fn()});

    expect(result).toEqual({
      success: false,
      uploadId: "upload-1",
      attempts: 3,
      reason: "unexpected-error",
      error: "SAS service down",
    });
  });

  it("normalizes non-Error exceptions from upload dependencies", async () => {
    const dependencies = createDependencies({
      generateUploadSasUrl: vi.fn().mockRejectedValue("SAS service down"),
    });

    const result = await uploadPendingScan(createUpload(), dependencies, {onProgress: vi.fn()});

    expect(result).toEqual({
      success: false,
      uploadId: "upload-1",
      attempts: 3,
      reason: "unexpected-error",
      error: "Unexpected upload error",
    });
  });
});

describe("readFileAsBase64", () => {
  it("reads files as data URLs", async () => {
    await expect(readFileAsBase64(new File(["hello"], "hello.txt", {type: "text/plain"}))).resolves.toBe("data:text/plain;base64,aGVsbG8=");
  });

  it("rejects when FileReader emits an error", async () => {
    const originalFileReader = globalThis.FileReader;

    class FailingFileReader {
      public readonly error = new Error("read failed");
      private errorListener: (() => void) | null = null;

      public addEventListener(type: "load" | "error", listener: () => void): void {
        if (type === "error") {
          this.errorListener = listener;
        }
      }

      public readAsDataURL(): void {
        this.errorListener?.();
      }
    }

    vi.stubGlobal("FileReader", FailingFileReader);

    try {
      await expect(readFileAsBase64(new File(["hello"], "hello.txt", {type: "text/plain"}))).rejects.toThrow("read failed");
    } finally {
      vi.stubGlobal("FileReader", originalFileReader);
    }
  });

  it("uses a fallback error when FileReader emits error without details", async () => {
    const originalFileReader = globalThis.FileReader;

    class FailingFileReaderWithoutError {
      public readonly error = null;
      private errorListener: (() => void) | null = null;

      public addEventListener(type: "load" | "error", listener: () => void): void {
        if (type === "error") {
          this.errorListener = listener;
        }
      }

      public readAsDataURL(): void {
        this.errorListener?.();
      }
    }

    vi.stubGlobal("FileReader", FailingFileReaderWithoutError);

    try {
      await expect(readFileAsBase64(new File(["hello"], "hello.txt", {type: "text/plain"}))).rejects.toThrow("Unable to read file");
    } finally {
      vi.stubGlobal("FileReader", originalFileReader);
    }
  });

  it("rejects when FileReader load result is not a string", async () => {
    const originalFileReader = globalThis.FileReader;

    class NonStringFileReader {
      public readonly result = new ArrayBuffer(0);
      public readonly error = null;
      private loadListener: (() => void) | null = null;

      public addEventListener(type: "load" | "error", listener: () => void): void {
        if (type === "load") {
          this.loadListener = listener;
        }
      }

      public readAsDataURL(): void {
        this.loadListener?.();
      }
    }

    vi.stubGlobal("FileReader", NonStringFileReader);

    try {
      await expect(readFileAsBase64(new File(["hello"], "hello.txt", {type: "text/plain"}))).rejects.toThrow(
        "Unable to read file as base64",
      );
    } finally {
      vi.stubGlobal("FileReader", originalFileReader);
    }
  });
});
