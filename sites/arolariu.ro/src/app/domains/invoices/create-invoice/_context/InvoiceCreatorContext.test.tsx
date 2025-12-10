/**
 * @fileoverview Comprehensive tests for InvoiceCreatorContext.
 * Tests all context functionality including file handling, submissions management,
 * and server action integration.
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {InvoiceCreatorProvider, useInvoiceCreator} from "./InvoiceCreatorContext";

// Mock the toast from @arolariu/components
vi.mock("@arolariu/components", () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock the createInvoiceAction server action
vi.mock("../_actions/createInvoiceAction", () => ({
  createInvoiceAction: vi.fn(),
}));

// Mock uuid with a counter-based implementation
// The counter is managed via a module-scoped object so it can be reset in tests
const uuidState = {counter: 0};
vi.mock("uuid", () => ({
  v4: () => `mock-uuid-${++uuidState.counter}`,
}));

// Import mocked modules after vi.mock declarations
import {toast} from "@arolariu/components";
import {createInvoiceAction} from "../_actions/createInvoiceAction";

describe("InvoiceCreatorContext", () => {
  // Helper to create a wrapper for renderHook
  const wrapper = ({children}: {children: React.ReactNode}) => <InvoiceCreatorProvider>{children}</InvoiceCreatorProvider>;

  // Helper to create a mock File
  const createMockFile = (name: string, type: string): File => {
    const blob = new Blob(["mock content"], {type});
    return new File([blob], name, {type});
  };

  // Helper to create a mock FileList (compatible with jsdom which doesn't have DataTransfer)
  const createMockFileList = (files: File[]): FileList => {
    const fileList = {
      length: files.length,
      item: (index: number) => files[index] ?? null,
      [Symbol.iterator]: function* () {
        for (const file of files) {
          yield file;
        }
      },
    } as unknown as FileList;

    // Add indexed access
    for (let i = 0; i < files.length; i++) {
      Object.defineProperty(fileList, i, {
        value: files[i],
        enumerable: true,
      });
    }

    return fileList;
  };

  // Mock URL.createObjectURL and URL.revokeObjectURL
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    uuidState.counter = 0; // Reset uuid counter for each test
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });

  describe("useInvoiceCreator hook", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useInvoiceCreator());
      }).toThrow("useInvoiceCreator must be used within an InvoiceCreatorProvider");

      consoleError.mockRestore();
    });

    it("should return context when used within provider", () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      expect(result.current).toBeDefined();
      expect(result.current.submissions).toEqual([]);
      expect(typeof result.current.addSubmissions).toBe("function");
      expect(typeof result.current.removeSubmissions).toBe("function");
      expect(typeof result.current.clearAllSubmissions).toBe("function");
      expect(typeof result.current.rotateSubmissionPhoto).toBe("function");
      expect(typeof result.current.renameSubmission).toBe("function");
      expect(typeof result.current.processSubmission).toBe("function");
    });

    it("should initialize with empty submissions array", () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      expect(result.current.submissions).toHaveLength(0);
    });
  });

  describe("addSubmissions", () => {
    it("should add image file submissions", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");
      const fileList = createMockFileList([imageFile]);

      await act(async () => {
        await result.current.addSubmissions(fileList);
      });

      expect(result.current.submissions).toHaveLength(1);
      expect(result.current.submissions[0]).toMatchObject({
        id: "mock-uuid-1",
        name: "test.jpg",
        type: "image",
        mimeType: "image/jpeg",
        status: "idle",
        attempts: 0,
        adjustments: {
          rotation: 0,
          brightness: 100,
          contrast: 100,
          saturation: 100,
        },
      });
      expect(createObjectURLSpy).toHaveBeenCalledWith(imageFile);
    });

    it("should add PDF file submissions", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const pdfFile = createMockFile("document.pdf", "application/pdf");
      const fileList = createMockFileList([pdfFile]);

      await act(async () => {
        await result.current.addSubmissions(fileList);
      });

      expect(result.current.submissions).toHaveLength(1);
      expect(result.current.submissions[0]).toMatchObject({
        id: "mock-uuid-1",
        name: "document.pdf",
        type: "pdf",
        mimeType: "application/pdf",
        status: "idle",
        adjustments: undefined,
      });
    });

    it("should add multiple files at once", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("image.png", "image/png");
      const pdfFile = createMockFile("doc.pdf", "application/pdf");
      const fileList = createMockFileList([imageFile, pdfFile]);

      await act(async () => {
        await result.current.addSubmissions(fileList);
      });

      expect(result.current.submissions).toHaveLength(2);
      expect(result.current.submissions[0]!.type).toBe("image");
      expect(result.current.submissions[1]!.type).toBe("pdf");
    });

    it("should skip unsupported file types", async () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const textFile = createMockFile("readme.txt", "text/plain");
      const fileList = createMockFileList([textFile]);

      await act(async () => {
        await result.current.addSubmissions(fileList);
      });

      expect(result.current.submissions).toHaveLength(0);
      expect(consoleWarn).toHaveBeenCalledWith(">>> Unsupported file type: text/plain");
      consoleWarn.mockRestore();
    });

    it("should handle mixed supported and unsupported files", async () => {
      const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      const imageFile = createMockFile("photo.jpg", "image/jpeg");
      const textFile = createMockFile("notes.txt", "text/plain");
      const pdfFile = createMockFile("invoice.pdf", "application/pdf");
      const fileList = createMockFileList([imageFile, textFile, pdfFile]);

      await act(async () => {
        await result.current.addSubmissions(fileList);
      });

      // Only 2 supported files should be added
      expect(result.current.submissions).toHaveLength(2);
      expect(consoleWarn).toHaveBeenCalledWith(">>> Unsupported file type: text/plain");
      consoleWarn.mockRestore();
    });

    it("should create preview URLs for files", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");
      const fileList = createMockFileList([imageFile]);

      await act(async () => {
        await result.current.addSubmissions(fileList);
      });

      expect(result.current.submissions[0]!.preview).toBe("blob:mock-url");
      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeSubmissions", () => {
    it("should remove submissions by IDs", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      // Add two submissions
      const file1 = createMockFile("image1.jpg", "image/jpeg");
      const file2 = createMockFile("image2.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([file1]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([file2]));
      });

      expect(result.current.submissions).toHaveLength(2);

      // Remove the first submission
      act(() => {
        result.current.removeSubmissions(["mock-uuid-1"]);
      });

      expect(result.current.submissions).toHaveLength(1);
      expect(result.current.submissions[0]!.id).toBe("mock-uuid-2");
    });

    it("should revoke preview URLs when removing submissions", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      act(() => {
        result.current.removeSubmissions(["mock-uuid-1"]);
      });

      expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should show toast error when removing submissions", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      act(() => {
        result.current.removeSubmissions(["mock-uuid-1"]);
      });

      expect(toast.error).toHaveBeenCalledWith("1 submissions have been removed!");
    });

    it("should remove multiple submissions at once", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      // Add three submissions
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img1.jpg", "image/jpeg")]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img2.jpg", "image/jpeg")]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img3.jpg", "image/jpeg")]));
      });

      expect(result.current.submissions).toHaveLength(3);

      // Remove first and third
      act(() => {
        result.current.removeSubmissions(["mock-uuid-1", "mock-uuid-3"]);
      });

      expect(result.current.submissions).toHaveLength(1);
      expect(result.current.submissions[0]!.id).toBe("mock-uuid-2");
      expect(toast.error).toHaveBeenCalledWith("2 submissions have been removed!");
    });
  });

  describe("clearAllSubmissions", () => {
    it("should clear all submissions", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      // Add multiple submissions
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img1.jpg", "image/jpeg")]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img2.pdf", "application/pdf")]));
      });

      expect(result.current.submissions).toHaveLength(2);

      act(() => {
        result.current.clearAllSubmissions();
      });

      expect(result.current.submissions).toHaveLength(0);
    });

    it("should revoke all preview URLs when clearing", async () => {
      createObjectURLSpy.mockImplementation((file: Blob | MediaSource) => `blob:url-for-${(file as File).name}`);

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img1.jpg", "image/jpeg")]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img2.jpg", "image/jpeg")]));
      });

      act(() => {
        result.current.clearAllSubmissions();
      });

      expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2);
    });

    it("should show toast info when clearing all", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("test.jpg", "image/jpeg")]));
      });

      act(() => {
        result.current.clearAllSubmissions();
      });

      expect(toast.info).toHaveBeenCalledWith("All submissions have been cleared!");
    });
  });

  describe("rotateSubmissionPhoto", () => {
    it("should rotate an image submission by specified degrees", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      await act(async () => {
        await result.current.rotateSubmissionPhoto("mock-uuid-1", 90);
      });

      expect(result.current.submissions[0]).toMatchObject({
        adjustments: {
          rotation: 90,
          brightness: 100,
          contrast: 100,
          saturation: 100,
        },
      });
    });

    it("should accumulate rotations", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      await act(async () => {
        await result.current.rotateSubmissionPhoto("mock-uuid-1", 90);
      });

      await act(async () => {
        await result.current.rotateSubmissionPhoto("mock-uuid-1", 90);
      });

      expect(result.current.submissions[0]).toMatchObject({
        adjustments: {
          rotation: 180,
        },
      });
    });

    it("should wrap rotation at 360 degrees", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      await act(async () => {
        await result.current.rotateSubmissionPhoto("mock-uuid-1", 270);
      });

      await act(async () => {
        await result.current.rotateSubmissionPhoto("mock-uuid-1", 180);
      });

      // (270 + 180) % 360 = 90
      expect(result.current.submissions[0]).toMatchObject({
        adjustments: {
          rotation: 90,
        },
      });
    });

    it("should not affect PDF submissions (no adjustments)", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const pdfFile = createMockFile("doc.pdf", "application/pdf");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([pdfFile]));
      });

      await act(async () => {
        await result.current.rotateSubmissionPhoto("mock-uuid-1", 90);
      });

      // PDF submissions have undefined adjustments
      expect(result.current.submissions[0]!.adjustments).toBeUndefined();
    });

    it("should not affect other submissions when rotating one", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img1.jpg", "image/jpeg")]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img2.jpg", "image/jpeg")]));
      });

      await act(async () => {
        await result.current.rotateSubmissionPhoto("mock-uuid-1", 90);
      });

      // First should be rotated
      expect(result.current.submissions[0]).toMatchObject({
        id: "mock-uuid-1",
        adjustments: {rotation: 90},
      });

      // Second should be unchanged
      expect(result.current.submissions[1]).toMatchObject({
        id: "mock-uuid-2",
        adjustments: {rotation: 0},
      });
    });
  });

  describe("renameSubmission", () => {
    it("should rename a submission", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("original.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      act(() => {
        result.current.renameSubmission("mock-uuid-1", "renamed-file.jpg");
      });

      expect(result.current.submissions[0]!.name).toBe("renamed-file.jpg");
    });

    it("should not affect other submissions when renaming one", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("file1.jpg", "image/jpeg")]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("file2.jpg", "image/jpeg")]));
      });

      act(() => {
        result.current.renameSubmission("mock-uuid-1", "new-name.jpg");
      });

      expect(result.current.submissions[0]!.name).toBe("new-name.jpg");
      expect(result.current.submissions[1]!.name).toBe("file2.jpg");
    });

    it("should do nothing if ID does not exist", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      act(() => {
        result.current.renameSubmission("non-existent-id", "new-name.jpg");
      });

      expect(result.current.submissions[0]!.name).toBe("test.jpg");
    });
  });

  describe("processSubmission", () => {
    it("should process idle submissions", async () => {
      vi.mocked(createInvoiceAction).mockResolvedValue({
        id: "mock-uuid-1234",
        invoiceId: "invoice-123",
      });

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      await act(async () => {
        await result.current.processSubmission();
      });

      // Should be removed after successful processing
      await waitFor(() => {
        expect(result.current.submissions).toHaveLength(0);
      });

      expect(createInvoiceAction).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Invoice invoice-123 created successfully!");
    });

    it("should handle failed submissions", async () => {
      vi.mocked(createInvoiceAction).mockResolvedValue({
        id: "mock-uuid-1234",
        code: "PROCESSING_ERROR",
        message: "Server error occurred",
      });

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      await act(async () => {
        await result.current.processSubmission();
      });

      await waitFor(() => {
        expect(result.current.submissions[0]!.status).toBe("failed");
        expect(result.current.submissions[0]!.error).toBe("Server error occurred");
      });
    });

    it("should handle exceptions during processing", async () => {
      vi.mocked(createInvoiceAction).mockRejectedValue(new Error("Network error"));

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      await act(async () => {
        await result.current.processSubmission();
      });

      await waitFor(() => {
        expect(result.current.submissions[0]!.status).toBe("failed");
        expect(result.current.submissions[0]!.error).toBe("Network error");
      });
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(createInvoiceAction).mockRejectedValue("String error");

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      await act(async () => {
        await result.current.processSubmission();
      });

      await waitFor(() => {
        expect(result.current.submissions[0]!.status).toBe("failed");
        expect(result.current.submissions[0]!.error).toBe("Unknown error");
      });
    });

    it("should not process already processing submissions", async () => {
      // Create a slow mock that we can track
      vi.mocked(createInvoiceAction).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  id: "mock-uuid-1234",
                  invoiceId: "invoice-123",
                }),
              100,
            ),
          ),
      );

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      // Start processing
      act(() => {
        void result.current.processSubmission();
      });

      // Check status is "creating"
      await waitFor(() => {
        expect(result.current.submissions[0]!.status).toBe("creating");
      });

      // Call process again - should not start a new process for already creating submissions
      const initialCallCount = vi.mocked(createInvoiceAction).mock.calls.length;

      await act(async () => {
        await result.current.processSubmission();
      });

      // The action should not have been called again for the same submission
      // (it was already in "creating" status, not "idle" or "failed")
      expect(vi.mocked(createInvoiceAction).mock.calls.length).toBe(initialCallCount);
    });

    it("should retry failed submissions", async () => {
      let callCount = 0;
      vi.mocked(createInvoiceAction).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            id: "mock-uuid-1234",
            code: "PROCESSING_ERROR" as const,
            message: "First attempt failed",
          };
        }
        return {
          id: "mock-uuid-1234",
          invoiceId: "invoice-123",
        };
      });

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      // First attempt fails
      await act(async () => {
        await result.current.processSubmission();
      });

      await waitFor(() => {
        expect(result.current.submissions[0]!.status).toBe("failed");
      });

      // Second attempt succeeds
      await act(async () => {
        await result.current.processSubmission();
      });

      await waitFor(() => {
        expect(result.current.submissions).toHaveLength(0);
      });

      expect(toast.success).toHaveBeenCalledWith("Invoice invoice-123 created successfully!");
    });

    it("should do nothing when no submissions to process", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      await act(async () => {
        await result.current.processSubmission();
      });

      expect(createInvoiceAction).not.toHaveBeenCalled();
    });

    it("should process multiple submissions in parallel", async () => {
      vi.mocked(createInvoiceAction).mockImplementation(async (submission) => {
        return {
          id: submission.id,
          invoiceId: `invoice-${submission.id}`,
        };
      });

      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img1.jpg", "image/jpeg")]));
      });
      await act(async () => {
        await result.current.addSubmissions(createMockFileList([createMockFile("img2.jpg", "image/jpeg")]));
      });

      expect(result.current.submissions).toHaveLength(2);

      await act(async () => {
        await result.current.processSubmission();
      });

      await waitFor(() => {
        expect(result.current.submissions).toHaveLength(0);
      });

      expect(createInvoiceAction).toHaveBeenCalledTimes(2);
      expect(toast.success).toHaveBeenCalledTimes(2);
    });
  });

  describe("revokePreview helper", () => {
    it("should not throw when preview is undefined", async () => {
      const {result} = renderHook(() => useInvoiceCreator(), {wrapper});
      const imageFile = createMockFile("test.jpg", "image/jpeg");

      // Create a submission without a preview by having createObjectURL return undefined-like
      createObjectURLSpy.mockReturnValue(undefined as unknown as string);

      await act(async () => {
        await result.current.addSubmissions(createMockFileList([imageFile]));
      });

      // Remove should not throw even with undefined preview
      expect(() => {
        act(() => {
          result.current.removeSubmissions(["mock-uuid-1234"]);
        });
      }).not.toThrow();
    });
  });

  describe("context value memoization", () => {
    it("should maintain stable function references", async () => {
      const {result, rerender} = renderHook(() => useInvoiceCreator(), {wrapper});

      const initialAddSubmissions = result.current.addSubmissions;
      const initialRemoveSubmissions = result.current.removeSubmissions;
      const initialClearAllSubmissions = result.current.clearAllSubmissions;
      const initialRotateSubmissionPhoto = result.current.rotateSubmissionPhoto;
      const initialRenameSubmission = result.current.renameSubmission;

      rerender();

      expect(result.current.addSubmissions).toBe(initialAddSubmissions);
      expect(result.current.removeSubmissions).toBe(initialRemoveSubmissions);
      expect(result.current.clearAllSubmissions).toBe(initialClearAllSubmissions);
      expect(result.current.rotateSubmissionPhoto).toBe(initialRotateSubmissionPhoto);
      expect(result.current.renameSubmission).toBe(initialRenameSubmission);
    });
  });
});
