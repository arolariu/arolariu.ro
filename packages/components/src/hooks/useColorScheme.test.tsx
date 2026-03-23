import {renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

vi.mock("./useMediaQuery", () => ({
  useMediaQuery: vi.fn(),
}));

import {useColorScheme} from "./useColorScheme";
import {useMediaQuery} from "./useMediaQuery";

describe("useColorScheme", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'light' when prefers-color-scheme is not dark", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);

    const {result} = renderHook(() => useColorScheme());

    expect(result.current).toBe("light");
  });

  it("returns 'dark' when dark mode is preferred", () => {
    vi.mocked(useMediaQuery).mockReturnValue(true);

    const {result} = renderHook(() => useColorScheme());

    expect(result.current).toBe("dark");
  });

  it("passes the exact dark mode query to useMediaQuery", () => {
    vi.mocked(useMediaQuery).mockReturnValue(false);

    renderHook(() => useColorScheme());

    expect(useMediaQuery).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });
});
