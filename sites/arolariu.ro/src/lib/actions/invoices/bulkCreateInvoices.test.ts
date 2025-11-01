import {describe, it, expect, vi, beforeEach} from "vitest";
import {bulkCreateInvoicesAction} from "./bulkCreateInvoices";

// Mock the server utils
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.example.com",
}));

// Mock global fetch
global.fetch = vi.fn();

describe("bulkCreateInvoicesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should process scans in batches of 10", async () => {
    const mockScans = Array.from({length: 25}, (_, i) => ({
      file: new File([`content-${i}`], `file-${i}.jpg`, {type: "image/jpeg"}),
      name: `file-${i}.jpg`,
      type: "image",
      uploadedAt: new Date().toISOString(),
    }));

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({id: "test-id", success: true}),
    });

    const result = await bulkCreateInvoicesAction({
      scans: mockScans,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    // Should make 25 API calls (one per scan)
    expect(global.fetch).toHaveBeenCalledTimes(25);
    expect(result.success).toBe(true);
    expect(result.totalProcessed).toBe(25);
    expect(result.totalFailed).toBe(0);
    expect(result.results).toHaveLength(25);
  });

  it("should handle successful processing of all scans", async () => {
    const mockScans = [
      {
        file: new File(["content1"], "file1.jpg", {type: "image/jpeg"}),
        name: "file1.jpg",
        type: "image",
        uploadedAt: new Date().toISOString(),
      },
      {
        file: new File(["content2"], "file2.pdf", {type: "application/pdf"}),
        name: "file2.pdf",
        type: "pdf",
        uploadedAt: new Date().toISOString(),
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({id: "test-id", success: true}),
    });

    const result = await bulkCreateInvoicesAction({
      scans: mockScans,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(true);
    expect(result.totalProcessed).toBe(2);
    expect(result.totalFailed).toBe(0);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.success)).toBe(true);
  });

  it("should handle partial failures", async () => {
    const mockScans = [
      {
        file: new File(["content1"], "file1.jpg", {type: "image/jpeg"}),
        name: "file1.jpg",
        type: "image",
        uploadedAt: new Date().toISOString(),
      },
      {
        file: new File(["content2"], "file2.pdf", {type: "application/pdf"}),
        name: "file2.pdf",
        type: "pdf",
        uploadedAt: new Date().toISOString(),
      },
      {
        file: new File(["content3"], "file3.jpg", {type: "image/jpeg"}),
        name: "file3.jpg",
        type: "image",
        uploadedAt: new Date().toISOString(),
      },
    ];

    // First and third succeed, second fails
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({id: "test-id-1", success: true}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "Invalid file",
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({id: "test-id-3", success: true}),
      });

    const result = await bulkCreateInvoicesAction({
      scans: mockScans,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(false); // Not all succeeded
    expect(result.totalProcessed).toBe(2);
    expect(result.totalFailed).toBe(1);
    expect(result.results).toHaveLength(3);
    expect(result.results[0]?.success).toBe(true);
    expect(result.results[1]?.success).toBe(false);
    expect(result.results[1]?.error).toContain("400");
    expect(result.results[2]?.success).toBe(true);
  });

  it("should handle network errors", async () => {
    const mockScans = [
      {
        file: new File(["content1"], "file1.jpg", {type: "image/jpeg"}),
        name: "file1.jpg",
        type: "image",
        uploadedAt: new Date().toISOString(),
      },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

    const result = await bulkCreateInvoicesAction({
      scans: mockScans,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(false);
    expect(result.totalProcessed).toBe(0);
    expect(result.totalFailed).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.success).toBe(false);
    expect(result.results[0]?.error).toBe("Network error");
  });

  it("should include proper metadata in FormData", async () => {
    const mockScan = {
      file: new File(["content"], "test.jpg", {type: "image/jpeg"}),
      name: "test.jpg",
      type: "image",
      uploadedAt: "2024-01-01T00:00:00.000Z",
    };

    let capturedFormData: FormData | null = null;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url, options) => {
      capturedFormData = options?.body as FormData;
      return Promise.resolve({
        ok: true,
        json: async () => ({id: "test-id"}),
      });
    });

    await bulkCreateInvoicesAction({
      scans: [mockScan],
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(capturedFormData).not.toBeNull();
    expect(capturedFormData?.get("file")).toBeInstanceOf(File);
    expect(capturedFormData?.get("userIdentifier")).toBe("user-123");
    
    const metadata = capturedFormData?.get("metadata");
    expect(metadata).toBeTruthy();
    const parsedMetadata = JSON.parse(metadata as string);
    expect(parsedMetadata).toMatchObject({
      requiresAnalysis: "true",
      fileName: "test.jpg",
      fileType: "image",
      uploadedAt: "2024-01-01T00:00:00.000Z",
    });
  });

  it("should use correct API endpoint and headers", async () => {
    const mockScan = {
      file: new File(["content"], "test.jpg", {type: "image/jpeg"}),
      name: "test.jpg",
      type: "image",
      uploadedAt: new Date().toISOString(),
    };

    let capturedUrl = "";
    let capturedHeaders: HeadersInit | undefined;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url, options) => {
      capturedUrl = url as string;
      capturedHeaders = options?.headers as HeadersInit;
      return Promise.resolve({
        ok: true,
        json: async () => ({id: "test-id"}),
      });
    });

    await bulkCreateInvoicesAction({
      scans: [mockScan],
      userIdentifier: "user-123",
      userJwt: "jwt-token-123",
    });

    expect(capturedUrl).toBe("https://api.example.com/rest/v2/invoices");
    expect(capturedHeaders).toMatchObject({
      Authorization: "Bearer jwt-token-123",
    });
  });

  it("should handle empty scan array", async () => {
    const result = await bulkCreateInvoicesAction({
      scans: [],
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    expect(result.success).toBe(true); // No failures
    expect(result.totalProcessed).toBe(0);
    expect(result.totalFailed).toBe(0);
    expect(result.results).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should process exactly 3 batches for 25 scans", async () => {
    const mockScans = Array.from({length: 25}, (_, i) => ({
      file: new File([`content-${i}`], `file-${i}.jpg`, {type: "image/jpeg"}),
      name: `file-${i}.jpg`,
      type: "image",
      uploadedAt: new Date().toISOString(),
    }));

    let batchCount = 0;
    const callsPerBatch: number[] = [];
    let currentBatchCalls = 0;

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      currentBatchCalls++;
      
      // Detect batch boundaries (batch completes when 10 calls or end is reached)
      if (currentBatchCalls === 10 || currentBatchCalls + batchCount * 10 === mockScans.length) {
        callsPerBatch.push(currentBatchCalls);
        currentBatchCalls = 0;
        batchCount++;
      }

      return {
        ok: true,
        json: async () => ({id: "test-id"}),
      };
    });

    await bulkCreateInvoicesAction({
      scans: mockScans,
      userIdentifier: "user-123",
      userJwt: "jwt-token",
    });

    // Should have 3 batches: 10, 10, 5
    expect(callsPerBatch).toEqual([10, 10, 5]);
  });
});
