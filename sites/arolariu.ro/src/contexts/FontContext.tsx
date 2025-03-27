/** @format */
"use client";

import {isBrowserStorageAvailable} from "@/lib/utils.client";
import type {NextFont} from "next/dist/compiled/@next/font";
import {Atkinson_Hyperlegible, Caudex} from "next/font/google";
import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from "react";

const STORAGE_KEY = "selectedFont";

/**
 * Default font for the application.
 * This font is used when no other font is selected.
 */
const defaultFont: NextFont = Caudex({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
  preload: true,
});

/**
 * Dyslexic font for the application.
 * This font is used when the user selects the dyslexic font option.
 * It is designed to improve readability for individuals with dyslexia.
 */
const dyslexicFont: NextFont = Atkinson_Hyperlegible({
  weight: "400",
  style: "normal",
  subsets: ["latin"],
  preload: false,
});

type FontType = "normal" | "dyslexic";

/**
 * FontContextValueType is an interface that defines the shape of the context value
 * provided by the FontContext. It includes the current font and a function to set the font.
 * This interface is used to ensure type safety when consuming the context in components.
 */
interface FontContextValueType {
  font: NextFont;
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

  /**
   * Memoized value for the FontContext.
   * This value is created using useMemo to avoid unnecessary re-renders.
   * It includes the current font and a function to set the font.
   * The value is updated whenever the selectedFont state changes.
   * This ensures that the context consumers always receive the latest font value.
   */
  const value = useMemo(
    () => ({
      font: fontType === "dyslexic" ? dyslexicFont : defaultFont,
      setFont: handleFontChange,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleFontChange is stable and does not change.
    [fontType],
  );
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

/**
 * Custom hook to access the FontContext.
 * This hook provides the current value of the FontContext. It must be used
 * within a FontContextProvider; otherwise, it will throw an error.
 * @returns The current context value of FontContext.
 * @throws If the hook is used outside of a FontContextProvider.
 */
export const useFontContext = (): FontContextValueType => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error("useFontContext must be used within a FontContextProvider");
  }

  return context;
};
