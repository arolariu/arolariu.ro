/** @format */

import {act, renderHook} from "@testing-library/react";
import {ReactNode} from "react";
import {DialogProvider, useDialog} from "./DialogContext";

// Wrapper component to provide context for the hooks
const wrapper = ({children}: {children: ReactNode}) => <DialogProvider>{children}</DialogProvider>;

describe("DialogProvider", () => {
  test("should provide the current dialog state", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentDialog.type).toBe("share");
  });

  test("should provide the isOpen function", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});
    expect(typeof result.current.isOpen).toBe("boolean");
  });

  test("should provide the openDialog function", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});
    expect(typeof result.current.open).toBe("function");
  });

  test("should provide the closeDialog function", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});
    expect(typeof result.current.close).toBe("function");
  });

  test("should set the current dialog state when openDialog is called", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("share");
  });
});

describe("useDialog", () => {
  test("should return isOpen as false initially", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});
    expect(result.current.isOpen).toBe(false);
  });

  test("should set isOpen to true when open is called", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  test("should set isOpen to false when close is called", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

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
    const {result: shareResult} = renderHook(() => useDialog("share"), {wrapper});
    const {result: merchantResult} = renderHook(() => useDialog("merchant"), {wrapper});

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
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useDialog("share"));
    }).toThrow("useDialogs must be used within a DialogProvider");

    consoleErrorSpy.mockRestore();
  });

  test("it uses current dialog when openDialog is called", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("share");
  });

  test("it uses current dialog when closeDialog is called", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("share");

    act(() => {
      result.current.close();
    });

    expect(result.current.currentDialog).toStrictEqual({type: null, mode: null, payload: null});
  });

  test("it opens dialog with correct type and mode", () => {
    const {result} = renderHook(() => useDialog("share", "edit"), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("share");
    expect(result.current.currentDialog.mode).toBe("edit");
  });

  test("it opens dialog with correct type and payload", () => {
    const {result} = renderHook(() => useDialog("share", "edit", {id: 1}), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("share");
    expect(result.current.currentDialog.payload).toStrictEqual({id: 1});
  });

  test("it closes dialog and resets state", () => {
    const {result} = renderHook(() => useDialog("share", "edit", {id: 1}), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("share");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toStrictEqual({id: 1});

    act(() => {
      result.current.close();
    });

    expect(result.current.currentDialog).toStrictEqual({type: null, mode: null, payload: null});
  });

  test("it opens dialog with correct type, mode, and payload", () => {
    const {result} = renderHook(() => useDialog("share", "edit", {id: 1}), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("share");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toStrictEqual({id: 1});
  });

  test("it does not open dialog if already open", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

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
    const {result: shareResult} = renderHook(() => useDialog("share"), {wrapper});
    const {result: merchantResult} = renderHook(() => useDialog("merchant"), {wrapper});

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

  test("it does not open dialog if already open", () => {
    const {result} = renderHook(() => useDialog("share"), {wrapper});

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
    const {result: shareResult} = renderHook(() => useDialog("share"), {wrapper});
    const {result: merchantResult} = renderHook(() => useDialog("merchant"), {wrapper});

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
    const {result: shareHook1} = renderHook(() => useDialog("share"), {wrapper});
    const {result: shareHook2} = renderHook(() => useDialog("share"), {wrapper});

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
    const {result} = renderHook(() => useDialog("metadata", "edit", testPayload), {wrapper});

    act(() => {
      result.current.open();
    });

    expect(result.current.currentDialog.type).toBe("metadata");
    expect(result.current.currentDialog.mode).toBe("edit");
    expect(result.current.currentDialog.payload).toBe(testPayload);
  });

  test("dialog state is properly reset when closed", () => {
    const testPayload = {id: 123};
    const {result} = renderHook(() => useDialog("analysis", "view", testPayload), {wrapper});

    act(() => {
      result.current.open();
    });

    // Verify dialog is open with correct data
    expect(result.current.currentDialog.type).toBe("analysis");
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
    const {result} = renderHook(() => useDialog("share", "edit"), {wrapper});

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
    expect(result.current.currentDialog.type).toBe("share");
    expect(result.current.currentDialog.mode).toBe("edit");
  });

  test("context maintains singleton reference to dialog state type", () => {
    // Create multiple hooks
    const {result: hook1} = renderHook(() => useDialog("share"), {wrapper});
    const {result: hook2} = renderHook(() => useDialog("merchant"), {wrapper});

    // Store original references
    const originalDialog1 = hook1.current.currentDialog;
    const originalDialog2 = hook2.current.currentDialog;

    expect(originalDialog1).not.toBe(originalDialog2);

    // Open one dialog
    act(() => {
      hook1.current.open();
    });

    // The other dialog should be closed.
    expect(hook2.current.isOpen).toBe(false);
    // The first dialog should be open
    expect(hook1.current.isOpen).toBe(true);

    // The references should be different now
  });
});
