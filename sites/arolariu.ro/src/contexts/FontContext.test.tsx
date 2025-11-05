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
    vi.stubGlobal("localStorage", {
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
    });

    // Mock document.documentElement
    vi.stubGlobal("document", {
      documentElement: {
        className: "",
        classList: {
          contains: vi.fn((className: string) => {
            return globalThis.document.documentElement.className.includes(className);
          }),
          remove: vi.fn((className: string) => {
            const classes = globalThis.document.documentElement.className.split(" ");
            globalThis.document.documentElement.className = classes.filter((c) => c !== className).join(" ");
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
  });

  describe("useFontContext", () => {
    it("should throw error when used outside provider", () => {
      expect(() => {
        renderHook(() => useFontContext());
      }).toThrow("useFontContext must be used within a FontContextProvider");
    });
  });
});
