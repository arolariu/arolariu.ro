/** @format */
"use client";

import {NextFont} from "next/dist/compiled/@next/font";
import {Caudex} from "next/font/google";
import {createContext, Dispatch, SetStateAction, useContext, useEffect, useMemo, useState} from "react";

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

export const FontContextProvider: React.FC<FontContextProviderProps> = ({children, currentFont}) => {
  const [selectedFont, setSelectedFont] = useState<NextFont>(currentFont ?? defaultFont);

  useEffect(() => {
    setSelectedFont(currentFont ?? defaultFont);
  }, [currentFont]);

  const value = useMemo(() => ({font: selectedFont, setFont: setSelectedFont}), [selectedFont, setSelectedFont]);
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
};

export const useFontContext = () => {
  const context = useContext(FontContext);

  if (context === undefined) {
    throw new Error("useFontContext must be used within a FontContextProvider");
  }

  return context;
};
