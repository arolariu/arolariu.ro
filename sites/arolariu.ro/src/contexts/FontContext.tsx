/** @format */
"use client";

import {NextFont} from "next/dist/compiled/@next/font";
import {Caudex} from "next/font/google";
import React, {createContext, Dispatch, SetStateAction, useContext, useEffect, useMemo, useState} from "react";

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
  children: React.ReactNode;
  currentFont?: NextFont;
}

/**
 * FontContextProvider component provides a context for managing font selection.
 *
 * @param {FontContextProviderProps} props - The properties for the FontContextProvider component.
 * @param {React.ReactNode} props.children - The child components that will have access to the font context.
 * @param {NextFont} props.currentFont - The current font to be used. If not provided, the default font will be used.
 *
 * @returns {React.JSX.Element} A provider component that supplies the font context to its children.
 *
 * @example
 * ```tsx
 * <FontContextProvider currentFont={someFont}>
 *   <YourComponent />
 * </FontContextProvider>
 * ```
 */
export const FontContextProvider: React.FC<FontContextProviderProps> = ({
  children,
  currentFont,
}: FontContextProviderProps): React.JSX.Element => {
  const [selectedFont, setSelectedFont] = useState<NextFont>(currentFont ?? defaultFont);

  useEffect(() => {
    setSelectedFont(currentFont ?? defaultFont);
  }, [currentFont]);

  const value = useMemo(() => ({font: selectedFont, setFont: setSelectedFont}), [selectedFont, setSelectedFont]);
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
};

/**
 * Custom hook to access the FontContext.
 *
 * This hook provides the current value of the FontContext. It must be used
 * within a FontContextProvider; otherwise, it will throw an error.
 *
 * @returns {FontContextType} The current context value of FontContext.
 * @throws {Error} If the hook is used outside of a FontContextProvider.
 */
export const useFontContext = (): FontContextType => {
  const context = useContext(FontContext);

  if (context === undefined) {
    throw new Error("useFontContext must be used within a FontContextProvider");
  }

  return context;
};
