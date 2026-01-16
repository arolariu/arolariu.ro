/**
 * @fileoverview Utility functions for gradient theme management.
 * Provides hex-to-HSL conversion and color validation for CSS custom properties.
 * @module lib/gradient-utils
 */

/**
 * Converts a hex color to HSL string for CSS variables.
 * The output format matches Tailwind CSS HSL variable format: "h s% l%"
 *
 * @param hex - Hex color code (e.g., "#06b6d4" or "06b6d4")
 * @returns HSL values as "h s% l%" string suitable for CSS variables
 *
 * @example
 * ```typescript
 * hexToHsl("#06b6d4"); // "187 94% 43%"
 * hexToHsl("#ec4899"); // "330 81% 60%"
 * ```
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

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

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
      default:
        // This case is unreachable since max is always r, g, or b
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Converts HSL values to a hex color string.
 *
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 * @returns Hex color code (e.g., "#06b6d4")
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  const getRgb = (): [number, number, number] => {
    if (h >= 0 && h < 60) return [c, x, 0];
    if (h >= 60 && h < 120) return [x, c, 0];
    if (h >= 120 && h < 180) return [0, c, x];
    if (h >= 180 && h < 240) return [0, x, c];
    if (h >= 240 && h < 300) return [x, 0, c];
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
 * Validates a hex color string.
 *
 * @param hex - String to validate
 * @returns True if valid 6-digit hex color (with or without #)
 *
 * @example
 * ```typescript
 * isValidHexColor("#06b6d4"); // true
 * isValidHexColor("06b6d4");  // true
 * isValidHexColor("#FFF");    // false (3-digit not supported)
 * isValidHexColor("invalid"); // false
 * ```
 */
export function isValidHexColor(hex: string): boolean {
  return /^#?[\dA-Fa-f]{6}$/u.test(hex);
}

/**
 * Generates a complementary color for a given hex color.
 *
 * @param hex - Hex color code
 * @returns Complementary hex color code
 */
export function getComplementaryColor(hex: string): string {
  const cleanHex = hex.replace("#", "");
  const r = 255 - Number.parseInt(cleanHex.slice(0, 2), 16);
  const g = 255 - Number.parseInt(cleanHex.slice(2, 4), 16);
  const b = 255 - Number.parseInt(cleanHex.slice(4, 6), 16);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Adjusts the lightness of a hex color.
 *
 * @param hex - Hex color code
 * @param amount - Amount to adjust lightness (-100 to 100)
 * @returns Adjusted hex color code
 */
export function adjustLightness(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  const [h, s, l] = hsl.split(" ").map((v, i) => (i === 0 ? Number.parseInt(v, 10) : Number.parseInt(v.replace("%", ""), 10)));

  const newL = Math.max(0, Math.min(100, (l ?? 50) + amount));
  return hslToHex(h ?? 0, s ?? 50, newL);
}

/**
 * Parses an HSL CSS variable string back to numeric values.
 *
 * @param hslString - HSL string in format "h s% l%"
 * @returns Object with h, s, l values or null if invalid
 */
export function parseHslString(hslString: string): {h: number; s: number; l: number} | null {
  const pattern = /^(?<hue>\d+)\s+(?<sat>\d+)%\s+(?<light>\d+)%$/u;
  const match = pattern.exec(hslString);
  if (!match?.groups) return null;

  return {
    h: Number.parseInt(match.groups["hue"] ?? "0", 10),
    s: Number.parseInt(match.groups["sat"] ?? "0", 10),
    l: Number.parseInt(match.groups["light"] ?? "0", 10),
  };
}
