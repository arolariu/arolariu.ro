import {renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {useBreakpoint} from "./useBreakpoint";

const DEFAULT_MATCHES = new Map<string, boolean>([
  ["(min-width: 1536px)", false],
  ["(min-width: 1280px)", false],
  ["(min-width: 1024px)", false],
  ["(min-width: 768px)", false],
]);

function mockMatchMedia(matches: ReadonlyMap<string, boolean> = DEFAULT_MATCHES): void {
  Object.defineProperty(globalThis.window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matches.get(query) ?? false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("useBreakpoint", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it("returns 'sm' when no breakpoints match", () => {
    const {result} = renderHook(() => useBreakpoint());

    expect(result.current).toBe("sm");
  });

  it("returns 'md' when the md breakpoint matches", () => {
    mockMatchMedia(new Map([["(min-width: 768px)", true]]));

    const {result} = renderHook(() => useBreakpoint());

    expect(result.current).toBe("md");
  });

  it("returns 'lg' when the lg breakpoint matches", () => {
    mockMatchMedia(
      new Map([
        ["(min-width: 1024px)", true],
        ["(min-width: 768px)", true],
      ]),
    );

    const {result} = renderHook(() => useBreakpoint());

    expect(result.current).toBe("lg");
  });

  it("returns 'xl' when the xl breakpoint matches", () => {
    mockMatchMedia(
      new Map([
        ["(min-width: 1280px)", true],
        ["(min-width: 1024px)", true],
        ["(min-width: 768px)", true],
      ]),
    );

    const {result} = renderHook(() => useBreakpoint());

    expect(result.current).toBe("xl");
  });

  it("returns '2xl' when the 2xl breakpoint matches", () => {
    mockMatchMedia(
      new Map([
        ["(min-width: 1536px)", true],
        ["(min-width: 1280px)", true],
        ["(min-width: 1024px)", true],
        ["(min-width: 768px)", true],
      ]),
    );

    const {result} = renderHook(() => useBreakpoint());

    expect(result.current).toBe("2xl");
  });
});
