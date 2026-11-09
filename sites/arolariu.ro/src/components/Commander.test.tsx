import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import Commander from "./Commander";

const replaceMock = vi.fn();
const setThemeMock = vi.fn();
const setFontMock = vi.fn();

vi.mock("next/navigation", () => ({useRouter: () => ({replace: replaceMock})}));
vi.mock("next-themes", () => ({useTheme: () => ({setTheme: setThemeMock})}));
vi.mock("@/contexts/FontContext", () => ({useFontContext: () => ({setFont: setFontMock})}));

function openPalette(): void {
  fireEvent.keyDown(globalThis.document, {key: "k", ctrlKey: true});
}

describe("Commander", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    setThemeMock.mockReset();
    setFontMock.mockReset();
  });

  it("opens a titled command dialog with a single Command root on Ctrl+K", () => {
    // Arrange
    render(<Commander />);

    // Act
    openPalette();

    // Assert
    expect(screen.getByRole("dialog", {name: "app.commander.title"})).toBeInTheDocument();
    expect(screen.getByRole("combobox", {name: "app.commander.placeholder"})).toBeInTheDocument();
    expect(screen.getByRole("option", {name: /^app\.commander\.items\.homepage\b/})).toBeInTheDocument();
  });

  it("filters options by their translated label keywords", () => {
    // Arrange
    render(<Commander />);
    openPalette();

    // Act
    fireEvent.change(screen.getByRole("combobox"), {target: {value: "items.dark"}});

    // Assert
    expect(screen.getByRole("option", {name: /^app\.commander\.items\.dark\b/})).toBeInTheDocument();
    expect(screen.queryByRole("option", {name: /^app\.commander\.items\.homepage\b/})).not.toBeInTheDocument();
  });

  it("runs the selected command and closes the palette", async () => {
    // Arrange
    render(<Commander />);
    openPalette();

    // Act
    fireEvent.click(screen.getByRole("option", {name: /^app\.commander\.items\.dark\b/}));

    // Assert
    expect(setThemeMock).toHaveBeenCalledWith("dark");
    await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument());
  });
});
