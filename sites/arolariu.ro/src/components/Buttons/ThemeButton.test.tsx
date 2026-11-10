/**
 * @fileoverview Tests for the theme toggle button with the real next-themes provider.
 * @module components/Buttons/ThemeButton.test
 */

import {fireEvent, render, screen} from "@testing-library/react";
import {ThemeProvider} from "next-themes";
import {renderToStaticMarkup} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import ThemeButton from "./ThemeButton";

const toggleName = "shared.accessibility.toggleTheme";

function renderWithTheme(defaultTheme: "light" | "dark"): ReturnType<typeof render> {
  return render(
    <ThemeProvider
      attribute='class'
      defaultTheme={defaultTheme}
      enableSystem={false}>
      <ThemeButton />
    </ThemeProvider>,
  );
}

describe("ThemeButton", () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    // next-themes queries matchMedia for the system preference.
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    globalThis.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("style");
    vi.unstubAllGlobals();
  });

  it("switches from dark to light when clicked", () => {
    renderWithTheme("dark");

    fireEvent.click(screen.getByRole("button", {name: toggleName}));

    expect(globalThis.localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("switches from light to dark when clicked", () => {
    renderWithTheme("light");

    fireEvent.click(screen.getByRole("button", {name: toggleName}));

    expect(globalThis.localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");
  });

  it("toggles back to the original theme on a second click", () => {
    renderWithTheme("dark");
    const button = screen.getByRole("button", {name: toggleName});

    fireEvent.click(button);
    fireEvent.click(button);

    expect(globalThis.localStorage.getItem("theme")).toBe("dark");
  });

  it("renders only an aria-hidden placeholder on the server snapshot", () => {
    const markup = renderToStaticMarkup(<ThemeButton />);

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("<button");
  });
});
