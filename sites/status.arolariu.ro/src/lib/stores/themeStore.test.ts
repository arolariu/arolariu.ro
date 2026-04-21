import {describe, it, expect, beforeEach, vi} from "vitest";
import {getTheme, setTheme, resolveTheme} from "./themeStore.svelte";

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
});
