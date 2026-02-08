/**
 * @fileoverview Theme preset metadata for end-user customization.
 *
 * CSS variable values for each preset are defined in SCSS:
 * src/styles/themes/_presets.scss (single source of truth).
 *
 * This file provides TypeScript metadata only:
 * - Display name and description for the settings UI
 * - Preview colors for visual preset selectors
 * - Type definitions for preset names and custom colors
 *
 * ARCHITECTURE:
 * - SCSS generates [data-theme-preset="name"] CSS selectors
 * - useThemePreset hook sets the data-theme-preset attribute on <html>
 * - next-themes toggles .dark class — SCSS handles light/dark variants
 * - No runtime JavaScript CSS variable application for named presets
 * - Only "custom" preset applies CSS variables via JS
 *
 * @see src/styles/themes/_presets.scss for CSS variable definitions
 * @see {@link useThemePreset} for runtime attribute application
 */

export interface ThemePresetMeta {
  /** Display name for the UI */
  readonly name: string;
  /** Short description */
  readonly description: string;
  /** Preview colors for the settings UI (3 gradient stops) */
  readonly preview: readonly [string, string, string];
}

export const THEME_PRESETS = {
  default: {
    name: "Default",
    description: "Cyan, purple, and pink — the signature look",
    preview: ["#06b6d4", "#8b5cf6", "#ec4899"],
  },
  midnight: {
    name: "Midnight",
    description: "Deep indigo and blue — elegant and dark",
    preview: ["#3730a3", "#6366f1", "#818cf8"],
  },
  ocean: {
    name: "Ocean",
    description: "Sky, cyan, and teal — cool and refreshing",
    preview: ["#0ea5e9", "#06b6d4", "#14b8a6"],
  },
  sunset: {
    name: "Sunset",
    description: "Orange, red, and pink — warm and vibrant",
    preview: ["#f97316", "#ef4444", "#ec4899"],
  },
  forest: {
    name: "Forest",
    description: "Green, emerald, and teal — natural and calm",
    preview: ["#22c55e", "#10b981", "#14b8a6"],
  },
  rose: {
    name: "Rose",
    description: "Rose, pink, and fuchsia — soft and romantic",
    preview: ["#f43f5e", "#ec4899", "#d946ef"],
  },
  monochrome: {
    name: "Monochrome",
    description: "Grayscale — clean and minimal",
    preview: ["#525252", "#737373", "#a3a3a3"],
  },
} as const satisfies Record<string, ThemePresetMeta>;

export type ThemePresetName = keyof typeof THEME_PRESETS;

/**
 * Custom user theme colors.
 * Users can define their own gradient colors and primary color.
 * Applied via runtime JavaScript when themePreset is "custom".
 */
export interface CustomThemeColors {
  readonly gradientFrom: string; // HSL values e.g. "187 94% 43%"
  readonly gradientVia: string;
  readonly gradientTo: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly footerBg: string;
}
