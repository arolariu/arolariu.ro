/** @format */
"use client";

import {isBrowserStorageAvailable} from "@/lib/utils.client";
import type {NextFont} from "next/dist/compiled/@next/font";
import {Caudex} from "next/font/google";
import React, {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const defaultFont: NextFont = Caudex({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
  preload: true,
});

interface FontContextType {
  font: NextFont;
  setFont: Dispatch<SetStateAction<NextFont>>;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

interface FontContextProviderProps {
  readonly children: React.ReactNode;
  //eslint-disable-next-line react/require-default-props
  readonly currentFont?: NextFont;
}

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
export function FontContextProvider({children, currentFont}: FontContextProviderProps): React.JSX.Element {
  const [selectedFont, setSelectedFont] = useState<NextFont>(() => {
    if (isBrowserStorageAvailable("localStorage")) {
      const storedFont = localStorage?.getItem("selectedFont") ?? null;
      return storedFont ? JSON.parse(storedFont) : (currentFont ?? defaultFont);
    }
    return currentFont ?? defaultFont;
  });

  useEffect(() => {
    if (currentFont && currentFont !== selectedFont) {
      setSelectedFont(currentFont); // set to the current font
    } else if (!currentFont && selectedFont !== defaultFont) {
      setSelectedFont(defaultFont); // set to the default font
    }
  }, [currentFont, selectedFont]);

  useEffect(() => {
    localStorage.setItem("selectedFont", JSON.stringify(selectedFont));
  }, [selectedFont]);

  const value = useMemo(() => ({font: selectedFont, setFont: setSelectedFont}), [selectedFont]);
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

/**
 * Custom hook to access the FontContext.
 * This hook provides the current value of the FontContext. It must be used
 * within a FontContextProvider; otherwise, it will throw an error.
 * @returns The current context value of FontContext.
 * @throws If the hook is used outside of a FontContextProvider.
 */
export const useFontContext = (): FontContextType => {
  const context = useContext(FontContext);

  if (context === undefined) {
    throw new Error("useFontContext must be used within a FontContextProvider");
  }

  return context;
};
