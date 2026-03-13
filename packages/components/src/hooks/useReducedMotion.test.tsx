import {describe, expect, it} from "vitest";

import {useReducedMotion} from "./useReducedMotion";

describe("useReducedMotion", () => {
  it("is exported as a function", () => {
    expect(typeof useReducedMotion).toBe("function");
  });
});
