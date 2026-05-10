import {describe, expect, it} from "vitest";

import {volunteer} from "./volunteer";

describe("volunteer (JSON Resume volunteer block)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(volunteer)).toBe(true);
  });

  it("contains 3 community / ambassador roles", () => {
    expect(volunteer).toHaveLength(3);
  });

  it("every entry has organization + position", () => {
    for (const v of volunteer) {
      expect(v.organization).toBeTypeOf("string");
      expect(v.position).toBeTypeOf("string");
    }
  });
});
