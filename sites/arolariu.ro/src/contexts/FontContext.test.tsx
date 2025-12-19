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

    it("should remove font class on unmount via cleanup function", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result, unmount} = renderHook(() => useFontContext(), {wrapper});

      // Get the current font class
      const fontClass = result.current.fontClassName;

      // Ensure the font class is applied
      expect(document.documentElement.className).toContain(fontClass);

      // Unmount the hook to trigger cleanup
      unmount();

      // After unmount, the font class should be removed
      expect(document.documentElement.classList.contains(fontClass)).toBe(false);
    });

    it("should cleanup previous font class when font changes", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // Get initial font class
      const initialFontClass = result.current.fontClassName;
      expect(document.documentElement.className).toContain(initialFontClass);

      // Change to dyslexic font
      act(() => {
        result.current.setFont("dyslexic");
      });

      // New font class should be applied
      const newFontClass = result.current.fontClassName;
      expect(document.documentElement.className).toContain(newFontClass);

      // Old font class should be removed
      expect(document.documentElement.className).not.toContain(initialFontClass);
    });

    it("should handle cleanup when document className needs updating", () => {
      // Start with a clean slate
      document.documentElement.className = "";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result, unmount} = renderHook(() => useFontContext(), {wrapper});

      // Change font to dyslexic to trigger the cleanup path when we unmount
      act(() => {
        result.current.setFont("dyslexic");
      });

      const dyslexicClass = result.current.fontClassName;
      expect(document.documentElement.className).toContain(dyslexicClass);

      // Unmount to trigger cleanup
      unmount();

      // Font class should be removed after unmount
      expect(document.documentElement.classList.contains(dyslexicClass)).toBe(false);
    });

    it("should handle the scenario when document className differs from newClassName", () => {
      // Set up initial state with some classes
      document.documentElement.className = "some-other-class font-test";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // The font context should update the className
      expect(result.current.fontType).toBe("normal");

      // The font-test class should be filtered out (it matches font-* pattern)
      // but font-sans/serif/mono should be preserved
      expect(document.documentElement.className).not.toContain("font-test");
      expect(document.documentElement.className).toContain(result.current.fontClassName);
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

  describe("Edge cases for branch coverage", () => {
    it("should not update className when it already matches newClassName", () => {
      // Set document to have the exact expected className including the font class
      // This tests the branch where className === newClassName
      document.documentElement.className = "some-other-class caudex-font";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;

      const {result} = renderHook(() => useFontContext(), {wrapper});

      // The className should remain unchanged since caudex-font is already present
      expect(result.current.fontType).toBe("normal");
    });

    it("should ignore storage event with invalid value", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;
      const {result} = renderHook(() => useFontContext(), {wrapper});

      act(() => {
        const event = new StorageEvent("storage", {
          key: "selectedFont",
          newValue: "invalid-font",
        });
        globalThis.dispatchEvent(event);
      });

      expect(result.current.fontType).toBe("normal");
    });

    it("should ignore storage event for different key", () => {
      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;
      const {result} = renderHook(() => useFontContext(), {wrapper});

      act(() => {
        const event = new StorageEvent("storage", {
          key: "otherKey",
          newValue: "dyslexic",
        });
        globalThis.dispatchEvent(event);
      });

      expect(result.current.fontType).toBe("normal");
    });

    it("should return early if font class is already present (Safety Check 1)", () => {
      // Set up the DOM so classList.contains returns true
      document.documentElement.className = "caudex-font extra-class";

      const wrapper = ({children}: {children: React.ReactNode}) => <FontContextProvider>{children}</FontContextProvider>;
      renderHook(() => useFontContext(), {wrapper});

      // If it returns early, className should remain exactly as set
      expect(document.documentElement.className).toBe("caudex-font extra-class");
    });
  });
});
