import {describe, expect, it} from "vitest";

import {testimonials, testimonialsAsArray} from "./testimonials";

describe("testimonials data", () => {
  it("is frozen (both keyed map and flat array)", () => {
    expect(Object.isFrozen(testimonials)).toBe(true);
    expect(Object.isFrozen(testimonialsAsArray)).toBe(true);
  });

  it("has at least one testimonial", () => {
    expect(testimonialsAsArray.length).toBeGreaterThan(0);
  });

  it("every testimonial has author/quote/position/company", () => {
    for (const t of testimonialsAsArray) {
      expect(t.author).toBeTypeOf("string");
      expect(t.quote.length).toBeGreaterThan(0);
      expect(t.position).toBeTypeOf("string");
      expect(t.company).toBeTypeOf("string");
    }
  });
});
