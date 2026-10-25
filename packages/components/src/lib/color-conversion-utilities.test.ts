import {describe, expect, it} from "vitest";

import {
  adjustHexColorLightness,
  calculateComplementaryHexColor,
  convertHexToHslString,
  convertHslToHexString,
  parseHslStringToComponents,
  validateHexColorFormat,
} from "./color-conversion-utilities";
import * as colorUtilities from "./color-conversion-utilities";

describe("color-conversion-utilities", () => {
  it("convertHexToHslString handles known color conversions", () => {
    expect(convertHexToHslString("#06b6d4")).toBe("189 94% 43%");
    expect(convertHexToHslString("#ec4899")).toBe("330 81% 60%");
    expect(convertHexToHslString("ffffff")).toBe("0 0% 100%");
  });

  it("convertHslToHexString handles known conversions", () => {
    expect(convertHslToHexString(0, 100, 50)).toBe("#ff0000");
    expect(convertHslToHexString(120, 100, 50)).toBe("#00ff00");
    expect(convertHslToHexString(240, 100, 50)).toBe("#0000ff");
  });

  it("validateHexColorFormat handles valid and invalid inputs", () => {
    expect(validateHexColorFormat("#06b6d4")).toBe(true);
    expect(validateHexColorFormat("06b6d4")).toBe(true);
    expect(validateHexColorFormat("#FFF")).toBe(false);
    expect(validateHexColorFormat("invalid")).toBe(false);
  });

  it("calculateComplementaryHexColor returns known complements", () => {
    expect(calculateComplementaryHexColor("#000000")).toBe("#ffffff");
    expect(calculateComplementaryHexColor("#ffffff")).toBe("#000000");
    expect(calculateComplementaryHexColor("#123456")).toBe("#edcba9");
  });

  it("adjustHexColorLightness lightens and darkens colors", () => {
    expect(adjustHexColorLightness("#000000", 20)).toBe("#333333");
    expect(adjustHexColorLightness("#ffffff", -20)).toBe("#cccccc");
  });

  it("parseHslStringToComponents handles valid and invalid inputs", () => {
    expect(parseHslStringToComponents("187 94% 43%")).toStrictEqual({
      hue: 187,
      saturation: 94,
      lightness: 43,
    });
    expect(parseHslStringToComponents("invalid")).toBeNull();
    expect(parseHslStringToComponents("187 94 43")).toBeNull();
  });

  it("exports only the canonical color operations", () => {
    expect(Object.keys(colorUtilities).sort()).toEqual([
      "adjustHexColorLightness",
      "calculateComplementaryHexColor",
      "convertHexToHslString",
      "convertHslToHexString",
      "parseHslStringToComponents",
      "validateHexColorFormat",
    ]);
  });
});
