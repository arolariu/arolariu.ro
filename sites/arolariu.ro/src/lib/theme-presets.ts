/**
 * @fileoverview Theme preset definitions for end-user customization.
 *
 * Each preset defines a complete set of CSS custom properties that
 * override the defaults from globals.css. Presets affect:
 * - Semantic colors (primary, primary-foreground)
 * - Gradient colors (from, via, to)
 * - Accent and footer colors
 *
 * ARCHITECTURE:
 * - Presets are applied by setting CSS variables on :root at runtime
 * - The useThemePreset hook reads the active preset from preferencesStore
 * - Light mode values are defined directly, dark mode in the .dark override
 * - User custom colors are stored separately in preferencesStore
 *
 * @see {@link GradientThemeContext} for gradient-specific application
 * @see {@link useThemePreset} for runtime CSS variable application
 */

export interface ThemePreset {
  /** Display name for the UI */
  readonly name: string;
  /** Short description */
  readonly description: string;
  /** Preview colors for the settings UI (3 gradient stops) */
  readonly preview: readonly [string, string, string];
  /** CSS variable overrides for :root (light mode) */
  readonly light: Readonly<Record<string, string>>;
  /** CSS variable overrides for .dark (dark mode) */
  readonly dark: Readonly<Record<string, string>>;
}

export const THEME_PRESETS = {
  default: {
    name: "Default",
    description: "Cyan, purple, and pink — the signature look",
    preview: ["#06b6d4", "#8b5cf6", "#ec4899"],
    light: {
      "--primary": "221.2 83.2% 53.3%",
      "--primary-foreground": "210 40% 98%",
      "--gradient-from": "187 94% 43%",
      "--gradient-via": "262 83% 58%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "187 94% 43%",
      "--footer-bg": "262 83% 35%",
    },
    dark: {
      "--primary": "214 100% 50%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "187 94% 43%",
      "--gradient-via": "262 83% 58%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "187 94% 43%",
      "--footer-bg": "262 83% 35%",
    },
  },
  midnight: {
    name: "Midnight",
    description: "Deep indigo and blue — elegant and dark",
    preview: ["#3730a3", "#6366f1", "#818cf8"],
    light: {
      "--primary": "243 75% 59%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "245 58% 51%",
      "--gradient-via": "243 75% 59%",
      "--gradient-to": "241 77% 74%",
      "--accent-primary": "243 75% 59%",
      "--footer-bg": "245 58% 30%",
    },
    dark: {
      "--primary": "241 77% 74%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "245 58% 51%",
      "--gradient-via": "243 75% 59%",
      "--gradient-to": "241 77% 74%",
      "--accent-primary": "241 77% 74%",
      "--footer-bg": "245 58% 25%",
    },
  },
  ocean: {
    name: "Ocean",
    description: "Sky, cyan, and teal — cool and refreshing",
    preview: ["#0ea5e9", "#06b6d4", "#14b8a6"],
    light: {
      "--primary": "199 89% 48%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "199 89% 48%",
      "--gradient-via": "187 94% 43%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "199 89% 48%",
      "--footer-bg": "187 94% 28%",
    },
    dark: {
      "--primary": "187 94% 43%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "199 89% 48%",
      "--gradient-via": "187 94% 43%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "187 94% 43%",
      "--footer-bg": "187 94% 25%",
    },
  },
  sunset: {
    name: "Sunset",
    description: "Orange, red, and pink — warm and vibrant",
    preview: ["#f97316", "#ef4444", "#ec4899"],
    light: {
      "--primary": "24 95% 53%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "24 95% 53%",
      "--gradient-via": "0 84% 60%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "24 95% 53%",
      "--footer-bg": "0 84% 35%",
    },
    dark: {
      "--primary": "0 84% 60%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "24 95% 53%",
      "--gradient-via": "0 84% 60%",
      "--gradient-to": "330 81% 60%",
      "--accent-primary": "24 95% 53%",
      "--footer-bg": "0 84% 30%",
    },
  },
  forest: {
    name: "Forest",
    description: "Green, emerald, and teal — natural and calm",
    preview: ["#22c55e", "#10b981", "#14b8a6"],
    light: {
      "--primary": "142 71% 45%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "142 71% 45%",
      "--gradient-via": "160 84% 39%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "142 71% 45%",
      "--footer-bg": "160 84% 25%",
    },
    dark: {
      "--primary": "160 84% 39%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "142 71% 45%",
      "--gradient-via": "160 84% 39%",
      "--gradient-to": "173 80% 40%",
      "--accent-primary": "160 84% 39%",
      "--footer-bg": "160 84% 22%",
    },
  },
  rose: {
    name: "Rose",
    description: "Rose, pink, and fuchsia — soft and romantic",
    preview: ["#f43f5e", "#ec4899", "#d946ef"],
    light: {
      "--primary": "350 89% 60%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "350 89% 60%",
      "--gradient-via": "330 81% 60%",
      "--gradient-to": "292 91% 73%",
      "--accent-primary": "350 89% 60%",
      "--footer-bg": "330 81% 35%",
    },
    dark: {
      "--primary": "330 81% 60%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "350 89% 60%",
      "--gradient-via": "330 81% 60%",
      "--gradient-to": "292 91% 73%",
      "--accent-primary": "330 81% 60%",
      "--footer-bg": "330 81% 30%",
    },
  },
  monochrome: {
    name: "Monochrome",
    description: "Grayscale — clean and minimal",
    preview: ["#525252", "#737373", "#a3a3a3"],
    light: {
      "--primary": "0 0% 32%",
      "--primary-foreground": "0 0% 100%",
      "--gradient-from": "0 0% 32%",
      "--gradient-via": "0 0% 45%",
      "--gradient-to": "0 0% 64%",
      "--accent-primary": "0 0% 32%",
      "--footer-bg": "0 0% 20%",
    },
    dark: {
      "--primary": "0 0% 64%",
      "--primary-foreground": "0 0% 0%",
      "--gradient-from": "0 0% 32%",
      "--gradient-via": "0 0% 45%",
      "--gradient-to": "0 0% 64%",
      "--accent-primary": "0 0% 64%",
      "--footer-bg": "0 0% 15%",
    },
  },
} as const satisfies Record<string, ThemePreset>;

export type ThemePresetName = keyof typeof THEME_PRESETS;

/**
 * Custom user theme colors.
 * Users can define their own gradient colors and primary color.
 */
export interface CustomThemeColors {
  readonly gradientFrom: string; // HSL values e.g. "187 94% 43%"
  readonly gradientVia: string;
  readonly gradientTo: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly footerBg: string;
}
