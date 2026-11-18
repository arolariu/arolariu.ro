import {act, renderHook, screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import DialogContainer from "./DialogContainer";
import {DialogProvider, useDialogs} from "./DialogContext";

// These registry cases check the module selected by Next's loader. The single-invoice export test runs the real loader and dialog.
vi.mock("next/dynamic", () => ({
  default: (load: () => Promise<unknown>) => {
    const path = /["']([^"']*\/_dialogs\/[^"']+)["']/u.exec(load.toString())?.[1];
    return function LazyRoute(): React.JSX.Element {
      return <output data-testid='dialog-route'>{path}</output>;
    };
  },
}));

type DialogType = Parameters<ReturnType<typeof useDialogs>["openDialog"]>[0];
type DialogMode = Parameters<ReturnType<typeof useDialogs>["openDialog"]>[1];

const routes = [
  ["EDIT_INVOICE__ANALYSIS", "view", "edit-invoice/[id]/_dialogs/AnalyzeDialog"],
  ["EDIT_INVOICE__ITEMS", "edit", "edit-invoice/[id]/_dialogs/ItemsDialog"],
  ["EDIT_INVOICE__FEEDBACK", "view", "edit-invoice/[id]/_dialogs/FeedbackDialog"],
  ["EDIT_INVOICE__MERCHANT", "view", "edit-invoice/[id]/_dialogs/MerchantDialog"],
  ["EDIT_INVOICE__MERCHANT_INVOICES", "view", "edit-invoice/[id]/_dialogs/MerchantReceiptsDialog"],
  ["EDIT_INVOICE__METADATA", "edit", "edit-invoice/[id]/_dialogs/MetadataDialog"],
  ["EDIT_INVOICE__IMAGE", "view", "edit-invoice/[id]/_dialogs/ImageDialog"],
  ["EDIT_INVOICE__RECIPE_ADD", "add", "edit-invoice/[id]/_dialogs/AddRecipeDialog"],
  ["EDIT_INVOICE__RECIPE_UPDATE", "edit", "edit-invoice/[id]/_dialogs/UpdateRecipeDialog"],
  ["EDIT_INVOICE__RECIPE_DELETE", "delete", "edit-invoice/[id]/_dialogs/DeleteRecipeDialog"],
  ["EDIT_INVOICE__RECIPE_PREVIEW", "view", "edit-invoice/[id]/_dialogs/PreviewRecipeDialog"],
  ["EDIT_INVOICE__ALLERGENS", "edit", "edit-invoice/[id]/_dialogs/AllergenDialog"],
  ["EDIT_INVOICE__ADD_SCAN", "add", "edit-invoice/[id]/_dialogs/AddScanDialog"],
  ["EDIT_INVOICE__REMOVE_SCAN", "delete", "edit-invoice/[id]/_dialogs/RemoveScanDialog"],
  ["VIEW_INVOICE__SHARE_ANALYTICS", "share", "view-invoice/[id]/_dialogs/ShareAnalyticsDialog"],
  ["VIEW_INVOICES__IMPORT", "view", "view-invoices/_dialogs/ImportDialog"],
  ["VIEW_INVOICES__EXPORT", "view", "view-invoices/_dialogs/ExportDialog"],
  ["VIEW_SCANS__CREATE_INVOICE", "add", "view-scans/_dialogs/CreateInvoiceDialog"],
  ["SHARED__INVOICE_DELETE", "delete", "_dialogs/DeleteInvoiceDialog"],
  ["SHARED__INVOICE_SHARE", "share", "_dialogs/ShareInvoiceDialog"],
  ["SHARED__SCAN_DELETE", "delete", "_dialogs/DeleteScanDialog"],
  ["SHARED__SCAN_PREVIEW", "view", "_dialogs/PreviewScanDialog"],
] as const satisfies readonly [DialogType, DialogMode, string][];

function renderRegistry() {
  const {result} = renderHook(useDialogs, {
    wrapper: ({children}) => (
      <DialogProvider>
        <div data-testid='dialog-registry'>
          <DialogContainer />
        </div>
        {children}
      </DialogProvider>
    ),
  });
  const registry = screen.getByTestId("dialog-registry");
  return {
    registry,
    open: (type: DialogType, mode: DialogMode) => act(() => result.current.openDialog(type, mode)),
    close: () => act(() => result.current.closeDialog()),
    route: () =>
      within(registry)
        .getByTestId("dialog-route")
        .textContent?.replace(/^.*\/domains\/invoices\//u, "")
        .replace(/^\.\.\//u, "")
        .replace(/\.tsx$/u, ""),
  };
}

describe("DialogContainer registry", () => {
  it.each(routes)("selects the registered module for %s", (type, mode, path) => {
    const {open, route} = renderRegistry();

    open(type, mode);

    expect(route()).toBe(path);
  });

  it("renders no dialog until one is opened and removes it when closed", () => {
    const {registry, open, close, route} = renderRegistry();
    expect(registry).toBeEmptyDOMElement();
    open("EDIT_INVOICE__ITEMS", "edit");
    expect(route()).toBe("edit-invoice/[id]/_dialogs/ItemsDialog");

    close();

    expect(registry).toBeEmptyDOMElement();
  });

  it("keeps the active dialog until close and then opens the next route", () => {
    const {open, close, route} = renderRegistry();
    open("EDIT_INVOICE__ANALYSIS", "view");

    open("SHARED__INVOICE_SHARE", "share");

    expect(route()).toBe("edit-invoice/[id]/_dialogs/AnalyzeDialog");

    close();
    open("SHARED__INVOICE_SHARE", "share");

    expect(route()).toBe("_dialogs/ShareInvoiceDialog");
  });
});
