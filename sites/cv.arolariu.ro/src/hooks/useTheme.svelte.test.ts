/**
 * Unit tests for useTheme hook
 * Tests theme management functionality including localStorage persistence and DOM updates
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useTheme} from "./useTheme.svelte";

describe("useTheme", () => {
  let theme: ReturnType<typeof useTheme>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Clear any theme classes from document
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.removeAttribute("data-theme");

    // Reset the module to get a fresh instance
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.removeAttribute("data-theme");
  });

  describe("initialization", () => {
    it("should initialize with dark theme by default", async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      theme = freshUseTheme();

      expect(theme.current).toBe("dark");
      expect(theme.currentTheme).toBe("dark");
    });

    it("should initialize with theme from localStorage if available", async () => {
      localStorage.setItem("theme", "light");

      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      theme = freshUseTheme();

      expect(theme.current).toBe("light");
    });

    it("should apply theme class to document on initialization", async () => {
      localStorage.setItem("theme", "light");

      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      freshUseTheme();

      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("should set data-theme attribute on initialization", async () => {
      localStorage.setItem("theme", "light");

      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      freshUseTheme();

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });

  describe("current property", () => {
    beforeEach(async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      theme = freshUseTheme();
    });

    it("should return current theme via current property", () => {
      expect(theme.current).toBe("dark");
    });

    it("should return current theme via currentTheme property", () => {
      expect(theme.currentTheme).toBe("dark");
    });

    it("should return same value for both current and currentTheme", () => {
      expect(theme.current).toBe(theme.currentTheme);
    });
  });

  describe("set method", () => {
    beforeEach(async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      theme = freshUseTheme();
    });

    it("should update theme to light", () => {
      theme.set("light");

      expect(theme.current).toBe("light");
    });

    it("should update theme to dark", () => {
      theme.set("light");
      theme.set("dark");

      expect(theme.current).toBe("dark");
    });

    it("should persist theme to localStorage", () => {
      theme.set("light");

      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("should apply theme class to document", () => {
      theme.set("light");

      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should set data-theme attribute", () => {
      theme.set("light");

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("should remove previous theme class when setting new theme", () => {
      theme.set("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      theme.set("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("should update localStorage when changing theme multiple times", () => {
      theme.set("light");
      expect(localStorage.getItem("theme")).toBe("light");

      theme.set("dark");
      expect(localStorage.getItem("theme")).toBe("dark");

      theme.set("light");
      expect(localStorage.getItem("theme")).toBe("light");
    });
  });

  describe("toggle method", () => {
    beforeEach(async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      theme = freshUseTheme();
    });

    it("should toggle from dark to light", () => {
      theme.set("dark");
      theme.toggle();

      expect(theme.current).toBe("light");
    });

    it("should toggle from light to dark", () => {
      theme.set("light");
      theme.toggle();

      expect(theme.current).toBe("dark");
    });

    it("should toggle multiple times", () => {
      theme.set("dark");

      theme.toggle();
      expect(theme.current).toBe("light");

      theme.toggle();
      expect(theme.current).toBe("dark");

      theme.toggle();
      expect(theme.current).toBe("light");
    });

    it("should persist toggled theme to localStorage", () => {
      theme.set("dark");
      theme.toggle();

      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("should apply correct theme class after toggle", () => {
      theme.set("dark");
      theme.toggle();

      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should update data-theme attribute after toggle", () => {
      theme.set("dark");
      theme.toggle();

      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
  });

  describe("DOM manipulation", () => {
    beforeEach(async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      theme = freshUseTheme();
    });

    it("should only have one theme class at a time", () => {
      theme.set("light");
      const classList = Array.from(document.documentElement.classList);
      const themeClasses = classList.filter((c) => c === "light" || c === "dark");

      expect(themeClasses).toHaveLength(1);
    });

    it("should maintain data-theme attribute consistency with class", () => {
      theme.set("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");

      theme.set("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
  });

  describe("edge cases", () => {
    beforeEach(async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      theme = freshUseTheme();
    });

    it("should handle setting same theme multiple times", () => {
      theme.set("light");
      theme.set("light");
      theme.set("light");

      expect(theme.current).toBe("light");
      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("should handle rapid theme changes", () => {
      theme.set("light");
      theme.set("dark");
      theme.set("light");
      theme.set("dark");
      theme.set("light");

      expect(theme.current).toBe("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("should handle toggle after manual set", () => {
      theme.set("light");
      theme.toggle();

      expect(theme.current).toBe("dark");
    });
  });

  describe("singleton behavior", () => {
    it("should return same state across multiple useTheme calls", async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      const theme1 = freshUseTheme();
      const theme2 = freshUseTheme();

      theme1.set("light");

      expect(theme2.current).toBe("light");
    });

    it("should maintain state after toggle from one instance", async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      const theme1 = freshUseTheme();
      const theme2 = freshUseTheme();

      theme1.toggle();

      expect(theme2.current).toBe(theme1.current);
    });
  });

  describe("DOM updates", () => {
    it("should add theme class to html element", async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      const theme = freshUseTheme();

      theme.set("light");

      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });

    it("should handle theme changes without explicit set", async () => {
      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      const theme = freshUseTheme();

      // Toggle from default dark to light
      theme.toggle();
      expect(document.documentElement.classList.contains("light")).toBe(true);

      // Toggle back to dark
      theme.toggle();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("SSR behavior", () => {
    it("should handle applyTheme when not in browser", async () => {
      // Mock browser as false temporarily
      vi.doMock("$app/environment", () => ({
        browser: false,
        building: false,
        dev: true,
        version: "test",
      }));

      const {useTheme: freshUseTheme} = await import("./useTheme.svelte");
      const theme = freshUseTheme();

      // Should not throw when setting theme in SSR
      expect(() => theme.set("light")).not.toThrow();
      expect(theme.current).toBe("light");

      // Reset mock
      vi.doUnmock("$app/environment");
    });
  });
});
