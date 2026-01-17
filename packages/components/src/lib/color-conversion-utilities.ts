/**
 * @fileoverview Utility functions for color conversion and manipulation.
 * Provides hex-to-HSL conversion and color validation for CSS custom properties.
 * @module lib/color-conversion-utilities
 */

/**
 * Converts a hexadecimal color code to an HSL string for CSS variables.
 * The output format matches Tailwind CSS HSL variable format: "h s% l%"
 *
 * @param hexColor - Hex color code (e.g., "#06b6d4" or "06b6d4")
 * @returns HSL values as "h s% l%" string suitable for CSS variables
 *
 * @example
 * ```typescript
 * convertHexToHslString("#06b6d4"); // "187 94% 43%"
 * convertHexToHslString("#ec4899"); // "330 81% 60%"
 * ```
 */
export function convertHexToHslString(hexColor: string): string {
  // Remove # if present
  const cleanHex = hexColor.replace("#", "");

  // Parse RGB values
  const r = Number.parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(cleanHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    // max is always r, g, or b - no default case needed
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Converts HSL color values to a hexadecimal color string.
 *
 * @param hue - Hue value (0-360)
 * @param saturation - Saturation percentage (0-100)
 * @param lightness - Lightness percentage (0-100)
 * @returns Hex color code (e.g., "#06b6d4")
 */
export function convertHslToHexString(hue: number, saturation: number, lightness: number): string {
  const sNorm = saturation / 100;
  const lNorm = lightness / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lNorm - c / 2;

  const getRgb = (): [number, number, number] => {
    if (hue >= 0 && hue < 60) return [c, x, 0];
    if (hue >= 60 && hue < 120) return [x, c, 0];
    if (hue >= 120 && hue < 180) return [0, c, x];
    if (hue >= 180 && hue < 240) return [0, x, c];
    if (hue >= 240 && hue < 300) return [x, 0, c];
    return [c, 0, x];
  };

  const rgb = getRgb();

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

/**
 * Validates whether a string is a valid 6-digit hexadecimal color code.
 *
 * @param hexColor - String to validate
 * @returns True if valid 6-digit hex color (with or without #)
 *
 * @example
 * ```typescript
 * validateHexColorFormat("#06b6d4"); // true
 * validateHexColorFormat("06b6d4");  // true
 * validateHexColorFormat("#FFF");    // false (3-digit not supported)
 * validateHexColorFormat("invalid"); // false
 * ```
 */
export function validateHexColorFormat(hexColor: string): boolean {
  return /^#?[\dA-Fa-f]{6}$/u.test(hexColor);
}

/**
 * Generates the complementary (inverse) color for a given hex color.
 *
 * @param hexColor - Hex color code
 * @returns Complementary hex color code
 */
export function calculateComplementaryHexColor(hexColor: string): string {
  const cleanHex = hexColor.replace("#", "");
  const r = 255 - Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = 255 - Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = 255 - Number.parseInt(cleanHex.slice(4, 6), 16);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Adjusts the lightness of a hexadecimal color by a specified amount.
 *
 * @param hexColor - Hex color code
 * @param lightnessAdjustment - Amount to adjust lightness (-100 to 100)
 * @returns Adjusted hex color code
 */
export function adjustHexColorLightness(hexColor: string, lightnessAdjustment: number): string {
  const hsl = convertHexToHslString(hexColor);
  const [h, s, l] = hsl.split(" ").map((v, i) => (i === 0 ? Number.parseInt(v, 10) : Number.parseInt(v.replace("%", ""), 10)));

  const newL = Math.max(0, Math.min(100, (l ?? 50) + lightnessAdjustment));
  return convertHslToHexString(h ?? 0, s ?? 50, newL);
}

/**
 * Parses an HSL CSS variable string into its numeric components.
 *
 * @param hslString - HSL string in format "h s% l%"
 * @returns Object with hue, saturation, lightness values or null if invalid
 */
export function parseHslStringToComponents(hslString: string): {hue: number; saturation: number; lightness: number} | null {
  const pattern = /^(?<hue>\d+)\s+(?<sat>\d+)%\s+(?<light>\d+)%$/u;
  const match = pattern.exec(hslString);
  if (!match?.groups) return null;

  return {
    hue: Number.parseInt(match.groups["hue"] ?? "0", 10),
    saturation: Number.parseInt(match.groups["sat"] ?? "0", 10),
    lightness: Number.parseInt(match.groups["light"] ?? "0", 10),
  };
}

// Legacy aliases for backwards compatibility (deprecated)
/** @deprecated Use convertHexToHslString instead */
export const hexToHsl = convertHexToHslString;
/** @deprecated Use convertHslToHexString instead */
export const hslToHex = convertHslToHexString;
/** @deprecated Use validateHexColorFormat instead */
export const isValidHexColor = validateHexColorFormat;
/** @deprecated Use calculateComplementaryHexColor instead */
export const getComplementaryColor = calculateComplementaryHexColor;
/** @deprecated Use adjustHexColorLightness instead */
export const adjustLightness = adjustHexColorLightness;
/** @deprecated Use parseHslStringToComponents instead */
export const parseHslString = parseHslStringToComponents;
