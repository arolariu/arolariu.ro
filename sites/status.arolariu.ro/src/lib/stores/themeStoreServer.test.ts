import {describe, expect, it, vi} from "vitest";
import {applyTheme, getTheme, resolveTheme, setTheme} from "./themeStore.svelte";

describe("Status theme on the server", () => {
  it("uses the initial dark appearance for auto without a browser media query", () => {
    expect(globalThis.window).toBeUndefined();

    expect(resolveTheme("auto")).toBe("dark");
  });

  it("defaults to auto and can apply a theme without a browser document or storage", () => {
    vi.stubGlobal("localStorage", undefined);
    try {
      expect(getTheme()).toBe("auto");
      expect(() => setTheme("dark")).not.toThrow();
      expect(() => applyTheme("light")).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
