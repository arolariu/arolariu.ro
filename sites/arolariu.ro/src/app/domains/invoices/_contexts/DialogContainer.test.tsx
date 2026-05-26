/**
 * @fileoverview Unit tests for the DialogContainer component.
 * @module domains/invoices/_contexts/DialogContainer.test
 */

import "@testing-library/jest-dom/vitest";
import {render, screen} from "@testing-library/react";
import {describe, expect, test, vi} from "vitest";

// ============================================================================
// Mocks - Must be declared before imports that use them
// ============================================================================

// Mock next/dynamic so dialog routing is tested synchronously.
vi.mock("next/dynamic", () => ({
  default: (
    loader: () => Promise<{default: React.ComponentType<Record<string, unknown>>} | {ExportDialog: React.ComponentType<Record<string, unknown>>}>,
  ) => {
    void loader().catch(() => undefined);
    const source = loader.toString();
    const dialogStubs: ReadonlyArray<readonly [moduleName: string, testId: string, label: string]> = [
      ["AddScanDialog", "add-scan-dialog", "AddScanDialog"],
      ["AddRecipeDialog", "add-recipe-dialog", "AddRecipeDialog"],
      ["AllergenDialog", "allergen-dialog", "AllergenDialog"],
      ["AnalyzeDialog", "analyze-dialog", "AnalyzeDialog"],
      ["BulkCategoryDialog", "bulk-category-dialog", "BulkCategoryDialog"],
      ["CreateInvoiceDialog", "create-invoice-dialog", "CreateInvoiceDialog"],
      ["DeleteInvoiceDialog", "delete-invoice-dialog", "DeleteInvoiceDialog"],
      ["DeleteRecipeDialog", "delete-recipe-dialog", "DeleteRecipeDialog"],
      ["DeleteScanDialog", "delete-scan-dialog", "DeleteScanDialog"],
      ["FeedbackDialog", "feedback-dialog", "InvoiceFeedbackDialog"],
      ["ImageDialog", "image-dialog", "InvoiceImageDialog"],
      ["ItemsDialog", "items-dialog", "InvoiceItemsDialog"],
      ["MerchantDialog", "merchant-dialog", "InvoiceMerchantDialog"],
      ["MerchantReceiptsDialog", "merchant-receipts-dialog", "InvoiceMerchantReceiptsDialog"],
      ["MetadataDialog", "metadata-dialog", "InvoiceMetadataDialog"],
      ["ImportDialog", "import-dialog", "InvoicesImportDialog"],
      ["PreviewRecipeDialog", "preview-recipe-dialog", "PreviewRecipeDialog"],
      ["PreviewScanDialog", "preview-scan-dialog", "PreviewScanDialog"],
      ["RemoveScanDialog", "remove-scan-dialog", "RemoveScanDialog"],
      ["ShareAnalyticsDialog", "share-analytics-dialog", "ShareAnalyticsDialog"],
      ["ShareInvoiceDialog", "share-invoice-dialog", "ShareInvoiceDialog"],
      ["ShareRecipeDialog", "share-recipe-dialog", "ShareRecipeDialog"],
      ["UpdateRecipeDialog", "update-recipe-dialog", "UpdateRecipeDialog"],
    ];
    const match = dialogStubs.find(([moduleName]) => source.includes(moduleName));

    function DynamicComponent(): React.JSX.Element {
      if (source.includes("view-invoice/[id]/_dialogs/ExportDialog")) {
        return <div data-testid='view-invoice-export-dialog'>ViewInvoiceExportDialog</div>;
      }
      if (source.includes("view-invoices/_dialogs/ExportDialog")) {
        return <div data-testid='export-dialog'>InvoicesExportDialog</div>;
      }
      if (match) {
        return <div data-testid={match[1]}>{match[2]}</div>;
      }

      return <div data-testid='unknown-dialog'>UnknownDialog</div>;
    }

    return DynamicComponent;
  },
}));

// Mock server-only modules that are imported by server actions
vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/utils.server", () => ({
  fetchWithTimeout: vi.fn(),
}));

// Mock server actions
vi.mock("@/app/domains/invoices/_actions/invoices/patchInvoice", () => ({
  default: vi.fn(),
}));

// Mock @arolariu/components to avoid path alias resolution issues in tests
vi.mock("@arolariu/components", () => ({
  Dialog: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  DialogContent: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  DialogHeader: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  DialogTitle: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  DialogDescription: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  DialogFooter: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  Button: ({children}: {children: React.ReactNode}) => <button>{children}</button>,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({children}: {children: React.ReactNode}) => <label>{children}</label>,
  toast: vi.fn(),
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}));

// Mock the useDialogs hook from DialogContext
const mockUseDialogs = vi.fn();
vi.mock("./DialogContext", () => ({
  useDialogs: () => mockUseDialogs(),
}));

// Mock all dialog components to return simple identifiable elements
vi.mock("../_dialogs/DeleteInvoiceDialog", () => ({
  default: () => <div data-testid='delete-invoice-dialog'>DeleteInvoiceDialog</div>,
}));

vi.mock("../_dialogs/ShareInvoiceDialog", () => ({
  default: () => <div data-testid='share-invoice-dialog'>ShareInvoiceDialog</div>,
}));

vi.mock("../_dialogs/DeleteScanDialog", () => ({
  default: () => <div data-testid='delete-scan-dialog'>DeleteScanDialog</div>,
}));

vi.mock("../_dialogs/PreviewScanDialog", () => ({
  default: () => <div data-testid='preview-scan-dialog'>PreviewScanDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/AnalyzeDialog", () => ({
  default: () => <div data-testid='analyze-dialog'>AnalyzeDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/FeedbackDialog", () => ({
  default: () => <div data-testid='feedback-dialog'>InvoiceFeedbackDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/ImageDialog", () => ({
  default: () => <div data-testid='image-dialog'>InvoiceImageDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/ItemsDialog", () => ({
  default: () => <div data-testid='items-dialog'>InvoiceItemsDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/MerchantDialog", () => ({
  default: () => <div data-testid='merchant-dialog'>InvoiceMerchantDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/MerchantReceiptsDialog", () => ({
  default: () => <div data-testid='merchant-receipts-dialog'>InvoiceMerchantReceiptsDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/MetadataDialog", () => ({
  default: () => <div data-testid='metadata-dialog'>InvoiceMetadataDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/AddRecipeDialog", () => ({
  default: () => <div data-testid='add-recipe-dialog'>AddRecipeDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/UpdateRecipeDialog", () => ({
  default: () => <div data-testid='update-recipe-dialog'>UpdateRecipeDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/DeleteRecipeDialog", () => ({
  default: () => <div data-testid='delete-recipe-dialog'>DeleteRecipeDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/PreviewRecipeDialog", () => ({
  default: () => <div data-testid='preview-recipe-dialog'>PreviewRecipeDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/ShareRecipeDialog", () => ({
  default: () => <div data-testid='share-recipe-dialog'>ShareRecipeDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/AddScanDialog", () => ({
  default: () => <div data-testid='add-scan-dialog'>AddScanDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/RemoveScanDialog", () => ({
  default: () => <div data-testid='remove-scan-dialog'>RemoveScanDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/AllergenDialog", () => ({
  default: () => <div data-testid='allergen-dialog'>AllergenDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_dialogs/BulkCategoryDialog", () => ({
  default: () => <div data-testid='bulk-category-dialog'>BulkCategoryDialog</div>,
}));

vi.mock("../view-invoice/[id]/_dialogs/ShareAnalyticsDialog", () => ({
  default: () => <div data-testid='share-analytics-dialog'>ShareAnalyticsDialog</div>,
}));

vi.mock("../view-invoices/_dialogs/ExportDialog", () => ({
  default: () => <div data-testid='export-dialog'>InvoicesExportDialog</div>,
}));

vi.mock("../view-invoices/_dialogs/ImportDialog", () => ({
  default: () => <div data-testid='import-dialog'>InvoicesImportDialog</div>,
}));

vi.mock("../view-scans/_dialogs/CreateInvoiceDialog", () => ({
  default: () => <div data-testid='create-invoice-dialog'>CreateInvoiceDialog</div>,
}));

vi.mock("../view-invoice/[id]/_dialogs/ExportDialog", () => ({
  ExportDialog: () => <div data-testid='view-invoice-export-dialog'>ViewInvoiceExportDialog</div>,
}));

// Import the component after mocks are set up
import DialogContainer from "./DialogContainer";
import type {DialogMode, DialogType} from "./DialogContext";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sets up the mock to return the specified dialog type and optional mode.
 */
function setupMockDialogType(type: DialogType, mode: DialogMode = null): void {
  mockUseDialogs.mockReturnValue({
    currentDialog: {type, mode, payload: null},
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("DialogContainer", () => {
  describe("when no dialog is open (type is null)", () => {
    test("renders null when dialog type is null", () => {
      setupMockDialogType(null);

      const {container} = render(<DialogContainer />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("edit-invoice dialogs", () => {
    test("renders AnalyzeDialog when type is EDIT_INVOICE__ANALYSIS", () => {
      setupMockDialogType("EDIT_INVOICE__ANALYSIS");

      render(<DialogContainer />);

      expect(screen.getByTestId("analyze-dialog")).toBeInTheDocument();
      expect(screen.getByText("AnalyzeDialog")).toBeInTheDocument();
    });

    test("renders InvoiceItemsDialog when type is EDIT_INVOICE__ITEMS", () => {
      setupMockDialogType("EDIT_INVOICE__ITEMS");

      render(<DialogContainer />);

      expect(screen.getByTestId("items-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoiceItemsDialog")).toBeInTheDocument();
    });

    test("renders InvoiceFeedbackDialog when type is EDIT_INVOICE__FEEDBACK", () => {
      setupMockDialogType("EDIT_INVOICE__FEEDBACK");

      render(<DialogContainer />);

      expect(screen.getByTestId("feedback-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoiceFeedbackDialog")).toBeInTheDocument();
    });

    test("renders InvoiceMerchantDialog when type is EDIT_INVOICE__MERCHANT", () => {
      setupMockDialogType("EDIT_INVOICE__MERCHANT");

      render(<DialogContainer />);

      expect(screen.getByTestId("merchant-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoiceMerchantDialog")).toBeInTheDocument();
    });

    test("renders InvoiceMerchantReceiptsDialog when type is EDIT_INVOICE__MERCHANT_INVOICES", () => {
      setupMockDialogType("EDIT_INVOICE__MERCHANT_INVOICES");

      render(<DialogContainer />);

      expect(screen.getByTestId("merchant-receipts-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoiceMerchantReceiptsDialog")).toBeInTheDocument();
    });

    test("renders InvoiceMetadataDialog when type is EDIT_INVOICE__METADATA", () => {
      setupMockDialogType("EDIT_INVOICE__METADATA");

      render(<DialogContainer />);

      expect(screen.getByTestId("metadata-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoiceMetadataDialog")).toBeInTheDocument();
    });

    test("renders InvoiceImageDialog when type is EDIT_INVOICE__IMAGE", () => {
      setupMockDialogType("EDIT_INVOICE__IMAGE");

      render(<DialogContainer />);

      expect(screen.getByTestId("image-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoiceImageDialog")).toBeInTheDocument();
    });

    test("renders AddRecipeDialog when type is EDIT_INVOICE__RECIPE_ADD", () => {
      setupMockDialogType("EDIT_INVOICE__RECIPE_ADD", "add");

      render(<DialogContainer />);

      expect(screen.getByTestId("add-recipe-dialog")).toBeInTheDocument();
      expect(screen.getByText("AddRecipeDialog")).toBeInTheDocument();
    });

    test("renders AllergenDialog when type is EDIT_INVOICE__ALLERGENS", () => {
      setupMockDialogType("EDIT_INVOICE__ALLERGENS");

      render(<DialogContainer />);

      expect(screen.getByTestId("allergen-dialog")).toBeInTheDocument();
      expect(screen.getByText("AllergenDialog")).toBeInTheDocument();
    });

    test("renders BulkCategoryDialog when type is EDIT_INVOICE__BULK_CATEGORY", () => {
      setupMockDialogType("EDIT_INVOICE__BULK_CATEGORY");

      render(<DialogContainer />);

      expect(screen.getByTestId("bulk-category-dialog")).toBeInTheDocument();
      expect(screen.getByText("BulkCategoryDialog")).toBeInTheDocument();
    });
  });

  describe("view-invoice dialogs", () => {
    test("renders ShareAnalyticsDialog when type is VIEW_INVOICE__SHARE_ANALYTICS", () => {
      setupMockDialogType("VIEW_INVOICE__SHARE_ANALYTICS");

      render(<DialogContainer />);

      expect(screen.getByTestId("share-analytics-dialog")).toBeInTheDocument();
      expect(screen.getByText("ShareAnalyticsDialog")).toBeInTheDocument();
    });

    test("renders ViewInvoiceExportDialog when type is VIEW_INVOICE__EXPORT", () => {
      setupMockDialogType("VIEW_INVOICE__EXPORT");

      render(<DialogContainer />);

      expect(screen.getByTestId("view-invoice-export-dialog")).toBeInTheDocument();
      expect(screen.getByText("ViewInvoiceExportDialog")).toBeInTheDocument();
    });
  });

  describe("view-invoices dialogs", () => {
    test("renders InvoicesImportDialog when type is VIEW_INVOICES__IMPORT", () => {
      setupMockDialogType("VIEW_INVOICES__IMPORT");

      render(<DialogContainer />);

      expect(screen.getByTestId("import-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoicesImportDialog")).toBeInTheDocument();
    });

    test("renders InvoicesExportDialog when type is VIEW_INVOICES__EXPORT", () => {
      setupMockDialogType("VIEW_INVOICES__EXPORT");

      render(<DialogContainer />);

      expect(screen.getByTestId("export-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoicesExportDialog")).toBeInTheDocument();
    });
  });

  describe("view-scans dialogs", () => {
    test("renders CreateInvoiceDialog when type is VIEW_SCANS__CREATE_INVOICE", () => {
      setupMockDialogType("VIEW_SCANS__CREATE_INVOICE");

      render(<DialogContainer />);

      expect(screen.getByTestId("create-invoice-dialog")).toBeInTheDocument();
      expect(screen.getByText("CreateInvoiceDialog")).toBeInTheDocument();
    });
  });

  describe("shared dialogs", () => {
    test("renders DeleteInvoiceDialog when type is SHARED__INVOICE_DELETE", () => {
      setupMockDialogType("SHARED__INVOICE_DELETE");

      render(<DialogContainer />);

      expect(screen.getByTestId("delete-invoice-dialog")).toBeInTheDocument();
      expect(screen.getByText("DeleteInvoiceDialog")).toBeInTheDocument();
    });

    test("renders ShareInvoiceDialog when type is SHARED__INVOICE_SHARE", () => {
      setupMockDialogType("SHARED__INVOICE_SHARE");

      render(<DialogContainer />);

      expect(screen.getByTestId("share-invoice-dialog")).toBeInTheDocument();
      expect(screen.getByText("ShareInvoiceDialog")).toBeInTheDocument();
    });
  });

  describe("dialog type coverage", () => {
    const dialogTestCases: Array<{type: DialogType; mode?: DialogMode; expectedTestId: string}> = [
      {type: "EDIT_INVOICE__ANALYSIS", expectedTestId: "analyze-dialog"},
      {type: "EDIT_INVOICE__ITEMS", expectedTestId: "items-dialog"},
      {type: "EDIT_INVOICE__FEEDBACK", expectedTestId: "feedback-dialog"},
      {type: "EDIT_INVOICE__MERCHANT", expectedTestId: "merchant-dialog"},
      {type: "EDIT_INVOICE__MERCHANT_INVOICES", expectedTestId: "merchant-receipts-dialog"},
      {type: "EDIT_INVOICE__METADATA", expectedTestId: "metadata-dialog"},
      {type: "EDIT_INVOICE__IMAGE", expectedTestId: "image-dialog"},
      {type: "EDIT_INVOICE__RECIPE_ADD", mode: "add", expectedTestId: "add-recipe-dialog"},
      {type: "EDIT_INVOICE__RECIPE_UPDATE", mode: "edit", expectedTestId: "update-recipe-dialog"},
      {type: "EDIT_INVOICE__RECIPE_DELETE", mode: "delete", expectedTestId: "delete-recipe-dialog"},
      {type: "EDIT_INVOICE__RECIPE_PREVIEW", mode: "view", expectedTestId: "preview-recipe-dialog"},
      {type: "EDIT_INVOICE__RECIPE_SHARE", mode: "share", expectedTestId: "share-recipe-dialog"},
      {type: "EDIT_INVOICE__ALLERGENS", expectedTestId: "allergen-dialog"},
      {type: "EDIT_INVOICE__BULK_CATEGORY", expectedTestId: "bulk-category-dialog"},
      {type: "EDIT_INVOICE__SCAN", mode: "add", expectedTestId: "add-scan-dialog"},
      {type: "EDIT_INVOICE__SCAN", mode: "delete", expectedTestId: "remove-scan-dialog"},
      {type: "VIEW_INVOICE__SHARE_ANALYTICS", expectedTestId: "share-analytics-dialog"},
      {type: "VIEW_INVOICE__EXPORT", expectedTestId: "view-invoice-export-dialog"},
      {type: "VIEW_INVOICES__IMPORT", expectedTestId: "import-dialog"},
      {type: "VIEW_INVOICES__EXPORT", expectedTestId: "export-dialog"},
      {type: "VIEW_SCANS__CREATE_INVOICE", expectedTestId: "create-invoice-dialog"},
      {type: "SHARED__INVOICE_DELETE", expectedTestId: "delete-invoice-dialog"},
      {type: "SHARED__INVOICE_SHARE", expectedTestId: "share-invoice-dialog"},
      {type: "SHARED__SCAN_DELETE", expectedTestId: "delete-scan-dialog"},
      {type: "SHARED__SCAN_PREVIEW", expectedTestId: "preview-scan-dialog"},
    ];

    test.each(dialogTestCases)("renders correct dialog for type $type with mode $mode", ({type, mode, expectedTestId}) => {
      setupMockDialogType(type, mode);

      render(<DialogContainer />);

      expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
    });

    test("all defined dialog types are covered by test cases", () => {
      // This test ensures that the test cases array covers all dialog types
      const allDialogTypes: DialogType[] = [
        "EDIT_INVOICE__ANALYSIS",
        "EDIT_INVOICE__IMAGE",
        "EDIT_INVOICE__MERCHANT",
        "EDIT_INVOICE__MERCHANT_INVOICES",
        "EDIT_INVOICE__RECIPE_ADD",
        "EDIT_INVOICE__RECIPE_UPDATE",
        "EDIT_INVOICE__RECIPE_DELETE",
        "EDIT_INVOICE__RECIPE_PREVIEW",
        "EDIT_INVOICE__RECIPE_SHARE",
        "EDIT_INVOICE__METADATA",
        "EDIT_INVOICE__ITEMS",
        "EDIT_INVOICE__FEEDBACK",
        "EDIT_INVOICE__ALLERGENS",
        "EDIT_INVOICE__BULK_CATEGORY",
        "EDIT_INVOICE__SCAN",
        "VIEW_INVOICE__SHARE_ANALYTICS",
        "VIEW_INVOICE__EXPORT",
        "VIEW_INVOICES__IMPORT",
        "VIEW_INVOICES__EXPORT",
        "VIEW_SCANS__CREATE_INVOICE",
        "SHARED__INVOICE_DELETE",
        "SHARED__INVOICE_SHARE",
        "SHARED__SCAN_DELETE",
        "SHARED__SCAN_PREVIEW",
        null,
      ];

      const testedTypes = dialogTestCases.map((tc) => tc.type);

      // All non-null dialog types should be in the test cases
      for (const dialogType of allDialogTypes) {
        if (dialogType !== null) {
          expect(testedTypes).toContain(dialogType);
        }
      }
    });
  });

  describe("component behavior", () => {
    test("only renders one dialog at a time", () => {
      setupMockDialogType("EDIT_INVOICE__ANALYSIS");

      render(<DialogContainer />);

      // Only the analyze dialog should be present
      expect(screen.getByTestId("analyze-dialog")).toBeInTheDocument();
      expect(screen.queryByTestId("items-dialog")).not.toBeInTheDocument();
      expect(screen.queryByTestId("share-invoice-dialog")).not.toBeInTheDocument();
    });

    test("re-renders correctly when dialog type changes", () => {
      setupMockDialogType("EDIT_INVOICE__ANALYSIS");

      const {unmount} = render(<DialogContainer />);
      expect(screen.getByTestId("analyze-dialog")).toBeInTheDocument();

      // Unmount, change the dialog type, remount — React.memo is bypassed on fresh mount.
      unmount();
      setupMockDialogType("SHARED__INVOICE_SHARE");
      render(<DialogContainer />);

      expect(screen.queryByTestId("analyze-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("share-invoice-dialog")).toBeInTheDocument();
    });

    test("transitions from open dialog to null correctly", () => {
      setupMockDialogType("EDIT_INVOICE__ITEMS");

      const {unmount} = render(<DialogContainer />);
      expect(screen.getByTestId("items-dialog")).toBeInTheDocument();

      // Unmount, close the dialog (type becomes null), remount — React.memo is bypassed on fresh mount.
      unmount();
      setupMockDialogType(null);
      const {container} = render(<DialogContainer />);

      expect(container.firstChild).toBeNull();
    });
  });
});
