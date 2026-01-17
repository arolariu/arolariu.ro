/**
 * @fileoverview Tests for CreateInvoiceDialog component.
 * @module app/domains/invoices/view-scans/_components/dialogs/CreateInvoiceDialog.test
 */

import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Mock stores
const mockArchiveScans = vi.fn();
const mockClearSelectedScans = vi.fn();
const mockMarkScansAsUsedByInvoice = vi.fn();
const mockUpsertInvoice = vi.fn();

vi.mock("@/stores", () => ({
  useScansStore: (selector: (state: unknown) => unknown) => {
    const state = {
      archiveScans: mockArchiveScans,
      clearSelectedScans: mockClearSelectedScans,
      markScansAsUsedByInvoice: mockMarkScansAsUsedByInvoice,
    };
    return selector(state);
  },
  useInvoicesStore: (selector: (state: unknown) => unknown) => {
    const state = {
      upsertInvoice: mockUpsertInvoice,
    };
    return selector(state);
  },
}));

// Mock DialogContext
const mockDialogClose = vi.fn();
const mockDialogOpen = vi.fn();
let mockIsOpen = true;
let mockPayload = {
  selectedScans: [
    {
      id: "scan-1",
      name: "Test Scan 1",
      blobUrl: "https://example.com/scan1.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    },
  ],
};

vi.mock("../../../_contexts/DialogContext", () => ({
  useDialog: () => ({
    isOpen: mockIsOpen,
    open: mockDialogOpen,
    close: mockDialogClose,
    currentDialog: {payload: mockPayload},
  }),
}));

// Mock createInvoiceFromScans
const mockCreateInvoiceFromScans = vi.fn();
vi.mock("../../_actions/createInvoiceFromScans", () => ({
  createInvoiceFromScans: (params: unknown) => mockCreateInvoiceFromScans(params),
}));

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, vars?: Record<string, string>) => {
    const translations: Record<string, string> = {
      title: "Create Invoice",
      titlePlural: "Create Invoices",
      description: "Choose how to create invoices from your scans",
      selectedScans: "Selected Scans",
      totalSize: "total",
      chooseMode: "Choose creation mode",
      "singleMode.title": "Single Mode",
      "singleMode.description": `Create ${vars?.count ?? "1"} individual invoices`,
      "batchMode.title": "Batch Mode",
      "batchMode.description": `Combine ${vars?.count ?? "1"} scans into one invoice`,
      "singleScanInfo.title": "Single Scan Selected",
      "singleScanInfo.description": "This scan will be converted into a new invoice",
      "buttons.cancel": "Cancel",
      "buttons.createSingle": "Create Invoice",
      "buttons.createMultiple": `Create ${vars?.count ?? "1"} Invoices`,
      "creating.title": "Creating Invoice",
      "creating.titlePlural": "Creating Invoices",
      "creating.processing": "Processing scan...",
      "creating.processingPlural": `Processing ${vars?.count ?? "1"} scans...`,
      "creating.step1Title": "Uploading",
      "creating.step1Description": "Uploading scans to server",
      "creating.step2Title": "Processing",
      "creating.step2Description": "Processing scans",
      "creating.step3Title": "Finalizing",
      "creating.step3Description": "Creating invoice",
      "complete.title": "Invoice Created!",
      "complete.titlePlural": `${vars?.count ?? "1"} Invoices Created!`,
      "complete.description": "Your invoice is ready",
      "complete.descriptionPlural": "Your invoices are ready",
      "complete.nextSteps": "Next Steps:",
      "complete.nextStepsDescription": "View your invoice",
      "complete.nextStepsDescriptionPlural": "View your invoices",
      "complete.viewButton": "View Invoice",
      "complete.viewButtonPlural": "View Invoices",
      "errors.partialFail": `${vars?.count ?? "0"} scans failed`,
      "errors.createFailed": `Failed: ${vars?.message ?? "Unknown error"}`,
      "errors.unknown": "Unknown error",
    };
    return translations[key] ?? key;
  },
}));

// Mock @arolariu/components
vi.mock("@arolariu/components", () => ({
  Button: ({children, onClick, variant, className}: {children: ReactNode; onClick?: () => void; variant?: string; className?: string}) => (
    <button
      onClick={onClick}
      data-variant={variant}
      className={className}>
      {children}
    </button>
  ),
  Dialog: ({children, open, onOpenChange}: {children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void}) =>
    open ? (
      <div
        role='dialog'
        data-testid='dialog'>
        {children}
        <button
          data-testid='dialog-close'
          onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
    ) : null,
  DialogContent: ({children, className}: {children: ReactNode; className?: string}) => <div className={className}>{children}</div>,
  DialogDescription: ({children}: {children: ReactNode}) => <p data-testid='dialog-description'>{children}</p>,
  DialogFooter: ({children, className}: {children: ReactNode; className?: string}) => (
    <div
      data-testid='dialog-footer'
      className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({children}: {children: ReactNode}) => <div data-testid='dialog-header'>{children}</div>,
  DialogTitle: ({children, className}: {children: ReactNode; className?: string}) => (
    <h2
      data-testid='dialog-title'
      className={className}>
      {children}
    </h2>
  ),
  Label: ({children, htmlFor, className}: {children: ReactNode; htmlFor?: string; className?: string}) => (
    <label
      htmlFor={htmlFor}
      className={className}>
      {children}
    </label>
  ),
  Progress: ({value, className}: {value: number; className?: string}) => (
    <div
      data-testid='progress'
      data-value={value}
      className={className}
    />
  ),
  RadioGroup: ({children, value, onValueChange}: {children: ReactNode; value: string; onValueChange: (v: string) => void}) => (
    <div
      data-testid='radio-group'
      data-value={value}>
      {children}
    </div>
  ),
  RadioGroupItem: ({value, id, className}: {value: string; id: string; className?: string}) => (
    <input
      type='radio'
      id={id}
      value={value}
      className={className}
      data-testid={`radio-${value}`}
    />
  ),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock motion/react
vi.mock("motion/react", () => ({
  AnimatePresence: ({children}: {children: ReactNode}) => <>{children}</>,
  motion: {
    div: ({children, className, key}: {children: ReactNode; className?: string; key?: string}) => (
      <div
        className={className}
        data-key={key}>
        {children}
      </div>
    ),
  },
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({src, alt, fill, className}: {src: string; alt: string; fill?: boolean; className?: string}) => (
    <img
      src={src}
      alt={alt}
      className={className}
      data-fill={fill}
    />
  ),
}));

// Mock react-icons
vi.mock("react-icons/tb", () => ({
  TbArrowRight: ({className}: {className?: string}) => <span className={className}>→</span>,
  TbCheck: ({className}: {className?: string}) => <span className={className}>✓</span>,
  TbFileInvoice: ({className}: {className?: string}) => <span className={className}>📄</span>,
  TbFileTypePdf: ({className}: {className?: string}) => <span className={className}>PDF</span>,
  TbLoader2: ({className}: {className?: string}) => <span className={className}>⏳</span>,
  TbPhoto: ({className}: {className?: string}) => <span className={className}>🖼</span>,
  TbSparkles: ({className}: {className?: string}) => <span className={className}>✨</span>,
  TbStack2: ({className}: {className?: string}) => <span className={className}>📚</span>,
}));

// Import after mocks
import CreateInvoiceDialog from "./CreateInvoiceDialog";

describe("CreateInvoiceDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOpen = true;
    mockPayload = {
      selectedScans: [
        {
          id: "scan-1",
          name: "Test Scan 1",
          blobUrl: "https://example.com/scan1.jpg",
          mimeType: "image/jpeg",
          sizeInBytes: 1024,
        },
      ],
    };
    mockCreateInvoiceFromScans.mockResolvedValue({
      invoices: [{id: "invoice-1", name: "Test Invoice"}],
      convertedScanIds: ["scan-1"],
      errors: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render dialog when open", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render dialog when closed", () => {
      mockIsOpen = false;
      render(<CreateInvoiceDialog />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should display dialog title", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByTestId("dialog-title")).toBeInTheDocument();
    });

    it("should display dialog description", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByTestId("dialog-description")).toBeInTheDocument();
    });

    it("should display selected scans count", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText(/Selected Scans/)).toBeInTheDocument();
    });
  });

  describe("single scan mode", () => {
    it("should display single scan info banner when only one scan selected", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText("Single Scan Selected")).toBeInTheDocument();
    });

    it("should not display mode selection for single scan", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.queryByTestId("radio-group")).not.toBeInTheDocument();
    });

    it("should display Create Invoice button", () => {
      render(<CreateInvoiceDialog />);
      const footer = screen.getByTestId("dialog-footer");
      expect(footer.textContent).toContain("Create Invoice");
    });
  });

  describe("multiple scans mode", () => {
    beforeEach(() => {
      mockPayload = {
        selectedScans: [
          {id: "scan-1", name: "Scan 1", blobUrl: "https://example.com/scan1.jpg", mimeType: "image/jpeg", sizeInBytes: 1024},
          {id: "scan-2", name: "Scan 2", blobUrl: "https://example.com/scan2.jpg", mimeType: "image/jpeg", sizeInBytes: 2048},
        ],
      };
    });

    it("should display mode selection for multiple scans", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByTestId("radio-group")).toBeInTheDocument();
    });

    it("should display single mode option", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText("Single Mode")).toBeInTheDocument();
    });

    it("should display batch mode option", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText("Batch Mode")).toBeInTheDocument();
    });

    it("should display plural title for multiple scans", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText("Create Invoices")).toBeInTheDocument();
    });
  });

  describe("PDF scan handling", () => {
    beforeEach(() => {
      mockPayload = {
        selectedScans: [
          {id: "scan-1", name: "Scan 1", blobUrl: "https://example.com/scan1.pdf", mimeType: "application/pdf", sizeInBytes: 1024},
        ],
      };
    });

    it("should display PDF icon for PDF scans", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText("PDF")).toBeInTheDocument();
    });
  });

  describe("file size formatting", () => {
    it("should format bytes correctly", () => {
      mockPayload = {
        selectedScans: [{id: "scan-1", name: "Scan 1", blobUrl: "https://example.com/scan1.jpg", mimeType: "image/jpeg", sizeInBytes: 500}],
      };
      render(<CreateInvoiceDialog />);
      expect(screen.getByText(/500 B/)).toBeInTheDocument();
    });

    it("should format KB correctly", () => {
      mockPayload = {
        selectedScans: [
          {id: "scan-1", name: "Scan 1", blobUrl: "https://example.com/scan1.jpg", mimeType: "image/jpeg", sizeInBytes: 2048},
        ],
      };
      render(<CreateInvoiceDialog />);
      expect(screen.getByText(/2.0 KB/)).toBeInTheDocument();
    });

    it("should format MB correctly", () => {
      mockPayload = {
        selectedScans: [
          {id: "scan-1", name: "Scan 1", blobUrl: "https://example.com/scan1.jpg", mimeType: "image/jpeg", sizeInBytes: 2 * 1024 * 1024},
        ],
      };
      render(<CreateInvoiceDialog />);
      expect(screen.getByText(/2.0 MB/)).toBeInTheDocument();
    });
  });

  describe("overflow scans display", () => {
    beforeEach(() => {
      mockPayload = {
        selectedScans: Array.from({length: 8}, (_, i) => ({
          id: `scan-${i + 1}`,
          name: `Scan ${i + 1}`,
          blobUrl: `https://example.com/scan${i + 1}.jpg`,
          mimeType: "image/jpeg",
          sizeInBytes: 1024,
        })),
      };
    });

    it("should show +N indicator when more than 6 scans", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText("+2")).toBeInTheDocument();
    });
  });

  describe("cancel button", () => {
    it("should display cancel button", () => {
      render(<CreateInvoiceDialog />);
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should call close when cancel is clicked", () => {
      render(<CreateInvoiceDialog />);
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);
      expect(mockDialogClose).toHaveBeenCalled();
    });
  });

  describe("invoice creation", () => {
    const getCreateButton = (): HTMLElement => {
      const footer = screen.getByTestId("dialog-footer");
      const buttons = footer.querySelectorAll("button");
      // The create button is the one without "outline" variant
      const createBtn = Array.from(buttons).find((btn) => btn.getAttribute("data-variant") !== "outline");
      if (!createBtn) throw new Error("Create button not found");
      return createBtn as HTMLElement;
    };

    it("should call createInvoiceFromScans when create button clicked", async () => {
      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateInvoiceFromScans).toHaveBeenCalled();
      });
    });

    it("should call createInvoiceFromScans with single mode", async () => {
      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockCreateInvoiceFromScans).toHaveBeenCalledWith(
          expect.objectContaining({
            mode: "single",
          }),
        );
      });
    });

    it("should upsert invoice after successful creation", async () => {
      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockUpsertInvoice).toHaveBeenCalledWith({id: "invoice-1", name: "Test Invoice"});
      });
    });

    it("should mark scans as used after successful creation", async () => {
      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockMarkScansAsUsedByInvoice).toHaveBeenCalled();
      });
    });

    it("should archive scans after successful creation", async () => {
      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockArchiveScans).toHaveBeenCalledWith(["scan-1"]);
      });
    });

    it("should clear selected scans after successful creation", async () => {
      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockClearSelectedScans).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    const getCreateButton = (): HTMLElement => {
      const footer = screen.getByTestId("dialog-footer");
      const buttons = footer.querySelectorAll("button");
      const createBtn = Array.from(buttons).find((btn) => btn.getAttribute("data-variant") !== "outline");
      if (!createBtn) throw new Error("Create button not found");
      return createBtn as HTMLElement;
    };

    it("should handle creation failure", async () => {
      const {toast} = await import("@arolariu/components");
      mockCreateInvoiceFromScans.mockRejectedValue(new Error("Creation failed"));

      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("should handle partial failures", async () => {
      const {toast} = await import("@arolariu/components");
      mockCreateInvoiceFromScans.mockResolvedValue({
        invoices: [{id: "invoice-1", name: "Test Invoice"}],
        convertedScanIds: ["scan-1"],
        errors: [{scanId: "scan-2", error: "Failed"}],
      });

      render(<CreateInvoiceDialog />);
      const createButton = getCreateButton();

      fireEvent.click(createButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });

  describe("empty scans", () => {
    beforeEach(() => {
      mockPayload = {selectedScans: []};
    });

    it("should not call createInvoiceFromScans with empty scans", async () => {
      render(<CreateInvoiceDialog />);
      const footer = screen.getByTestId("dialog-footer");
      const buttons = footer.querySelectorAll("button");
      const createBtn = Array.from(buttons).find((btn) => btn.getAttribute("data-variant") !== "outline");

      if (createBtn) {
        fireEvent.click(createBtn);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockCreateInvoiceFromScans).not.toHaveBeenCalled();
    });
  });
});
