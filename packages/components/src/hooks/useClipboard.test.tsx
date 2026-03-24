import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useClipboard} from "./useClipboard";

describe("useClipboard", () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeTextMock = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: {writeText: writeTextMock},
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("initializes with copied false and no error", () => {
    const {result} = renderHook(() => useClipboard());

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("copies text successfully and sets copied to true", async () => {
    const {result} = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(writeTextMock).toHaveBeenCalledWith("test text");
    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("resets copied state after default timeout (2000ms)", async () => {
    const {result} = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it("resets copied state after custom timeout", async () => {
    const {result} = renderHook(() => useClipboard({timeout: 5000}));

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.copied).toBe(false);
  });

  it("handles copy errors when clipboard API is unavailable", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const {result} = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Clipboard API is not available");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("handles copy errors when writeText fails", async () => {
    const writeError = new Error("Permission denied");

    writeTextMock.mockRejectedValueOnce(writeError);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const {result} = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("test text");
    });

    expect(result.current.copied).toBe(false);
    expect(result.current.error).toEqual(writeError);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("clears previous error on successful copy", async () => {
    writeTextMock.mockRejectedValueOnce(new Error("First error"));

    const {result} = renderHook(() => useClipboard());

    // First copy fails
    await act(async () => {
      await result.current.copy("fail");
    });

    expect(result.current.error).toBeInstanceOf(Error);

    // Second copy succeeds
    writeTextMock.mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.copy("success");
    });

    expect(result.current.error).toBe(null);
    expect(result.current.copied).toBe(true);
  });

  it("resets timeout when copy is called again before timeout expires", async () => {
    const {result} = renderHook(() => useClipboard({timeout: 3000}));

    await act(async () => {
      await result.current.copy("first");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    await act(async () => {
      await result.current.copy("second");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.copied).toBe(false);
  });

  it("cleans up timeout on unmount", async () => {
    const {result, unmount} = renderHook(() => useClipboard({timeout: 5000}));

    await act(async () => {
      await result.current.copy("test");
    });

    expect(result.current.copied).toBe(true);

    unmount();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should not crash or cause issues after unmount
  });

  it("handles empty string copy", async () => {
    const {result} = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("");
    });

    expect(writeTextMock).toHaveBeenCalledWith("");
    expect(result.current.copied).toBe(true);
  });

  it("handles multi-line text copy", async () => {
    const multiLineText = "Line 1\nLine 2\nLine 3";
    const {result} = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy(multiLineText);
    });

    expect(writeTextMock).toHaveBeenCalledWith(multiLineText);
    expect(result.current.copied).toBe(true);
  });
});
