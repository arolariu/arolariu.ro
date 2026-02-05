/**
 * @fileoverview Gradient theme context for dynamic color customization.
 * @module contexts/GradientThemeContext
 *
 * @remarks
 * Manages application-wide gradient colors by:
 * - Reading preferences from Zustand store (IndexedDB backed)
 * - Applying CSS custom properties to document root
 * - Providing hooks for gradient theme access
 *
 * **Rendering Context**: Client Component (requires browser APIs).
 *
 * **CSS Variables Applied:**
 * - `--gradient-from`: Primary gradient start color (HSL format)
 * - `--gradient-via`: Optional middle gradient color (HSL format)
 * - `--gradient-to`: Primary gradient end color (HSL format)
 *
 * These variables are consumed by Tailwind classes:
 * - `from-gradient-from`, `via-gradient-via`, `to-gradient-to`
 */

"use client";

import {usePreferencesStore, type GradientTheme} from "@/stores";
import {convertHexToHslString} from "@arolariu/components";
import React, {createContext, use, useCallback, useEffect, useMemo} from "react";

/**
 * Predefined gradient color presets.
 * Each preset defines a harmonious color combination for the gradient theme.
 */
export const GRADIENT_PRESETS = {
  default: {
    from: "#06b6d4", // cyan-500
    via: "#8b5cf6", // purple-500
    to: "#ec4899", // pink-500
  },
  ocean: {
    from: "#0ea5e9", // sky-500
    via: "#06b6d4", // cyan-500
    to: "#14b8a6", // teal-500
  },
  sunset: {
    from: "#f97316", // orange-500
    via: "#ef4444", // red-500
    to: "#ec4899", // pink-500
  },
  forest: {
    from: "#22c55e", // green-500
    via: "#10b981", // emerald-500
    to: "#14b8a6", // teal-500
  },
  purple: {
    from: "#8b5cf6", // violet-500
    via: "#a855f7", // purple-500
    to: "#d946ef", // fuchsia-500
  },
} as const;

/** Available gradient preset names */
export type GradientPreset = keyof typeof GRADIENT_PRESETS;

/**
 * Context value shape for gradient theme state and actions.
 */
interface GradientThemeContextValue {
  /** Current gradient theme configuration */
  gradientTheme: GradientTheme;
  /** Whether preferences have been loaded from storage */
  isReady: boolean;
  /** Primary/start color (hex) */
  primaryColor: string;
  /** Secondary/end color (hex) */
  secondaryColor: string;
  /** Tertiary/via color (hex) */
  tertiaryColor: string | undefined;
  /** Set primary gradient color */
  setPrimaryColor: (color: string) => void;
  /** Set secondary gradient color */
  setSecondaryColor: (color: string) => void;
  /** Set tertiary (via) gradient color */
  setTertiaryColor: (color: string | undefined) => void;
  /** Current preset name or 'custom' if colors don't match any preset */
  preset: GradientPreset | "custom";
  /** Apply a preset by name */
  setPreset: (preset: GradientPreset) => void;
  /** Available presets */
  presets: typeof GRADIENT_PRESETS;
}

const GradientThemeContext = createContext<GradientThemeContextValue | undefined>(undefined);

/**
 * Derives a darker HSL color from an HSL string by reducing lightness.
 * @param hsl - HSL string in format "h s% l%"
 * @param amount - Amount to reduce lightness (default: 20)
 * @returns Darker HSL string
 */
function darkenHsl(hsl: string, amount = 20): string {
  const parts = hsl.split(" ");
  const h = parts[0];
  const s = parts[1];
  const l = Number.parseInt(parts[2]?.replace("%", "") ?? "50", 10);
  const newL = Math.max(0, l - amount);
  return `${h} ${s} ${newL}%`;
}

/**
 * Applies gradient CSS variables to document root.
 *
 * @param theme - Gradient theme configuration with hex colors
 *
 * @remarks
 * Converts hex colors to HSL format for Tailwind CSS compatibility.
 * The HSL format matches other CSS variables in globals.css (e.g., "187 94% 43%").
 *
 * Also sets derived variables:
 * - `--accent-primary`: Same as gradient-from, for text/icon accents
 * - `--footer-bg`: Darker version of gradient-via, for footer background
 */
function applyGradientVariables(theme: GradientTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Convert hex to HSL for Tailwind compatibility
  const fromHsl = convertHexToHslString(theme.from);
  const toHsl = convertHexToHslString(theme.to);

  root.style.setProperty("--gradient-from", fromHsl);
  root.style.setProperty("--gradient-to", toHsl);

  // Set accent-primary to match gradient-from (primary color)
  root.style.setProperty("--accent-primary", fromHsl);

  if (theme.via) {
    const viaHsl = convertHexToHslString(theme.via);
    root.style.setProperty("--gradient-via", viaHsl);
    // Footer background is a darker version of the via color
    root.style.setProperty("--footer-bg", darkenHsl(viaHsl, 25));
  } else {
    // If no via color, use a darker version of the from color for footer
    root.style.setProperty("--footer-bg", darkenHsl(fromHsl, 25));
  }
}

/**
 * Client Component providing application-wide gradient theme management.
 *
 * @remarks
 * **Rendering Context**: Client Component ("use client" directive required).
 *
 * **Why Client Component?**
 * - Uses Zustand store for state management
 * - Manipulates document.documentElement style properties
 * - Uses React hooks (useEffect, useMemo)
 *
 * **State Management:**
 * - Reads from usePreferencesStore (Zustand with IndexedDB)
 * - Applies CSS variables when preferences change
 * - Waits for store hydration before applying user preferences
 *
 * **SSR Safety:**
 * - Default CSS variables in globals.css ensure consistent server-render
 * - User preferences applied client-side after hydration
 * - Minimal visual flash acceptable for theming features
 *
 * @param props - Component props
 * @param props.children - Child components to receive gradient theme context
 * @returns Provider component wrapping children with gradient theme context
 *
 * @example
 * ```tsx
 * // In providers.tsx
 * <GradientThemeProvider>
 *   {children}
 * </GradientThemeProvider>
 * ```
 *
 * @see {@link useGradientTheme} for consuming the context
 */
export function GradientThemeProvider({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  const {primaryColor, secondaryColor, tertiaryColor, hasHydrated, setPrimaryColor, setSecondaryColor, setTertiaryColor, getGradientTheme} =
    usePreferencesStore();

  /**
   * Detects if current colors match any preset.
   * @returns The matching preset name or 'custom' if no match
   */
  const detectPreset = useCallback((): GradientPreset | "custom" => {
    for (const [name, preset] of Object.entries(GRADIENT_PRESETS)) {
      if (
        primaryColor.toLowerCase() === preset.from.toLowerCase()
        && secondaryColor.toLowerCase() === preset.to.toLowerCase()
        && tertiaryColor?.toLowerCase() === preset.via.toLowerCase()
      ) {
        return name as GradientPreset;
      }
    }
    return "custom";
  }, [primaryColor, secondaryColor, tertiaryColor]);

  /**
   * Applies a preset by setting all three colors at once.
   */
  const setPreset = useCallback(
    (presetName: GradientPreset) => {
      const preset = GRADIENT_PRESETS[presetName];
      setPrimaryColor(preset.from);
      setSecondaryColor(preset.to);
      setTertiaryColor(preset.via);
    },
    [setPrimaryColor, setSecondaryColor, setTertiaryColor],
  );

  /**
   * Effect: Applies CSS variables when preferences change.
   *
   * @remarks
   * **Timing:** Only runs after store has hydrated from IndexedDB.
   * This prevents applying default values over user preferences.
   *
   * **Dependencies:** Re-runs when any color preference changes.
   */
  useEffect(() => {
    if (!hasHydrated) return;

    applyGradientVariables({
      from: primaryColor,
      via: tertiaryColor,
      to: secondaryColor,
    });
  }, [primaryColor, secondaryColor, tertiaryColor, hasHydrated]);

  /**
   * Memoized context value to prevent unnecessary consumer re-renders.
   */
  const value = useMemo(
    (): GradientThemeContextValue => ({
      gradientTheme: getGradientTheme(),
      isReady: hasHydrated,
      primaryColor,
      secondaryColor,
      tertiaryColor,
      setPrimaryColor,
      setSecondaryColor,
      setTertiaryColor,
      preset: detectPreset(),
      setPreset,
      presets: GRADIENT_PRESETS,
    }),
    [
      primaryColor,
      secondaryColor,
      tertiaryColor,
      hasHydrated,
      setPrimaryColor,
      setSecondaryColor,
      setTertiaryColor,
      getGradientTheme,
      detectPreset,
      setPreset,
    ],
  );

  return <GradientThemeContext value={value}>{children}</GradientThemeContext>;
}

/**
 * Custom hook to consume gradient theme context with type-safe access.
 *
 * @remarks
 * **Usage Requirements:** Must be called within a GradientThemeProvider tree.
 *
 * **Return Value:**
 * - `gradientTheme`: Current gradient configuration (from, via, to)
 * - `isReady`: Whether preferences have loaded from storage
 * - `primaryColor`: Current primary/start color (hex)
 * - `secondaryColor`: Current secondary/end color (hex)
 * - `tertiaryColor`: Current tertiary/via color (hex or undefined)
 * - `setPrimaryColor`: Function to change primary color
 * - `setSecondaryColor`: Function to change secondary color
 * - `setTertiaryColor`: Function to change tertiary color
 * - `preset`: Current preset name or 'custom' if colors don't match any preset
 * - `setPreset`: Function to apply a preset by name
 * - `presets`: Available preset definitions
 *
 * @returns Current gradient theme context value
 *
 * @throws {Error} When used outside GradientThemeProvider
 *
 * @example
 * ```tsx
 * "use client";
 *
 * function ColorPicker() {
 *   const { primaryColor, setPrimaryColor, isReady } = useGradientTheme();
 *
 *   if (!isReady) return <Skeleton />;
 *
 *   return (
 *     <input
 *       type="color"
 *       value={primaryColor}
 *       onChange={(e) => setPrimaryColor(e.target.value)}
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using presets
 * function PresetPicker() {
 *   const { preset, setPreset, presets } = useGradientTheme();
 *
 *   return (
 *     <select value={preset} onChange={(e) => setPreset(e.target.value as GradientPreset)}>
 *       {Object.keys(presets).map((name) => (
 *         <option key={name} value={name}>{name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useGradientTheme(): GradientThemeContextValue {
  const context = use(GradientThemeContext);
  if (context === undefined) {
    throw new Error("useGradientTheme must be used within a GradientThemeProvider");
  }

  return context;
}
