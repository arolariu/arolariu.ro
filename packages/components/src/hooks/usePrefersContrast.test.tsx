import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {usePrefersContrast} from "./usePrefersContrast";

describe("usePrefersContrast", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis.window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("returns false when prefers-contrast is not 'more'", () => {
    const {result} = renderHook(() => usePrefersContrast());

    expect(result.current).toBe(false);
  });
});
