import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {CopyButton} from "./copy-button";

describe("CopyButton", () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => undefined,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();

    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it("renders without crashing", () => {
    render(<CopyButton value='test' />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    render(<CopyButton value='test' />);

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLButtonElement | null};

    render(
      <CopyButton
        ref={ref}
        value='test'
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("copies text to clipboard on click", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(<CopyButton value='test value' />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test value");
    });
  });

  it("shows check icon after successful copy", async () => {
    const user = userEvent.setup();

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Copied")).toBeInTheDocument();
    });
  });

  it("calls clipboard.writeText with correct value", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(<CopyButton value='test-value-123' />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test-value-123");
    });
  });

  it("does not crash when clipboard writeText fails", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard access denied"));

    Object.defineProperty(navigator, "clipboard", {
      value: {writeText: writeTextMock},
      writable: true,
      configurable: true,
    });

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    await user.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test");
    });

    expect(button).toBeInTheDocument();
    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("shows check icon and reverts after custom timeout", async () => {
    vi.useFakeTimers();

    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        timeout={1000}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("clears timeout on unmount", async () => {
    vi.useFakeTimers();

    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const {unmount} = render(
      <CopyButton
        value='test'
        timeout={1000}
      />,
    );
    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    unmount();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("handles multiple rapid clicks by resetting timeout", async () => {
    vi.useFakeTimers();

    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        timeout={1000}
      />,
    );
    const button = screen.getByRole("button");

    await act(async () => {
      fireEvent.click(button);
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByLabelText("Copied")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("does not copy when disabled", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        disabled
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(writeTextMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("does not copy when clipboard.writeText is not available", async () => {
    const user = userEvent.setup();

    Object.defineProperty(navigator, "clipboard", {
      value: {writeText: undefined},
      writable: true,
      configurable: true,
    });

    render(<CopyButton value='test' />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("calls custom onClick handler", async () => {
    const user = userEvent.setup();
    const onClickMock = vi.fn();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        onClick={onClickMock}
      />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(onClickMock).toHaveBeenCalledTimes(1);
      expect(writeTextMock).toHaveBeenCalledWith("test");
    });
  });

  it("does not copy when event is prevented by onClick handler", async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    render(
      <CopyButton
        value='test'
        onClick={(e) => e.preventDefault()}
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(writeTextMock).not.toHaveBeenCalled();
  });
});
