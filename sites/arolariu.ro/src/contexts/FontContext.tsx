"use client";

import {isBrowserStorageAvailable} from "@/lib/utils.client";
import React, {createContext, use, useCallback, useEffect, useMemo, useState} from "react";

const STORAGE_KEY = "selectedFont";

type FontType = "normal" | "dyslexic";

/**
 * FontContextValueType is an interface that defines the shape of the context value
 * provided by the FontContext. It includes the current font and a function to set the font.
 * This interface is used to ensure type safety when consuming the context in components.
 */
interface FontContextValueType {
  fontType: FontType;
  fontClassName: string;
  setFont: (fontType: FontType) => void;
}

const FontContext = createContext<FontContextValueType | undefined>(undefined);

/**
 * FontContextProvider component provides font selection context to its children.
 * It manages font state and persists the selection to localStorage.
 * 
 * NOTE: Google Fonts (Caudex, Atkinson Hyperlegible) are temporarily disabled
 * due to build environment network restrictions. Using CSS fallback fonts instead.
 * TODO: Re-enable when build environment has network access to fonts.googleapis.com
 *
 * @param children - React children nodes that will have access to font context
 * @returns The provider component that wraps children with font context
 */
export function FontContextProvider({children}: {children: React.ReactNode}): React.JSX.Element {
  const [fontType, setFontType] = useState<FontType>(() => {
    if (typeof window !== "undefined" && isBrowserStorageAvailable("localStorage")) {
      const storedValue = localStorage.getItem(STORAGE_KEY);
      return storedValue === "dyslexic" ? "dyslexic" : "normal";
    }
    return "normal";
  });

  const handleFontChange = useCallback((newFontType: FontType) => {
    if (isBrowserStorageAvailable("localStorage")) {
      localStorage.setItem(STORAGE_KEY, newFontType);
    }
    setFontType(newFontType);
  }, []);

  /**
   * Sync with localStorage changes (useful for multi-tab scenarios).
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        const newFontType = event.newValue as FontType;
        if (newFontType === "normal" || newFontType === "dyslexic") {
          setFontType(newFontType);
        }
      }
    };

    globalThis.addEventListener("storage", handleStorageChange);
    return () => globalThis.removeEventListener("storage", handleStorageChange);
  }, []);

  const fontClassName = useMemo(() => {
    // Use Tailwind CSS font-family classes instead of next/font
    // font-serif for normal, font-sans for dyslexic (better readability)
    return fontType === "dyslexic" ? "font-sans" : "font-serif";
  }, [fontType]);

  // Apply font class to document element
  useEffect(() => {
    if (typeof globalThis.document === "undefined") {
      return;
    }

    // Remove old font classes
    const html = globalThis.document.documentElement;
    html.classList.remove("font-serif", "font-sans");
    
    // Add new font class
    html.classList.add(fontClassName);

    return () => {
      if (typeof globalThis.document !== "undefined") {
        globalThis.document.documentElement.classList.remove(fontClassName);
      }
    };
  }, [fontClassName]);

  const value = useMemo(
    () => ({
      fontType,
      fontClassName,
      setFont: handleFontChange,
    }),
    [fontType, fontClassName, handleFontChange]
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

/**
 * Custom hook to access the font context.
 * @returns The font context value including current font and setter function.
 * @throws Will throw an error if used outside of FontContextProvider.
 */
export const useFontContext = () => {
  const context = use(FontContext);
  if (context === undefined) {
    throw new Error("useFontContext must be used within a FontContextProvider");
  }
  return context;
};
