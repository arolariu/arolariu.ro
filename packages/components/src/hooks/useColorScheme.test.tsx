import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {useColorScheme} from "./useColorScheme";

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(globalThis.window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("useColorScheme", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("returns 'light' when prefers-color-scheme is not dark", () => {
    const {result} = renderHook(() => useColorScheme());

    expect(result.current).toBe("light");
  });

  it("returns 'dark' when prefers-color-scheme is dark", () => {
    mockMatchMedia(true);

    const {result} = renderHook(() => useColorScheme());

    expect(result.current).toBe("dark");
  });
});
