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
    expect(result.current.currentDialog).toBe("share");
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

    expect(result.current.currentDialog).toBe("share");
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
});

