/**
 * @fileoverview Font management context for accessibility and user preferences.
 * @module contexts/FontContext
 *
 * @remarks
 * Provides application-wide font selection with:
 * - Normal font (Caudex) and dyslexic-friendly font (Atkinson Hyperlegible)
 * - localStorage persistence for user preferences
 * - Multi-tab synchronization via storage events
 * - Safe font class application with conflict prevention
 * - React Context API for global font state
 *
 * **Rendering Context**: Client Component (requires browser APIs).
 *
 * **Accessibility**: Supports users with dyslexia through specialized typography.
 *
 * @see {@link https://brailleinstitute.org/freefont|Atkinson Hyperlegible Font}
 */

"use client";

import {isBrowserStorageAvailable} from "@/lib/utils.client";
import type {NextFontWithVariable} from "next/dist/compiled/@next/font";
import {Atkinson_Hyperlegible, Caudex} from "next/font/google";
import React, {createContext, use, useCallback, useEffect, useMemo, useState} from "react";

const STORAGE_KEY = "selectedFont";

/**
 * Default application font optimized for readability.
 *
 * @remarks
 * **Font:** Caudex (serif typeface) with 700 weight for headers/emphasis.
 *
 * **Characteristics:**
 * - Preloaded for optimal performance (critical rendering path)
 * - Latin subset only
 * - CSS variable: `--font-default`
 * - Used when fontType is "normal" or as fallback
 *
 * **Performance:** Preloaded to avoid FOUT (Flash of Unstyled Text).
 */
const defaultFont: NextFontWithVariable = Caudex({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-default",
  preload: true,
});

/**
 * Accessibility-focused font designed for dyslexic readers.
 *
 * @remarks
 * **Font:** Atkinson Hyperlegible by Braille Institute.
 *
 * **Design Features:**
 * - Greater distinction between similar characters (b/d, p/q)
 * - Increased character spacing for clarity
 * - Improved letter differentiation (I/l/1)
 *
 * **Performance:**
 * - Not preloaded (lazy-loaded when selected by user)
 * - CSS variable: `--font-dyslexic`
 *
 * **Accessibility:** Specifically designed for low-vision and dyslexic users.
 *
 * @see {@link https://brailleinstitute.org/freefont|Atkinson Hyperlegible}
 */
const dyslexicFont: NextFontWithVariable = Atkinson_Hyperlegible({
  weight: "400",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-dyslexic",
  preload: false,
});

type FontType = "normal" | "dyslexic";

/**
 * Context value shape for font management state and actions.
 *
 * @remarks
 * **Properties:**
 * - `font`: Next.js font object with className and CSS variables
 * - `fontType`: Current selected font type ("normal" or "dyslexic")
 * - `fontClassName`: Ready-to-use className string for components
 * - `setFont`: Function to change font preference (persists to localStorage)
 *
 * **Type Safety:** Ensures consistent font API across all consuming components.
 *
 * @example
 * ```typescript
 * const { font, fontType, fontClassName, setFont } = useFontContext();
 * ```
 */
interface FontContextValueType {
  font: NextFontWithVariable;
  fontType: FontType;
  fontClassName: string;
  setFont: (fontType: FontType) => void;
}

const FontContext = createContext<FontContextValueType | undefined>(undefined);

/**
 * Client Component providing application-wide font management with persistence.
 *
 * @remarks
 * **Rendering Context**: Client Component ("use client" directive required).
 *
 * **Why Client Component?**
 * - Uses localStorage for preference persistence
 * - Listens to storage events for multi-tab synchronization
 * - Manipulates document.documentElement className
 * - Uses React hooks (useState, useEffect, useMemo)
 *
 * **State Management:**
 * - Initializes from localStorage on mount
 * - Persists changes to localStorage on font switch
 * - Syncs across tabs via storage events
 *
 * **Performance:**
 * - Memoized context value prevents unnecessary re-renders
 * - Safe font class application with deduplication
 * - Cleanup handlers prevent memory leaks
 *
 * **Font Application Safety:**
 * 1. Checks if font class already applied (no-op)
 * 2. Removes only conflicting font classes
 * 3. Applies new font class only if different
 *
 * @param props - Component props
 * @param props.children - Child components to receive font context
 * @returns Provider component wrapping children with font context
 *
 * @example
 * ```tsx
 * // In root layout.tsx
 * <FontContextProvider>
 *   <Header />
 *   <main>{children}</main>
 *   <Footer />
 * </FontContextProvider>
 * ```
 *
 * @see {@link useFontContext} for consuming the context
 */
export function FontContextProvider({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  const [fontType, setFontType] = useState<FontType>((): FontType => {
    if (isBrowserStorageAvailable("localStorage")) {
      const storedPreference = localStorage.getItem(STORAGE_KEY);
      if (storedPreference === "normal" || storedPreference === "dyslexic") {
        return storedPreference;
      }
    }
    return "normal"; // Default fallback
  });

  /**
   * Memoized callback to change font preference with persistence.
   *
   * @param fontType - Font type to activate ("normal" or "dyslexic")
   *
   * @remarks
   * **Side Effects:**
   * - Persists preference to localStorage (if available)
   * - Triggers state update (fontType setState)
   * - Causes useEffect to re-run and apply font class to document
   *
   * **Stability:** useCallback ensures function identity remains stable.
   *
   * @example
   * ```typescript
   * <Button onClick={() => handleFontChange("dyslexic")}>Dyslexic Font</Button>
   * ```
   */
  const handleFontChange = useCallback((fontType: "normal" | "dyslexic") => {
    if (isBrowserStorageAvailable("localStorage")) {
      localStorage.setItem(STORAGE_KEY, fontType);
    }
    setFontType(fontType);
  }, []);

  /**
   * Effect: Synchronizes font preference across browser tabs.
   *
   * @remarks
   * **Multi-Tab Sync:** Listens to storage events fired when localStorage changes in other tabs.
   *
   * **Event Handling:**
   * - Filters for STORAGE_KEY ("selectedFont") changes only
   * - Validates new value is valid FontType
   * - Updates local state to match other tab
   *
   * **Cleanup:** Removes event listener on unmount to prevent memory leaks.
   *
   * **Browser Behavior:** Storage events only fire in OTHER tabs, not the one making the change.
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        // Update the font type based on the new value from localStorage
        const newFontType = event.newValue as FontType;
        if (newFontType === "normal" || newFontType === "dyslexic") {
          setFontType(newFontType);
        }
      }
    };

    globalThis.addEventListener("storage", handleStorageChange);
    return () => globalThis.removeEventListener("storage", handleStorageChange);
  }, []);

  /**
   * Effect: Applies selected font to document root with safety checks.
   *
   * @remarks
   * **Font Application Strategy:**
   * 1. Safety Check 1: Skip if font class already applied (idempotent)
   * 2. Safety Check 2: Remove only conflicting font classes (preserve other classes)
   * 3. Safety Check 3: Apply new font class only if className actually differs
   *
   * **Class Filtering:**
   * - Removes classes matching `font-*` pattern (except font-sans/serif/mono)
   * - Preserves all non-font classes (layout, theme, etc.)
   *
   * **SSR Safety:** Checks for `document` availability before DOM manipulation.
   *
   * **Cleanup:** Removes specific font class on unmount or font change.
   *
   * **Dependencies:** Re-runs when fontType changes.
   */
  useEffect(() => {
    /* v8 ignore next 3 - SSR guard that cannot be tested in jsdom */
    if (typeof globalThis.document === "undefined") {
      return;
    }

    const currentFont = fontType === "dyslexic" ? dyslexicFont : defaultFont;
    const fontClassName = currentFont.className;

    // 🛡️ Safety Check 1: Skip if font class is already applied
    if (globalThis.document.documentElement.classList.contains(fontClassName)) {
      return;
    }

    // 🛡️ Safety Check 2: Remove only conflicting font classes safely
    const existingClasses = globalThis.document.documentElement.className
      .split(" ")
      .filter(
        (className) =>
          !className.includes("font-")
          || className.includes("font-sans")
          || className.includes("font-serif")
          || className.includes("font-mono"),
      );

    // 🛡️ Safety Check 3: Apply new font class only if it's different
    const newClassName = [...existingClasses, fontClassName].join(" ").trim();

    if (globalThis.document.documentElement.className !== newClassName) {
      globalThis.document.documentElement.className = newClassName;
    }

    // Cleanup function to remove the specific font class
    return () => {
      if (typeof globalThis.document !== "undefined") {
        globalThis.document.documentElement.classList.remove(fontClassName);
      }
    };
  }, [fontType]);

  /**
   * Memoized context value to prevent unnecessary consumer re-renders.
   *
   * @remarks
   * **Performance:** Only recomputes when fontType changes, not on every render.
   *
   * **Contents:**
   * - `font`: Current NextFontWithVariable object (defaultFont or dyslexicFont)
   * - `fontType`: Current font type string ("normal" or "dyslexic")
   * - `fontClassName`: Pre-computed className for direct use in components
   * - `setFont`: Stable reference to handleFontChange callback
   *
   * **Dependencies:** Only fontType (handleFontChange is stable via useCallback).
   *
   * **ESLint Disable:** handleFontChange is intentionally excluded from deps array
   * because it's stable and doesn't change between renders.
   */
  const value = useMemo(
    () => {
      const currentFont = fontType === "dyslexic" ? dyslexicFont : defaultFont;
      return {
        font: currentFont,
        fontType,
        fontClassName: currentFont.className,
        setFont: handleFontChange,
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleFontChange is stable and does not change.
    [fontType],
  );

  return <FontContext value={value}>{children}</FontContext>;
}

/**
 * Custom hook to consume font context with type-safe access.
 *
 * @remarks
 * **Usage Requirements:** Must be called within a FontContextProvider tree.
 *
 * **Why Client Component?** This hook uses React 19's `use()` API which requires
 * client-side execution.
 *
 * **Error Handling:** Throws descriptive error if provider is missing, aiding debugging.
 *
 * **Return Value:**
 * - `font`: Next.js font object with className and CSS variables
 * - `fontType`: Current selected font ("normal" or "dyslexic")
 * - `fontClassName`: Pre-computed className string
 * - `setFont`: Function to change font preference
 *
 * @returns Current font context value with font object and setter function
 *
 * @throws {Error} When used outside FontContextProvider (context is undefined)
 *
 * @example
 * ```tsx
 * "use client";
 *
 * function FontSwitcher() {
 *   const { fontType, setFont } = useFontContext();
 *
 *   return (
 *     <button onClick={() => setFont(fontType === "normal" ? "dyslexic" : "normal")}>
 *       Switch to {fontType === "normal" ? "Dyslexic" : "Normal"} Font
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Apply font class to component
 * function StyledText() {
 *   const { fontClassName } = useFontContext();
 *   return <p className={fontClassName}>Styled with current font</p>;
 * }
 * ```
 */
export const useFontContext = (): FontContextValueType => {
  const context = use(FontContext);
  if (context === undefined) {
    throw new Error("useFontContext must be used within a FontContextProvider");
  }

  return context;
};
