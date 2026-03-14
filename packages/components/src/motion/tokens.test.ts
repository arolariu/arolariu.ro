import {describe, expect, it} from "vitest";

import {durations, easings} from "./tokens";

describe("motion tokens", () => {
  it("exports duration values as numbers", () => {
    expect(typeof durations.fast).toBe("number");
    expect(typeof durations.normal).toBe("number");
    expect(typeof durations.slow).toBe("number");
  });

  it("exports easing arrays", () => {
    expect(Array.isArray(easings.ease)).toBe(true);
    expect(easings.ease).toHaveLength(4);
  });

  it("exports spring config", () => {
    expect(easings.spring.type).toBe("spring");
    expect(typeof easings.spring.stiffness).toBe("number");
  });
});
