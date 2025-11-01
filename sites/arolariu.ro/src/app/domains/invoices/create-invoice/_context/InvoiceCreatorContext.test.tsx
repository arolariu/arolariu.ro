import {act, renderHook, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, test, vi, beforeEach, afterEach} from "vitest";
import {InvoiceCreatorProvider, useInvoiceCreator} from "./InvoiceCreatorContext";

// Mock the server action
vi.mock("@/lib/actions/invoices/createInvoice", () => ({
  createInvoiceAction: vi.fn(),
}));

// Mock toast
vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
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
});
