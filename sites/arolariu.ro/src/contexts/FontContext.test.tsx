import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {FontContextProvider, useFontContext} from "./FontContext";

// Mock next/font/google fonts
vi.mock("next/font/google", () => ({
  Caudex: vi.fn(() => ({
    className: "caudex-font",
    style: {fontFamily: "Caudex"},
    variable: "--font-caudex",
  })),
  Atkinson_Hyperlegible: vi.fn(() => ({
    className: "atkinson-hyperlegible-font",
    style: {fontFamily: "Atkinson Hyperlegible"},
    variable: "--font-atkinson-hyperlegible",
  })),
}));

describe("FontContext", () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    globalThis.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(),
    } as Storage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("FontContextProvider", () => {
    it("should initialize with normal font by default", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      expect(result.current.fontType).toBe("normal");
      expect(result.current.fontClassName).toBeTruthy();
    });

    it("should load font preference from localStorage", () => {
      localStorageMock["selectedFont"] = "dyslexic";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      expect(result.current.fontType).toBe("dyslexic");
    });

    it("should change font type and persist to localStorage", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      act(() => {
        result.current.setFont("dyslexic");
      });

      expect(result.current.fontType).toBe("dyslexic");
      expect(localStorageMock["selectedFont"]).toBe("dyslexic");
    });

    it("should change font back to normal", () => {
      localStorageMock["selectedFont"] = "dyslexic";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      expect(result.current.fontType).toBe("dyslexic");

      act(() => {
        result.current.setFont("normal");
      });

      expect(result.current.fontType).toBe("normal");
      expect(localStorageMock["selectedFont"]).toBe("normal");
    });

    it("should sync with localStorage changes from other tabs", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      expect(result.current.fontType).toBe("normal");

      // Simulate storage event from another tab
      act(() => {
        const storageEvent = new StorageEvent("storage", {
          key: "selectedFont",
          newValue: "dyslexic",
        });
        globalThis.dispatchEvent(storageEvent);
      });

      expect(result.current.fontType).toBe("dyslexic");
    });

    it("should ignore invalid font types from localStorage", () => {
      localStorageMock["selectedFont"] = "invalid-font";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // Should fall back to normal font
      expect(result.current.fontType).toBe("normal");
    });

    it("should provide font object with className", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      expect(result.current.font).toBeDefined();
      expect(result.current.font.className).toBeTruthy();
      expect(result.current.fontClassName).toBe(result.current.font.className);
    });

    it("should not apply font class if already present", () => {
      // Set the font class to be already present
      document.documentElement.className = "caudex-font";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // Should remain normal font and class should still be present
      expect(result.current.fontType).toBe("normal");
      expect(document.documentElement.className).toContain("caudex-font");
    });

    it("should switch between fonts multiple times", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // Switch to dyslexic
      act(() => {
        result.current.setFont("dyslexic");
      });
      expect(result.current.fontType).toBe("dyslexic");

      // Switch back to normal
      act(() => {
        result.current.setFont("normal");
      });
      expect(result.current.fontType).toBe("normal");

      // Switch to dyslexic again
      act(() => {
        result.current.setFont("dyslexic");
      });
      expect(result.current.fontType).toBe("dyslexic");
    });

    it("should handle storage event with invalid font type", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      expect(result.current.fontType).toBe("normal");

      // Simulate storage event with invalid font type
      act(() => {
        const storageEvent = new StorageEvent("storage", {
          key: "selectedFont",
          newValue: "invalid-font-type",
        });
        globalThis.dispatchEvent(storageEvent);
      });

      // Should remain normal since invalid type was provided
      expect(result.current.fontType).toBe("normal");
    });

    it("should handle storage event with null value", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // Simulate storage event with null value (ignored)
      act(() => {
        const storageEvent = new StorageEvent("storage", {
          key: "selectedFont",
          newValue: null,
        });
        globalThis.dispatchEvent(storageEvent);
      });

      // Should remain unchanged
      expect(result.current.fontType).toBe("normal");
    });

    it("should handle storage event for different key", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // Simulate storage event for a different key
      act(() => {
        const storageEvent = new StorageEvent("storage", {
          key: "some-other-key",
          newValue: "dyslexic",
        });
        globalThis.dispatchEvent(storageEvent);
      });

      // Should remain unchanged since it's a different key
      expect(result.current.fontType).toBe("normal");
    });

    it("should preserve font-sans class when applying custom font", () => {
      // Set document to have font-sans class
      document.documentElement.className = "font-sans some-other-class";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // Should apply the custom font while preserving font-sans
      expect(result.current.fontType).toBe("normal");
      expect(document.documentElement.className).toContain("font-sans");
    });

    it("should preserve font-serif class when applying custom font", () => {
      // Set document to have font-serif class
      document.documentElement.className = "font-serif some-other-class";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      renderHook(() => useFontContext(), {wrapper});

      // Should preserve font-serif
      expect(document.documentElement.className).toContain("font-serif");
    });

    it("should preserve font-mono class when applying custom font", () => {
      // Set document to have font-mono class
      document.documentElement.className = "font-mono some-other-class";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      renderHook(() => useFontContext(), {wrapper});

      // Should preserve font-mono
      expect(document.documentElement.className).toContain("font-mono");
    });

    it("should remove custom font- classes when applying new font", () => {
      // Set document to have custom font class
      document.documentElement.className = "font-custom some-other-class";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      renderHook(() => useFontContext(), {wrapper});

      // Should not contain font-custom anymore
      expect(document.documentElement.className).not.toContain("font-custom");
    });
  });

  describe("useFontContext", () => {
    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test since we expect an error to be thrown
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      expect(() => {
        renderHook(() => useFontContext());
      }).toThrow("useFontContext must be used within a FontContextProvider");

      consoleSpy.mockRestore();
    });
  });
});
