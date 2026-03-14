import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {CopyButton} from "./copy-button";

describe("CopyButton", () => {
  it("renders without crashing", () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: vi.fn()},
    });

    render(<CopyButton value='test' />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: vi.fn()},
    });

    render(<CopyButton value='test' />);

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: vi.fn()},
    });

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
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(<CopyButton value='test value' />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test value");
    });
  });

  it("shows check icon after successful copy", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Copied")).toBeInTheDocument();
    });
  });

  it("calls clipboard.writeText with correct value", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(<CopyButton value='test-value-123' />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("test-value-123");
    });
  });

  it("does not crash when clipboard writeText fails", async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard access denied"));
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    // Should not throw
    fireEvent.click(button);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Button should still be functional
    expect(button).toBeInTheDocument();
  });

  it("shows check icon and reverts after custom timeout", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(
      <CopyButton
        value='test'
        timeout={100}
      />,
    );
    const button = screen.getByRole("button");

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Copied")).toBeInTheDocument();
    });

    // Wait for timeout to complete
    await waitFor(
      () => {
        expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
      },
      {timeout: 200},
    );
  });

  it("clears timeout on unmount", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    const {unmount} = render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Copied")).toBeInTheDocument();
    });

    // Unmount before timeout completes - should not crash
    unmount();

    // Wait a bit to ensure no errors
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it("handles multiple rapid clicks by resetting timeout", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    // First click
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText("Copied")).toBeInTheDocument();
    });

    // Second click before timeout completes
    fireEvent.click(button);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledTimes(2);
    });

    // Still shows copied state
    expect(screen.getByLabelText("Copied")).toBeInTheDocument();
  });

  it("does not copy when disabled", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(
      <CopyButton
        value='test'
        disabled
      />,
    );
    const button = screen.getByRole("button");

    fireEvent.click(button);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(writeTextMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("does not copy when clipboard.writeText is not available", async () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: undefined},
    });

    render(<CopyButton value='test' />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Should still show copy icon
    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("calls custom onClick handler", async () => {
    const onClickMock = vi.fn();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(
      <CopyButton
        value='test'
        onClick={onClickMock}
      />,
    );
    const button = screen.getByRole("button");

    fireEvent.click(button);

    await waitFor(() => {
      expect(onClickMock).toHaveBeenCalledTimes(1);
      expect(writeTextMock).toHaveBeenCalledWith("test");
    });
  });

  it("does not copy when event is prevented by onClick handler", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: writeTextMock},
    });

    render(
      <CopyButton
        value='test'
        onClick={(e) => e.preventDefault()}
      />,
    );
    const button = screen.getByRole("button");

    fireEvent.click(button);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(writeTextMock).not.toHaveBeenCalled();
  });
});
