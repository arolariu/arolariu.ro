import {describe, expect, it} from "vitest";

import {skills} from "./skills";

describe("skills data (bento mosaic source)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(skills)).toBe(true);
  });

  it("contains exactly 12 tiles", () => {
    expect(skills).toHaveLength(12);
  });

  it("tile-size distribution is 1 hero + 2 lg + 3 md + 6 sm", () => {
    const sizes = skills.map((s) => s.size);
    expect(sizes.filter((s) => s === "hero")).toHaveLength(1);
    expect(sizes.filter((s) => s === "lg")).toHaveLength(2);
    expect(sizes.filter((s) => s === "md")).toHaveLength(3);
    expect(sizes.filter((s) => s === "sm")).toHaveLength(6);
  });

  it("the hero tile has a caption", () => {
    const hero = skills.find((s) => s.size === "hero");
    expect(hero?.caption).toBeTypeOf("string");
    expect(hero?.caption?.length ?? 0).toBeGreaterThan(0);
  });
});
