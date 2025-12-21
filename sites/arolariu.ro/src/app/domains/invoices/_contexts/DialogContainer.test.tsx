/**
 * @fileoverview Unit tests for the DialogContainer component.
 * @module domains/invoices/_contexts/DialogContainer.test
 */

import {render, screen} from "@testing-library/react";
import {describe, expect, test, vi} from "vitest";

// ============================================================================
// Mocks - Must be declared before imports that use them
// ============================================================================

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

vi.mock("../edit-invoice/[id]/_components/dialogs/AnalyzeDialog", () => ({
  default: () => <div data-testid='analyze-dialog'>AnalyzeDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_components/dialogs/FeedbackDialog", () => ({
  default: () => <div data-testid='feedback-dialog'>InvoiceFeedbackDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_components/dialogs/ImageDialog", () => ({
  default: () => <div data-testid='image-dialog'>InvoiceImageDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_components/dialogs/ItemsDialog", () => ({
  default: () => <div data-testid='items-dialog'>InvoiceItemsDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_components/dialogs/MerchantDialog", () => ({
  default: () => <div data-testid='merchant-dialog'>InvoiceMerchantDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_components/dialogs/MerchantReceiptsDialog", () => ({
  default: () => <div data-testid='merchant-receipts-dialog'>InvoiceMerchantReceiptsDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_components/dialogs/MetadataDialog", () => ({
  default: () => <div data-testid='metadata-dialog'>InvoiceMetadataDialog</div>,
}));

vi.mock("../edit-invoice/[id]/_components/dialogs/RecipeDialog", () => ({
  default: () => <div data-testid='recipe-dialog'>InvoiceRecipeDialog</div>,
}));

vi.mock("../view-invoice/[id]/_components/dialogs/ShareAnalyticsDialog", () => ({
  default: () => <div data-testid='share-analytics-dialog'>ShareAnalyticsDialog</div>,
}));

vi.mock("../view-invoices/_components/dialogs/ExportDialog", () => ({
  default: () => <div data-testid='export-dialog'>InvoicesExportDialog</div>,
}));

vi.mock("../view-invoices/_components/dialogs/ImportDialog", () => ({
  default: () => <div data-testid='import-dialog'>InvoicesImportDialog</div>,
}));

vi.mock("../view-invoices/_components/dialogs/ShareDialog", () => ({
  default: () => <div data-testid='invoices-share-dialog'>InvoicesInvoiceShareDialog</div>,
}));

// Import the component after mocks are set up
import DialogContainer from "./DialogContainer";
import type {DialogType} from "./DialogContext";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sets up the mock to return the specified dialog type.
 */
function setupMockDialogType(type: DialogType): void {
  mockUseDialogs.mockReturnValue({
    currentDialog: {type, mode: null, payload: null},
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

    test("renders InvoiceRecipeDialog when type is EDIT_INVOICE__RECIPE", () => {
      setupMockDialogType("EDIT_INVOICE__RECIPE");

      render(<DialogContainer />);

      expect(screen.getByTestId("recipe-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoiceRecipeDialog")).toBeInTheDocument();
    });
  });

  describe("view-invoice dialogs", () => {
    test("renders ShareAnalyticsDialog when type is VIEW_INVOICE__SHARE_ANALYTICS", () => {
      setupMockDialogType("VIEW_INVOICE__SHARE_ANALYTICS");

      render(<DialogContainer />);

      expect(screen.getByTestId("share-analytics-dialog")).toBeInTheDocument();
      expect(screen.getByText("ShareAnalyticsDialog")).toBeInTheDocument();
    });
  });

  describe("view-invoices dialogs", () => {
    test("renders InvoicesInvoiceShareDialog when type is VIEW_INVOICES__SHARE", () => {
      setupMockDialogType("VIEW_INVOICES__SHARE");

      render(<DialogContainer />);

      expect(screen.getByTestId("invoices-share-dialog")).toBeInTheDocument();
      expect(screen.getByText("InvoicesInvoiceShareDialog")).toBeInTheDocument();
    });

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
    const dialogTestCases: Array<{type: DialogType; expectedTestId: string}> = [
      {type: "EDIT_INVOICE__ANALYSIS", expectedTestId: "analyze-dialog"},
      {type: "EDIT_INVOICE__ITEMS", expectedTestId: "items-dialog"},
      {type: "EDIT_INVOICE__FEEDBACK", expectedTestId: "feedback-dialog"},
      {type: "EDIT_INVOICE__MERCHANT", expectedTestId: "merchant-dialog"},
      {type: "EDIT_INVOICE__MERCHANT_INVOICES", expectedTestId: "merchant-receipts-dialog"},
      {type: "EDIT_INVOICE__METADATA", expectedTestId: "metadata-dialog"},
      {type: "EDIT_INVOICE__IMAGE", expectedTestId: "image-dialog"},
      {type: "EDIT_INVOICE__RECIPE", expectedTestId: "recipe-dialog"},
      {type: "VIEW_INVOICE__SHARE_ANALYTICS", expectedTestId: "share-analytics-dialog"},
      {type: "VIEW_INVOICES__SHARE", expectedTestId: "invoices-share-dialog"},
      {type: "VIEW_INVOICES__IMPORT", expectedTestId: "import-dialog"},
      {type: "VIEW_INVOICES__EXPORT", expectedTestId: "export-dialog"},
      {type: "SHARED__INVOICE_DELETE", expectedTestId: "delete-invoice-dialog"},
      {type: "SHARED__INVOICE_SHARE", expectedTestId: "share-invoice-dialog"},
    ];

    test.each(dialogTestCases)("renders correct dialog for type $type", ({type, expectedTestId}) => {
      setupMockDialogType(type);

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
        "EDIT_INVOICE__RECIPE",
        "EDIT_INVOICE__METADATA",
        "EDIT_INVOICE__ITEMS",
        "EDIT_INVOICE__FEEDBACK",
        "VIEW_INVOICE__SHARE_ANALYTICS",
        "VIEW_INVOICES__SHARE",
        "VIEW_INVOICES__IMPORT",
        "VIEW_INVOICES__EXPORT",
        "SHARED__INVOICE_DELETE",
        "SHARED__INVOICE_SHARE",
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

      const {rerender} = render(<DialogContainer />);
      expect(screen.getByTestId("analyze-dialog")).toBeInTheDocument();

      // Change the dialog type
      setupMockDialogType("SHARED__INVOICE_SHARE");

      rerender(<DialogContainer />);

      expect(screen.queryByTestId("analyze-dialog")).not.toBeInTheDocument();
      expect(screen.getByTestId("share-invoice-dialog")).toBeInTheDocument();
    });

    test("transitions from open dialog to null correctly", () => {
      setupMockDialogType("EDIT_INVOICE__ITEMS");

      const {rerender, container} = render(<DialogContainer />);
      expect(screen.getByTestId("items-dialog")).toBeInTheDocument();

      // Close the dialog (type becomes null)
      setupMockDialogType(null);

      rerender(<DialogContainer />);

      expect(container.firstChild).toBeNull();
    });
  });
});
