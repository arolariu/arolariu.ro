import {act, renderHook} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, test, vi} from "vitest";
import {DialogProvider, useDialog, useDialogs} from "./DialogContext";

// Wrapper component to provide context for the hooks
const wrapper = ({children}: {children: ReactNode}) => <DialogProvider>{children}</DialogProvider>;

describe("DialogProvider", () => {
  test("should provide the current dialog state", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
  });

  test("should provide the isOpen function", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    expect(typeof result.current.isOpen).toBe("boolean");
  });

  test("should provide the openDialog function", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    expect(typeof result.current.open).toBe("function");
  });

  test("should provide the closeDialog function", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    expect(typeof result.current.close).toBe("function");
  });

  test("should set the current dialog state when openDialog is called", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
  });
});

describe("useDialog", () => {
  test("should return isOpen as false initially", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    expect(result.current.isOpen).toBe(false);
  });

  test("should set isOpen to true when open is called", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  test("should set isOpen to false when close is called", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  test("should not close the current dialog if another dialog says so", () => {
    const {result: shareResult} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    const {result: merchantResult} = renderHook(() => useDialog("EDIT_INVOICE__MERCHANT"), {wrapper});

    act(() => {
      // Open the share dialog first
      shareResult.current.open();
    });

    // Expect the share dialog to be open
    expect(shareResult.current.isOpen).toBe(true);
    // Expect the merchant dialog to be closed
    expect(merchantResult.current.isOpen).toBe(false);

    act(() => {
      // Close the merchant dialog
      merchantResult.current.close();
    });

    // Expect the share dialog to still be open
    expect(shareResult.current.isOpen).toBe(true);
    // Expect the merchant dialog to still be closed
    expect(merchantResult.current.isOpen).toBe(false);
  });

  test("it throws when used outside of provider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDialog("SHARED__INVOICE_SHARE"));
    }).toThrow("useDialog must be used within a DialogProvider");

    consoleErrorSpy.mockRestore();
  });

  test("useDialogs throws when used outside of provider", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDialogs());
    }).toThrow("useDialogs must be used within a DialogProvider");

    consoleErrorSpy.mockRestore();
  });

  test("it uses current dialog when openDialog is called", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
  });

  test("it uses current dialog when closeDialog is called", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");

    act(() => {
      result.current.close();
    });

    expect(result.current.currentDialog).toStrictEqual({type: null, mode: null, payload: null});
  });

  test("it opens dialog with correct type and mode", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE", "edit"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
    expect(result.current.currentDialog.mode).toBe("edit");
  });

  test("it opens dialog with correct type and payload", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE", "edit", {id: 1}), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
    expect(result.current.currentDialog.payload).toStrictEqual({id: 1});
  });

  test("it closes dialog and resets state", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE", "edit", {id: 1}), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toStrictEqual({id: 1});

    act(() => {
      result.current.close();
    });

    expect(result.current.currentDialog).toStrictEqual({type: null, mode: null, payload: null});
  });

  test("it opens dialog with correct type, mode, and payload", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE", "edit", {id: 1}), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toStrictEqual({id: 1});
  });

  test("it does not open dialog if already open", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  test("it does not close dialog if another dialog says so", () => {
    const {result: shareResult} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    const {result: merchantResult} = renderHook(() => useDialog("EDIT_INVOICE__MERCHANT"), {wrapper});

    act(() => {
      // Open the share dialog first
      shareResult.current.open();
    });

    // Expect the share dialog to be open
    expect(shareResult.current.isOpen).toBe(true);
    // Expect the merchant dialog to be closed
    expect(merchantResult.current.isOpen).toBe(false);

    act(() => {
      // Close the merchant dialog
      merchantResult.current.close();
    });

    // Expect the share dialog to still be open
    expect(shareResult.current.isOpen).toBe(true);
    // Expect the merchant dialog to still be closed
    expect(merchantResult.current.isOpen).toBe(false);
  });

  test("it does not open dialog if already open (duplicate)", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  test("it does not alter the current dialog if another dialog says so", () => {
    const {result: shareResult} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    const {result: merchantResult} = renderHook(() => useDialog("EDIT_INVOICE__MERCHANT"), {wrapper});

    act(() => {
      // Open the share dialog first
      shareResult.current.open();
    });

    // Expect the share dialog to be open
    expect(shareResult.current.isOpen).toBe(true);
    // Expect the merchant dialog to be closed
    expect(merchantResult.current.isOpen).toBe(false);

    act(() => {
      // Close the merchant dialog
      merchantResult.current.close();
    });

    // Expect the share dialog to still be open
    expect(shareResult.current.isOpen).toBe(true);
    // Expect the merchant dialog to still be closed
    expect(merchantResult.current.isOpen).toBe(false);
  });

  test("dialog state is persisted across different useDialog calls", () => {
    // Create two separate hooks for the same dialog type
    const {result: shareHook1} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});
    const {result: shareHook2} = renderHook(() => useDialog("SHARED__INVOICE_SHARE"), {wrapper});

    // Initially both should show the dialog as closed
    expect(shareHook1.current.isOpen).toBe(false);
    expect(shareHook2.current.isOpen).toBe(false);

    // Open using the first hook
    act(() => {
      shareHook1.current.open();
    });

    expect(shareHook1.current.isOpen).toBe(true);
    expect(shareHook2.current.isOpen).toBe(false);

    // Close using the second hook
    act(() => {
      shareHook2.current.close();
    });

    expect(shareHook1.current.isOpen).toBe(true);
    expect(shareHook2.current.isOpen).toBe(false);
  });

  test("mode and payload are preserved when opening a dialog", () => {
    const testPayload = {id: 123, name: "Test"};
    const {result} = renderHook(() => useDialog("EDIT_INVOICE__METADATA", "edit", testPayload), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("EDIT_INVOICE__METADATA");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toBe(testPayload);
  });

  test("dialog state is properly reset when closed", () => {
    const testPayload = {id: 123};
    const {result} = renderHook(() => useDialog("EDIT_INVOICE__ANALYSIS", "view", testPayload), {wrapper});

    act(() => {
      result.current.open();
    });

    // Verify dialog is open with correct data
    expect(result.current.currentDialog.type).toBe("EDIT_INVOICE__ANALYSIS");
    expect(result.current.currentDialog.mode).toBe("view");
    expect(result.current.currentDialog.payload).toBe(testPayload);

    act(() => {
      result.current.close();
    });

    // Verify state is completely reset
    expect(result.current.currentDialog.type).toBe(null);
    expect(result.current.currentDialog.mode).toBe(null);
    expect(result.current.currentDialog.payload).toBe(null);
  });

  test("closing and reopening dialog works correctly", () => {
    const {result} = renderHook(() => useDialog("SHARED__INVOICE_SHARE", "edit"), {wrapper});

    // Open the dialog
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    // Close the dialog
    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);

    // Reopen the dialog
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
    expect(result.current.currentDialog.mode).toBe("edit");
  });

  test("two useDialog calls share the same canonical state reference", () => {
    // Both hooks must live inside the SAME provider tree to share DialogStateContext.
    const {result} = renderHook(
      () => ({
        hook1: useDialog("SHARED__INVOICE_SHARE"),
        hook2: useDialog("EDIT_INVOICE__MERCHANT"),
      }),
      {wrapper},
    );

    // Before any open, both read the same initial-state singleton.
    expect(result.current.hook1.currentDialog).toBe(result.current.hook2.currentDialog);

    // Opening one dialog updates state for both hooks.
    act(() => {
      result.current.hook1.open();
    });

    expect(result.current.hook1.isOpen).toBe(true);
    expect(result.current.hook2.isOpen).toBe(false);
    // After state change, both hooks still see the same (updated) reference.
    expect(result.current.hook1.currentDialog).toBe(result.current.hook2.currentDialog);
    expect(result.current.hook1.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
  });

  test("useDialogs().openDialog dispatches with type, mode, and payload", () => {
    const {result} = renderHook(() => useDialogs(), {wrapper});

    act(() => {
      result.current.openDialog("EDIT_INVOICE__ALLERGENS", "edit", {
        invoice: {id: "i1"} as never,
        product: {id: "p1"} as never,
        productIndex: 3,
      });
    });

    expect(result.current.currentDialog.type).toBe("EDIT_INVOICE__ALLERGENS");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toStrictEqual({
      invoice: {id: "i1"},
      product: {id: "p1"},
      productIndex: 3,
    });
    expect(result.current.isOpen("EDIT_INVOICE__ALLERGENS")).toBe(true);
    expect(result.current.isOpen("SHARED__INVOICE_SHARE")).toBe(false);
  });

  test("useDialogs().openDialog is no-op if another dialog is already open", () => {
    const {result} = renderHook(() => useDialogs(), {wrapper});

    act(() => {
      result.current.openDialog("SHARED__INVOICE_SHARE", "share");
    });
    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");

    act(() => {
      result.current.openDialog("EDIT_INVOICE__ALLERGENS", "edit");
    });

    // Original dialog still open; second openDialog was silently ignored.
    expect(result.current.currentDialog.type).toBe("SHARED__INVOICE_SHARE");
    expect(result.current.currentDialog.mode).toBe("share");
  });
});
