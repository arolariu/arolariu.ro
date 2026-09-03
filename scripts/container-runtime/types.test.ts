/**
 * @fileoverview Tests for shared container runtime types.
 * @module scripts/container-runtime/types.test
 */

import {describe, expect, it} from "vitest";
import {ContainerRuntimeError} from "./types.ts";

// `exitWithError` was the last ambient `process.exitCode` compatibility surface in this cohort;
// Task 21 removed it once Selfhost migrated. Every declarative container command now reports
// failures through its typed `CommandExecution` instead.
describe("ContainerRuntimeError", () => {
  it("is an Error carrying a stable name and the supplied message", () => {
    const error = new ContainerRuntimeError("bad runtime");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ContainerRuntimeError");
    expect(error.message).toBe("bad runtime");
  });

  it("stays distinguishable from a plain Error for programmatic classification", () => {
    expect(new Error("bad runtime")).not.toBeInstanceOf(ContainerRuntimeError);
  });
});
