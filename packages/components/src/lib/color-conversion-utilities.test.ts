/**
 * @fileoverview Tests for color conversion utilities.
 * @module lib/color-conversion-utilities.test
 */

import {describe, expect, it} from "vitest";
import {
  adjustHexColorLightness,
  calculateComplementaryHexColor,
  convertHexToHslString,
  convertHslToHexString,
  parseHslStringToComponents,
  validateHexColorFormat,
} from "./color-conversion-utilities";

describe("color-conversion-utilities", () => {
  describe("convertHexToHslString", () => {
    it("should convert cyan-500 (#06b6d4) to HSL", () => {
      const result = convertHexToHslString("#06b6d4");
      // Note: Actual computed value due to floating point math
      expect(result).toBe("189 94% 43%");
    });

    it("should convert pink-500 (#ec4899) to HSL", () => {
      const result = convertHexToHslString("#ec4899");
      expect(result).toBe("330 81% 60%");
    });

    it("should handle hex without # prefix", () => {
      const result = convertHexToHslString("06b6d4");
      // Note: Same color as with # prefix, same computed HSL
      expect(result).toBe("189 94% 43%");
    });

    it("should convert black (#000000) to HSL", () => {
      const result = convertHexToHslString("#000000");
      expect(result).toBe("0 0% 0%");
    });

    it("should convert white (#ffffff) to HSL", () => {
      const result = convertHexToHslString("#ffffff");
      expect(result).toBe("0 0% 100%");
    });

    it("should convert pure red (#ff0000) to HSL", () => {
      const result = convertHexToHslString("#ff0000");
      expect(result).toBe("0 100% 50%");
    });

    it("should convert pure green (#00ff00) to HSL", () => {
      const result = convertHexToHslString("#00ff00");
      expect(result).toBe("120 100% 50%");
    });

    it("should convert pure blue (#0000ff) to HSL", () => {
      const result = convertHexToHslString("#0000ff");
      expect(result).toBe("240 100% 50%");
    });

    it("should handle high lightness colors (l > 0.5)", () => {
      // Light pink has l > 0.5, which triggers the other saturation calculation branch
      const result = convertHexToHslString("#ffb6c1");
      expect(result).toBe("351 100% 86%");
    });

    it("should handle colors where max is green", () => {
      // Green dominant color
      const result = convertHexToHslString("#90ee90");
      expect(result).toBe("120 73% 75%");
    });

    it("should handle colors where g < b in red-dominant colors", () => {
      // Red with more blue than green (magenta-ish)
      const result = convertHexToHslString("#ff00aa");
      expect(result).toBe("320 100% 50%");
    });
  });

  describe("convertHslToHexString", () => {
    it("should convert HSL to cyan-500", () => {
      // Note: HSL to hex conversion may not perfectly round-trip due to rounding
      const result = convertHslToHexString(189, 94, 43);
      expect(result.toLowerCase()).toBe("#07b6d5");
    });

    it("should convert black HSL to hex", () => {
      const result = convertHslToHexString(0, 0, 0);
      expect(result.toLowerCase()).toBe("#000000");
    });

    it("should convert white HSL to hex", () => {
      const result = convertHslToHexString(0, 0, 100);
      expect(result.toLowerCase()).toBe("#ffffff");
    });

    it("should convert pure red HSL to hex", () => {
      const result = convertHslToHexString(0, 100, 50);
      expect(result.toLowerCase()).toBe("#ff0000");
    });

    it("should handle all hue ranges", () => {
      // Yellow range (60)
      expect(convertHslToHexString(60, 100, 50).toLowerCase()).toBe("#ffff00");
      // Cyan range (180)
      expect(convertHslToHexString(180, 100, 50).toLowerCase()).toBe("#00ffff");
      // Magenta range (300)
      expect(convertHslToHexString(300, 100, 50).toLowerCase()).toBe("#ff00ff");
    });

    it("should handle all hue sectors correctly", () => {
      // Sector 0-60: red range
      expect(convertHslToHexString(30, 100, 50).toLowerCase()).toBe("#ff8000");
      // Sector 60-120: yellow-green range
      expect(convertHslToHexString(90, 100, 50).toLowerCase()).toBe("#80ff00");
      // Sector 120-180: green-cyan range
      expect(convertHslToHexString(150, 100, 50).toLowerCase()).toBe("#00ff80");
      // Sector 180-240: cyan-blue range
      expect(convertHslToHexString(210, 100, 50).toLowerCase()).toBe("#0080ff");
      // Sector 240-300: blue-magenta range
      expect(convertHslToHexString(270, 100, 50).toLowerCase()).toBe("#8000ff");
      // Sector 300-360: magenta-red range
      expect(convertHslToHexString(330, 100, 50).toLowerCase()).toBe("#ff0080");
    });
  });

  describe("validateHexColorFormat", () => {
    it("should return true for valid hex with #", () => {
      expect(validateHexColorFormat("#06b6d4")).toBe(true);
    });

    it("should return true for valid hex without #", () => {
      expect(validateHexColorFormat("06b6d4")).toBe(true);
    });

    it("should return true for uppercase hex", () => {
      expect(validateHexColorFormat("#FFFFFF")).toBe(true);
    });

    it("should return false for 3-digit hex", () => {
      expect(validateHexColorFormat("#FFF")).toBe(false);
    });

    it("should return false for invalid characters", () => {
      expect(validateHexColorFormat("#GGGGGG")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(validateHexColorFormat("")).toBe(false);
    });

    it("should return false for random string", () => {
      expect(validateHexColorFormat("invalid")).toBe(false);
    });
  });

  describe("calculateComplementaryHexColor", () => {
    it("should return inverse of black as white", () => {
      const result = calculateComplementaryHexColor("#000000");
      expect(result.toLowerCase()).toBe("#ffffff");
    });

    it("should return inverse of white as black", () => {
      const result = calculateComplementaryHexColor("#ffffff");
      expect(result.toLowerCase()).toBe("#000000");
    });

    it("should return cyan for red", () => {
      const result = calculateComplementaryHexColor("#ff0000");
      expect(result.toLowerCase()).toBe("#00ffff");
    });

    it("should handle hex without #", () => {
      const result = calculateComplementaryHexColor("ff0000");
      expect(result.toLowerCase()).toBe("#00ffff");
    });
  });

  describe("adjustHexColorLightness", () => {
    it("should lighten a color", () => {
      const result = adjustHexColorLightness("#000000", 50);
      expect(result).not.toBe("#000000");
    });

    it("should darken a color", () => {
      const result = adjustHexColorLightness("#ffffff", -50);
      expect(result).not.toBe("#ffffff");
    });

    it("should not exceed 100% lightness", () => {
      const result = adjustHexColorLightness("#ffffff", 100);
      // Should cap at white
      expect(result.toLowerCase()).toBe("#ffffff");
    });

    it("should not go below 0% lightness", () => {
      const result = adjustHexColorLightness("#000000", -100);
      // Should cap at black
      expect(result.toLowerCase()).toBe("#000000");
    });
  });

  describe("parseHslStringToComponents", () => {
    it("should parse valid HSL string", () => {
      const result = parseHslStringToComponents("187 94% 43%");
      expect(result).toEqual({hue: 187, saturation: 94, lightness: 43});
    });

    it("should parse HSL with zero values", () => {
      const result = parseHslStringToComponents("0 0% 0%");
      expect(result).toEqual({hue: 0, saturation: 0, lightness: 0});
    });

    it("should return null for invalid format", () => {
      expect(parseHslStringToComponents("invalid")).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(parseHslStringToComponents("")).toBeNull();
    });

    it("should return null for partial HSL", () => {
      expect(parseHslStringToComponents("187 94%")).toBeNull();
    });
  });
});
