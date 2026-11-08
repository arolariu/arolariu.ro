/**
 * @fileoverview Utility functions for color conversion and manipulation.
 * Provides hex-to-HSL conversion and color validation for CSS custom properties.
 * @module lib/color-conversion-utilities
 */

/**
 * Converts a hexadecimal color code to an HSL string for CSS variables.
 * The output format is "h s% l%" for CSS custom property HSL components.
 *
 * @remarks
 * Expects a 6-digit hex color; check untrusted input with {@link validateHexColorFormat} first. Other input (for
 * example 3-digit shorthand) is not rejected and produces `NaN` components.
 *
 * @param hexColor - 6-digit hex color code, with or without a leading `#` (e.g., `"#06b6d4"` or `"06b6d4"`).
 * @returns HSL values as "h s% l%" string suitable for CSS variables
 *
 * @example
 * ```typescript
 * convertHexToHslString("#06b6d4"); // "189 94% 43%"
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
 * @remarks
 * Hue wraps around the color wheel (`360` is red, `480` equals `120`, `-120` equals `240`). Saturation and
 * lightness are clamped to `0`–`100`, so the result is always a valid 6-digit lowercase hex color.
 *
 * @param hue - Hue in degrees; any finite value, normalized into `[0, 360)`.
 * @param saturation - Saturation percentage; clamped to `0`–`100`.
 * @param lightness - Lightness percentage; clamped to `0`–`100`.
 * @returns Lowercase hex color code with a leading `#` (e.g., `"#06b6d4"`).
 * @throws {RangeError} If any component is not a finite number.
 *
 * @example
 * ```typescript
 * convertHslToHexString(0, 100, 50);   // "#ff0000"
 * convertHslToHexString(-120, 100, 50); // "#0000ff"
 * ```
 */
export function convertHslToHexString(hue: number, saturation: number, lightness: number): string {
  if (![hue, saturation, lightness].every((component) => Number.isFinite(component))) {
    throw new RangeError("convertHslToHexString components must be finite numbers.");
  }
  const h = ((hue % 360) + 360) % 360;
  const sNorm = Math.min(100, Math.max(0, saturation)) / 100;
  const lNorm = Math.min(100, Math.max(0, lightness)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  const getRgb = (): [number, number, number] => {
    if (h < 60) return [c, x, 0];
    if (h < 120) return [x, c, 0];
    if (h < 180) return [0, c, x];
    if (h < 240) return [0, x, c];
    if (h < 300) return [x, 0, c];
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
 * @remarks
 * Inverts each RGB channel (`255 - channel`). Expects a 6-digit hex color; check untrusted input with
 * {@link validateHexColorFormat} first, because other input produces an invalid `NaN` result.
 *
 * @param hexColor - 6-digit hex color code, with or without a leading `#`.
 * @returns Complementary lowercase hex color code with a leading `#`.
 *
 * @example
 * ```typescript
 * calculateComplementaryHexColor("#06b6d4"); // "#f9492b"
 * ```
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
 * @remarks
 * Round-trips through HSL with whole-number components, so channels can drift by a few steps from the input even for
 * an adjustment of `0` (for example `"#ec4899"` becomes `"#ec4699"`). Expects a 6-digit hex color; check untrusted
 * input with {@link validateHexColorFormat} first.
 *
 * @param hexColor - 6-digit hex color code, with or without a leading `#`.
 * @param lightnessAdjustment - Lightness percentage points to add (negative darkens); the result is clamped to `0`–`100`.
 * @returns Adjusted lowercase hex color code with a leading `#`.
 *
 * @example
 * ```typescript
 * adjustHexColorLightness("#ff0000", -50); // "#000000"
 * ```
 */
export function adjustHexColorLightness(hexColor: string, lightnessAdjustment: number): string {
  const hsl = convertHexToHslString(hexColor);
  const [h = 0, s = 50, l = 50] = hsl
    .split(" ")
    .map((v, i) => (i === 0 ? Number.parseInt(v, 10) : Number.parseInt(v.replace("%", ""), 10)));

  const newL = Math.max(0, Math.min(100, l + lightnessAdjustment));
  return convertHslToHexString(h, s, newL);
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
