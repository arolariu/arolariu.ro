import {describe, expect, it} from "vitest";

import {cn} from "./utilities";

describe("cn", () => {
  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });

  it("joins class names", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", true && "visible", false && "hidden")).toBe("base visible");
  });

  it("handles arrays", () => {
    expect(cn(["flex", ["items-center", ["justify-between"]]])).toBe("flex items-center justify-between");
  });

  it("handles objects", () => {
    expect(
      cn({
        active: true,
        disabled: false,
        visible: true,
      }),
    ).toBe("active visible");
  });

  it("handles undefined, null, and false values", () => {
    expect(cn("base", undefined, null, false, "final")).toBe("base final");
  });
});
