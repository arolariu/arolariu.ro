import {describe, expect, it} from "vitest";

import {awards} from "./awards";

describe("awards (JSON Resume awards block)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(awards)).toBe(true);
  });

  it("has at least one award", () => {
    expect(awards.length).toBeGreaterThan(0);
  });

  it("every award has title/date/awarder/summary", () => {
    for (const a of awards) {
      expect(a.title).toBeTypeOf("string");
      expect(a.date).toBeTypeOf("string");
      expect(a.awarder).toBeTypeOf("string");
      expect(a.summary).toBeTypeOf("string");
    }
  });
});
