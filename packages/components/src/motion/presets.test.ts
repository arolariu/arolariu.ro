import {describe, expect, it} from "vitest";

import {fadeIn, fadeInUp, reducedMotion, scaleIn} from "./presets";

describe("motion presets", () => {
  it("fadeIn has initial, animate, and exit states", () => {
    expect(fadeIn.initial).toHaveProperty("opacity", 0);
    expect(fadeIn.animate).toHaveProperty("opacity", 1);
    expect(fadeIn.exit).toHaveProperty("opacity", 0);
  });

  it("fadeInUp includes y translation", () => {
    expect(fadeInUp.initial).toHaveProperty("y");
    expect(fadeInUp.animate).toHaveProperty("y", 0);
  });

  it("scaleIn includes scale", () => {
    expect(scaleIn.initial).toHaveProperty("scale");
    expect(scaleIn.animate).toHaveProperty("scale", 1);
  });

  it("reducedMotion has zero duration", () => {
    expect(reducedMotion.transition.duration).toBe(0);
  });
});
