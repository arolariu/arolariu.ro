/** @format */

import type {NextFont} from "next/dist/compiled/@next/font";
import {Atkinson_Hyperlegible, Caudex} from "next/font/google";

// TODO: implement function with RxJs to automatically set the font based on user preferences.

const primaryFont: NextFont = Caudex({
  weight: "700",
  style: "normal",
  subsets: ["latin"],
  preload: true,
});

const dyslexicFont: NextFont = Atkinson_Hyperlegible({
  weight: "400",
  style: "normal",
  subsets: ["latin"],
  preload: false,
});

export const fonts = [primaryFont, dyslexicFont];
