import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {CopyButton} from "./copy-button";

describe("CopyButton", () => {
  it("renders without crashing", () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: vi.fn()},
    });

    render(<CopyButton value="test" />);

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("has accessible label", () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: vi.fn()},
    });

    render(<CopyButton value="test" />);

    expect(screen.getByLabelText("Copy to clipboard")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {writeText: vi.fn()},
    });

    const ref = {current: null as HTMLButtonElement | null};

    render(<CopyButton ref={ref} value="test" />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
