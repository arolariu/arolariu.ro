"use client";

import type {CustomThemeColors} from "@/lib/theme-presets";
import {usePreferencesStore} from "@/stores/preferencesStore";
import {useEffect} from "react";

/**
 * CSS properties managed by the theme preset system.
 * Used to clean up inline styles when switching away from "custom" preset.
 */
const THEME_CSS_PROPS = [
  "--primary",
  "--primary-foreground",
  "--gradient-from",
  "--gradient-via",
  "--gradient-to",
  "--accent-primary",
  "--footer-bg",
] as const;

/**
 * Removes inline theme CSS properties from the root element.
 * Called when switching from "custom" to a named preset so that
 * SCSS-defined [data-theme-preset] selectors take precedence.
 */
function clearInlineThemeStyles(root: HTMLElement): void {
  for (const prop of THEME_CSS_PROPS) {
    root.style.removeProperty(prop);
  }
}

/**
 * Applies custom user-defined theme colors as inline CSS properties.
 * Only called when themePreset is "custom".
 */
function applyCustomThemeColors(root: HTMLElement, colors: CustomThemeColors): void {
  root.style.setProperty("--gradient-from", colors.gradientFrom);
  root.style.setProperty("--gradient-via", colors.gradientVia);
  root.style.setProperty("--gradient-to", colors.gradientTo);
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-foreground", colors.primaryForeground);
  root.style.setProperty("--accent-primary", colors.gradientFrom);
  root.style.setProperty("--footer-bg", colors.footerBg);
}

/**
 * Hook that applies theme preset via data attribute on the document root.
 *
 * For named presets (default, midnight, ocean, etc.):
 * - Sets `data-theme-preset` attribute on <html>
 * - SCSS selectors in themes/_presets.scss handle CSS variable overrides
 * - No runtime JavaScript CSS variable application needed
 * - No dependency on resolvedTheme — SCSS handles .dark variants
 *
 * For "custom" preset:
 * - Applies user-defined CSS variables via inline styles
 * - Clears inline styles are cleaned up when switching away
 *
 * Should be used once in a top-level client component (e.g., providers.tsx).
 *
 * @see src/styles/themes/_presets.scss for named preset CSS definitions
 */
export function useThemePreset(): void {
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const customThemeColors = usePreferencesStore((s) => s.customThemeColors);
  const hasHydrated = usePreferencesStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    const root = document.documentElement;

    // Set data attribute — SCSS handles named preset variables
    root.setAttribute("data-theme-preset", themePreset);

    if (themePreset === "custom" && customThemeColors) {
      // Only "custom" needs runtime JS variable application
      applyCustomThemeColors(root, customThemeColors);
    } else {
      // Named presets: clear any previously applied inline styles
      // so SCSS-defined variables take precedence
      clearInlineThemeStyles(root);
    }
  }, [themePreset, customThemeColors, hasHydrated]);
}
