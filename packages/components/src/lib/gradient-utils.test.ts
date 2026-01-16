import {describe, expect, it} from "vitest";
import {adjustLightness, getComplementaryColor, hexToHsl, hslToHex, isValidHexColor, parseHslString} from "./gradient-utils";

describe("hexToHsl", () => {
  it("should convert cyan (#06b6d4) to HSL", () => {
    const result = hexToHsl("#06b6d4");
    // Note: Minor rounding differences expected in HSL conversion
    expect(result).toBe("189 94% 43%");
  });

  it("should convert pink (#ec4899) to HSL", () => {
    const result = hexToHsl("#ec4899");
    expect(result).toBe("330 81% 60%");
  });

  it("should convert purple (#8b5cf6) to HSL", () => {
    const result = hexToHsl("#8b5cf6");
    // Note: Minor rounding differences expected in HSL conversion
    expect(result).toBe("258 90% 66%");
  });

  it("should handle hex without # prefix", () => {
    const result = hexToHsl("06b6d4");
    expect(result).toBe("189 94% 43%");
  });

  it("should convert pure red (#ff0000) to HSL", () => {
    const result = hexToHsl("#ff0000");
    expect(result).toBe("0 100% 50%");
  });

  it("should convert pure green (#00ff00) to HSL", () => {
    const result = hexToHsl("#00ff00");
    expect(result).toBe("120 100% 50%");
  });

  it("should convert pure blue (#0000ff) to HSL", () => {
    const result = hexToHsl("#0000ff");
    expect(result).toBe("240 100% 50%");
  });

  it("should convert white (#ffffff) to HSL", () => {
    const result = hexToHsl("#ffffff");
    expect(result).toBe("0 0% 100%");
  });

  it("should convert black (#000000) to HSL", () => {
    const result = hexToHsl("#000000");
    expect(result).toBe("0 0% 0%");
  });

  it("should convert gray (#808080) to HSL", () => {
    const result = hexToHsl("#808080");
    expect(result).toBe("0 0% 50%");
  });

  it("should handle uppercase hex", () => {
    const result = hexToHsl("#FF0000");
    expect(result).toBe("0 100% 50%");
  });

  it("should handle mixed case hex", () => {
    const result = hexToHsl("#Ff00fF");
    expect(result).toBe("300 100% 50%");
  });
});

describe("hslToHex", () => {
  it("should convert cyan HSL to hex", () => {
    // Using HSL values that match exact hex color
    const result = hslToHex(189, 94, 43);
    expect(result).toBe("#07b6d5");
  });

  it("should convert pure red HSL to hex", () => {
    const result = hslToHex(0, 100, 50);
    expect(result).toBe("#ff0000");
  });

  it("should convert pure green HSL to hex", () => {
    const result = hslToHex(120, 100, 50);
    expect(result).toBe("#00ff00");
  });

  it("should convert pure blue HSL to hex", () => {
    const result = hslToHex(240, 100, 50);
    expect(result).toBe("#0000ff");
  });

  it("should convert white HSL to hex", () => {
    const result = hslToHex(0, 0, 100);
    expect(result).toBe("#ffffff");
  });

  it("should convert black HSL to hex", () => {
    const result = hslToHex(0, 0, 0);
    expect(result).toBe("#000000");
  });

  it("should convert gray HSL to hex", () => {
    const result = hslToHex(0, 0, 50);
    expect(result).toBe("#808080");
  });

  it("should handle yellow hue range (60-120)", () => {
    const result = hslToHex(60, 100, 50);
    expect(result).toBe("#ffff00");
  });

  it("should handle cyan hue range (120-180)", () => {
    const result = hslToHex(180, 100, 50);
    expect(result).toBe("#00ffff");
  });

  it("should handle blue hue range (180-240)", () => {
    const result = hslToHex(210, 100, 50);
    expect(result).toBe("#0080ff");
  });

  it("should handle purple hue range (240-300)", () => {
    const result = hslToHex(270, 100, 50);
    expect(result).toBe("#8000ff");
  });

  it("should handle magenta hue range (300-360)", () => {
    const result = hslToHex(330, 100, 50);
    expect(result).toBe("#ff0080");
  });
});

describe("hexToHsl and hslToHex roundtrip", () => {
  it("should roundtrip pure colors correctly", () => {
    // Pure colors roundtrip exactly due to no rounding errors
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffffff", "#000000"];
    for (const hex of colors) {
      const hsl = hexToHsl(hex);
      const parsed = parseHslString(hsl);
      expect(parsed).not.toBeNull();
      const backToHex = hslToHex(parsed!.h, parsed!.s, parsed!.l);
      expect(backToHex).toBe(hex);
    }
  });

  it("should roundtrip complex colors with minimal loss", () => {
    // Complex colors may have minor rounding differences
    const hex = "#06b6d4";
    const hsl = hexToHsl(hex);
    const parsed = parseHslString(hsl);
    expect(parsed).not.toBeNull();
    const backToHex = hslToHex(parsed!.h, parsed!.s, parsed!.l);
    // Allow for minor rounding differences (within 2 values per channel)
    const originalR = Number.parseInt(hex.slice(1, 3), 16);
    const originalG = Number.parseInt(hex.slice(3, 5), 16);
    const originalB = Number.parseInt(hex.slice(5, 7), 16);
    const resultR = Number.parseInt(backToHex.slice(1, 3), 16);
    const resultG = Number.parseInt(backToHex.slice(3, 5), 16);
    const resultB = Number.parseInt(backToHex.slice(5, 7), 16);
    expect(Math.abs(originalR - resultR)).toBeLessThanOrEqual(2);
    expect(Math.abs(originalG - resultG)).toBeLessThanOrEqual(2);
    expect(Math.abs(originalB - resultB)).toBeLessThanOrEqual(2);
  });
});

describe("isValidHexColor", () => {
  it("should validate hex with # prefix", () => {
    expect(isValidHexColor("#06b6d4")).toBe(true);
  });

  it("should validate hex without # prefix", () => {
    expect(isValidHexColor("06b6d4")).toBe(true);
  });

  it("should validate uppercase hex", () => {
    expect(isValidHexColor("#FFFFFF")).toBe(true);
  });

  it("should validate mixed case hex", () => {
    expect(isValidHexColor("#AbCdEf")).toBe(true);
  });

  it("should reject 3-digit hex", () => {
    expect(isValidHexColor("#FFF")).toBe(false);
  });

  it("should reject invalid characters", () => {
    expect(isValidHexColor("#GGGGGG")).toBe(false);
  });

  it("should reject too short hex", () => {
    expect(isValidHexColor("#12345")).toBe(false);
  });

  it("should reject too long hex", () => {
    expect(isValidHexColor("#1234567")).toBe(false);
  });

  it("should reject empty string", () => {
    expect(isValidHexColor("")).toBe(false);
  });

  it("should reject non-hex string", () => {
    expect(isValidHexColor("invalid")).toBe(false);
  });

  it("should reject hex with spaces", () => {
    expect(isValidHexColor("# 06b6d4")).toBe(false);
  });
});

describe("getComplementaryColor", () => {
  it("should return complementary of black as white", () => {
    expect(getComplementaryColor("#000000")).toBe("#ffffff");
  });

  it("should return complementary of white as black", () => {
    expect(getComplementaryColor("#ffffff")).toBe("#000000");
  });

  it("should return complementary of red as cyan", () => {
    expect(getComplementaryColor("#ff0000")).toBe("#00ffff");
  });

  it("should return complementary of green as magenta", () => {
    expect(getComplementaryColor("#00ff00")).toBe("#ff00ff");
  });

  it("should return complementary of blue as yellow", () => {
    expect(getComplementaryColor("#0000ff")).toBe("#ffff00");
  });

  it("should handle hex without # prefix", () => {
    expect(getComplementaryColor("ff0000")).toBe("#00ffff");
  });

  it("should return complementary of cyan", () => {
    expect(getComplementaryColor("#06b6d4")).toBe("#f9492b");
  });
});

describe("adjustLightness", () => {
  it("should lighten a color", () => {
    const result = adjustLightness("#808080", 20);
    // Gray (50% lightness) + 20 = 70% lightness
    expect(result).toBe("#b3b3b3");
  });

  it("should darken a color", () => {
    const result = adjustLightness("#808080", -20);
    // Gray (50% lightness) - 20 = 30% lightness
    expect(result).toBe("#4d4d4d");
  });

  it("should clamp lightness at 100%", () => {
    const result = adjustLightness("#ffffff", 50);
    expect(result).toBe("#ffffff");
  });

  it("should clamp lightness at 0%", () => {
    const result = adjustLightness("#000000", -50);
    expect(result).toBe("#000000");
  });

  it("should handle hex without # prefix", () => {
    const result = adjustLightness("808080", 20);
    expect(result).toBe("#b3b3b3");
  });
});

describe("parseHslString", () => {
  it("should parse valid HSL string", () => {
    const result = parseHslString("187 94% 43%");
    expect(result).toEqual({h: 187, s: 94, l: 43});
  });

  it("should parse HSL string with 0 values", () => {
    const result = parseHslString("0 0% 0%");
    expect(result).toEqual({h: 0, s: 0, l: 0});
  });

  it("should parse HSL string with max values", () => {
    const result = parseHslString("360 100% 100%");
    expect(result).toEqual({h: 360, s: 100, l: 100});
  });

  it("should return null for invalid format", () => {
    expect(parseHslString("invalid")).toBeNull();
  });

  it("should return null for missing percentage signs", () => {
    expect(parseHslString("187 94 43")).toBeNull();
  });

  it("should return null for partial percentage", () => {
    expect(parseHslString("187 94% 43")).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseHslString("")).toBeNull();
  });

  it("should return null for CSS hsl() format", () => {
    expect(parseHslString("hsl(187, 94%, 43%)")).toBeNull();
  });
});
