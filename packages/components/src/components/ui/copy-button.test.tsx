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
});
