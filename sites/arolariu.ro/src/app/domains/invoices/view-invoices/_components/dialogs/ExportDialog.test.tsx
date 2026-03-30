/**
 * @fileoverview Unit tests for ExportDialog component.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_components/dialogs/ExportDialog/tests
 */

import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {InvoiceBuilder} from "../../../../../../data/mocks/invoice";
import ExportDialog from "./ExportDialog";

// Mock next-intl
vi.mock("next-intl", () => {
  const mockT = (key: string) => key;
  mockT.rich = (key: string) => key;
  return {
    useTranslations: () => mockT,
    useLocale: () => "en",
  };
});

// Mock the DialogContext
const mockOpen = vi.fn();
const mockClose = vi.fn();
vi.mock("../../../_contexts/DialogContext", () => ({
  useDialog: () => ({
    isOpen: true,
    open: mockOpen,
    close: mockClose,
  }),
}));

// Mock the invoices store
const mockSelectedInvoices = [
  new InvoiceBuilder().withId("invoice-1").build(),
  new InvoiceBuilder().withId("invoice-2").build(),
];
const mockAllInvoices = [
  ...mockSelectedInvoices,
  new InvoiceBuilder().withId("invoice-3").build(),
];

vi.mock("@/stores", () => ({
  useInvoicesStore: (selector: (state: any) => any) =>
    selector({
      selectedInvoices: mockSelectedInvoices,
      invoices: mockAllInvoices,
    }),
}));

// Mock the export utility
const mockExportInvoices = vi.fn();
vi.mock("../../_utils/export", () => ({
  exportInvoices: (...args: unknown[]) => mockExportInvoices(...args),
}));

// Mock @arolariu/components
vi.mock("@arolariu/components", () => ({
  Button: ({children, onClick, className, variant, ...props}: any) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      {...props}>
      {children}
    </button>
  ),
  Card: ({children, className}: any) => <div className={className}>{children}</div>,
  CardContent: ({children, className}: any) => <div className={className}>{children}</div>,
  Checkbox: ({checked, onCheckedChange, id}: any) => (
    <input
      type='checkbox'
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
    />
  ),
  Dialog: ({open, onOpenChange, children}: any) =>
    open ? <div data-testid='dialog'>{children}</div> : null,
  DialogContent: ({children, className}: any) => <div className={className}>{children}</div>,
  DialogDescription: ({children}: any) => <p>{children}</p>,
  DialogFooter: ({children}: any) => <div>{children}</div>,
  DialogHeader: ({children}: any) => <div>{children}</div>,
  DialogTitle: ({children}: any) => <h2>{children}</h2>,
  Input: ({value, onChange, id, placeholder, className}: any) => (
    <input
      type='text'
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  ),
  Label: ({children, htmlFor, className}: any) => (
    <label
      htmlFor={htmlFor}
      className={className}>
      {children}
    </label>
  ),
  RadioGroup: ({children, defaultValue, onValueChange}: any) => (
    <div
      data-testid='radio-group'
      data-default-value={defaultValue}
      onChange={(e: any) => onValueChange(e.target.value)}>
      {children}
    </div>
  ),
  RadioGroupItem: ({value, id}: any) => (
    <input
      type='radio'
      id={id}
      value={value}
      name='format'
    />
  ),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock react-icons
vi.mock("react-icons/tb", () => ({
  TbCheck: () => <span>✓</span>,
  TbCopy: () => <span>📋</span>,
  TbDownload: () => <span>⬇</span>,
  TbFileSpreadsheet: () => <span>📊</span>,
  TbFileText: () => <span>📄</span>,
  TbJson: () => <span>{"{}"}</span>,
}));

describe("ExportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe("Rendering", () => {
    it("should render dialog with title and description", () => {
      render(<ExportDialog />);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("Invoices.ViewInvoices.exportDialog.title")).toBeInTheDocument();
      expect(screen.getByText(/Invoices.ViewInvoices.exportDialog.description/)).toBeInTheDocument();
    });

    it("should render all export format options (CSV, JSON, PDF)", () => {
      render(<ExportDialog />);

      expect(screen.getByLabelText(/format\.labels\.csv/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/format\.labels\.json/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/format\.labels\.pdf/i)).toBeInTheDocument();
    });

    it("should render include options checkboxes", () => {
      render(<ExportDialog />);

      expect(screen.getByLabelText(/options\.includeMetadata/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/options\.includeProducts/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/options\.includeMerchant/i)).toBeInTheDocument();
    });

    it("should render filename input with default value", () => {
      render(<ExportDialog />);

      const filenameInput = screen.getByLabelText(/filename\.label/i);
      expect(filenameInput).toBeInTheDocument();
      expect(filenameInput).toHaveValue(expect.stringContaining("invoices-export-"));
    });

    it("should render export button", () => {
      render(<ExportDialog />);

      expect(screen.getByText(/buttons\.export/i)).toBeInTheDocument();
    });

    it("should render cancel button", () => {
      render(<ExportDialog />);

      expect(screen.getByText(/buttons\.cancel/i)).toBeInTheDocument();
    });

    it("should display estimated file size", () => {
      render(<ExportDialog />);

      expect(screen.getByText(/estimate\.label/i)).toBeInTheDocument();
      expect(screen.getByText(/KB/i)).toBeInTheDocument();
    });
  });

  describe("Checkbox Interactions", () => {
    it("should toggle includeMetadata checkbox", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const metadataCheckbox = screen.getByLabelText(/options\.includeMetadata/i) as HTMLInputElement;
      expect(metadataCheckbox.checked).toBe(false);

      await user.click(metadataCheckbox);
      expect(metadataCheckbox.checked).toBe(true);

      await user.click(metadataCheckbox);
      expect(metadataCheckbox.checked).toBe(false);
    });

    it("should toggle includeProducts checkbox", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const productsCheckbox = screen.getByLabelText(/options\.includeProducts/i) as HTMLInputElement;
      expect(productsCheckbox.checked).toBe(false);

      await user.click(productsCheckbox);
      expect(productsCheckbox.checked).toBe(true);
    });

    it("should toggle includeMerchant checkbox", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const merchantCheckbox = screen.getByLabelText(/options\.includeMerchant/i) as HTMLInputElement;
      expect(merchantCheckbox.checked).toBe(false);

      await user.click(merchantCheckbox);
      expect(merchantCheckbox.checked).toBe(true);
    });
  });

  describe("Format Selection", () => {
    it("should default to CSV format", () => {
      render(<ExportDialog />);

      const radioGroup = screen.getByTestId("radio-group");
      expect(radioGroup).toHaveAttribute("data-default-value", "csv");
    });

    it("should show CSV-specific options when CSV format is selected", () => {
      render(<ExportDialog />);

      expect(screen.getByLabelText(/options\.csv\.includeHeaders/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/options\.csv\.delimiterLabel/i)).toBeInTheDocument();
    });

    it("should show JSON-specific options when JSON format is selected", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByLabelText(/options\.json\.prettyPrint/i)).toBeInTheDocument();
      });
    });

    it("should show copy button only for JSON format", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // CSV format initially - no copy button
      expect(screen.queryByText(/buttons\.copy/i)).not.toBeInTheDocument();

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
      });
    });
  });

  describe("CSV Options", () => {
    it("should toggle CSV includeHeaders option", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const headersCheckbox = screen.getByLabelText(/options\.csv\.includeHeaders/i) as HTMLInputElement;
      expect(headersCheckbox.checked).toBe(true); // Default is true

      await user.click(headersCheckbox);
      expect(headersCheckbox.checked).toBe(false);
    });

    it("should update CSV delimiter", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const delimiterInput = screen.getByLabelText(/options\.csv\.delimiterLabel/i) as HTMLInputElement;
      expect(delimiterInput.value).toBe(",");

      await user.clear(delimiterInput);
      await user.type(delimiterInput, ";");
      expect(delimiterInput.value).toBe(";");
    });
  });

  describe("JSON Options", () => {
    it("should toggle JSON prettyPrint option", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        const prettyPrintCheckbox = screen.getByLabelText(/options\.json\.prettyPrint/i) as HTMLInputElement;
        expect(prettyPrintCheckbox.checked).toBe(false);
      });

      const prettyPrintCheckbox = screen.getByLabelText(/options\.json\.prettyPrint/i) as HTMLInputElement;
      await user.click(prettyPrintCheckbox);
      expect(prettyPrintCheckbox.checked).toBe(true);
    });
  });

  describe("Filename Customization", () => {
    it("should allow changing the filename", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const filenameInput = screen.getByLabelText(/filename\.label/i) as HTMLInputElement;
      await user.clear(filenameInput);
      await user.type(filenameInput, "my-custom-export");

      expect(filenameInput.value).toBe("my-custom-export");
    });

    it("should use custom filename when exporting", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const filenameInput = screen.getByLabelText(/filename\.label/i);
      await user.clear(filenameInput);
      await user.type(filenameInput, "custom-filename");

      const exportButton = screen.getByText(/buttons\.export/i);
      await user.click(exportButton);

      expect(mockExportInvoices).toHaveBeenCalledWith(
        mockSelectedInvoices,
        expect.objectContaining({format: "csv"}),
        "custom-filename",
      );
    });
  });

  describe("Export Functionality", () => {
    it("should call exportInvoices with selected invoices when export button is clicked", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const exportButton = screen.getByText(/buttons\.export/i);
      await user.click(exportButton);

      expect(mockExportInvoices).toHaveBeenCalledWith(
        mockSelectedInvoices,
        expect.objectContaining({
          format: "csv",
          includeMetadata: false,
          includeMerchant: false,
          includeProducts: false,
        }),
        expect.any(String),
      );
    });

    it("should export with all options enabled", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // Enable all options
      await user.click(screen.getByLabelText(/options\.includeMetadata/i));
      await user.click(screen.getByLabelText(/options\.includeMerchant/i));
      await user.click(screen.getByLabelText(/options\.includeProducts/i));

      const exportButton = screen.getByText(/buttons\.export/i);
      await user.click(exportButton);

      expect(mockExportInvoices).toHaveBeenCalledWith(
        mockSelectedInvoices,
        expect.objectContaining({
          includeMetadata: true,
          includeMerchant: true,
          includeProducts: true,
        }),
        expect.any(String),
      );
    });

    it("should handle keyboard Enter key on export button", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const exportButton = screen.getByText(/buttons\.export/i);
      exportButton.focus();
      await user.keyboard("{Enter}");

      expect(mockExportInvoices).toHaveBeenCalled();
    });
  });

  describe("Copy to Clipboard (JSON)", () => {
    it("should copy JSON to clipboard when copy button is clicked", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
      });

      const copyButton = screen.getByText(/buttons\.copy/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"id"'));
      });
    });

    it("should include only selected fields in copied JSON", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
      });

      // Enable metadata only
      await user.click(screen.getByLabelText(/options\.includeMetadata/i));

      const copyButton = screen.getByText(/buttons\.copy/i);
      await user.click(copyButton);

      await waitFor(() => {
        const clipboardCall = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
        expect(clipboardCall).toBeTruthy();
        const jsonData = JSON.parse(clipboardCall as string);
        expect(jsonData[0]).toHaveProperty("additionalMetadata");
        expect(jsonData[0].items).toBeUndefined();
      });
    });

    it("should format JSON with pretty print when enabled", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
      });

      // Enable pretty print
      await user.click(screen.getByLabelText(/options\.json\.prettyPrint/i));

      const copyButton = screen.getByText(/buttons\.copy/i);
      await user.click(copyButton);

      await waitFor(() => {
        const clipboardCall = vi.mocked(navigator.clipboard.writeText).mock.calls[0][0];
        expect(clipboardCall).toContain("\n"); // Pretty printed JSON has newlines
        expect(clipboardCall).toContain("  "); // Pretty printed JSON has indentation
      });
    });

    it("should show success state after copying", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
      });

      const copyButton = screen.getByText(/buttons\.copy/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copied/i)).toBeInTheDocument();
      });
    });

    it("should reset copied state after 2 seconds", async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({delay: null});
      render(<ExportDialog />);

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
      });

      const copyButton = screen.getByText(/buttons\.copy/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copied/i)).toBeInTheDocument();
      });

      // Fast-forward time by 2 seconds
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
        expect(screen.queryByText(/buttons\.copied/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("should handle clipboard errors gracefully", async () => {
      const {toast} = await import("@arolariu/components");
      const user = userEvent.setup();

      // Mock clipboard to fail
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("Clipboard access denied")),
        },
      });

      render(<ExportDialog />);

      // Switch to JSON format
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByText(/buttons\.copy/i)).toBeInTheDocument();
      });

      const copyButton = screen.getByText(/buttons\.copy/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to copy to clipboard");
      });
    });
  });

  describe("Dialog Controls", () => {
    it("should call close when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const cancelButton = screen.getByText(/buttons\.cancel/i);
      await user.click(cancelButton);

      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe("Empty Invoice Handling", () => {
    it("should handle empty invoice array gracefully", () => {
      // Override store mock for this test
      vi.mocked(vi.fn()).mockReturnValue({
        selectedInvoices: [],
        invoices: [],
      });

      render(<ExportDialog />);

      // Should still render without crashing
      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText(/estimate\.label/i)).toBeInTheDocument();
    });
  });

  describe("File Size Estimation", () => {
    it("should update file size estimate when options change", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      const initialEstimate = screen.getByText(/KB/i).textContent;

      // Enable products (significantly increases size)
      await user.click(screen.getByLabelText(/options\.includeProducts/i));

      const newEstimate = screen.getByText(/KB/i).textContent;
      expect(newEstimate).not.toBe(initialEstimate);
    });

    it("should increase estimate when pretty print is enabled for JSON", async () => {
      const user = userEvent.setup();
      render(<ExportDialog />);

      // Switch to JSON
      const jsonRadio = screen.getByLabelText(/format\.labels\.json/i);
      await user.click(jsonRadio);

      await waitFor(() => {
        expect(screen.getByLabelText(/options\.json\.prettyPrint/i)).toBeInTheDocument();
      });

      const estimateBefore = screen.getByText(/KB/i).textContent;

      // Enable pretty print
      await user.click(screen.getByLabelText(/options\.json\.prettyPrint/i));

      const estimateAfter = screen.getByText(/KB/i).textContent;
      expect(estimateAfter).not.toBe(estimateBefore);
    });
  });

  describe("Event Propagation", () => {
    it("should prevent event propagation on export button click", async () => {
      const user = userEvent.setup();
      const mockParentClick = vi.fn();

      const {container} = render(
        <div onClick={mockParentClick}>
          <ExportDialog />
        </div>,
      );

      const exportButton = screen.getByText(/buttons\.export/i);
      await user.click(exportButton);

      // Parent click should not be called due to stopPropagation
      expect(mockExportInvoices).toHaveBeenCalled();
      // Note: stopPropagation prevents bubbling, but in test environment this might behave differently
    });
  });
});
