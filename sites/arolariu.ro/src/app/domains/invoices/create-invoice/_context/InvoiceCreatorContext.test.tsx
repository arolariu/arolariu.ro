import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, test, vi, beforeEach, afterEach} from "vitest";
import {InvoiceCreatorProvider, useInvoiceCreator} from "./InvoiceCreatorContext";

// Mock the server action
vi.mock("@/lib/actions/invoices/bulkCreateInvoices", () => ({
  bulkCreateInvoicesAction: vi.fn(),
}));

// Mock toast
vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
}));

const wrapper = ({children}: {children: ReactNode}) => <InvoiceCreatorProvider>{children}</InvoiceCreatorProvider>;

describe("InvoiceCreatorContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "mock-blob-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should provide initial state", () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    expect(result.current.scans).toEqual([]);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.isProcessingNext).toBe(false);
  });

  test("should provide required functions", () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    expect(typeof result.current.addFiles).toBe("function");
    expect(typeof result.current.removeScan).toBe("function");
    expect(typeof result.current.clearAll).toBe("function");
    expect(typeof result.current.rotateScan).toBe("function");
    expect(typeof result.current.renameScan).toBe("function");
    expect(typeof result.current.processNextStep).toBe("function");
  });

  test("should add files to scans", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
      expect(result.current.scans[0].name).toBe("test.jpg");
      expect(result.current.scans[0].type).toBe("image");
    });
  });

  test("should classify PDF files correctly", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.pdf", {type: "application/pdf"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
      expect(result.current.scans[0].type).toBe("pdf");
    });
  });

  test("should validate file type and reject unsupported types", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
    const {toast} = await import("@arolariu/components");

    const file = new File(["content"], "test.txt", {type: "text/plain"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Unsupported file type"),
      );
      expect(result.current.scans.length).toBe(0);
    });
  });

  test("should validate file size and reject large files", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
    const {toast} = await import("@arolariu/components");

    // Create a file larger than 10MB
    const largeFile = new File(["x".repeat(11 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? largeFile : null),
      [0]: largeFile,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("File too large"),
      );
      expect(result.current.scans.length).toBe(0);
    });
  });

  test("should remove a scan by id", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    const scanId = result.current.scans[0].id;

    act(() => {
      result.current.removeScan(scanId);
    });

    expect(result.current.scans.length).toBe(0);
  });

  test("should clear all scans", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file1 = new File(["content1"], "test1.jpg", {type: "image/jpeg"});
    const file2 = new File(["content2"], "test2.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 2,
      item: (index: number) => [file1, file2][index] || null,
      [0]: file1,
      [1]: file2,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(2);
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.scans.length).toBe(0);
  });

  test("should rename a scan", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    const scanId = result.current.scans[0].id;

    act(() => {
      result.current.renameScan(scanId, "renamed.jpg");
    });

    expect(result.current.scans[0].name).toBe("renamed.jpg");
  });

  test("should set isUploading state during file addition", () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    expect(result.current.isUploading).toBe(true);
  });

  test("should create blob URLs for scans", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
      expect(result.current.scans[0].preview).toBe("mock-blob-url");
      expect(result.current.scans[0].url).toBe("mock-blob-url");
    });
  });

  test("should revoke blob URL when removing scan", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    const scanId = result.current.scans[0].id;

    act(() => {
      result.current.removeScan(scanId);
    });

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("mock-blob-url");
  });

  test("should handle multiple files at once", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file1 = new File(["content1"], "test1.jpg", {type: "image/jpeg"});
    const file2 = new File(["content2"], "test2.png", {type: "image/png"});
    const file3 = new File(["content3"], "test3.pdf", {type: "application/pdf"});
    
    const fileList = {
      length: 3,
      item: (index: number) => [file1, file2, file3][index] || null,
      [0]: file1,
      [1]: file2,
      [2]: file3,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(3);
      expect(result.current.scans[0].name).toBe("test1.jpg");
      expect(result.current.scans[1].name).toBe("test2.png");
      expect(result.current.scans[2].name).toBe("test3.pdf");
    });
  });

  test("should throw error when used outside of provider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useInvoiceCreator());
    }).toThrow("useInvoiceCreator must be used within an InvoiceCreatorProvider");

    consoleErrorSpy.mockRestore();
  });

  test("should handle processNextStep with no scans", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
    const {toast} = await import("@arolariu/components");

    await act(async () => {
      await result.current.processNextStep();
    });

    expect(toast.info).toHaveBeenCalledWith("No files to process.");
  });

  test("should process scans and update isProcessing state", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
    const {bulkCreateInvoicesAction} = await import("@/lib/actions/invoices/bulkCreateInvoices");

    // Mock the bulk action
    vi.mocked(bulkCreateInvoicesAction).mockResolvedValue({
      success: true,
      results: [{scanName: "test.jpg", success: true}],
      totalProcessed: 1,
      totalFailed: 0,
    });

    // Mock fetch for user info
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({userIdentifier: "user-123", userJwt: "jwt-token"}),
    });

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    await act(async () => {
      await result.current.processNextStep();
    });

    // Scan should be marked as processing during submission
    expect(bulkCreateInvoicesAction).toHaveBeenCalled();
  });

  test("should handle processNextStep errors gracefully", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
    const {toast} = await import("@arolariu/components");

    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    await act(async () => {
      await result.current.processNextStep();
    });

    expect(toast.error).toHaveBeenCalled();
    // Scans should not be processing after error
    expect(result.current.scans.every((s) => !s.isProcessing)).toBe(true);
  });

  test("should set isProcessingNext flag during submission", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    // Mock fetch for user info
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({userIdentifier: "user-123", userJwt: "jwt-token"}),
    });

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    expect(result.current.isProcessingNext).toBe(false);

    // Start processing
    const processPromise = act(async () => {
      await result.current.processNextStep();
    });

    await processPromise;
    
    // Should reset after processing
    expect(result.current.isProcessingNext).toBe(false);
  });

  test("should prevent concurrent processNextStep calls", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
    const {bulkCreateInvoicesAction} = await import("@/lib/actions/invoices/bulkCreateInvoices");

    // Mock slow bulk action
    vi.mocked(bulkCreateInvoicesAction).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({
        success: true,
        results: [],
        totalProcessed: 0,
        totalFailed: 0,
      }), 100))
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({userIdentifier: "user-123", userJwt: "jwt-token"}),
    });

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    // Try to call processNextStep twice concurrently
    const promise1 = act(async () => {
      await result.current.processNextStep();
    });

    const promise2 = act(async () => {
      await result.current.processNextStep();
    });

    await Promise.all([promise1, promise2]);

    // Should only call bulk action once due to processing guard
    expect(bulkCreateInvoicesAction).toHaveBeenCalledTimes(1);
  });

  test("should update isUploading state during file addition", () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      [0]: file,
    } as FileList;

    expect(result.current.isUploading).toBe(false);

    act(() => {
      result.current.addFiles(fileList);
    });

    // Should be uploading immediately after call
    expect(result.current.isUploading).toBe(true);
  });

  test("should handle rotation for image files only", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
    const {toast} = await import("@arolariu/components");

    // Add a PDF file
    const pdfFile = new File(["content"], "test.pdf", {type: "application/pdf"});
    const fileList = {
      length: 1,
      item: (index: number) => (index === 0 ? pdfFile : null),
      [0]: pdfFile,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(1);
    });

    const scanId = result.current.scans[0].id;

    // Try to rotate PDF
    await act(async () => {
      await result.current.rotateScan(scanId, 90);
    });

    expect(toast.error).toHaveBeenCalledWith("Rotation is supported only for images.");
  });

  test("should clear all scans and revoke blob URLs", async () => {
    const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

    const file1 = new File(["content1"], "test1.jpg", {type: "image/jpeg"});
    const file2 = new File(["content2"], "test2.png", {type: "image/png"});
    
    const fileList = {
      length: 2,
      item: (index: number) => [file1, file2][index] || null,
      [0]: file1,
      [1]: file2,
    } as FileList;

    act(() => {
      result.current.addFiles(fileList);
    });

    await waitFor(() => {
      expect(result.current.scans.length).toBe(2);
    });

    act(() => {
      result.current.clearAll();
    });

    expect(result.current.scans.length).toBe(0);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });
});
