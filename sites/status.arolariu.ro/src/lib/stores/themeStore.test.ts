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

  describe("unavailable storage", () => {
    it("getTheme returns 'auto' when localStorage access throws", () => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("Blocked", "SecurityError");
        },
      });

      expect(getTheme()).toBe("auto");

      if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    });

    it("setTheme still applies theme when localStorage persistence throws", () => {
      const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Blocked", "SecurityError");
      });

      setTheme("dark");

      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      setItem.mockRestore();
    });
  });
});
