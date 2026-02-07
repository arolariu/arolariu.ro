"use client";

import {THEME_PRESETS} from "@/lib/theme-presets";
import type {ThemePresetName} from "@/lib/theme-presets";
import {usePreferencesStore} from "@/stores/preferencesStore";
import {useEffect} from "react";
import {useTheme} from "next-themes";

/**
 * Hook that applies theme preset CSS variables to the document root.
 * Reads the active preset from preferencesStore and applies the
 * corresponding CSS variable overrides for semantic colors (primary,
 * primary-foreground, accent-primary, footer-bg).
 *
 * Should be used once in a top-level client component (e.g., providers.tsx).
 *
 * @remarks
 * This hook works alongside GradientThemeContext:
 * - GradientThemeContext handles --gradient-from/via/to from individual color picks
 * - This hook applies the full preset (including --primary, --primary-foreground)
 * - When themePreset is "custom", only custom colors are applied
 * - When themePreset is "default", the CSS defaults from globals.css are used
 */
export function useThemePreset(): void {
  const {resolvedTheme} = useTheme();
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const customThemeColors = usePreferencesStore((s) => s.customThemeColors);
  const hasHydrated = usePreferencesStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    const root = document.documentElement;

    // Set data attribute for SCSS selectors
    root.setAttribute("data-theme-preset", themePreset);

    if (themePreset === "custom" && customThemeColors) {
      // Apply custom user colors
      root.style.setProperty("--gradient-from", customThemeColors.gradientFrom);
      root.style.setProperty("--gradient-via", customThemeColors.gradientVia);
      root.style.setProperty("--gradient-to", customThemeColors.gradientTo);
      root.style.setProperty("--primary", customThemeColors.primary);
      root.style.setProperty("--primary-foreground", customThemeColors.primaryForeground);
      root.style.setProperty("--accent-primary", customThemeColors.gradientFrom);
      root.style.setProperty("--footer-bg", customThemeColors.footerBg);
    } else if (themePreset !== "default" && themePreset !== "custom") {
      // Apply preset colors based on current light/dark mode
      const preset = THEME_PRESETS[themePreset as ThemePresetName];
      const colors = resolvedTheme === "dark" ? preset.dark : preset.light;

      for (const [property, value] of Object.entries(colors)) {
        root.style.setProperty(property, value);
      }
    }
    // For "default" preset, don't override — let globals.css values apply naturally

    return () => {
      // Cleanup: remove data attribute on unmount
      root.removeAttribute("data-theme-preset");
    };
  }, [themePreset, customThemeColors, resolvedTheme, hasHydrated]);
}
