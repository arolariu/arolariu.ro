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

import {hexToHsl} from "@arolariu/components";
import {usePreferencesStore, type GradientTheme} from "@/stores";
import React, {createContext, use, useEffect, useMemo} from "react";

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
}

const GradientThemeContext = createContext<GradientThemeContextValue | undefined>(undefined);

/**
 * Applies gradient CSS variables to document root.
 *
 * @param theme - Gradient theme configuration with hex colors
 *
 * @remarks
 * Converts hex colors to HSL format for Tailwind CSS compatibility.
 * The HSL format matches other CSS variables in globals.css (e.g., "187 94% 43%").
 */
function applyGradientVariables(theme: GradientTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  // Convert hex to HSL for Tailwind compatibility
  const fromHsl = hexToHsl(theme.from);
  const toHsl = hexToHsl(theme.to);

  root.style.setProperty("--gradient-from", fromHsl);
  root.style.setProperty("--gradient-to", toHsl);

  if (theme.via) {
    const viaHsl = hexToHsl(theme.via);
    root.style.setProperty("--gradient-via", viaHsl);
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
    }),
    [primaryColor, secondaryColor, tertiaryColor, hasHydrated, setPrimaryColor, setSecondaryColor, setTertiaryColor, getGradientTheme],
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
 */
export function useGradientTheme(): GradientThemeContextValue {
  const context = use(GradientThemeContext);
  if (context === undefined) {
    throw new Error("useGradientTheme must be used within a GradientThemeProvider");
  }

  return context;
}
