import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {ReactNode} from "react";
import {describe, expect, test, vi} from "vitest";
import {InvoiceCreatorProvider} from "../_context/InvoiceCreatorContext";
import type {InvoiceScan} from "../_types/InvoiceScan";
import TableDisplay from "./TableDisplay";

// Mock data
const createMockScan = (id: string, name: string, type: "image" | "pdf" = "image"): InvoiceScan => ({
  id,
  name,
  type,
  file: new File([], name),
  blob: new Blob(),
  preview: `mock-preview-${id}`,
  uploadedAt: new Date("2024-01-01T10:00:00Z"),
  createdAt: new Date("2024-01-01T10:00:00Z"),
  rotation: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  mimeType: type === "pdf" ? "application/pdf" : "image/jpeg",
  size: 1024 * 1024, // 1MB
});

// Mock the InvoiceCreatorContext
const mockContextValue = {
  scans: [] as InvoiceScan[],
  isUploading: false,
  uploadProgress: 0,
  isProcessingNext: false,
  addFiles: vi.fn(),
  removeScan: vi.fn(),
  clearAll: vi.fn(),
  rotateScan: vi.fn(),
  renameScan: vi.fn(),
  processNextStep: vi.fn(),
};

const wrapper = ({children, scans = []}: {children: ReactNode; scans?: InvoiceScan[]}) => {
  // Override the context value with provided scans
  mockContextValue.scans = scans;
  return <InvoiceCreatorProvider>{children}</InvoiceCreatorProvider>;
};

describe("TableDisplay", () => {
  test("should return null when no scans are present", () => {
    const {container} = render(<TableDisplay />, {wrapper});
    expect(container).toBeEmptyDOMElement();
  });

  test("should display table with scans", () => {
    const scans = [
      createMockScan("1", "invoice-001.jpg"),
      createMockScan("2", "receipt-002.pdf", "pdf"),
    ];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    expect(screen.getByText("invoice-001.jpg")).toBeInTheDocument();
    expect(screen.getByText("receipt-002.pdf")).toBeInTheDocument();
  });

  test("should display search input", () => {
    const scans = [createMockScan("1", "invoice-001.jpg")];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    expect(screen.getByPlaceholderText(/search by filename/i)).toBeInTheDocument();
  });

  test("should filter scans based on search query", async () => {
    const user = userEvent.setup();
    const scans = [
      createMockScan("1", "invoice-001.jpg"),
      createMockScan("2", "receipt-002.pdf", "pdf"),
      createMockScan("3", "invoice-003.jpg"),
    ];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    const searchInput = screen.getByPlaceholderText(/search by filename/i);
    await user.type(searchInput, "receipt");

    await waitFor(() => {
      expect(screen.getByText("receipt-002.pdf")).toBeInTheDocument();
      expect(screen.queryByText("invoice-001.jpg")).not.toBeInTheDocument();
    });
  });

  test("should display results count", () => {
    const scans = [
      createMockScan("1", "invoice-001.jpg"),
      createMockScan("2", "receipt-002.pdf", "pdf"),
    ];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    expect(screen.getByText(/2 of 2 shown/i)).toBeInTheDocument();
  });

  test("should display pagination controls", () => {
    const scans = Array.from({length: 15}, (_, i) =>
      createMockScan(`${i}`, `invoice-${String(i + 1).padStart(3, "0")}.jpg`),
    );
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    // Should show page size selector
    expect(screen.getByText(/rows per page:/i)).toBeInTheDocument();
  });

  test("should display correct file types with badges", () => {
    const scans = [
      createMockScan("1", "invoice.jpg", "image"),
      createMockScan("2", "receipt.pdf", "pdf"),
    ];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    expect(screen.getByText("IMAGE")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
  });

  test("should display file size in MB", () => {
    const scans = [createMockScan("1", "invoice.jpg")];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    expect(screen.getByText(/1\.00 MB/i)).toBeInTheDocument();
  });

  test("should display upload time", () => {
    const scans = [createMockScan("1", "invoice.jpg")];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    // Should show formatted time (e.g., "10:00 AM")
    expect(screen.getByText(/10:00/i)).toBeInTheDocument();
  });

  test("should have rename and delete action buttons but not rotate", () => {
    const scans = [createMockScan("1", "invoice.jpg", "image")];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    // Should have edit (rename) and delete buttons
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    
    // Should NOT have rotate button
    const rotateButtons = screen.queryAllByLabelText(/rotate/i);
    expect(rotateButtons.length).toBe(0);
  });

  test("should show correct row numbers with pagination", () => {
    const scans = Array.from({length: 25}, (_, i) =>
      createMockScan(`${i}`, `invoice-${String(i + 1).padStart(3, "0")}.jpg`),
    );
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    // First row should be numbered 1
    const firstCell = screen.getAllByRole("cell")[0];
    expect(firstCell).toHaveTextContent("1");
  });

  test("should display table headers correctly", () => {
    const scans = [createMockScan("1", "invoice.jpg")];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("File Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Uploaded")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  test("should handle empty search results", async () => {
    const user = userEvent.setup();
    const scans = [createMockScan("1", "invoice-001.jpg")];
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    const searchInput = screen.getByPlaceholderText(/search by filename/i);
    await user.type(searchInput, "nonexistent");

    await waitFor(() => {
      expect(screen.getByText(/0 of 1 shown/i)).toBeInTheDocument();
    });
  });

  test("should display correct page size options", async () => {
    const user = userEvent.setup();
    const scans = Array.from({length: 50}, (_, i) =>
      createMockScan(`${i}`, `invoice-${i}.jpg`),
    );
    
    render(<TableDisplay />, {
      wrapper: ({children}) => wrapper({children, scans}),
    });

    // Click on page size selector
    const pageSizeButton = screen.getByRole("combobox");
    await user.click(pageSizeButton);

    await waitFor(() => {
      // Should show options: 10, 20, 50, 100
      expect(screen.getByRole("option", {name: "10"})).toBeInTheDocument();
      expect(screen.getByRole("option", {name: "20"})).toBeInTheDocument();
      expect(screen.getByRole("option", {name: "50"})).toBeInTheDocument();
      expect(screen.getByRole("option", {name: "100"})).toBeInTheDocument();
    });
  });
});
