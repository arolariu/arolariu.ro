import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {render, screen, waitFor, act} from "@testing-library/react";
import {InvoiceCreatorProvider, useInvoiceCreator} from "./InvoiceCreatorContext";
import {toast} from "@arolariu/components";

// Mock dependencies
vi.mock("@arolariu/components", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => "toast-id-123"),
  },
}));

// Mock only what's necessary - external API calls and side effects
vi.mock("@/lib/actions/invoices/createInvoice", () => ({
  createInvoiceAction: vi.fn(),
}));

vi.mock("../_utils/fileActions", () => ({
  rotateImageImpl: vi.fn(),
}));

// Mock URL.createObjectURL and revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => "blob:test-url");
globalThis.URL.revokeObjectURL = vi.fn();

// Mock fetch
globalThis.fetch = vi.fn();

// Test component that uses the context
function TestComponent() {
  const context = useInvoiceCreator();
  
  return (
    <div>
      <div aria-label="Status Information">
        <p>Uploaded Scans: {context.scans.length}</p>
        <p>Is Uploading: {context.isUploading ? "Yes" : "No"}</p>
        <p>Upload Progress: {context.uploadProgress}%</p>
        <p>Is Processing: {context.isProcessingNext ? "Yes" : "No"}</p>
        {context.scans.length > 0 && (
          <div aria-label="Scan Details">
            <p>Scan Name: {context.scans[0].name}</p>
            <p>Scan Type: {context.scans[0].type}</p>
          </div>
        )}
      </div>
      <div aria-label="Actions">
        <button
          onClick={() => {
            const file = new File(["content"], "test.jpg", {type: "image/jpeg"});
            const fileList = {
              0: file,
              length: 1,
              item: (index: number) => (index === 0 ? file : null),
            } as FileList;
            context.addFiles(fileList);
          }}
        >
          Add Files
        </button>
        <button
          onClick={() => {
            const file = new File(["large content"], "large.jpg", {type: "image/jpeg"});
            Object.defineProperty(file, "size", {value: 11 * 1024 * 1024}); // 11MB
            const fileList = {
              0: file,
              length: 1,
              item: (index: number) => (index === 0 ? file : null),
            } as FileList;
            context.addFiles(fileList);
          }}
        >
          Add Large File
        </button>
        <button
          onClick={() => {
            const file = new File(["pdf content"], "document.pdf", {type: "application/pdf"});
            const fileList = {
              0: file,
              length: 1,
              item: (index: number) => (index === 0 ? file : null),
            } as FileList;
            context.addFiles(fileList);
          }}
        >
          Add PDF
        </button>
        <button onClick={() => context.scans[0] && context.removeScan(context.scans[0].id)}>
          Remove Scan
        </button>
        <button onClick={() => context.clearAll()}>Clear All</button>
        <button onClick={() => context.scans[0] && context.renameScan(context.scans[0].id, "newname")}>
          Rename
        </button>
        <button onClick={() => context.scans[0] && context.rotateScan(context.scans[0].id, 90)}>
          Rotate
        </button>
        <button onClick={() => context.processNextStep()}>Process</button>
      </div>
    </div>
  );
}

describe("InvoiceCreatorContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should provide initial context values", () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    expect(screen.getByText(/uploaded scans: 0/i)).toBeInTheDocument();
    expect(screen.getByText(/is uploading: no/i)).toBeInTheDocument();
    expect(screen.getByText(/upload progress: 0%/i)).toBeInTheDocument();
    expect(screen.getByText(/is processing: no/i)).toBeInTheDocument();
  });

  it("should throw error when used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow(
      "useInvoiceCreator must be used within an InvoiceCreatorProvider"
    );
    
    consoleError.mockRestore();
  });

  it("should add files successfully", async () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByRole("button", {name: /add files/i}).click();
    });

    // Should set uploading state
    expect(screen.getByText(/is uploading: yes/i)).toBeInTheDocument();

    // Fast-forward timers to complete upload
    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // Should have 1 scan after upload completes
    await waitFor(() => {
      expect(screen.getByText(/uploaded scans: 1/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/is uploading: no/i)).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith("1 file(s) uploaded successfully!");
  });

  it("should validate file types", async () => {
    const invalidFile = new File(["content"], "test.txt", {type: "text/plain"});
    const fileList = {
      0: invalidFile,
      length: 1,
      item: (index: number) => (index === 0 ? invalidFile : null),
    } as FileList;

    const TestInvalidFile = () => {
      const context = useInvoiceCreator();
      return (
        <button onClick={() => context.addFiles(fileList)}>
          Add Invalid File
        </button>
      );
    };

    render(
      <InvoiceCreatorProvider>
        <TestInvalidFile />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByRole("button", {name: /add invalid file/i}).click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("Invalid file type")
    );
  });

  it("should reject files larger than 10MB", () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByRole("button", {name: /add large file/i}).click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("File too large")
    );
  });

  it("should classify PDF files correctly", async () => {
    const pdfFile = new File(["pdf content"], "invoice.pdf", {
      type: "application/pdf",
    });
    const fileList = {
      0: pdfFile,
      length: 1,
      item: (index: number) => (index === 0 ? pdfFile : null),
    } as FileList;

    const TestPDFComponent = () => {
      const context = useInvoiceCreator();
      return (
        <div>
          <button onClick={() => context.addFiles(fileList)}>Add PDF</button>
          <div>{context.scans[0]?.type || "none"}</div>
        </div>
      );
    };

    render(
      <InvoiceCreatorProvider>
        <TestPDFComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByRole("button", {name: /add pdf/i}).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByText("pdf")).toBeInTheDocument();
    });
  });

  it("should remove a scan by ID", async () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    // Add a file first
    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByTestId("scans-count")).toHaveTextContent("1");
    });

    // Remove the scan
    act(() => {
      screen.getByTestId("remove-scan-btn").click();
    });

    expect(screen.getByTestId("scans-count")).toHaveTextContent("0");
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("should clear all scans", async () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    // Add files multiple times
    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByTestId("scans-count")).toHaveTextContent("2");
    });

    // Clear all
    act(() => {
      screen.getByRole("button", {name: /clear all/i}).click();
    });

    expect(screen.getByText(/scans: 0/i)).toBeInTheDocument();
  });
    act(() => {
      screen.getByTestId("clear-all-btn").click();
    });

    expect(screen.getByTestId("scans-count")).toHaveTextContent("0");
  });

  it("should rename a scan", async () => {
    const TestRenameComponent = () => {
      const context = useInvoiceCreator();
      return (
        <div>
          <button
            onClick={() => {
              const file = new File(["content"], "original.jpg", {
                type: "image/jpeg",
              });
              const fileList = {
                0: file,
                length: 1,
                item: (index: number) => (index === 0 ? file : null),
              } as FileList;
              context.addFiles(fileList);
            }}
          >
            Add File
          </button>
          <button
            onClick={() =>
              context.scans[0] && context.renameScan(context.scans[0].id, "renamed")
            }
          >
            Rename Scan
          </button>
          <div>Current name: {context.scans[0]?.name || "none"}</div>
        </div>
      );
    };

    render(
      <InvoiceCreatorProvider>
        <TestRenameComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByRole("button", {name: /add file/i}).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByText(/current name: original\.jpg/i)).toBeInTheDocument();
    });

    act(() => {
      screen.getByRole("button", {name: /rename scan/i}).click();
    });

    await waitFor(() => {
      expect(screen.getByText(/current name: renamed\.jpg/i)).toBeInTheDocument();
    });

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("renamed")
    );
  });

  it("should rotate image scans", async () => {
    const {rotateImageImpl} = await import("../_utils/fileActions");
    (rotateImageImpl as ReturnType<typeof vi.fn>).mockResolvedValue({
      file: new File(["rotated"], "test.jpg", {type: "image/jpeg"}),
      blob: new Blob(["rotated"]),
      url: "blob:rotated-url",
    });

    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByTestId("scans-count")).toHaveTextContent("1");
    });

    await act(async () => {
      screen.getByTestId("rotate-scan-btn").click();
    });

    await waitFor(() => {
      expect(rotateImageImpl).toHaveBeenCalled();
    });

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("rotated"));
  });

  it("should not rotate PDF files", async () => {
    const TestPDFRotateComponent = () => {
      const context = useInvoiceCreator();
      return (
        <div>
          <button
            data-testid="add-pdf"
            onClick={() => {
              const file = new File(["pdf content"], "test.pdf", {
                type: "application/pdf",
              });
              const fileList = {
                0: file,
                length: 1,
                item: (index: number) => (index === 0 ? file : null),
              } as FileList;
              context.addFiles(fileList);
            }}
          >
            Add PDF
          </button>
          <button
            data-testid="rotate"
            onClick={() =>
              context.scans[0] && context.rotateScan(context.scans[0].id, 90)
            }
          >
            Rotate
          </button>
        </div>
      );
    };

    render(
      <InvoiceCreatorProvider>
        <TestPDFRotateComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByTestId("add-pdf").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await act(async () => {
      screen.getByTestId("rotate").click();
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Rotation is supported only for images."
    );
  });

  it("should process scans one by one", async () => {
    const {createInvoiceAction} = await import(
      "@/lib/actions/invoices/createInvoice"
    );
    (createInvoiceAction as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: {id: "invoice-123"},
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        userIdentifier: "user-123",
        userJwt: "jwt-token",
      }),
    });

    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    // Add files
    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByTestId("scans-count")).toHaveTextContent("1");
    });

    // Process
    await act(async () => {
      screen.getByTestId("process-btn").click();
    });

    await waitFor(() => {
      expect(createInvoiceAction).toHaveBeenCalled();
    });

    expect(toast.loading).toHaveBeenCalledWith(
      expect.stringContaining("Processing"),
      expect.any(Object)
    );
  });

  it("should show toast info when processing with no scans", async () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    await act(async () => {
      screen.getByTestId("process-btn").click();
    });

    expect(toast.info).toHaveBeenCalledWith("No files to process.");
  });

  it("should prevent concurrent processNextStep calls", async () => {
    const {createInvoiceAction} = await import(
      "@/lib/actions/invoices/createInvoice"
    );
    (createInvoiceAction as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({success: true, data: {}}), 1000)
        )
    );

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        userIdentifier: "user-123",
        userJwt: "jwt-token",
      }),
    });

    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    // Add file
    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // Try to process twice
    act(() => {
      screen.getByTestId("process-btn").click();
      screen.getByTestId("process-btn").click();
    });

    // Should only call once due to ref guard
    await waitFor(() => {
      expect(createInvoiceAction).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle processNextStep errors", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Failed to fetch user")
    );

    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    // Add file
    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // Try to process
    await act(async () => {
      screen.getByTestId("process-btn").click();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fetch user")
      );
    });
  });

  it("should handle multiple file additions", async () => {
    const TestMultipleFilesComponent = () => {
      const context = useInvoiceCreator();
      return (
        <div>
          <button
            data-testid="add-multiple"
            onClick={() => {
              const file1 = new File(["content1"], "file1.jpg", {
                type: "image/jpeg",
              });
              const file2 = new File(["content2"], "file2.png", {
                type: "image/png",
              });
              const fileList = {
                0: file1,
                1: file2,
                length: 2,
                item: (index: number) => {
                  if (index === 0) return file1;
                  if (index === 1) return file2;
                  return null;
                },
              } as FileList;
              context.addFiles(fileList);
            }}
          >
            Add Multiple
          </button>
          <div data-testid="count">{context.scans.length}</div>
        </div>
      );
    };

    render(
      <InvoiceCreatorProvider>
        <TestMultipleFilesComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByTestId("add-multiple").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(screen.getByTestId("count")).toHaveTextContent("2");
    });

    expect(toast.success).toHaveBeenCalledWith("2 file(s) uploaded successfully!");
  });

  it("should create blob URLs for previews", async () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it("should revoke blob URLs on scan removal", async () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    // Add file
    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    // Remove file
    act(() => {
      screen.getByTestId("remove-scan-btn").click();
    });

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });

  it("should track upload progress", async () => {
    render(
      <InvoiceCreatorProvider>
        <TestComponent />
      </InvoiceCreatorProvider>
    );

    act(() => {
      screen.getByTestId("add-files-btn").click();
    });

    // Progress should increase over time
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    const progress1 = Number.parseInt(
      screen.getByTestId("upload-progress").textContent || "0"
    );
    expect(progress1).toBeGreaterThan(0);

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    // After full time, should be complete
    await waitFor(() => {
      expect(screen.getByTestId("upload-progress")).toHaveTextContent("0");
    });
  });
});
