"use client";

import {isBrowserStorageAvailable} from "@/lib/utils.client";
import type {NextFontWithVariable} from "next/dist/compiled/@next/font";
import {Atkinson_Hyperlegible, Caudex} from "next/font/google";
import React, {createContext, use, useCallback, useEffect, useMemo, useState} from "react";

const STORAGE_KEY = "selectedFont";

/**
 * Default font for the application.
 * This font is used when no other font is selected.
 */
const defaultFont: NextFontWithVariable = Caudex({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
  variable: "--font-default",
  preload: true,
});

/**
 * Dyslexic font for the application.
 * This font is used when the user selects the dyslexic font option.
 * It is designed to improve readability for individuals with dyslexia.
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
 * FontContextValueType is an interface that defines the shape of the context value
 * provided by the FontContext. It includes the current font and a function to set the font.
 * This interface is used to ensure type safety when consuming the context in components.
 */
interface FontContextValueType {
  font: NextFontWithVariable;
  fontType: FontType;
  fontClassName: string;
  setFont: (fontType: FontType) => void;
}

const FontContext = createContext<FontContextValueType | undefined>(undefined);

/**
 * FontContextProvider component provides a context for managing font selection.
 * @returns A provider component that supplies the font context to its children.
 * @example
 * ```tsx
 * <FontContextProvider currentFont={someFont}>
 *   <YourComponent />
 * </FontContextProvider>
 * ```
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
   * Function to handle font change.
   * This function takes a font type as an argument and updates the selectedFont state
   * accordingly. It will also trigger the useEffect call, since the selectedFont state is a dependency.
   * @param fontType The type of font to set (normal or dyslexic).
   */
  const handleFontChange = useCallback((fontType: "normal" | "dyslexic") => {
    if (isBrowserStorageAvailable("localStorage")) {
      localStorage.setItem(STORAGE_KEY, fontType);
    }
    setFontType(fontType);
  }, []);

  /**
   * Sync with localStorage changes (useful for multi-tab scenarios).
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

  // 🛡️ Enhanced font application with safety checks
  useEffect(() => {
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
   * Memoized value for the FontContext.
   * This value is created using useMemo to avoid unnecessary re-renders.
   * It includes the current font and a function to set the font.
   * The value is updated whenever the selectedFont state changes.
   * This ensures that the context consumers always receive the latest font value.
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
 * Custom hook to access the FontContext.
 * This hook provides the current value of the FontContext. It must be used
 * within a FontContextProvider; otherwise, it will throw an error.
 * @returns The current context value of FontContext.
 * @throws If the hook is used outside of a FontContextProvider.
 */
export const useFontContext = (): FontContextValueType => {
  const context = use(FontContext);
  if (context === undefined) {
    throw new Error("useFontContext must be used within a FontContextProvider");
  }

  return context;
};
