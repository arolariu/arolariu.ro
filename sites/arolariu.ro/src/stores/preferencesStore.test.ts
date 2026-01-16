/**
 * @fileoverview Tests for preferencesStore.
 * @module stores/preferencesStore.test
 */

import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {DEFAULT_PREFERENCES, usePreferencesStore} from "./preferencesStore";

// Mock IndexedDB storage
vi.mock("./storage/indexedDBStorage", () => ({
  createSharedStorage: vi.fn(() => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("preferencesStore", () => {
  beforeEach(() => {
    // Reset the store to default state before each test
    const {result} = renderHook(() => usePreferencesStore);
    act(() => {
      result.current.getState().resetToDefaults();
      result.current.getState().setHasHydrated(false);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have default preferences", () => {
      const {result} = renderHook(() => usePreferencesStore);
      const state = result.current.getState();

      expect(state.primaryColor).toBe(DEFAULT_PREFERENCES.primaryColor);
      expect(state.secondaryColor).toBe(DEFAULT_PREFERENCES.secondaryColor);
      expect(state.tertiaryColor).toBe(DEFAULT_PREFERENCES.tertiaryColor);
      expect(state.theme).toBe(DEFAULT_PREFERENCES.theme);
      expect(state.fontType).toBe(DEFAULT_PREFERENCES.fontType);
      expect(state.locale).toBe(DEFAULT_PREFERENCES.locale);
      expect(state.compactMode).toBe(DEFAULT_PREFERENCES.compactMode);
      expect(state.animationsEnabled).toBe(DEFAULT_PREFERENCES.animationsEnabled);
    });

    it("should have hasHydrated as false initially", () => {
      const {result} = renderHook(() => usePreferencesStore);
      const state = result.current.getState();

      expect(state.hasHydrated).toBe(false);
    });
  });

  describe("setPrimaryColor", () => {
    it("should update primary color", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setPrimaryColor("#ff0000");
      });

      expect(result.current.getState().primaryColor).toBe("#ff0000");
    });

    it("should accept any valid hex color", () => {
      const {result} = renderHook(() => usePreferencesStore);
      const colors = ["#ffffff", "#000000", "#123456", "#abcdef"];

      for (const color of colors) {
        act(() => {
          result.current.getState().setPrimaryColor(color);
        });
        expect(result.current.getState().primaryColor).toBe(color);
      }
    });
  });

  describe("setSecondaryColor", () => {
    it("should update secondary color", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setSecondaryColor("#00ff00");
      });

      expect(result.current.getState().secondaryColor).toBe("#00ff00");
    });
  });

  describe("setTertiaryColor", () => {
    it("should update tertiary color", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setTertiaryColor("#0000ff");
      });

      expect(result.current.getState().tertiaryColor).toBe("#0000ff");
    });

    it("should allow undefined to clear tertiary color", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setTertiaryColor("#0000ff");
      });
      expect(result.current.getState().tertiaryColor).toBe("#0000ff");

      act(() => {
        result.current.getState().setTertiaryColor(undefined);
      });
      expect(result.current.getState().tertiaryColor).toBeUndefined();
    });
  });

  describe("setTheme", () => {
    it("should update theme to light", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setTheme("light");
      });

      expect(result.current.getState().theme).toBe("light");
    });

    it("should update theme to dark", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setTheme("dark");
      });

      expect(result.current.getState().theme).toBe("dark");
    });

    it("should update theme to system", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setTheme("system");
      });

      expect(result.current.getState().theme).toBe("system");
    });
  });

  describe("setFontType", () => {
    it("should update font type to normal", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setFontType("normal");
      });

      expect(result.current.getState().fontType).toBe("normal");
    });

    it("should update font type to dyslexic", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setFontType("dyslexic");
      });

      expect(result.current.getState().fontType).toBe("dyslexic");
    });
  });

  describe("setLocale", () => {
    it("should update locale to en", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setLocale("en");
      });

      expect(result.current.getState().locale).toBe("en");
    });

    it("should update locale to ro", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setLocale("ro");
      });

      expect(result.current.getState().locale).toBe("ro");
    });

    it("should update locale to fr", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setLocale("fr");
      });

      expect(result.current.getState().locale).toBe("fr");
    });
  });

  describe("setCompactMode", () => {
    it("should enable compact mode", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setCompactMode(true);
      });

      expect(result.current.getState().compactMode).toBe(true);
    });

    it("should disable compact mode", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setCompactMode(true);
      });
      act(() => {
        result.current.getState().setCompactMode(false);
      });

      expect(result.current.getState().compactMode).toBe(false);
    });
  });

  describe("setAnimationsEnabled", () => {
    it("should enable animations", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setAnimationsEnabled(true);
      });

      expect(result.current.getState().animationsEnabled).toBe(true);
    });

    it("should disable animations", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setAnimationsEnabled(false);
      });

      expect(result.current.getState().animationsEnabled).toBe(false);
    });
  });

  describe("setHasHydrated", () => {
    it("should set hydration status to true", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setHasHydrated(true);
      });

      expect(result.current.getState().hasHydrated).toBe(true);
    });

    it("should set hydration status to false", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setHasHydrated(true);
      });
      act(() => {
        result.current.getState().setHasHydrated(false);
      });

      expect(result.current.getState().hasHydrated).toBe(false);
    });
  });

  describe("resetToDefaults", () => {
    it("should reset all preferences to defaults", () => {
      const {result} = renderHook(() => usePreferencesStore);

      // Change all preferences
      act(() => {
        result.current.getState().setPrimaryColor("#ff0000");
        result.current.getState().setSecondaryColor("#00ff00");
        result.current.getState().setTertiaryColor("#0000ff");
        result.current.getState().setTheme("dark");
        result.current.getState().setFontType("dyslexic");
        result.current.getState().setLocale("ro");
        result.current.getState().setCompactMode(true);
        result.current.getState().setAnimationsEnabled(false);
      });

      // Reset to defaults
      act(() => {
        result.current.getState().resetToDefaults();
      });

      const state = result.current.getState();
      expect(state.primaryColor).toBe(DEFAULT_PREFERENCES.primaryColor);
      expect(state.secondaryColor).toBe(DEFAULT_PREFERENCES.secondaryColor);
      expect(state.tertiaryColor).toBe(DEFAULT_PREFERENCES.tertiaryColor);
      expect(state.theme).toBe(DEFAULT_PREFERENCES.theme);
      expect(state.fontType).toBe(DEFAULT_PREFERENCES.fontType);
      expect(state.locale).toBe(DEFAULT_PREFERENCES.locale);
      expect(state.compactMode).toBe(DEFAULT_PREFERENCES.compactMode);
      expect(state.animationsEnabled).toBe(DEFAULT_PREFERENCES.animationsEnabled);
    });
  });

  describe("getGradientTheme", () => {
    it("should return gradient theme with from, via, and to colors", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setPrimaryColor("#ff0000");
        result.current.getState().setSecondaryColor("#00ff00");
        result.current.getState().setTertiaryColor("#0000ff");
      });

      const theme = result.current.getState().getGradientTheme();

      expect(theme.from).toBe("#ff0000");
      expect(theme.to).toBe("#00ff00");
      expect(theme.via).toBe("#0000ff");
    });

    it("should return undefined for via when tertiaryColor is undefined", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setPrimaryColor("#ff0000");
        result.current.getState().setSecondaryColor("#00ff00");
        result.current.getState().setTertiaryColor(undefined);
      });

      const theme = result.current.getState().getGradientTheme();

      expect(theme.from).toBe("#ff0000");
      expect(theme.to).toBe("#00ff00");
      expect(theme.via).toBeUndefined();
    });

    it("should return default gradient theme initially", () => {
      const {result} = renderHook(() => usePreferencesStore);

      // Reset to make sure we have defaults
      act(() => {
        result.current.getState().resetToDefaults();
      });

      const theme = result.current.getState().getGradientTheme();

      expect(theme.from).toBe(DEFAULT_PREFERENCES.primaryColor);
      expect(theme.to).toBe(DEFAULT_PREFERENCES.secondaryColor);
      expect(theme.via).toBe(DEFAULT_PREFERENCES.tertiaryColor);
    });
  });

  describe("DEFAULT_PREFERENCES constant", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_PREFERENCES.primaryColor).toBe("#06b6d4");
      expect(DEFAULT_PREFERENCES.secondaryColor).toBe("#ec4899");
      expect(DEFAULT_PREFERENCES.tertiaryColor).toBe("#8b5cf6");
      expect(DEFAULT_PREFERENCES.theme).toBe("system");
      expect(DEFAULT_PREFERENCES.fontType).toBe("normal");
      expect(DEFAULT_PREFERENCES.locale).toBe("en");
      expect(DEFAULT_PREFERENCES.compactMode).toBe(false);
      expect(DEFAULT_PREFERENCES.animationsEnabled).toBe(true);
    });
  });

  describe("store subscription", () => {
    it("should notify subscribers when state changes", () => {
      const {result} = renderHook(() => usePreferencesStore);
      const callback = vi.fn();

      const unsubscribe = result.current.subscribe(callback);

      act(() => {
        result.current.getState().setPrimaryColor("#ff0000");
      });

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });

    it("should stop notifying after unsubscribe", () => {
      const {result} = renderHook(() => usePreferencesStore);
      const callback = vi.fn();

      const unsubscribe = result.current.subscribe(callback);
      unsubscribe();

      act(() => {
        result.current.getState().setPrimaryColor("#ff0000");
      });

      // Callback should have been called once during subscribe setup
      const callCount = callback.mock.calls.length;

      act(() => {
        result.current.getState().setPrimaryColor("#00ff00");
      });

      // Call count should not increase after unsubscribe
      expect(callback.mock.calls.length).toBe(callCount);
    });
  });

  describe("multiple preference changes", () => {
    it("should handle rapid sequential updates", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.getState().setPrimaryColor(`#${i.toString().padStart(6, "0")}`);
        }
      });

      expect(result.current.getState().primaryColor).toBe("#000009");
    });

    it("should maintain consistency across multiple updates", () => {
      const {result} = renderHook(() => usePreferencesStore);

      act(() => {
        result.current.getState().setPrimaryColor("#111111");
        result.current.getState().setSecondaryColor("#222222");
        result.current.getState().setTertiaryColor("#333333");
        result.current.getState().setTheme("dark");
        result.current.getState().setFontType("dyslexic");
      });

      const state = result.current.getState();
      expect(state.primaryColor).toBe("#111111");
      expect(state.secondaryColor).toBe("#222222");
      expect(state.tertiaryColor).toBe("#333333");
      expect(state.theme).toBe("dark");
      expect(state.fontType).toBe("dyslexic");
    });
  });
});
