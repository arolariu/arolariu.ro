import {beforeEach, describe, expect, it, vi} from "vitest";
import {applyTheme, getTheme, resolveTheme, setTheme} from "./themeStore.svelte";

describe("themeStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("defaults to 'auto'", () => {
    expect(getTheme()).toBe("auto");
  });

  it("setTheme persists to localStorage", () => {
    setTheme("light");
    expect(localStorage.getItem("status-theme")).toBe("light");
    expect(getTheme()).toBe("light");
  });

  it("resolveTheme with 'auto' follows prefers-color-scheme", () => {
    const mm = vi.fn().mockReturnValue({matches: true} as MediaQueryList);
    Object.defineProperty(window, "matchMedia", {value: mm, configurable: true, writable: true});
    expect(resolveTheme("auto")).toBe("dark");
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockReturnValue({matches: false} as MediaQueryList);
    expect(resolveTheme("auto")).toBe("light");
  });

  it("ignores corrupted localStorage", () => {
    localStorage.setItem("status-theme", "purple");
    expect(getTheme()).toBe("auto");
  });

  it("resolveTheme returns the theme directly for 'light' and 'dark'", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("applyTheme sets data-theme attribute on document root", () => {
    applyTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applyTheme with 'auto' resolves and sets data-theme", () => {
    const mm = vi.fn().mockReturnValue({matches: true} as MediaQueryList);
    Object.defineProperty(window, "matchMedia", {value: mm, configurable: true, writable: true});
    applyTheme("auto");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("setTheme calls applyTheme (data-theme is updated)", () => {
    setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  describe("SSR guards", () => {
    it("getTheme returns 'auto' when localStorage is undefined (SSR)", () => {
      vi.stubGlobal("localStorage", undefined);
      expect(getTheme()).toBe("auto");
      vi.unstubAllGlobals();
    });

    it("setTheme is a no-op when localStorage is undefined (SSR)", () => {
      vi.stubGlobal("localStorage", undefined);
      // Should not throw; localStorage.setItem is never called
      expect(() => setTheme("dark")).not.toThrow();
      vi.unstubAllGlobals();
    });

    it("resolveTheme returns 'dark' when window is undefined (SSR)", () => {
      vi.stubGlobal("window", undefined);
      expect(resolveTheme("auto")).toBe("dark");
      vi.unstubAllGlobals();
    });

    it("applyTheme is a no-op when document is undefined (SSR)", () => {
      vi.stubGlobal("document", undefined);
      expect(() => applyTheme("dark")).not.toThrow();
      vi.unstubAllGlobals();
    });
  });
});
