/**
 * @fileoverview Tests for shared container runtime types and CLI error handling.
 * @module scripts/container-runtime/types.test
 */

import {afterEach, describe, expect, it, vi} from "vitest";
import {exitWithError} from "./types.ts";

describe("exitWithError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("prints Error messages and sets exit code 1", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    exitWithError(new Error("bad runtime"));

    expect(error).toHaveBeenCalledWith("bad runtime");
    expect(process.exitCode).toBe(1);
  });

  it("prints non-Error values and sets exit code 1", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    exitWithError("bad runtime");

    expect(error).toHaveBeenCalledWith("bad runtime");
    expect(process.exitCode).toBe(1);
  });
});
