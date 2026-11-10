import {usePreferencesStore} from "@/stores/preferencesStore";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
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

  it("toggles the palette closed on a second Ctrl+K and ignores other keys", async () => {
    // Arrange
    render(<Commander />);

    // Act
    fireEvent.keyDown(globalThis.document, {key: "k"});
    const openedByPlainKey = screen.queryByRole("combobox");
    openPalette();
    const openedByShortcut = screen.queryByRole("combobox");
    fireEvent.keyDown(globalThis.document, {key: "k", metaKey: true});

    // Assert
    expect(openedByPlainKey).not.toBeInTheDocument();
    expect(openedByShortcut).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument());
  });

  describe("command selection", () => {
    afterEach(() => {
      usePreferencesStore.getState().setLocale("en");
    });

    async function select(key: string): Promise<void> {
      openPalette();
      fireEvent.click(screen.getByRole("option", {name: new RegExp(String.raw`^app\.commander\.items\.${key}\b`)}));
      await waitFor(() => expect(screen.queryByRole("combobox")).not.toBeInTheDocument());
    }

    it.each([["homepage"], ["light"], ["system"], ["fontNormal"], ["fontDyslexic"]])("dispatches only the %s action", async (key) => {
      // Arrange
      render(<Commander />);

      // Act
      await select(key);

      // Assert
      const calls = {
        replace: replaceMock.mock.calls,
        theme: setThemeMock.mock.calls,
        font: setFontMock.mock.calls,
      };
      const expected: Record<string, typeof calls> = {
        homepage: {replace: [["/"]], theme: [], font: []},
        light: {replace: [], theme: [["light"]], font: []},
        system: {replace: [], theme: [["system"]], font: []},
        fontNormal: {replace: [], theme: [], font: [["normal"]]},
        fontDyslexic: {replace: [], theme: [], font: [["dyslexic"]]},
      };
      expect(calls).toEqual(expected[key]);
    });

    it.each([
      ["romanian", "ro"],
      ["french", "fr"],
      ["english", "en"],
    ] as const)("sets the %s locale in the preferences store", async (key, locale) => {
      // Arrange
      usePreferencesStore.getState().setLocale(locale === "en" ? "fr" : "en");
      render(<Commander />);

      // Act
      await select(key);

      // Assert
      expect(usePreferencesStore.getState().locale).toBe(locale);
      expect(setThemeMock).not.toHaveBeenCalled();
    });

    it("opens the GitHub profile in a noopener tab", async () => {
      // Arrange
      const openSpy = vi.spyOn(globalThis, "open").mockReturnValue(null);
      render(<Commander />);

      // Act
      await select("github");

      // Assert
      expect(openSpy).toHaveBeenCalledTimes(1);
      expect(openSpy).toHaveBeenCalledWith("https://github.com/arolariu", "_blank", "noopener");
    });
  });

  describe("timed effects", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      globalThis.document.body.innerHTML = "";
    });

    function select(key: string): void {
      openPalette();
      fireEvent.click(screen.getByRole("option", {name: new RegExp(String.raw`^app\.commander\.items\.${key}\b`)}));
    }

    it("paints headings with a transparent gradient and restores the colour after 10 seconds", () => {
      // Arrange
      render(
        <>
          <h1>Title</h1>
          <h2>Subtitle</h2>
          <p>Body</p>
          <Commander />
        </>,
      );
      const heading = screen.getByRole("heading", {level: 1});
      const subheading = screen.getByRole("heading", {level: 2});
      const paragraph = screen.getByText("Body");
      const originalColor = globalThis.getComputedStyle(heading).color;

      // Act
      select("rainbow");
      const during = {color: heading.style.color, clip: subheading.style.backgroundClip, paragraph: paragraph.style.color};
      act(() => {
        vi.advanceTimersByTime(9999);
      });
      const justBefore = heading.style.color;
      act(() => {
        vi.advanceTimersByTime(1);
      });

      // Assert
      expect(during).toEqual({color: "transparent", clip: "text", paragraph: ""});
      expect(justBefore).toBe("transparent");
      expect(heading.style.color).toBe(originalColor);
      expect(heading.style.backgroundClip).toBe("");
      expect(subheading.style.backgroundClip).toBe("");
    });

    it("cycles section backgrounds every 500ms and restores the originals after 10 seconds", () => {
      // Arrange
      render(
        <>
          <section data-testid='first'>one</section>
          <section data-testid='second'>two</section>
          <Commander />
        </>,
      );
      const first = screen.getByTestId("first");
      const second = screen.getByTestId("second");
      first.style.background = "blue";
      const originalFirst = globalThis.getComputedStyle(first).background;

      // Act
      select("disco");
      const beforeTick = first.style.background;
      act(() => {
        vi.advanceTimersByTime(500);
      });
      const afterTick = {first: first.style.background, second: second.style.background};
      act(() => {
        vi.advanceTimersByTime(9500);
      });

      // Assert
      expect(beforeTick).toBe(originalFirst);
      expect(afterTick.first).not.toBe(originalFirst);
      expect(afterTick.second).not.toBe("");
      expect(afterTick.first).not.toBe(afterTick.second);
      expect(first.style.background).toBe(originalFirst);
      expect(vi.getTimerCount()).toBe(0);
    });

    describe("matrix rain", () => {
      const fillText = vi.fn();
      const fillRect = vi.fn();
      const originalWidth = globalThis.innerWidth;
      const originalHeight = globalThis.innerHeight;

      beforeEach(() => {
        fillText.mockReset();
        fillRect.mockReset();
        const context = {fillText, fillRect, fillStyle: "", font: ""};
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D); // fake 2d context: happy-dom returns null
        vi.stubGlobal("innerWidth", 30);
        vi.stubGlobal("innerHeight", 20);
      });

      afterEach(() => {
        vi.unstubAllGlobals();
        expect(globalThis.innerWidth).toBe(originalWidth);
        expect(globalThis.innerHeight).toBe(originalHeight);
      });

      it("draws an overlay canvas, resets drops past the bottom on a high roll, and removes the canvas after 10 seconds", () => {
        // Arrange
        vi.spyOn(Math, "random").mockReturnValue(0.99);
        render(<Commander />);

        // Act
        select("matrix");
        const canvas = globalThis.document.body.querySelector("canvas");
        act(() => {
          vi.advanceTimersByTime(33 * 4);
        });

        // Assert
        expect(canvas).not.toBeNull();
        expect(canvas?.width).toBe(30);
        expect(canvas?.height).toBe(20);
        expect(canvas?.style.pointerEvents).toBe("none");
        expect(fillRect).toHaveBeenCalledTimes(4);
        expect(fillText).toHaveBeenCalledTimes(12);
        // first column, one call per draw: y = drop * 10 where the drop resets to 0 after passing the canvas height
        const columnZeroY = fillText.mock.calls.filter((_, index) => index % 3 === 0).map((call) => call[2]);
        expect(columnZeroY).toEqual([10, 20, 30, 0]);

        act(() => {
          vi.advanceTimersByTime(10_000);
        });
        expect(globalThis.document.body.querySelector("canvas")).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
      });

      it("keeps falling past the bottom on a low roll", () => {
        // Arrange
        vi.spyOn(Math, "random").mockReturnValue(0.5);
        render(<Commander />);

        // Act
        select("matrix");
        act(() => {
          vi.advanceTimersByTime(33 * 4);
        });

        // Assert
        const columnZeroY = fillText.mock.calls.filter((_, index) => index % 3 === 0).map((call) => call[2]);
        expect(columnZeroY).toEqual([10, 20, 30, 40]);
      });
    });
  });
});
